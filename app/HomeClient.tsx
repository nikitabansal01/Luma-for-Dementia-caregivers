"use client";

import Link from "next/link";
import { useState } from "react";
import type { BehaviorLog, CareRecipient } from "@/src/lib/repo";
import { getBehaviorLabelFromAllSources } from "@/src/lib/behaviorMap";
import {
  getLogInterventionLabel,
  getLogInterventionsAttempted,
  getLogOutcomeDisplay,
  getLogSeverityDisplay,
  getLogTriggerCodes,
  getLogTriggerLabel,
  getEpisodeTimingDisplay,
  notePreview,
} from "@/src/lib/logUtils";
import CoachWizard from "./CoachWizard";
import QuickLogForm from "./QuickLogForm";
import LumaCompanion from "./LumaCompanion";
import OnboardingModal from "./OnboardingModal";

type CustomBehaviorOption = { code: string; label: string };

function severityBadgeClass(severity: number): string {
  const base = "log-badge ";
  if (severity === 1) return base + "log-badge--severity-mild";
  if (severity === 3) return base + "log-badge--severity-severe";
  return base + "log-badge--severity-moderate";
}

function outcomeBadgeClass(tone: NonNullable<ReturnType<typeof getLogOutcomeDisplay>>["tone"]): string {
  const base = "log-badge ";
  if (tone === "helped") return base + "log-badge--outcome-helped";
  if (tone === "worse") return base + "log-badge--outcome-worse";
  if (tone === "mixed") return base + "log-badge--outcome-unchanged";
  return base + "log-badge--outcome-unknown";
}

function rowOutcomeClass(outcome: string): string {
  if (outcome === "better") return "log-row--better";
  if (outcome === "worse") return "log-row--worse";
  return "log-row--same";
}

function TodayLogCard({
  log,
  customBehaviorLabels,
}: {
  log: BehaviorLog;
  customBehaviorLabels: Record<string, string>;
}) {
  const triggerCodes = getLogTriggerCodes(log).slice(0, 3);
  const strategies = getLogInterventionsAttempted(log);
  const preview = notePreview(log.notes);
  const outcomeDisplay = getLogOutcomeDisplay(log);
  const { primary, secondary } = getEpisodeTimingDisplay(log);
  const hasDetails =
    triggerCodes.length > 0 ||
    Boolean(log.trigger_detail?.trim()) ||
    strategies.length > 0 ||
    Boolean(preview);

  return (
    <li>
      <Link
        href={`/history/${log.id}`}
        className={`log-card group ${rowOutcomeClass(log.outcome)}`}
      >
        <div className="log-card__inner">
          <div className="log-card__time-col">
            <span className="log-card__time">{primary}</span>
            {secondary && <span className="log-card__time-meridiem">{secondary}</span>}
          </div>

          <div className="log-card__body">
            <div className="log-card__top">
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="log-card__title">
                  {getBehaviorLabelFromAllSources(log.behavior_type, customBehaviorLabels)}
                </h3>
                <div className="log-card__badges">
                      <span className={severityBadgeClass(log.severity)}>
                        {getLogSeverityDisplay(log.severity)}
                      </span>
                  {outcomeDisplay && (
                    <span className={outcomeBadgeClass(outcomeDisplay.tone)}>
                      {outcomeDisplay.label}
                    </span>
                  )}
                </div>
              </div>
              <span className="log-card__view" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            {hasDetails && (
              <div className="log-card__details">
                {triggerCodes.length > 0 && (
                  <div className="log-card__detail">
                    <span className="log-card__detail-label">Triggers</span>
                    <div className="log-card__chips">
                      {triggerCodes.map((code) => (
                        <span key={code} className="log-chip">
                          {getLogTriggerLabel(code, log.behavior_type)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {log.trigger_detail?.trim() && (
                  <div className="log-card__detail">
                    <span className="log-card__detail-label">Detail</span>
                    <p className="log-card__detail-value">{log.trigger_detail.trim()}</p>
                  </div>
                )}

                {strategies.length > 0 && (
                  <div className="log-card__detail">
                    <span className="log-card__detail-label">Strategy</span>
                    <p className="log-card__detail-value">
                      {strategies.map(getLogInterventionLabel).join(" · ")}
                    </p>
                  </div>
                )}

                {preview && (
                  <div className="log-card__detail">
                    <span className="log-card__detail-label">Note</span>
                    <p className="log-card__note">&ldquo;{preview}&rdquo;</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function TodayLogsList({
  logs,
  onQuickLog,
  customBehaviorLabels,
}: {
  logs: BehaviorLog[];
  onQuickLog: () => void;
  customBehaviorLabels: Record<string, string>;
}) {
  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="today-logs-empty">
          <p className="today-logs-empty__title">No logs for today yet</p>
          <p className="today-logs-empty__text">
            Small notes can reveal useful patterns over time.
          </p>
        </div>
        <button type="button" onClick={onQuickLog} className="btn-add-log">
          <span aria-hidden>+</span>
          Quick log another incident
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="list-none space-y-3 pl-0">
        {logs.map((log) => (
          <TodayLogCard key={log.id} log={log} customBehaviorLabels={customBehaviorLabels} />
        ))}
      </ul>
      <button type="button" onClick={onQuickLog} className="btn-add-log">
        <span aria-hidden>+</span>
        Quick log another incident
      </button>
    </div>
  );
}

export default function HomeClient({
  todayLogs,
  customBehaviors: initialCustomBehaviors,
  customBehaviorLabels: initialCustomBehaviorLabels,
  careRecipient,
  showOnboarding,
}: {
  todayLogs: BehaviorLog[];
  customBehaviors: CustomBehaviorOption[];
  customBehaviorLabels: Record<string, string>;
  careRecipient: CareRecipient;
  showOnboarding: boolean;
}) {
  const [mode, setMode] = useState<"coach" | "quick" | "luma" | null>(null);
  const [customBehaviors, setCustomBehaviors] = useState(initialCustomBehaviors);
  const [customBehaviorLabels, setCustomBehaviorLabels] = useState(initialCustomBehaviorLabels);

  const showProfileBanner =
    !showOnboarding &&
    careRecipient.onboarding_skipped_at &&
    !careRecipient.onboarding_completed_at;

  function openQuickLog() {
    setMode("quick");
  }

  return (
    <div className="space-y-10">
      {showOnboarding && <OnboardingModal recipient={careRecipient} />}

      {showProfileBanner && (
        <div className="onboarding-banner">
          <p className="onboarding-banner__text">
            Add a quick profile so Luma and your synopsis have the right context.
          </p>
          <Link href="/profile" className="onboarding-banner__link">
            Complete profile
          </Link>
        </div>
      )}

      <header>
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">
          Luma
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-care-stone">
          {mode === "coach"
            ? "Log an incident, reflect on triggers, and get guided next steps."
            : mode === "luma"
              ? "Talk with Luma — she'll help capture what happened in your own words."
              : "Something happened? Get guided help or log quickly."}
        </p>
      </header>

      {mode === null && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => setMode("luma")}
            className="btn-primary flex-1 py-4 text-base sm:min-w-[140px]"
          >
            Talk with Luma
          </button>
          <button
            type="button"
            onClick={() => setMode("coach")}
            className="btn-secondary flex-1 py-4 text-base sm:min-w-[140px]"
          >
            Coach me now
          </button>
          <button
            type="button"
            onClick={openQuickLog}
            className="btn-secondary flex-1 py-4 text-base sm:min-w-[140px]"
          >
            Quick log
          </button>
        </div>
      )}

      {mode === "luma" && (
        <LumaCompanion
          customBehaviors={customBehaviors}
          onClose={() => setMode(null)}
          onBehaviorsUpdated={(behaviors) => {
            setCustomBehaviors(behaviors);
            setCustomBehaviorLabels(Object.fromEntries(behaviors.map((b) => [b.code, b.label])));
          }}
        />
      )}
      {mode === "coach" && (
        <CoachWizard onClose={() => setMode(null)} onQuickLog={openQuickLog} />
      )}
      {mode === "quick" && <QuickLogForm onClose={() => setMode(null)} />}

      {mode !== "coach" && mode !== "luma" && (
        <section className="section-band section-band--when">
          <div className="today-logs-header">
            <h2 className="card-heading">Today&apos;s logs</h2>
            {todayLogs.length > 0 && (
              <span className="today-logs-count">
                {todayLogs.length} incident{todayLogs.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <TodayLogsList
            logs={todayLogs}
            onQuickLog={openQuickLog}
            customBehaviorLabels={customBehaviorLabels}
          />
        </section>
      )}
    </div>
  );
}
