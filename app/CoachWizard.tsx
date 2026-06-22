"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BEHAVIOR_OPTIONS } from "@/src/lib/behaviorMap";
import {
  COACH_FLOW_TRIGGER_GROUPS,
  COACH_FLOW_STRATEGIES,
  COACH_OUTCOME_OPTIONS,
  DID_NOT_TRY_CODE,
  type CoachOutcomeUi,
  mapCoachOutcomeToDb,
  strategyCodesToLabels,
} from "@/src/lib/coachFlowCatalog";
import {
  generateCoachRecommendations,
  recommendationActions,
  type RecommendationCard,
} from "@/src/lib/coachFlowRecommendations";
import { submitCoachLog } from "./actions";
import SeveritySelector from "./SeveritySelector";
import EpisodeTimingSelector from "./EpisodeTimingSelector";
import {
  defaultEpisodeTiming,
  fromDatetimeLocal,
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
} from "@/src/lib/episodeTiming";

const COACH_STEPS = [
  { num: 1, label: "What happened" },
  { num: 2, label: "Possible triggers" },
  { num: 3, label: "What you tried" },
  { num: 4, label: "Next steps" },
] as const;

function buildNotes(step1Notes: string, afterTryNotes: string): string | undefined {
  const parts: string[] = [];
  if (step1Notes.trim()) parts.push(step1Notes.trim());
  if (afterTryNotes.trim()) parts.push(`After trying: ${afterTryNotes.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

type CoachWizardProps = {
  onClose: () => void;
  onQuickLog?: () => void;
};

function CoachStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Coach progress" className="coach-flow-stepper">
      {COACH_STEPS.map((s, index) => {
        const isActive = currentStep === s.num;
        const isComplete = currentStep > s.num;
        const state = isActive ? "active" : isComplete ? "complete" : "upcoming";
        return (
          <div
            key={s.num}
            className={`coach-flow-step coach-flow-step--${state}`}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="coach-flow-step__marker" aria-hidden="true">
              {isComplete ? "✓" : s.num}
            </span>
            <span className="coach-flow-step__label">{s.label}</span>
            {index < COACH_STEPS.length - 1 && (
              <span className="coach-flow-step__connector" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SuggestedNextSteps({
  recommendations,
  className = "",
}: {
  recommendations: RecommendationCard[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="font-serif text-lg font-semibold text-care-forest">Suggested next steps</h3>
      <p className="mt-1 text-sm leading-relaxed text-care-stone">
        Based on what happened, possible triggers, and what you already tried.
      </p>
      <div className="mt-4 space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-sm leading-relaxed text-care-stone">
            No specific suggestions right now. Save this log and share with your care team when
            you&apos;re ready.
          </p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className="coach-suggestion-card">
              <p className="font-semibold text-care-forest">{rec.action}</p>
              <p className="mt-2 text-care-bark">
                <span className="font-medium text-care-stone">Why this may help: </span>
                {rec.why}
              </p>
              <p className="mt-1 text-care-bark">
                <span className="font-medium text-care-stone">When to try it: </span>
                {rec.when}
              </p>
              {rec.safetyNote && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Safety: {rec.safetyNote}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PrivacyNote({ className = "" }: { className?: string }) {
  return (
    <aside className={`coach-privacy-card ${className}`}>
      <p>
        <span className="font-medium text-care-bark">Private notes.</span> Your notes are private
        and help reveal patterns over time.
      </p>
    </aside>
  );
}

export default function CoachWizard({ onClose, onQuickLog }: CoachWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [episodeRecency, setEpisodeRecency] = useState<EpisodeRecency>(
    defaultEpisodeTiming().episode_recency
  );
  const [episodeTimeOfDay, setEpisodeTimeOfDay] = useState<EpisodeTimeOfDay>(
    defaultEpisodeTiming().episode_time_of_day
  );
  const [episodeDayContext, setEpisodeDayContext] = useState<EpisodeDayContext>(
    defaultEpisodeTiming().episode_day_context
  );
  const [exactEpisodeAt, setExactEpisodeAt] = useState("");
  const [showExactEpisode, setShowExactEpisode] = useState(false);
  const [behaviorCode, setBehaviorCode] = useState("");
  const [severity, setSeverity] = useState<number>(2);
  const [step1Notes, setStep1Notes] = useState("");
  const [triggerHypotheses, setTriggerHypotheses] = useState<string[]>([]);
  const [triggerDetail, setTriggerDetail] = useState("");
  const [strategiesTried, setStrategiesTried] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<CoachOutcomeUi>("not_sure");
  const [afterTryNotes, setAfterTryNotes] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const didNotTryOnly =
    strategiesTried.length === 1 && strategiesTried[0] === DID_NOT_TRY_CODE;

  const step4Recommendations = useMemo(
    () =>
      generateCoachRecommendations({
        triggerCodes: triggerHypotheses,
        strategiesTried,
        outcome: didNotTryOnly ? "not_applicable" : outcome,
        severity,
      }),
    [triggerHypotheses, strategiesTried, outcome, didNotTryOnly, severity]
  );

  function goToStep4() {
    setRecommendations(step4Recommendations);
    setStep(4);
  }

  async function handleSubmit() {
    setError(null);
    if (!behaviorCode?.trim()) {
      setError("Please select a behavior.");
      return;
    }
    setIsSubmitting(true);
    try {
      const effectiveOutcome = didNotTryOnly ? "not_applicable" : outcome;
      const recs = recommendations.length > 0 ? recommendations : step4Recommendations;
      const result = await submitCoachLog({
        behavior_type: behaviorCode,
        severity,
        episode_recency: episodeRecency,
        episode_time_of_day: episodeTimeOfDay,
        episode_day_context: episodeDayContext,
        exact_episode_at:
          showExactEpisode && exactEpisodeAt
            ? fromDatetimeLocal(exactEpisodeAt)
            : undefined,
        trigger_hypotheses: triggerHypotheses,
        trigger_detail: triggerDetail.trim() || undefined,
        recommended_interventions: recommendationActions(recs),
        interventions_attempted: strategyCodesToLabels(strategiesTried),
        outcome: mapCoachOutcomeToDb(effectiveOutcome),
        coach_outcome: effectiveOutcome,
        notes: buildNotes(step1Notes, afterTryNotes),
      });
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error ?? "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleTrigger(code: string) {
    setTriggerHypotheses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function toggleStrategy(code: string) {
    if (code === DID_NOT_TRY_CODE) {
      setStrategiesTried([DID_NOT_TRY_CODE]);
      setOutcome("not_applicable");
      return;
    }
    setStrategiesTried((prev) => {
      const withoutDidNotTry = prev.filter((c) => c !== DID_NOT_TRY_CODE);
      return withoutDidNotTry.includes(code)
        ? withoutDidNotTry.filter((c) => c !== code)
        : [...withoutDidNotTry, code];
    });
    setOutcome((prev) => (prev === "not_applicable" ? "not_sure" : prev));
  }

  function handleOutcomeChange(value: CoachOutcomeUi) {
    if (didNotTryOnly) return;
    setOutcome(value);
  }

  const displayRecs = step === 4 ? recommendations : step4Recommendations;

  return (
    <div className={`coach-flow ${step === 4 ? "coach-flow--step4" : ""}`}>
      <div className={`coach-flow-grid ${step === 4 ? "coach-flow-grid--step4" : ""}`}>
        <article className="coach-flow-card">
          <header className="coach-flow-header">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-care-olive">
                Coach flow
              </p>
              <p className="mt-1 text-sm text-care-stone">
                Step {step} of {COACH_STEPS.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-care-stone transition-colors hover:bg-care-sage hover:text-care-bark"
            >
              Cancel
            </button>
          </header>

          <CoachStepper currentStep={step} />

          {error && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="coach-flow-section-title">What happened</h2>
                <p className="coach-flow-section-lead">
                  Capture the basics while the moment is still fresh.
                </p>
              </div>

              <div className="grid gap-2">
                <label htmlFor="coach-behavior" className="coach-flow-field-label">
                  What happened?
                </label>
                <select
                  id="coach-behavior"
                  value={behaviorCode}
                  onChange={(e) => setBehaviorCode(e.target.value)}
                  required
                >
                  <option value="">Select a behavior…</option>
                  {BEHAVIOR_OPTIONS.map(({ label, code }) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <EpisodeTimingSelector
                episodeRecency={episodeRecency}
                episodeTimeOfDay={episodeTimeOfDay}
                episodeDayContext={episodeDayContext}
                exactEpisodeAt={exactEpisodeAt}
                showExact={showExactEpisode}
                onRecencyChange={setEpisodeRecency}
                onTimeOfDayChange={setEpisodeTimeOfDay}
                onDayContextChange={setEpisodeDayContext}
                onExactEpisodeAtChange={setExactEpisodeAt}
                onShowExactChange={setShowExactEpisode}
              />

              <SeveritySelector
                value={severity}
                onChange={setSeverity}
                required
              />

              <div className="grid gap-2">
                <label htmlFor="coach-step1-notes" className="coach-flow-field-label">
                  Notes (optional)
                </label>
                <textarea
                  id="coach-step1-notes"
                  rows={3}
                  placeholder="Anything notable about what happened"
                  value={step1Notes}
                  onChange={(e) => setStep1Notes(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="coach-flow-section-title">Possible triggers</h2>
                <p className="coach-flow-section-lead">
                  Select anything that might have contributed. You can choose more than one.
                </p>
              </div>

              <div className="space-y-4">
                {COACH_FLOW_TRIGGER_GROUPS.map((group) => (
                  <div key={group.category} className="coach-flow-trigger-group">
                    <p className="mb-3 text-sm font-semibold text-care-forest">{group.category}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.chips.map((chip) => {
                        const selected = triggerHypotheses.includes(chip.code);
                        return (
                          <button
                            key={chip.code}
                            type="button"
                            onClick={() => toggleTrigger(chip.code)}
                            className={`coach-flow-chip ${
                              selected ? "coach-flow-chip--selected" : "coach-flow-chip--idle"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2">
                <label htmlFor="coach-trigger-detail" className="coach-flow-field-label">
                  What changed right before this happened? (optional)
                </label>
                <input
                  id="coach-trigger-detail"
                  type="text"
                  placeholder="e.g. Visitor arrived, lights were turned off"
                  value={triggerDetail}
                  onChange={(e) => setTriggerDetail(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="coach-flow-section-title">What did you try?</h2>
                <p className="coach-flow-section-lead">
                  Record what you already attempted in the moment — not what helped yet.
                </p>
              </div>

              <div>
                <p className="coach-flow-field-label">Strategies you tried</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COACH_FLOW_STRATEGIES.map((s) => {
                    const selected = strategiesTried.includes(s.code);
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => toggleStrategy(s.code)}
                        className={`coach-flow-chip ${
                          selected ? "coach-flow-chip--selected" : "coach-flow-chip--idle"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="coach-flow-field-label">How did it go?</p>
                <div
                  className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                  role="radiogroup"
                  aria-label="Outcome"
                >
                  {COACH_OUTCOME_OPTIONS.map(({ value, label }) => {
                    const isSelected = outcome === value;
                    const isDisabled = didNotTryOnly && value !== "not_applicable";
                    return (
                      <label
                        key={value}
                        className={`coach-flow-outcome ${
                          isDisabled
                            ? "coach-flow-outcome--disabled"
                            : isSelected
                              ? "coach-flow-outcome--selected"
                              : "coach-flow-outcome--idle"
                        }`}
                      >
                        <input
                          type="radio"
                          name="coach-outcome"
                          value={value}
                          checked={isSelected}
                          onChange={() => handleOutcomeChange(value)}
                          disabled={isDisabled}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                {didNotTryOnly && (
                  <p className="mt-3 text-sm text-care-stone">
                    Outcome set to &ldquo;Not applicable&rdquo; because nothing was tried yet.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label htmlFor="coach-after-try" className="coach-flow-field-label">
                  What happened after you tried it? (optional)
                </label>
                <textarea
                  id="coach-after-try"
                  rows={3}
                  placeholder="Describe what happened next"
                  value={afterTryNotes}
                  onChange={(e) => setAfterTryNotes(e.target.value)}
                  disabled={didNotTryOnly}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="coach-flow-section-title">Next steps</h2>
                <p className="coach-flow-section-lead lg:hidden">
                  Review the suggestions below, then save when you&apos;re ready.
                </p>
                <p className="coach-flow-section-lead hidden lg:block">
                  Review the suggestions beside this form, then save when you&apos;re ready.
                </p>
              </div>

              <div className="lg:hidden">
                <SuggestedNextSteps recommendations={displayRecs} />
              </div>
            </div>
          )}

          <footer className="coach-flow-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            {step === 4 && onQuickLog && (
              <button
                type="button"
                onClick={onQuickLog}
                className="btn-secondary sm:mr-auto"
                disabled={isSubmitting}
              >
                Quick log
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!behaviorCode}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue to possible triggers
              </button>
            )}
            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                Continue to what you tried
              </button>
            )}
            {step === 3 && (
              <button type="button" onClick={goToStep4} className="btn-primary">
                See suggested next steps
              </button>
            )}
            {step === 4 && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save log"}
              </button>
            )}
          </footer>
        </article>

        {step === 4 && (
          <aside className="coach-suggestions-panel hidden lg:block">
            <SuggestedNextSteps recommendations={displayRecs} />
          </aside>
        )}

        <PrivacyNote />
      </div>
    </div>
  );
}
