import type { ReportData, SynopsisLogPreview } from "@/src/lib/repo";
import { getBehaviorLabel } from "@/src/lib/behaviorMap";
import {
  COACH_FLOW_TRIGGER_GROUPS,
  getStrategyLabel,
  isCoachFlowTriggerCode,
} from "@/src/lib/coachFlowCatalog";
import { getTriggerDisplayLabel, getTriggerCategoryLabel } from "@/src/lib/synopsisBuilder";
import { getTriggerOptionsForBehavior } from "@/src/lib/triggerCatalog";

export function formatLogOutcome(outcome: string): string {
  switch (outcome) {
    case "better":
      return "Helped";
    case "same":
      return "No clear change";
    case "worse":
      return "Made things harder";
    default:
      return "Not sure yet";
  }
}

export function formatTimeOfDay(value: string | null): string | null {
  if (!value || value === "not_sure") return null;
  return value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ");
}

function getTriggerCoachCategory(code: string): string | null {
  if (!isCoachFlowTriggerCode(code)) return null;
  return COACH_FLOW_TRIGGER_GROUPS.find((group) => group.chips.some((chip) => chip.code === code))?.category ?? null;
}

export function isPotentiallyAvoidableTrigger(code: string, behaviorCode: string): boolean {
  if (code === "UNKNOWN") return false;

  const coachCategory = getTriggerCoachCategory(code);
  if (coachCategory) return coachCategory !== "Unknown";

  const option = getTriggerOptionsForBehavior(behaviorCode).find((item) => item.trigger_code === code);
  if (!option) return true;
  return option.trigger_type !== "UNAVOIDABLE" && option.trigger_type !== "UNKNOWN";
}

export type PatternConfidence = "strong" | "early" | "insufficient";

export const PATTERN_CONFIDENCE_LABELS: Record<PatternConfidence, string> = {
  strong: "Strong pattern",
  early: "Early signal",
  insufficient: "Not enough data yet",
};

export function getPatternConfidence(
  count: number,
  context?: { totalDays: number; daysWithLogs: number }
): PatternConfidence {
  if (count <= 0) return "insufficient";
  if (count >= 5) return "strong";
  if (context && context.totalDays >= 14 && context.daysWithLogs >= 7 && count >= 3) {
    return "strong";
  }
  if (count >= 2) return "early";
  return "insufficient";
}

export type CaregiverAvoidableBehavior = {
  behaviorCode: string;
  behaviorLabel: string;
  incidentCount: number;
  confidence: PatternConfidence;
  triggers: Array<{ label: string; count: number; category: string; confidence: PatternConfidence }>;
  insight: string;
};

export type CaregiverTriggerFocus = {
  behaviorCode: string;
  behaviorLabel: string;
  incidentCount: number;
  confidence: PatternConfidence;
  triggers: Array<{ label: string; count: number; confidence: PatternConfidence }>;
};

export type CaregiverWorkingStrategy = {
  code: string;
  label: string;
  helped: number;
  total: number;
  helpRate: number;
};

export type StrategyOutcomeBreakdown = {
  code: string;
  label: string;
  total: number;
  helped: number;
  helpedLittle: number;
  didNotHelp: number;
  madeWorse: number;
  notSure: number;
  summaryLine: string;
  isMixed: boolean;
  isPositive: boolean;
  isRethink: boolean;
  rethinkNote: string | null;
};

export type CaregiverAppointmentQuestion = {
  id: string;
  text: string;
};

function strategyContext(data: ReportData) {
  return { totalDays: data.totalDays, daysWithLogs: data.daysWithLogs };
}

function buildStrategySummaryLine(
  label: string,
  stats: {
    total: number;
    helped: number;
    helpedLittle: number;
    didNotHelp: number;
    madeWorse: number;
    notSure: number;
  }
): { summaryLine: string; isMixed: boolean; isPositive: boolean } {
  const { total, helped, helpedLittle, didNotHelp, madeWorse, notSure } = stats;
  const positiveCount = helped + helpedLittle;
  const nonPositive = didNotHelp + notSure + madeWorse;

  if (madeWorse >= 2 || (madeWorse >= 1 && helped === 0 && helpedLittle === 0)) {
    return { summaryLine: `${label}: mixed response`, isMixed: true, isPositive: false };
  }

  if (helped > 0 && nonPositive >= 2 && helped / total < 0.75) {
    return {
      summaryLine: `${label}: mixed response`,
      isMixed: true,
      isPositive: helped > madeWorse + didNotHelp,
    };
  }

  if (helped > 0 && didNotHelp > 0 && madeWorse === 0) {
    return {
      summaryLine: `${label}: helped or helped a little in ${positiveCount + didNotHelp} of ${total} attempts`,
      isMixed: false,
      isPositive: true,
    };
  }

  if (helped > 0 && madeWorse === 0 && didNotHelp === 0 && notSure === 0) {
    return {
      summaryLine: `${label}: helped in ${helped} of ${total} attempts`,
      isMixed: false,
      isPositive: true,
    };
  }

  if (helped > 0 && madeWorse === 0) {
    return {
      summaryLine: `${label}: helped in ${helped} of ${total} attempts`,
      isMixed: notSure > 0,
      isPositive: true,
    };
  }

  if (positiveCount > 0) {
    return {
      summaryLine: `${label}: mixed response`,
      isMixed: true,
      isPositive: positiveCount > madeWorse + didNotHelp,
    };
  }

  return { summaryLine: `${label}: mixed response`, isMixed: true, isPositive: false };
}

function buildRethinkNote(
  label: string,
  stats: { total: number; helped: number; didNotHelp: number; madeWorse: number }
): string {
  const unhelpful = stats.didNotHelp + stats.madeWorse;
  const labelLower = label.toLowerCase();

  if (stats.madeWorse >= 1 && stats.helped === 0) {
    return `${label} did not help in ${unhelpful} log${unhelpful === 1 ? "" : "s"} and was sometimes followed by escalation. It may be worth trying a different approach next time — you were doing your best with the tools you had.`;
  }

  if (stats.didNotHelp >= 2 && stats.helped <= 1) {
    if (labelLower.includes("redirect")) {
      return `${label} had a mixed response in your logs. When it did not land, try one-step cues or a calm change of focus instead.`;
    }
    return `${label} did not help in ${stats.didNotHelp} log${stats.didNotHelp === 1 ? "" : "s"}. That does not mean you did anything wrong — it may help to try something else when this comes up.`;
  }

  if (stats.madeWorse >= 1) {
    return `${label} was followed by escalation in ${stats.madeWorse} log${stats.madeWorse === 1 ? "" : "s"}. Consider a gentler alternative when you can — what works varies day to day.`;
  }

  return `${label} had limited benefit in your logs so far. It is okay to experiment — note what you try so patterns become clearer.`;
}

export function buildStrategyOutcomeDetails(data: ReportData): StrategyOutcomeBreakdown[] {
  return data.strategiesSummary
    .filter((strategy) => strategy.totalCount > 0 && strategy.strategy !== "DID_NOT_TRY")
    .map((strategy) => {
      const label = getStrategyLabel(strategy.strategy);
      const stats = {
        total: strategy.totalCount,
        helped: strategy.helped,
        helpedLittle: 0,
        didNotHelp: strategy.unchanged,
        madeWorse: strategy.madeWorse,
        notSure: strategy.notSure,
      };
      const { summaryLine, isMixed, isPositive } = buildStrategySummaryLine(label, stats);
      const isRethink =
        strategy.madeWorse >= 1 ||
        (strategy.unchanged >= 2 && strategy.helped <= 1) ||
        (strategy.unchanged > strategy.helped && strategy.unchanged >= 2);

      return {
        code: strategy.strategy,
        label,
        ...stats,
        summaryLine,
        isMixed,
        isPositive: isPositive && strategy.helped >= 1,
        isRethink,
        rethinkNote: isRethink ? buildRethinkNote(label, stats) : null,
      };
    })
    .sort((a, b) => b.helped - a.helped || b.total - a.total);
}

export function buildHelpfulStrategies(data: ReportData): StrategyOutcomeBreakdown[] {
  return buildStrategyOutcomeDetails(data).filter(
    (strategy) => strategy.helped >= 1 && !strategy.isRethink
  );
}

export function buildStrategiesToRethink(data: ReportData): StrategyOutcomeBreakdown[] {
  return buildStrategyOutcomeDetails(data).filter((strategy) => strategy.isRethink);
}

export function buildCaregiverAppointmentQuestions(data: ReportData): CaregiverAppointmentQuestion[] {
  const questions: CaregiverAppointmentQuestion[] = [];
  const seen = new Set<string>();

  function add(id: string, text: string) {
    if (seen.has(text)) return;
    seen.add(text);
    questions.push({ id, text });
  }

  add(
    "physical-meds",
    "Could pain, sleep, bathroom needs, or medication timing be contributing?"
  );

  const hasEvening = data.timeOfDayPattern.some(
    (period) => period.period === "Evening" && period.count > 0
  );
  const hasSundowning = data.topTriggersOverall.some((trigger) => trigger.trigger === "SUNDOWNING");
  if (hasEvening || hasSundowning) {
    add("sundowning", "Are evening episodes consistent with sundowning?");
  }

  const hasWandering = data.topBehaviors.some((behavior) => behavior.behavior === "WANDERING");
  if (hasWandering) {
    add("wandering-approach", "Should we change our approach when wandering starts?");
    add("wandering-safety", "What safety steps should we consider if wandering increases?");
  }

  for (const question of data.discussionQuestions) {
    if (questions.length >= 6) break;
    add(`derived-${questions.length}`, question);
  }

  return questions.slice(0, 6);
}

function buildAvoidableInsight(
  behaviorLabel: string,
  topTrigger: { label: string; category: string }
): string {
  const trigger = topTrigger.label.toLowerCase();
  switch (topTrigger.category) {
    case "Environment":
      return `${topTrigger.label} comes up often before ${behaviorLabel.toLowerCase()} — small changes to noise, lighting, or surroundings are worth trying early.`;
    case "Routine":
      return `${topTrigger.label} is a common lead-in — extra support during those transitions may prevent escalation.`;
    case "Body needs":
      return `${topTrigger.label} shows up a lot — checking comfort needs first sometimes heads off ${behaviorLabel.toLowerCase()}.`;
    case "People":
      return `${topTrigger.label} is often in the picture — who’s in the room and how they approach can matter.`;
    case "Time":
      return `Many observations cluster around ${trigger} — planning ahead for that part of the day may help.`;
    default:
      return `${topTrigger.label} is worth watching — noting what happens just before may reveal a pattern you can plan for.`;
  }
}

export function buildAvoidableBehaviors(data: ReportData): CaregiverAvoidableBehavior[] {
  const context = strategyContext(data);

  return data.topBehaviors.slice(0, 4).flatMap((behavior) => {
    const rawTriggers = data.topTriggersByBehavior[behavior.behavior] ?? [];
    const avoidableTriggers = rawTriggers
      .filter((trigger) => isPotentiallyAvoidableTrigger(trigger.trigger, behavior.behavior))
      .slice(0, 3)
      .map((trigger) => ({
        label: getTriggerDisplayLabel(trigger.trigger, behavior.behavior),
        count: trigger.count,
        category: getTriggerCoachCategory(trigger.trigger) ?? getTriggerCategoryLabel(trigger.trigger, behavior.behavior),
        confidence: getPatternConfidence(trigger.count, context),
      }));

    if (avoidableTriggers.length === 0) return [];

    return [
      {
        behaviorCode: behavior.behavior,
        behaviorLabel: getBehaviorLabel(behavior.behavior),
        incidentCount: behavior.count,
        confidence: getPatternConfidence(behavior.count, context),
        triggers: avoidableTriggers,
        insight: buildAvoidableInsight(getBehaviorLabel(behavior.behavior), avoidableTriggers[0]),
      },
    ];
  });
}

export function buildTriggerFocusList(data: ReportData): CaregiverTriggerFocus[] {
  const context = strategyContext(data);

  return data.topBehaviors.slice(0, 3).map((behavior) => ({
    behaviorCode: behavior.behavior,
    behaviorLabel: getBehaviorLabel(behavior.behavior),
    incidentCount: behavior.count,
    confidence: getPatternConfidence(behavior.count, context),
    triggers: (data.topTriggersByBehavior[behavior.behavior] ?? []).slice(0, 4).map((trigger) => ({
      label: getTriggerDisplayLabel(trigger.trigger, behavior.behavior),
      count: trigger.count,
      confidence: getPatternConfidence(trigger.count, context),
    })),
  }));
}

export function buildWorkingStrategies(data: ReportData): CaregiverWorkingStrategy[] {
  const fromSummary = data.strategiesSummary
    .filter((strategy) => strategy.totalCount > 0)
    .map((strategy) => ({
      code: strategy.strategy,
      label: getStrategyLabel(strategy.strategy),
      helped: strategy.helped,
      total: strategy.totalCount,
      helpRate: strategy.helped / strategy.totalCount,
    }))
    .sort((a, b) => b.helpRate - a.helpRate || b.helped - a.helped);

  if (fromSummary.length > 0) return fromSummary.slice(0, 5);

  return data.topHelpfulStrategies.slice(0, 5).map((code) => ({
    code,
    label: getStrategyLabel(code),
    helped: 0,
    total: 0,
    helpRate: 0,
  }));
}

export function buildCaregiverIntro(data: ReportData): string {
  if (data.totalIncidents === 0) {
    return "Log a few care observations and this page will highlight triggers to watch for and strategies that seem to help — focused on what you can act on at home.";
  }

  const avoidableCount = buildAvoidableBehaviors(data).length;
  const workingCount = buildWorkingStrategies(data).filter((strategy) => strategy.helped > 0).length;

  if (avoidableCount > 0 && workingCount > 0) {
    return `From ${data.totalIncidents} observations you logged, some challenging behaviors often follow triggers you can watch for — and you’ve already found approaches that help. Here’s a practical summary.`;
  }
  if (avoidableCount > 0) {
    return `From ${data.totalIncidents} observations you logged, these behaviors often show up alongside triggers worth paying attention to — small shifts in routine or environment sometimes help.`;
  }
  if (workingCount > 0) {
    return `From ${data.totalIncidents} observations you logged, these strategies stood out as helpful — keep noting when they work so the picture stays clear.`;
  }
  return "Keep logging triggers and what you try — over time this page will highlight what to watch for and what seems to help at home.";
}

/** @deprecated Use buildCaregiverIntro */
export function buildCaregiverPatternSummary(data: ReportData): string {
  return buildCaregiverIntro(data);
}

/** @deprecated Replaced by structured caregiver sections */
export function buildCaregiverNextSteps(data: ReportData): string[] {
  const steps: string[] = [];
  const avoidable = buildAvoidableBehaviors(data)[0];
  if (avoidable) {
    steps.push(avoidable.insight);
  }
  const working = buildWorkingStrategies(data)[0];
  if (working && working.helped > 0) {
    steps.push(`Keep using ${working.label.toLowerCase()} when you can — it’s helped in ${working.helped} of ${working.total} tries you logged.`);
  }
  if (steps.length === 0) {
    steps.push("When you log, note what was happening just before and what you tried — that makes this summary more useful.");
  }
  return steps.slice(0, 3);
}

export type CaregiverGlanceStat = {
  id: string;
  icon: "logs" | "behavior" | "time" | "trigger" | "strategy" | "watch";
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning";
  isNumeric?: boolean;
};

export type CaregiverBehaviorRow = {
  behaviorCode: string;
  label: string;
  count: number;
  avgSeverity: number;
  peakTime: string | null;
  confidence: PatternConfidence;
};

export type ReducibleTrigger = {
  triggerCode: string;
  label: string;
  count: number;
  confidence: PatternConfidence;
  linkedBehaviors: string[];
};

export type TryNextMonthTip = {
  id: string;
  verb: "Watch for" | "Repeat" | "Adjust" | "Note";
  detail: string;
};

const TIME_TRIGGER_HINTS: Record<string, string> = {
  SUNDOWNING: "Evening",
  EVENING: "Evening",
  NIGHTTIME: "Night",
  NIGHT: "Night",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
};

function inferBehaviorPeakTime(
  behaviorCode: string,
  triggers: Array<{ trigger: string }>
): string | null {
  for (const { trigger } of triggers) {
    const mapped = TIME_TRIGGER_HINTS[trigger];
    if (mapped) return mapped;
  }
  return null;
}

function buildWatchAreaLabel(data: ReportData): { value: string } {
  const top = data.topBehaviors[0];
  const hasWandering = data.topBehaviors.some((b) => b.behavior === "WANDERING");

  if (data.trend === "worsening" && top) {
    const name = getBehaviorLabel(top.behavior);
    return { value: `${name} increased` };
  }
  if (hasWandering) {
    return { value: "Wandering pattern" };
  }
  if (top && top.avgSeverity >= 2.5) {
    return { value: `${getBehaviorLabel(top.behavior)} severity` };
  }
  const peak = data.timeOfDayPattern[0];
  if (peak) {
    return { value: `${peak.period} peak` };
  }
  return { value: "Keep noting triggers" };
}

export function buildCaregiverGlanceStats(data: ReportData): CaregiverGlanceStat[] {
  const topBehavior = data.topBehaviors[0];
  const peakTime = data.timeOfDayPattern[0];
  const topTrigger = data.topTriggersOverall[0];
  const helpfulStrategies = buildHelpfulStrategies(data).slice(0, 2);
  const watch = buildWatchAreaLabel(data);
  const primaryBehaviorCode = topBehavior?.behavior ?? "OTHER_BEHAVIOR";

  const strategyValue =
    helpfulStrategies.length >= 2
      ? helpfulStrategies.map((s) => s.label).join(" + ")
      : helpfulStrategies[0]?.label ?? "—";

  return [
    {
      id: "logs",
      icon: "logs",
      label: "Care observations logged",
      value: String(data.totalIncidents),
      tone: "neutral",
      isNumeric: true,
    },
    {
      id: "behavior",
      icon: "behavior",
      label: "Most common behavior",
      value: topBehavior ? getBehaviorLabel(topBehavior.behavior) : "—",
      tone: "neutral",
    },
    {
      id: "time",
      icon: "time",
      label: "Most common time of day",
      value: peakTime?.period ?? "—",
      tone: "neutral",
    },
    {
      id: "trigger",
      icon: "trigger",
      label: "Most repeated trigger",
      value: topTrigger
        ? getTriggerDisplayLabel(topTrigger.trigger, primaryBehaviorCode)
        : "—",
      tone: "neutral",
    },
    {
      id: "strategy",
      icon: "strategy",
      label: "Most helpful strategy",
      value: strategyValue,
      tone: "positive",
    },
    {
      id: "watch",
      icon: "watch",
      label: "Watch area",
      value: watch.value,
      tone: "warning",
    },
  ];
}

export type CaregiverHighlightChip = {
  id: "watch" | "strategy";
  label: string;
  value: string;
};

/** Plain-language headline for the caregiver synopsis — one story, not six metrics. */
export function buildCaregiverPeriodSummary(data: ReportData): string {
  if (data.totalIncidents === 0) {
    return buildCaregiverIntro(data);
  }

  const topBehavior = data.topBehaviors[0];
  const peakTime = data.timeOfDayPattern[0];
  const topTrigger = data.topTriggersOverall[0];
  const helpful = buildHelpfulStrategies(data)[0];
  const primaryBehaviorCode = topBehavior?.behavior ?? "OTHER_BEHAVIOR";

  const lead = topBehavior
    ? `${getBehaviorLabel(topBehavior.behavior)} showed up most often`
    : "A few patterns stood out from your logs";

  let context = "";
  if (peakTime && topTrigger) {
    const triggerLabel = getTriggerDisplayLabel(topTrigger.trigger, primaryBehaviorCode).toLowerCase();
    context = `, especially in the ${peakTime.period.toLowerCase()} around ${triggerLabel}`;
  } else if (peakTime) {
    context = `, especially in the ${peakTime.period.toLowerCase()}`;
  } else if (topTrigger) {
    context = `, often around ${getTriggerDisplayLabel(topTrigger.trigger, primaryBehaviorCode).toLowerCase()}`;
  }

  const strategyNote = helpful ? ` ${helpful.label} helped most.` : "";

  return `${lead}${context}.${strategyNote}`.replace(/\.\./g, ".");
}

export function buildCaregiverHighlightChips(data: ReportData): CaregiverHighlightChip[] {
  if (data.totalIncidents === 0) return [];

  const chips: CaregiverHighlightChip[] = [];
  const peakTime = data.timeOfDayPattern[0];
  const topTrigger = data.topTriggersOverall[0];
  const primaryBehaviorCode = data.topBehaviors[0]?.behavior ?? "OTHER_BEHAVIOR";
  const watch = buildWatchAreaLabel(data);

  let watchValue = watch.value;
  if (peakTime && topTrigger) {
    watchValue = `${peakTime.period} ${getTriggerDisplayLabel(topTrigger.trigger, primaryBehaviorCode).toLowerCase()}`;
  }

  chips.push({ id: "watch", label: "Watch", value: watchValue });

  const helpful = buildHelpfulStrategies(data)[0];
  if (helpful) {
    chips.push({ id: "strategy", label: "Helpful", value: helpful.label });
  }

  return chips.slice(0, 2);
}

export function buildCaregiverBehaviorRows(data: ReportData): CaregiverBehaviorRow[] {
  const context = strategyContext(data);
  const fallbackTime = data.timeOfDayPattern[0]?.period ?? null;

  return data.topBehaviors.slice(0, 5).map((behavior) => {
    const triggers = data.topTriggersByBehavior[behavior.behavior] ?? [];
    return {
      behaviorCode: behavior.behavior,
      label: getBehaviorLabel(behavior.behavior),
      count: behavior.count,
      avgSeverity: behavior.avgSeverity,
      peakTime: inferBehaviorPeakTime(behavior.behavior, triggers) ?? fallbackTime,
      confidence: getPatternConfidence(behavior.count, context),
    };
  });
}

export function buildReducibleTriggers(data: ReportData): ReducibleTrigger[] {
  const context = strategyContext(data);

  return data.topTriggersOverall
    .filter((trigger) => {
      const sampleBehavior =
        data.topBehaviors.find((b) =>
          (data.topTriggersByBehavior[b.behavior] ?? []).some((t) => t.trigger === trigger.trigger)
        )?.behavior ?? data.topBehaviors[0]?.behavior ?? "OTHER_BEHAVIOR";
      return isPotentiallyAvoidableTrigger(trigger.trigger, sampleBehavior);
    })
    .slice(0, 5)
    .map((trigger) => {
      const linkedBehaviors = data.topBehaviors
        .filter((b) =>
          (data.topTriggersByBehavior[b.behavior] ?? []).some((t) => t.trigger === trigger.trigger)
        )
        .slice(0, 3)
        .map((b) => getBehaviorLabel(b.behavior));

      return {
        triggerCode: trigger.trigger,
        label: getTriggerDisplayLabel(
          trigger.trigger,
          data.topBehaviors[0]?.behavior ?? "OTHER_BEHAVIOR"
        ),
        count: trigger.count,
        confidence: getPatternConfidence(trigger.count, context),
        linkedBehaviors,
      };
    });
}

export function buildTryNextMonthTips(data: ReportData): TryNextMonthTip[] {
  const tips: TryNextMonthTip[] = [];
  const avoidable = buildAvoidableBehaviors(data);
  const helpful = buildHelpfulStrategies(data).slice(0, 2);
  const peakTime = data.timeOfDayPattern[0];
  const topTrigger = buildReducibleTriggers(data)[0];

  if (topTrigger) {
    tips.push({
      id: "watch-trigger",
      verb: "Watch for",
      detail: `${topTrigger.label.toLowerCase()}${peakTime ? `, especially in the ${peakTime.period.toLowerCase()}` : ""}.`,
    });
  } else if (peakTime) {
    tips.push({
      id: "watch-time",
      verb: "Watch for",
      detail: `Harder observations in the ${peakTime.period.toLowerCase()} — plan extra support then.`,
    });
  }

  if (helpful.length > 0) {
    tips.push({
      id: "repeat-strategy",
      verb: "Repeat",
      detail: helpful.map((s) => s.label.toLowerCase()).join(" and ") + " when similar situations come up.",
    });
  }

  const rethink = buildStrategiesToRethink(data)[0];
  if (rethink) {
    tips.push({
      id: "adjust-strategy",
      verb: "Adjust",
      detail: `If ${rethink.label.toLowerCase()} is not landing, try a gentler alternative and note the outcome.`,
    });
  } else if (avoidable[0]) {
    tips.push({
      id: "adjust-routine",
      verb: "Adjust",
      detail: avoidable[0].insight.replace(/^[^—]+—\s*/, "").slice(0, 120),
    });
  }

  if (tips.length < 3) {
    tips.push({
      id: "note-more",
      verb: "Note",
      detail: "Triggers and what you tried — even quick notes sharpen this summary.",
    });
  }

  return tips.slice(0, 4);
}

export function getTimePillClass(period: string | null): string {
  if (!period) return "cg-time-pill--neutral";
  const key = period.toLowerCase();
  if (key.includes("evening") || key.includes("night")) return "cg-time-pill--evening";
  if (key.includes("morning")) return "cg-time-pill--morning";
  if (key.includes("afternoon")) return "cg-time-pill--afternoon";
  return "cg-time-pill--neutral";
}

export function buildClinicianCoverageNote(data: ReportData): string {
  const coverage =
    data.totalDays > 0 ? Math.round((data.daysWithLogs / data.totalDays) * 100) : 0;
  return `${data.totalIncidents} caregiver-logged observations across ${data.daysWithLogs} of ${data.totalDays} days (${coverage}% day coverage). Observational data only.`;
}

export function trendClinicianLabel(trend: ReportData["trend"]): string {
  switch (trend) {
    case "improving":
      return "Fewer or milder logged incidents vs prior period";
    case "worsening":
      return "More frequent or severe logged incidents vs prior period";
    case "stable":
      return "Similar frequency and severity vs prior period";
    default:
      return "Insufficient prior-period data for trend comparison";
  }
}

export type SynopsisProfileLines = {
  fullContext: string | null;
  caregiverLine: string | null;
  caredForLine: string | null;
};

export function hasLogPreviewContent(log: SynopsisLogPreview): boolean {
  return Boolean(
    log.notes ||
      log.triggerLabels.length > 0 ||
      log.strategyLabels.length > 0 ||
      log.recommendedLabels.length > 0
  );
}
