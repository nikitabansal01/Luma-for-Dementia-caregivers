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

function EmptyLogsIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14h12M14 19h8M14 24h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M28 28c2-1 4-3 4-5.5 0-2.5-2-4.5-4.5-4.5S23 20 23 22.5c0 2 1.5 3.5 3 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M26 26l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
          <span className="home-today-panel__empty-icon">
            <EmptyLogsIcon />
          </span>
          <p className="home-today-panel__empty-text">
            <span className="home-today-panel__empty-title">No logs for today yet.</span>{" "}
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

      <button type="button" onClick={onLogAnother} className="home-today-panel__add">
        <span aria-hidden>+</span>
        Log another incident
      </button>
    </section>
  );
}

function MicrophoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M6 11a6 6 0 0012 0M12 17v4M8 21h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="5" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 5V4a2 2 0 012-2h2a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
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
      <button type="button" onClick={onLuma} className="home-action-card home-action-card--featured">
        <span className="home-action-card__icon home-action-card__icon--luma" aria-hidden>
          <MicrophoneIcon />
        </span>
        <span className="home-action-card__body">
          <span className="home-action-card__title">Talk with Luma</span>
          <span className="home-action-card__desc">
            Speak or type what happened in your own words — Luma helps you capture the moment and
            build your log.
          </span>
        </span>
        <span className="home-action-card__cta">Start conversation →</span>
        <span className="home-action-card__wave" aria-hidden>
          <svg viewBox="0 0 120 48" preserveAspectRatio="none">
            <path
              d="M0 32 Q30 18 60 28 T120 24 L120 48 L0 48 Z"
              fill="currentColor"
              opacity="0.12"
            />
          </svg>
        </span>
      </button>

      <button type="button" onClick={onCoach} className="home-action-card">
        <span className="home-action-card__icon home-action-card__icon--coach" aria-hidden>
          <ClipboardIcon />
        </span>
        <span className="home-action-card__body">
          <span className="home-action-card__title">Guided check-in</span>
          <span className="home-action-card__desc">
            Walk through a structured check-in — what happened, possible triggers, and ideas for
            what to try next.
          </span>
        </span>
        <span className="home-action-card__cta home-action-card__cta--coach">
          Start guided check-in →
        </span>
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

function ChatBubblesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 3.866-3.582 7-8 7a8.8 8.8 0 01-3.5-.7L3 20l1.2-3.6C3.4 15.1 3 13.6 3 12c0-3.866 3.582-7 8-7s8 3.134 8 7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <div className="home-hero__illustration" aria-hidden>
      <svg className="home-hero__scene" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
        <circle cx="210" cy="42" r="22" fill="#f5e6b8" opacity="0.85" />
        <path
          d="M0 120 Q70 90 140 105 T280 95 L280 160 L0 160 Z"
          fill="#c8dcc8"
          opacity="0.5"
        />
        <path
          d="M0 130 Q90 108 180 122 T280 115 L280 160 L0 160 Z"
          fill="#a8c4a8"
          opacity="0.55"
        />
        <path
          d="M0 140 Q100 125 200 135 T280 128 L280 160 L0 160 Z"
          fill="#8fb08f"
          opacity="0.45"
        />
        <line x1="230" y1="160" x2="230" y2="95" stroke="#5c7c64" strokeWidth="2" />
        <ellipse cx="218" cy="88" rx="10" ry="16" fill="#6b9a6b" opacity="0.7" transform="rotate(-30 218 88)" />
        <ellipse cx="242" cy="82" rx="8" ry="14" fill="#7aad7a" opacity="0.65" transform="rotate(25 242 82)" />
        <ellipse cx="232" cy="72" rx="7" ry="12" fill="#8fbf8f" opacity="0.6" transform="rotate(-5 232 72)" />
      </svg>
    </div>
  );
}

function HomeWelcomeCard() {
  return (
    <header className="home-hero">
      <div className="home-hero__grid">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">{formatTodayDate()}</p>
          <h1 className="home-hero__title">{getTimeGreeting()}</h1>
          <p className="home-hero__lead">
            Talk through a care moment or use a guided check-in to understand what happened, spot
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
                <path d="M9.5 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Your data stays private and secure
            </span>
          </div>
        </div>
        <HeroIllustration />
      </div>
    </header>
  );
}

function HomeSidebar() {
  return (
    <aside className="home-sidebar">
      <div className="home-sidebar-card">
        <h3 className="home-sidebar-card__title">Choose how you want support</h3>
        <ul className="home-sidebar-tips">
          <li className="home-sidebar-tip">
            <span className="home-sidebar-tip__icon home-sidebar-tip__icon--luma" aria-hidden>
              <ChatBubblesIcon />
            </span>
            <span>
              <strong>Talk with Luma</strong> — best when you want to explain what happened naturally.
            </span>
          </li>
          <li className="home-sidebar-tip">
            <span className="home-sidebar-tip__icon home-sidebar-tip__icon--coach" aria-hidden>
              <ClipboardIcon />
            </span>
            <span>
              <strong>Guided check-in</strong> — best when you want a structured path and quick
              next-step ideas.
            </span>
          </li>
        </ul>
      </div>

      <div className="home-sidebar-card home-sidebar-card--links">
        <h3 className="home-sidebar-card__title">Your care record</h3>
        <div className="home-sidebar-links">
          <Link href="/history" className="home-sidebar-link">
            <span className="home-sidebar-link__label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Browse history
            </span>
            <span className="home-sidebar-link__chevron" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </Link>
          <Link href="/report" className="home-sidebar-link">
            <span className="home-sidebar-link__label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              Clinician synopsis
            </span>
            <span className="home-sidebar-link__chevron" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </Link>
          <Link href="/profile" className="home-sidebar-link">
            <span className="home-sidebar-link__label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
                <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 12h4M14 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Care profile
            </span>
            <span className="home-sidebar-link__chevron" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
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
  const [mode, setMode] = useState<"coach" | "luma" | null>(null);
  const [customBehaviors, setCustomBehaviors] = useState(initialCustomBehaviors);
  const [customBehaviorLabels, setCustomBehaviorLabels] = useState(initialCustomBehaviorLabels);

  const showProfileBanner =
    !showOnboarding &&
    careRecipient.onboarding_skipped_at &&
    !careRecipient.onboarding_completed_at;

  const modeSubtitle =
    mode === "coach"
      ? "Walk through a structured check-in — triggers, what you tried, and ideas for next time."
      : mode === "luma"
        ? "Speak or type what happened — Luma helps you capture the moment and build your log."
        : null;

  return (
    <div className="home-shell">
      {showOnboarding && <OnboardingModal recipient={careRecipient} />}

      {showProfileBanner && (
        <div className="onboarding-banner">
          <span className="onboarding-banner__icon" aria-hidden>
            ✦
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
          <div className="home-dashboard__main">
            <HomeWelcomeCard />

            <HomeActionCards onLuma={() => setMode("luma")} onCoach={() => setMode("coach")} />

            <TodayLogsPanel
              logs={todayLogs}
              onLogAnother={() => setMode("luma")}
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
                {mode === "luma" ? "Talk with Luma" : "Guided check-in"}
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
          {mode === "coach" && <CoachWizard onClose={() => setMode(null)} />}
        </div>
      )}
    </div>
  );
}
