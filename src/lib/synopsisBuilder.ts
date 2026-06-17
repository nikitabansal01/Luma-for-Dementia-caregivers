/**
 * Pure helpers for clinician synopsis narrative and questions.
 */

import { getBehaviorLabel } from "./behaviorMap";
import { COACH_FLOW_TRIGGER_GROUPS, getCoachFlowTriggerLabel, isCoachFlowTriggerCode } from "./coachFlowCatalog";
import { getTriggerLabelByCode, TRIGGER_CATEGORIES, getTriggerOptionsForBehavior } from "./triggerCatalog";

export type SynopsisTrend = "stable" | "improving" | "worsening" | "insufficient_data";

export type StrategyOutcomeCounts = {
  helped: number;
  helpedLittleOrDidNotHelp: number;
  madeWorse: number;
  notSure: number;
};

export function getTriggerCategoryLabel(code: string, behaviorCode: string): string {
  if (isCoachFlowTriggerCode(code)) {
    const group = COACH_FLOW_TRIGGER_GROUPS.find((g) => g.chips.some((c) => c.code === code));
    return group?.category ?? "Other";
  }
  const opts = getTriggerOptionsForBehavior(behaviorCode);
  const found = opts.find((o) => o.trigger_code === code);
  if (found) return TRIGGER_CATEGORIES[found.trigger_type]?.label ?? "Other";
  return "Other";
}

export function getTriggerDisplayLabel(code: string, behaviorCode: string): string {
  if (isCoachFlowTriggerCode(code)) return getCoachFlowTriggerLabel(code);
  return getTriggerLabelByCode(code, behaviorCode);
}

export function getTimeOfDayPeriod(iso: string): "Morning" | "Afternoon" | "Evening" | "Night" {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

export function computeTrend(
  currentCount: number,
  currentAvgSeverity: number,
  prevCount: number,
  prevAvgSeverity: number
): SynopsisTrend {
  if (currentCount < 2 && prevCount < 2) return "insufficient_data";
  const countDelta = currentCount - prevCount;
  const severityDelta = currentAvgSeverity - prevAvgSeverity;
  if (countDelta <= -2 && severityDelta <= 0.1) return "improving";
  if (countDelta >= 2 || severityDelta >= 0.3) return "worsening";
  if (countDelta <= -1 && severityDelta <= 0) return "improving";
  if (countDelta >= 1 && severityDelta >= 0.15) return "worsening";
  return "stable";
}

function trendPhrase(trend: SynopsisTrend): string {
  switch (trend) {
    case "improving":
      return "appear to be improving compared with the prior period";
    case "worsening":
      return "may be increasing in frequency or severity compared with the prior period";
    case "insufficient_data":
      return "are still limited — more logs over time will clarify patterns";
    default:
      return "appear relatively stable compared with the prior period";
  }
}

type ExecutiveSummaryInput = {
  days: number;
  totalIncidents: number;
  topBehaviorCode: string | null;
  topTriggerLabels: string[];
  trend: SynopsisTrend;
};

export function buildExecutiveSummary(input: ExecutiveSummaryInput): string {
  const { days, totalIncidents, topBehaviorCode, topTriggerLabels, trend } = input;
  if (totalIncidents === 0) {
    return `No incidents were logged in the last ${days} days. Continued logging can help you and your care team spot patterns before appointments.`;
  }

  const behaviorPart = topBehaviorCode
    ? `The most frequent behavior was ${getBehaviorLabel(topBehaviorCode).toLowerCase()}`
    : "Several behaviors were noted";

  const triggerPart =
    topTriggerLabels.length > 0
      ? `Common trigger patterns included ${topTriggerLabels.slice(0, 3).join(", ").toLowerCase()}`
      : "Trigger patterns were not consistently recorded";

  return `Over the last ${days} days, ${totalIncidents} incident${totalIncidents === 1 ? "" : "s"} were logged. ${behaviorPart}. ${triggerPart}. Overall, frequency and severity ${trendPhrase(trend)}.`;
}

type DiscussionInput = {
  triggerCategories: Array<{ category: string; count: number }>;
  timeOfDayPattern: Array<{ period: string; count: number }>;
  topBehaviors: Array<{ behavior: string; count: number }>;
  trend: SynopsisTrend;
  avgSeverity: number;
};

const BASE_QUESTIONS = [
  "Could pain, sleep, medication timing, or infection be contributing?",
  "Should we review medication side effects or recent changes?",
];

export function buildDiscussionQuestions(input: DiscussionInput): string[] {
  const questions = new Set<string>(BASE_QUESTIONS);

  const topCategory = input.triggerCategories[0]?.category.toLowerCase() ?? "";
  if (topCategory.includes("body") || topCategory.includes("need") || topCategory.includes("discomfort")) {
    questions.add("Could unmet physical needs (pain, hunger, bathroom, fatigue) be driving some of these behaviors?");
  }

  const eveningCount = input.timeOfDayPattern.find((p) => p.period === "Evening")?.count ?? 0;
  const nightCount = input.timeOfDayPattern.find((p) => p.period === "Night")?.count ?? 0;
  const overnightCount = input.timeOfDayPattern.find((p) => p.period === "Overnight")?.count ?? 0;
  const totalTime = input.timeOfDayPattern.reduce((s, p) => s + p.count, 0);
  if (totalTime > 0 && (eveningCount + nightCount + overnightCount) / totalTime >= 0.4) {
    questions.add("Are these behaviors consistent with sundowning?");
  }

  if (input.topBehaviors.some((b) => b.behavior.includes("SLEEP"))) {
    questions.add("Would a sleep evaluation or adjusted evening routine be worth discussing?");
  }

  if (input.trend === "worsening" || input.avgSeverity >= 2.3) {
    questions.add("What safety planning is recommended if severity increases?");
  }

  return Array.from(questions);
}

export function countStrategyOutcomes<T extends { outcome: string }>(
  logs: T[],
  hasStrategy: (log: T) => boolean
): StrategyOutcomeCounts {
  const counts: StrategyOutcomeCounts = {
    helped: 0,
    helpedLittleOrDidNotHelp: 0,
    madeWorse: 0,
    notSure: 0,
  };
  for (const log of logs) {
    if (!hasStrategy(log)) continue;
    if (log.outcome === "better") counts.helped++;
    else if (log.outcome === "worse") counts.madeWorse++;
    else if (log.outcome === "same") counts.helpedLittleOrDidNotHelp++;
    else counts.notSure++;
  }
  return counts;
}
