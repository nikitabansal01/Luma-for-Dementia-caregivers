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

function severityDotClass(severity: number): string {
  if (severity === 1) return "home-log-row__dot home-log-row__dot--mild";
  if (severity === 3) return "home-log-row__dot home-log-row__dot--severe";
  return "home-log-row__dot home-log-row__dot--moderate";
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
      <Link href={`/history/${log.id}`} className="home-log-row group">
        <div className="home-log-row__time">
          <span className="home-log-row__time-primary">{primary}</span>
          {secondary && <span className="home-log-row__time-secondary">{secondary}</span>}
        </div>

        <div className="home-log-row__main">
          <div className="home-log-row__headline">
            <span className={severityDotClass(log.severity)} aria-hidden />
            <span className="home-log-row__behavior">{behaviorLabel}</span>
            <span className="home-log-row__severity-label">{getLogSeverityDisplay(log.severity)}</span>
            {outcomeDisplay && (
              <span className={`${outcomeBadgeClass(outcomeDisplay.tone)} home-log-row__outcome`}>
                {outcomeDisplay.label}
              </span>
            )}
          </div>

          {(triggerCodes.length > 0 || strategies.length > 0 || preview) && (
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
              {preview && <span className="home-log-row__preview">&ldquo;{preview}&rdquo;</span>}
            </div>
          )}
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

function TodayLogsPanel({
  logs,
  onQuickLog,
  customBehaviorLabels,
}: {
  logs: BehaviorLog[];
  onQuickLog: () => void;
  customBehaviorLabels: Record<string, string>;
}) {
  return (
    <section className="home-today-panel">
      <div className="home-today-panel__header">
        <div>
          <h2 className="home-today-panel__title">Today&apos;s logs</h2>
          <p className="home-today-panel__subtitle">
            {logs.length === 0
              ? "Incidents you log today appear here."
              : `${logs.length} incident${logs.length === 1 ? "" : "s"} captured today`}
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
          <p className="home-today-panel__empty-title">No logs for today yet</p>
          <p className="home-today-panel__empty-text">
            Small notes add up — patterns help you and your care team prepare for visits.
          </p>
        </div>
      ) : (
        <ul className="home-log-list">
          {logs.map((log) => (
            <TodayLogRow key={log.id} log={log} customBehaviorLabels={customBehaviorLabels} />
          ))}
        </ul>
      )}

      <button type="button" onClick={onQuickLog} className="home-today-panel__add">
        <span aria-hidden>+</span>
        Log another incident
      </button>
    </section>
  );
}

function HomeActionCards({
  onLuma,
  onCoach,
  onQuickLog,
}: {
  onLuma: () => void;
  onCoach: () => void;
  onQuickLog: () => void;
}) {
  return (
    <div className="home-actions">
      <button type="button" onClick={onLuma} className="home-action-card home-action-card--featured">
        <span className="home-action-card__icon home-action-card__icon--luma" aria-hidden>
          ✦
        </span>
        <span className="home-action-card__body">
          <span className="home-action-card__title">Talk with Luma</span>
          <span className="home-action-card__desc">
            Describe what happened in your own words — voice or text.
          </span>
        </span>
        <span className="home-action-card__cta">Start conversation →</span>
      </button>

      <button type="button" onClick={onCoach} className="home-action-card">
        <span className="home-action-card__icon home-action-card__icon--coach" aria-hidden>
          ◎
        </span>
        <span className="home-action-card__body">
          <span className="home-action-card__title">Coach me now</span>
          <span className="home-action-card__desc">
            Step through triggers, what you tried, and suggested next steps.
          </span>
        </span>
        <span className="home-action-card__cta">Begin guided log →</span>
      </button>

      <button type="button" onClick={onQuickLog} className="home-action-card">
        <span className="home-action-card__icon home-action-card__icon--quick" aria-hidden>
          ✎
        </span>
        <span className="home-action-card__body">
          <span className="home-action-card__title">Quick log</span>
          <span className="home-action-card__desc">
            Fast structured entry when you already know the details.
          </span>
        </span>
        <span className="home-action-card__cta">Open form →</span>
      </button>
    </div>
  );
}

function getDailyAffirmation(): { headline: string; body: string } {
  const affirmations = [
    {
      headline: "You're doing great.",
      body: "Every small note helps you see the bigger picture.",
    },
    {
      headline: "Your care makes a difference.",
      body: "Even on hard days, showing up is something to honor.",
    },
    {
      headline: "One moment at a time.",
      body: "You don't have to capture everything perfectly — just what matters now.",
    },
    {
      headline: "Patterns take time.",
      body: "Small logs today can make tomorrow's decisions clearer.",
    },
    {
      headline: "You're not alone in this.",
      body: "Documenting what happened helps you and your care team stay aligned.",
    },
    {
      headline: "Progress isn't linear.",
      body: "A difficult day logged honestly is still a step forward.",
    },
    {
      headline: "Rest is part of care too.",
      body: "Taking a breath before you log is okay — Luma will wait.",
    },
  ];
  const dayIndex = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return affirmations[dayIndex % affirmations.length];
}

function HomeAffirmationCard({ className = "" }: { className?: string }) {
  const { headline, body } = getDailyAffirmation();

  return (
    <div className={`home-affirmation-card${className ? ` ${className}` : ""}`}>
      <div className="home-affirmation-card__content">
        <span className="home-affirmation-card__heart" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <p className="home-affirmation-card__headline">{headline}</p>
        <p className="home-affirmation-card__body">{body}</p>
      </div>
      <div className="home-affirmation-card__scene" aria-hidden>
        <svg className="home-affirmation-card__hills" viewBox="0 0 280 72" preserveAspectRatio="none">
          <path
            d="M0 48 Q70 28 140 44 T280 36 L280 72 L0 72 Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M0 56 Q90 40 180 52 T280 48 L280 72 L0 72 Z"
            fill="currentColor"
            opacity="0.55"
          />
        </svg>
        <svg className="home-affirmation-card__leaves" viewBox="0 0 280 72">
          <ellipse cx="42" cy="58" rx="8" ry="14" fill="currentColor" opacity="0.4" transform="rotate(-25 42 58)" />
          <ellipse cx="58" cy="52" rx="6" ry="11" fill="currentColor" opacity="0.35" transform="rotate(15 58 52)" />
          <ellipse cx="218" cy="54" rx="7" ry="12" fill="currentColor" opacity="0.4" transform="rotate(20 218 54)" />
          <ellipse cx="236" cy="60" rx="9" ry="15" fill="currentColor" opacity="0.35" transform="rotate(-18 236 60)" />
        </svg>
      </div>
    </div>
  );
}

function HomeSidebar() {
  return (
    <aside className="home-sidebar">
      <div className="home-sidebar-card">
        <h3 className="home-sidebar-card__title">Ways to log</h3>
        <ul className="home-sidebar-tips">
          <li>
            <strong>Luma</strong> — best when you want to talk it through and let the draft fill in.
          </li>
          <li>
            <strong>Coach</strong> — best when you want prompts and immediate next-step ideas.
          </li>
          <li>
            <strong>Quick log</strong> — best when you are ready to enter fields directly.
          </li>
        </ul>
      </div>

      <div className="home-sidebar-card home-sidebar-card--links">
        <h3 className="home-sidebar-card__title">Your care record</h3>
        <div className="home-sidebar-links">
          <Link href="/history" className="home-sidebar-link">
            <span>Browse history</span>
            <span aria-hidden>→</span>
          </Link>
          <Link href="/report" className="home-sidebar-link">
            <span>Clinician synopsis</span>
            <span aria-hidden>→</span>
          </Link>
          <Link href="/profile" className="home-sidebar-link">
            <span>Care profile</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <HomeAffirmationCard className="hidden lg:block" />
    </aside>
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

  const modeSubtitle =
    mode === "coach"
      ? "Log an incident, reflect on triggers, and get guided next steps."
      : mode === "luma"
        ? "Talk with Luma — she'll help capture what happened in your own words."
        : mode === "quick"
          ? "Enter the details directly when you already know what to record."
          : null;

  return (
    <div className="home-shell">
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

      {mode === null ? (
        <div className="home-dashboard">
          <div className="home-dashboard__main">
            <header className="home-hero">
              <p className="home-hero__eyebrow">{formatTodayDate()}</p>
              <h1 className="home-hero__title">{getTimeGreeting()}</h1>
              <p className="home-hero__lead">
                Something happened? Choose how you&apos;d like to log it — then review patterns in
                your history or synopsis.
              </p>
            </header>

            <HomeActionCards
              onLuma={() => setMode("luma")}
              onCoach={() => setMode("coach")}
              onQuickLog={openQuickLog}
            />

            <TodayLogsPanel
              logs={todayLogs}
              onQuickLog={openQuickLog}
              customBehaviorLabels={customBehaviorLabels}
            />

            <div className="lg:hidden">
              <HomeAffirmationCard />
            </div>
          </div>

          <HomeSidebar />
        </div>
      ) : (
        <div className="home-active-flow">
          <header className="home-flow-header">
            <button type="button" onClick={() => setMode(null)} className="home-flow-back">
              ← Back to Today
            </button>
            <div>
              <h1 className="home-flow-title">
                {mode === "luma" ? "Talk with Luma" : mode === "coach" ? "Coach me now" : "Quick log"}
              </h1>
              {modeSubtitle && <p className="home-flow-subtitle">{modeSubtitle}</p>}
            </div>
          </header>

          {mode === "luma" && (
            <LumaCompanion
              customBehaviors={customBehaviors}
              onClose={() => setMode(null)}
              onBehaviorsUpdated={(behaviors) => {
                setCustomBehaviors(behaviors);
                setCustomBehaviorLabels(
                  Object.fromEntries(behaviors.map((b) => [b.code, b.label]))
                );
              }}
            />
          )}
          {mode === "coach" && (
            <CoachWizard onClose={() => setMode(null)} onQuickLog={openQuickLog} />
          )}
          {mode === "quick" && <QuickLogForm onClose={() => setMode(null)} />}
        </div>
      )}
    </div>
  );
}
