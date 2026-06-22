import type { ReportData, SynopsisLogPreview } from "@/src/lib/repo";

/** Realistic placeholder synopsis to preview value for new users. */
export const SAMPLE_SYNOPSIS_REPORT: ReportData = {
  daysWithLogs: 18,
  totalDays: 30,
  totalIncidents: 24,
  careContext:
    "Sample report — adult child caring for a parent with mid-stage Alzheimer's disease, living at home with family support.",
  executiveSummary:
    "Over the last 30 days, 24 incidents were logged across 18 days. The most frequent behavior was wandering. Common trigger patterns included evening transitions, unfamiliar environments, and unmet physical needs. Overall, frequency and severity appear relatively stable compared with the prior period, with more helpful outcomes when redirection and reassurance were tried early.",
  trend: "stable",
  topBehaviors: [
    { behavior: "WANDERING", count: 9, avgSeverity: 2.2 },
    { behavior: "AGITATION_RESTLESSNESS", count: 8, avgSeverity: 2.4 },
    { behavior: "SLEEP_DISRUPTION", count: 4, avgSeverity: 2.0 },
  ],
  previousPeriodComparison: [
    { behavior: "WANDERING", countChange: 1, severityChange: 0.1 },
    { behavior: "AGITATION_RESTLESSNESS", countChange: -2, severityChange: -0.2 },
  ],
  timeOfDayPattern: [
    { period: "Evening", count: 10, percentage: 42 },
    { period: "Afternoon", count: 7, percentage: 29 },
    { period: "Morning", count: 4, percentage: 17 },
    { period: "Night", count: 3, percentage: 12 },
  ],
  topTriggersOverall: [
    { trigger: "TRANSITION", count: 7 },
    { trigger: "SUNDOWNING", count: 6 },
    { trigger: "UNFAMILIAR_PLACE", count: 5 },
    { trigger: "BATHROOM", count: 4 },
  ],
  triggerCategories: [
    { category: "Routine & timing", count: 13 },
    { category: "Physical needs", count: 8 },
    { category: "Environment", count: 6 },
    { category: "Emotional state", count: 5 },
  ],
  topTriggersByBehavior: {
    WANDERING: [
      { trigger: "UNFAMILIAR_PLACE", count: 5 },
      { trigger: "TRANSITION", count: 4 },
    ],
    AGITATION_RESTLESSNESS: [
      { trigger: "SUNDOWNING", count: 6 },
      { trigger: "WAITING_TOO_LONG", count: 3 },
    ],
  },
  strategyOutcomes: {
    helped: 11,
    helpedLittleOrDidNotHelp: 7,
    madeWorse: 1,
    notSure: 5,
  },
  strategiesSummary: [
    {
      strategy: "REDIRECTION",
      totalCount: 9,
      helped: 6,
      unchanged: 2,
      madeWorse: 0,
      notSure: 1,
    },
    {
      strategy: "REASSURANCE",
      totalCount: 8,
      helped: 5,
      unchanged: 2,
      madeWorse: 0,
      notSure: 1,
    },
    {
      strategy: "QUIET_SPACE",
      totalCount: 6,
      helped: 3,
      unchanged: 2,
      madeWorse: 1,
      notSure: 0,
    },
    {
      strategy: "OTHER",
      totalCount: 3,
      helped: 0,
      unchanged: 2,
      madeWorse: 1,
      notSure: 0,
    },
    {
      strategy: "BATHROOM_CHECK",
      totalCount: 5,
      helped: 4,
      unchanged: 1,
      madeWorse: 0,
      notSure: 0,
    },
    {
      strategy: "MUSIC",
      totalCount: 4,
      helped: 2,
      unchanged: 1,
      madeWorse: 0,
      notSure: 1,
    },
  ],
  topHelpfulStrategies: ["REDIRECTION", "REASSURANCE", "BATHROOM_CHECK"],
  helpfulInterventions: [
    { intervention: "REDIRECTION", betterRate: 0.67, totalCount: 9 },
    { intervention: "REASSURANCE", betterRate: 0.63, totalCount: 8 },
  ],
  discussionQuestions: [
    "Could pain, sleep, medication timing, or infection be contributing?",
    "Should we review medication side effects or recent changes?",
    "Could unmet physical needs (pain, hunger, bathroom, fatigue) be driving some of these behaviors?",
    "Evening and sundowning episodes are common — should we adjust routine, lighting, or activity before dinner?",
    "Wandering has come up repeatedly — are there safety steps we should add at home?",
    "Would a brief cognitive or mood review help explain recent agitation patterns?",
  ],
};

export function getSampleSynopsisReport(days: number): ReportData {
  return {
    ...SAMPLE_SYNOPSIS_REPORT,
    totalDays: days,
  };
}

/**
 * MOCK DATA — isolated sample extras not yet derived from real logs.
 * Replace when log previews and profile lines are wired end-to-end.
 */
export const MOCK_SYNOPSIS_EXTRAS = {
  caregiverProfileLine: "Adult child caregiver, logging from home",
  caredForProfileLine: "Parent with moderate Alzheimer's disease, lives at home with family",
  recentMoments: [
    {
      id: "sample-1",
      dateLabel: "Jun 18",
      timeOfDay: "evening",
      behaviorLabel: "Wandering",
      severity: 2,
      outcome: "better",
      notes: "Seemed restless after dinner; walked toward the front door.",
      triggerLabels: ["Evening transition", "Sundowning"],
      strategyLabels: ["Redirection", "Reassurance"],
      recommendedLabels: ["Quiet space"],
    },
    {
      id: "sample-2",
      dateLabel: "Jun 15",
      timeOfDay: "afternoon",
      behaviorLabel: "Agitation / restlessness",
      severity: 3,
      outcome: "same",
      notes: "Upset during a doctor visit in an unfamiliar waiting room.",
      triggerLabels: ["Unfamiliar place", "Waiting too long"],
      strategyLabels: ["Music", "Reassurance"],
      recommendedLabels: [],
    },
    {
      id: "sample-3",
      dateLabel: "Jun 10",
      timeOfDay: "night",
      behaviorLabel: "Sleep disruption",
      severity: 2,
      outcome: "unknown",
      notes: "Awake twice overnight; calm after bathroom check.",
      triggerLabels: ["Bathroom need"],
      strategyLabels: ["Bathroom check"],
      recommendedLabels: ["Bathroom check"],
    },
  ] satisfies SynopsisLogPreview[],
  caregiverNextSteps: [
    "Evenings are a common time in your sample logs — consider what helps before dinner transitions.",
    "Redirection and reassurance show up when outcomes are better; note what you say or do in those observations.",
    "When wandering comes up, jot down where you were and who was home — context helps over time.",
  ],
} as const;
