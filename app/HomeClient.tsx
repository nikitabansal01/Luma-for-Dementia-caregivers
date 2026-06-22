"use client";

import Link from "next/link";
import { useState } from "react";
import type { BehaviorLog, CareRecipient } from "@/src/lib/repo";
import { getBehaviorLabelFromAllSources } from "@/src/lib/behaviorMap";
import {
  getLogInterventionLabel,
  getLogInterventionsAttempted,
  getLogOutcomeDisplay,
  getLogSeverityLabel,
  getLogTriggerCodes,
  getLogTriggerLabel,
  getEpisodeTimingDisplay,
  notePreview,
} from "@/src/lib/logUtils";
import CoachWizard from "./CoachWizard";
import LumaCompanion from "./LumaCompanion";
import OnboardingModal from "./OnboardingModal";

type CustomBehaviorOption = { code: string; label: string };

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function severityBadgeClass(severity: number): string {
  const base = "log-badge ";
  if (severity === 1) return base + "log-badge--severity-mild";
  if (severity === 3) return base + "log-badge--severity-severe";
  return base + "log-badge--severity-moderate";
}

function outcomeRowClass(tone: NonNullable<ReturnType<typeof getLogOutcomeDisplay>>["tone"] | null): string {
  if (tone === "helped") return "home-log-row--helped";
  if (tone === "worse") return "home-log-row--worse";
  if (tone === "mixed") return "home-log-row--same";
  return "";
}

function outcomeBadgeClass(tone: NonNullable<ReturnType<typeof getLogOutcomeDisplay>>["tone"]): string {
  const base = "log-badge ";
  if (tone === "helped") return base + "log-badge--outcome-helped";
  if (tone === "worse") return base + "log-badge--outcome-worse";
  if (tone === "mixed") return base + "log-badge--outcome-unchanged";
  return base + "log-badge--outcome-unknown";
}

function TodayLogRow({
  log,
  customBehaviorLabels,
}: {
  log: BehaviorLog;
  customBehaviorLabels: Record<string, string>;
}) {
  const triggerCodes = getLogTriggerCodes(log).slice(0, 3);
  const strategies = getLogInterventionsAttempted(log).slice(0, 1);
  const preview = notePreview(log.notes, 72);
  const outcomeDisplay = getLogOutcomeDisplay(log);
  const { primary, secondary } = getEpisodeTimingDisplay(log);
  const behaviorLabel = getBehaviorLabelFromAllSources(log.behavior_type, customBehaviorLabels);

  return (
    <li>
      <Link
        href={`/history/${log.id}`}
        className={`home-log-row group ${outcomeRowClass(outcomeDisplay?.tone ?? null)}`}
      >
        <div className="home-log-row__time">
          <div className="home-log-row__time-box">
            <span className="home-log-row__time-primary">{primary}</span>
            {secondary && <span className="home-log-row__time-secondary">{secondary}</span>}
          </div>
        </div>

        <div className="home-log-row__main">
          <div className="home-log-row__headline">
            <span className="home-log-row__behavior">{behaviorLabel}</span>
            <div className="home-log-row__badges">
              <span className={severityBadgeClass(log.severity)}>{getLogSeverityLabel(log.severity)}</span>
              {outcomeDisplay && (
                <span className={outcomeBadgeClass(outcomeDisplay.tone)}>{outcomeDisplay.label}</span>
              )}
            </div>
          </div>

          {(triggerCodes.length > 0 || strategies.length > 0) && (
            <div className="home-log-row__meta">
              {triggerCodes.map((code) => (
                <span key={code} className="home-log-row__chip">
                  {getLogTriggerLabel(code, log.behavior_type)}
                </span>
              ))}
              {strategies.map((s) => (
                <span key={s} className="home-log-row__chip home-log-row__chip--strategy">
                  {getLogInterventionLabel(s)}
                </span>
              ))}
            </div>
          )}

          {preview && <p className="home-log-row__preview">&ldquo;{preview}&rdquo;</p>}
        </div>

        <span className="home-log-row__chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    </li>
  );
}

function EmptyLogsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect x="8" y="6" width="18" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12h10M12 16h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M22 24l6-6 2 2-6 6h-2v-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TodayLogsPanel({
  logs,
  onLogAnother,
  customBehaviorLabels,
}: {
  logs: BehaviorLog[];
  onLogAnother: () => void;
  customBehaviorLabels: Record<string, string>;
}) {
  return (
    <section className="home-today-panel">
      <div className={`home-today-panel__header${logs.length > 0 ? " home-today-panel__header--with-link" : ""}`}>
        <div>
          <div className="home-today-panel__title-row">
            <h2 className="home-today-panel__title">Today&apos;s notes</h2>
            {logs.length > 0 && (
              <span className="home-today-panel__count">{logs.length}</span>
            )}
          </div>
          <p className="home-today-panel__subtitle">
            {logs.length === 0
              ? "Observations you note today show up here."
              : `${logs.length} observation${logs.length === 1 ? "" : "s"} noted today`}
          </p>
        </div>
        {logs.length > 0 && (
          <Link href="/history" className="home-today-panel__link">
            View all history
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="home-today-panel__empty">
          <div className="home-today-panel__empty-inner">
            <span className="home-today-panel__empty-icon">
              <EmptyLogsIcon />
            </span>
            <p className="home-today-panel__empty-title">No notes for today yet</p>
            <p className="home-today-panel__empty-text">
              Small notes add up — patterns help you and your care team prepare for visits.
            </p>
          </div>
        </div>
      ) : (
        <ul className="home-log-list">
          {logs.map((log) => (
            <TodayLogRow key={log.id} log={log} customBehaviorLabels={customBehaviorLabels} />
          ))}
        </ul>
      )}

      <button type="button" onClick={onLogAnother} className="home-today-panel__add">
        <span aria-hidden>+</span>
        Note another moment
      </button>
    </section>
  );
}

function LumaActionIcon() {
  return (
    <span className="home-action-card__icon home-action-card__icon--luma" aria-hidden>
      <span className="home-action-card__icon-badge home-action-card__icon-badge--luma">
        <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
          <rect x="8" y="3" width="6" height="10" rx="3" fill="currentColor" />
          <path
            d="M5 12a6 6 0 0012 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path d="M11 18v2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M8.5 20.5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

function CoachActionIcon() {
  return (
    <span className="home-action-card__icon home-action-card__icon--coach" aria-hidden>
      <span className="home-action-card__icon-badge home-action-card__icon-badge--coach">
        <svg width="24" height="26" viewBox="0 0 24 26" fill="none">
          <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8.5 11l2 2 4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M8.5 15.5l2 2 4.5-4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

function HomeActionCards({
  onLuma,
  onCoach,
}: {
  onLuma: () => void;
  onCoach: () => void;
}) {
  return (
    <div className="home-actions">
      <article className="home-action-card home-action-card--luma">
        <div className="home-action-card__main">
          <LumaActionIcon />
          <div className="home-action-card__body">
            <h3 className="home-action-card__title">Reflect with Luma</h3>
            <p className="home-action-card__desc">
              Speak or type what happened — Luma helps you capture it so patterns emerge over time.
            </p>
          </div>
        </div>
        <button type="button" onClick={onLuma} className="home-action-card__btn home-action-card__btn--luma">
          Start conversation
          <span aria-hidden>→</span>
        </button>
      </article>

      <article className="home-action-card home-action-card--coach">
        <div className="home-action-card__main">
          <CoachActionIcon />
          <div className="home-action-card__body">
            <h3 className="home-action-card__title home-action-card__title--coach">Guided check-in</h3>
            <p className="home-action-card__desc">
              Walk through a structured check-in — what happened, possible triggers, and ideas for
              what to try next.
            </p>
          </div>
        </div>
        <button type="button" onClick={onCoach} className="home-action-card__btn home-action-card__btn--coach">
          Begin check-in
          <span aria-hidden>→</span>
        </button>
      </article>
    </div>
  );
}

function HomeAffirmationCard() {
  return (
    <div className="home-affirmation-card">
      <div className="home-affirmation-card__artwork" aria-hidden>
        <img
          src="/images/affirmation-hills-sun.png"
          alt=""
          className="home-affirmation-card__artwork-image"
        />
      </div>
      <div className="home-affirmation-card__content">
        <span className="home-affirmation-card__heart" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <div className="home-affirmation-card__text">
          <p className="home-affirmation-card__headline">You&apos;re not alone in this.</p>
          <p className="home-affirmation-card__body">
            Every note you add helps reveal patterns over time and keeps your care team aligned.
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeWelcomeCard() {
  return (
    <header className="home-hero">
      <div className="home-hero__grid">
        <div className="home-hero__artwork" aria-hidden>
          <img
            src="/images/hero-greeting-bg.png"
            alt=""
            className="home-hero__artwork-image"
          />
        </div>
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">{formatTodayDate()}</p>
          <h1 className="home-hero__title">{getTimeGreeting()}</h1>
          <p className="home-hero__lead">
            Talk through a care observation or use a guided check-in to understand what happened, spot
            possible triggers, and choose what to try next.
          </p>
          <div className="home-hero__badges">
            <span className="home-hero__badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              We&apos;re here to listen
            </span>
            <span className="home-hero__badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3l7 3v5c0 5-3.5 9-7 10C8.5 20 5 16 5 11V6l7-3z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              Your data stays private and secure
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}


export default function HomeClient({
  todayLogs,
  customBehaviors: initialCustomBehaviors,
  customBehaviorLabels: initialCustomBehaviorLabels,
  customStrategies: initialCustomStrategies,
  customStrategyLabels: initialCustomStrategyLabels,
  careRecipient,
  showOnboarding,
}: {
  todayLogs: BehaviorLog[];
  customBehaviors: CustomBehaviorOption[];
  customBehaviorLabels: Record<string, string>;
  customStrategies: CustomBehaviorOption[];
  customStrategyLabels: Record<string, string>;
  careRecipient: CareRecipient;
  showOnboarding: boolean;
}) {
  const [mode, setMode] = useState<"coach" | "luma" | null>(null);
  const [customBehaviors, setCustomBehaviors] = useState(initialCustomBehaviors);
  const [customBehaviorLabels, setCustomBehaviorLabels] = useState(initialCustomBehaviorLabels);
  const [customStrategies, setCustomStrategies] = useState(initialCustomStrategies);
  const [customStrategyLabels, setCustomStrategyLabels] = useState(initialCustomStrategyLabels);

  const showProfileBanner =
    !showOnboarding &&
    careRecipient.onboarding_skipped_at &&
    !careRecipient.onboarding_completed_at;

  const modeSubtitle =
    mode === "coach"
      ? "Walk through a structured check-in — triggers, what you tried, and ideas for next time."
      : mode === "luma"
        ? "Speak or type what happened — Luma helps you capture it so patterns emerge over time."
        : null;

  return (
    <div className="home-shell">
      {showOnboarding && <OnboardingModal recipient={careRecipient} />}

      {showProfileBanner && (
        <div className="onboarding-banner">
          <span className="onboarding-banner__icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M7 18c0-2.761 2.239-5 5-5s5 2.239 5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <p className="onboarding-banner__text">
            Add a quick profile so Luma and your synopsis have the right context.
          </p>
          <Link href="/profile" className="onboarding-banner__link">
            Complete profile &gt;
          </Link>
        </div>
      )}

      {mode === null ? (
        <div className="home-dashboard">
          <HomeWelcomeCard />

          <HomeActionCards onLuma={() => setMode("luma")} onCoach={() => setMode("coach")} />

          <TodayLogsPanel
            logs={todayLogs}
            onLogAnother={() => setMode("luma")}
            customBehaviorLabels={customBehaviorLabels}
          />

          <HomeAffirmationCard />
        </div>
      ) : (
        <div className="home-active-flow">
          <header className="home-flow-header">
            <button type="button" onClick={() => setMode(null)} className="home-flow-back">
              ← Back to Today
            </button>
            <div>
              <h1 className="home-flow-title">
                {mode === "luma" ? "Reflect with Luma" : "Guided check-in"}
              </h1>
              {modeSubtitle && <p className="home-flow-subtitle">{modeSubtitle}</p>}
            </div>
          </header>

          {mode === "luma" && (
            <LumaCompanion
              customBehaviors={customBehaviors}
              customStrategies={customStrategies}
              onClose={() => setMode(null)}
              onBehaviorsUpdated={(behaviors) => {
                setCustomBehaviors(behaviors);
                setCustomBehaviorLabels(
                  Object.fromEntries(behaviors.map((b) => [b.code, b.label]))
                );
              }}
              onStrategiesUpdated={(strategies) => {
                setCustomStrategies(strategies);
                setCustomStrategyLabels(
                  Object.fromEntries(strategies.map((s) => [s.code, s.label]))
                );
              }}
            />
          )}
          {mode === "coach" && <CoachWizard onClose={() => setMode(null)} />}
        </div>
      )}
    </div>
  );
}
