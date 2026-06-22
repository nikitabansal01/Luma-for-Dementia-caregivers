"use client";

import { useState } from "react";
import { BEHAVIOR_OPTIONS } from "@/src/lib/behaviorMap";
import {
  COACH_FLOW_STRATEGIES,
  COACH_FLOW_TRIGGER_GROUPS,
  COACH_OUTCOME_OPTIONS,
  DID_NOT_TRY_CODE,
  type CoachOutcomeUi,
} from "@/src/lib/coachFlowCatalog";
import type { LumaDraft } from "@/src/lib/lumaEngine";
import type { RecommendationCard } from "@/src/lib/coachFlowRecommendations";
import { formatLumaSessionSavedAt } from "@/src/lib/lumaSessionStorage";
import {
  defaultEpisodeTiming,
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
} from "@/src/lib/episodeTiming";
import EpisodeTimingSelector from "./EpisodeTimingSelector";
import LumaSuggestionPanel from "./LumaSuggestionPanel";
import SeveritySelector from "./SeveritySelector";

type CustomBehaviorOption = { code: string; label: string };

type LumaFinalLogEditorProps = {
  draft: LumaDraft;
  customBehaviors: CustomBehaviorOption[];
  saving: boolean;
  lastAutoSavedAt: string | null;
  suggestions?: RecommendationCard[];
  onDraftChange: (draft: LumaDraft) => void;
  onSave: () => void;
  onKeepTalking: () => void;
};

const TRIGGER_GROUPS = COACH_FLOW_TRIGGER_GROUPS.filter((g) => g.category !== "Time");

export default function LumaFinalLogEditor({
  draft,
  customBehaviors,
  saving,
  lastAutoSavedAt,
  suggestions,
  onDraftChange,
  onSave,
  onKeepTalking,
}: LumaFinalLogEditorProps) {
  const defaults = defaultEpisodeTiming();
  const [exactEpisodeAt, setExactEpisodeAt] = useState("");
  const [showExactEpisode, setShowExactEpisode] = useState(false);

  const episodeRecency = draft.episode_recency ?? defaults.episode_recency;
  const episodeTimeOfDay = draft.episode_time_of_day ?? defaults.episode_time_of_day;
  const episodeDayContext = draft.episode_day_context ?? defaults.episode_day_context;
  const severity = draft.severity ?? 2;
  const outcome = draft.coach_outcome ?? "not_sure";

  const didNotTryOnly =
    draft.strategies_tried.length === 1 && draft.strategies_tried[0] === DID_NOT_TRY_CODE;

  function patch(partial: Partial<LumaDraft>) {
    onDraftChange({ ...draft, ...partial });
  }

  function handleBehaviorChange(code: string) {
    const standard = BEHAVIOR_OPTIONS.find((o) => o.code === code);
    const custom = customBehaviors.find((o) => o.code === code);
    patch({
      behavior_code: code || undefined,
      behavior_label: standard?.label ?? custom?.label,
      behavior_is_custom: custom != null,
    });
  }

  function toggleTrigger(code: string) {
    const prev = draft.trigger_hypotheses;
    const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
    patch({ trigger_hypotheses: next, triggers_answered: true });
  }

  function toggleStrategy(code: string) {
    if (code === DID_NOT_TRY_CODE) {
      patch({
        strategies_tried: [DID_NOT_TRY_CODE],
        coach_outcome: "not_applicable",
        outcome_answered: true,
        strategies_answered: true,
      });
      return;
    }
    const withoutDidNotTry = draft.strategies_tried.filter((c) => c !== DID_NOT_TRY_CODE);
    const next = withoutDidNotTry.includes(code)
      ? withoutDidNotTry.filter((c) => c !== code)
      : [...withoutDidNotTry, code];
    patch({
      strategies_tried: next,
      strategies_answered: next.length > 0,
      coach_outcome: outcome === "not_applicable" ? "not_sure" : outcome,
      outcome_answered: outcome === "not_applicable" ? false : draft.outcome_answered,
    });
  }

  function handleOutcomeChange(value: CoachOutcomeUi) {
    if (didNotTryOnly) return;
    patch({ coach_outcome: value, outcome_answered: true });
  }

  return (
    <div className="luma-companion__final-log">
      <div className="luma-companion__final-log-header">
        <h3 className="luma-companion__final-log-title">Review your log</h3>
        <p className="luma-companion__final-log-lead">
          Fix anything that looks off, then save when you&apos;re ready. Your edits auto-save locally
          every few seconds so nothing is lost.
        </p>
        {lastAutoSavedAt && (
          <p className="luma-companion__autosave-hint">
            Auto-saved locally at {formatLumaSessionSavedAt(lastAutoSavedAt)}
          </p>
        )}
      </div>

      <div className="luma-companion__final-log-fields">
        <div className="grid gap-2">
          <label htmlFor="luma-final-behavior" className="coach-flow-field-label">
            What happened?
          </label>
          <select
            id="luma-final-behavior"
            value={draft.behavior_code ?? ""}
            onChange={(e) => handleBehaviorChange(e.target.value)}
            disabled={saving}
            required
          >
            <option value="">Select a behavior…</option>
            {BEHAVIOR_OPTIONS.map(({ label, code }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
            {customBehaviors.length > 0 && (
              <optgroup label="Your behaviors">
                {customBehaviors.map(({ label, code }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <EpisodeTimingSelector
          episodeRecency={episodeRecency}
          episodeTimeOfDay={episodeTimeOfDay}
          episodeDayContext={episodeDayContext}
          exactEpisodeAt={exactEpisodeAt}
          showExact={showExactEpisode}
          onRecencyChange={(value: EpisodeRecency) => patch({ episode_recency: value })}
          onTimeOfDayChange={(value: EpisodeTimeOfDay) => patch({ episode_time_of_day: value })}
          onDayContextChange={(value: EpisodeDayContext) => patch({ episode_day_context: value })}
          onExactEpisodeAtChange={setExactEpisodeAt}
          onShowExactChange={setShowExactEpisode}
        />

        <SeveritySelector
          value={severity}
          onChange={(value) => patch({ severity: value })}
          required
        />

        <div className="space-y-4">
          <p className="coach-flow-field-label">Possible triggers (optional)</p>
          {TRIGGER_GROUPS.map((group) => (
            <div key={group.category} className="coach-flow-trigger-group">
              <p className="mb-3 text-sm font-semibold text-care-forest">{group.category}</p>
              <div className="flex flex-wrap gap-2">
                {group.chips.map((chip) => {
                  const selected = draft.trigger_hypotheses.includes(chip.code);
                  return (
                    <button
                      key={chip.code}
                      type="button"
                      onClick={() => toggleTrigger(chip.code)}
                      disabled={saving}
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
          <label htmlFor="luma-final-trigger-detail" className="coach-flow-field-label">
            What changed right before this happened? (optional)
          </label>
          <textarea
            id="luma-final-trigger-detail"
            rows={2}
            placeholder="e.g. Visitor arrived, lights were turned off"
            value={draft.trigger_detail ?? ""}
            onChange={(e) =>
              patch({
                trigger_detail: e.target.value || undefined,
                triggers_answered: true,
              })
            }
            disabled={saving}
          />
        </div>

        <div>
          <p className="coach-flow-field-label">Strategies you tried</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {COACH_FLOW_STRATEGIES.map((s) => {
              const selected = draft.strategies_tried.includes(s.code);
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleStrategy(s.code)}
                  disabled={saving}
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
                    name="luma-final-outcome"
                    value={value}
                    checked={isSelected}
                    onChange={() => handleOutcomeChange(value)}
                    disabled={saving || isDisabled}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="luma-final-notes" className="coach-flow-field-label">
            Notes (optional)
          </label>
          <textarea
            id="luma-final-notes"
            rows={3}
            placeholder="Anything else worth remembering"
            value={draft.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
            disabled={saving}
          />
        </div>
      </div>

      {suggestions != null && (
        <LumaSuggestionPanel
          recommendations={suggestions}
          className="luma-companion__final-log-suggestions coach-suggestions-panel"
        />
      )}

      <div className="luma-companion__final-log-actions">
        <button
          type="button"
          onClick={onKeepTalking}
          className="btn-secondary"
          disabled={saving}
        >
          Keep talking
        </button>
        <button
          type="button"
          onClick={onSave}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || !draft.behavior_code}
          aria-busy={saving}
        >
          {saving ? "Saving…" : "Save to log"}
        </button>
      </div>
    </div>
  );
}
