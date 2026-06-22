import type { ReactNode } from "react";
import type { PatternConfidence, StrategyOutcomeBreakdown } from "./synopsisHelpers";
import { PATTERN_CONFIDENCE_LABELS } from "./synopsisHelpers";

export function CgIcon({ name }: { name: "logs" | "behavior" | "time" | "trigger" | "strategy" | "watch" | "eye" | "repeat" | "adjust" | "note" | "question" }) {
  const paths: Record<string, string> = {
    logs: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h4m-4 4h4",
    behavior: "M22 12h-4l-3 9L9 3l-3 9H2",
    time: "M12 8v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    trigger: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    strategy: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    watch: "M12 9v4m0 4h.01M10.3 4.5l-7.2 12.5A2 2 0 005 20h14a2 2 0 001.9-3l-7.2-12.5a2 2 0 00-3.4 0z",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
    repeat: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
    adjust: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
    note: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    question: "M9.1 9a3 3 0 015.7 1c0 2-3 2-3 4m.9 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <svg className="cg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: PatternConfidence }) {
  return (
    <span className={`cg-confidence cg-confidence--${confidence}`}>
      {PATTERN_CONFIDENCE_LABELS[confidence]}
    </span>
  );
}

export function SeverityMeter({ value, max = 3 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="cg-severity">
      <div className="cg-severity__track" aria-hidden>
        <span className="cg-severity__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="cg-severity__label">{value.toFixed(1)} / {max}</span>
    </div>
  );
}

export function EffectivenessBar({
  helped,
  total,
  variant = "positive",
}: {
  helped: number;
  total: number;
  variant?: "positive" | "negative" | "mixed";
}) {
  const pct = total > 0 ? Math.round((helped / total) * 100) : 0;
  return (
    <div className={`cg-effect-bar cg-effect-bar--${variant}`}>
      <div className="cg-effect-bar__track" aria-hidden>
        <span className="cg-effect-bar__fill" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}

export function strategyHelpLabel(strategy: StrategyOutcomeBreakdown): string {
  if (strategy.isMixed) return "Mixed results";
  const partial = strategy.didNotHelp;
  if (strategy.helped > 0 && partial > 0) {
    return `${strategy.helped + partial} of ${strategy.total} helped or helped a little`;
  }
  if (strategy.helped > 0) return `${strategy.helped} of ${strategy.total} helped`;
  return strategy.summaryLine;
}

export function strategyRethinkLabel(strategy: StrategyOutcomeBreakdown): string {
  if (strategy.madeWorse > 0 && strategy.didNotHelp > 0) {
    return `Did not help in ${strategy.didNotHelp}, made worse in ${strategy.madeWorse}`;
  }
  if (strategy.madeWorse > 0) return `Made worse in ${strategy.madeWorse}`;
  if (strategy.didNotHelp > 0) return `Did not help in ${strategy.didNotHelp}`;
  return "Limited benefit so far";
}

export function DashboardCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cg-card ${className}`.trim()}>
      <h3 className="cg-card__title">{title}</h3>
      {children}
    </section>
  );
}
