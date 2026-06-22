/**
 * Coach flow: universal trigger chips, strategy options, and display labels.
 * Client-safe — no DB imports.
 */

export type TriggerChip = { code: string; label: string };

export type TriggerGroup = {
  category: string;
  chips: TriggerChip[];
};

export const COACH_FLOW_TRIGGER_GROUPS: TriggerGroup[] = [
  {
    category: "Environment",
    chips: [
      { code: "NOISE", label: "Noise" },
      { code: "CLUTTER", label: "Clutter" },
      { code: "LIGHTING", label: "Lighting" },
      { code: "TEMPERATURE", label: "Temperature" },
      { code: "UNFAMILIAR_PLACE", label: "Unfamiliar place" },
    ],
  },
  {
    category: "Body needs",
    chips: [
      { code: "HUNGER", label: "Hunger" },
      { code: "THIRST", label: "Thirst" },
      { code: "PAIN", label: "Pain" },
      { code: "BATHROOM", label: "Bathroom" },
      { code: "FATIGUE", label: "Fatigue" },
    ],
  },
  {
    category: "Routine",
    chips: [
      { code: "SCHEDULE_CHANGE", label: "Change in schedule" },
      { code: "WAITING_TOO_LONG", label: "Waiting too long" },
      { code: "TRANSITION", label: "Transition" },
      { code: "MISSED_ACTIVITY", label: "Missed activity" },
    ],
  },
  {
    category: "People",
    chips: [
      { code: "NEW_VISITOR", label: "New visitor" },
      { code: "RAISED_VOICE", label: "Raised voice" },
      { code: "TOO_MANY_PEOPLE", label: "Too many people" },
      { code: "CAREGIVER_CHANGE", label: "Caregiver change" },
    ],
  },
  {
    category: "Time",
    chips: [
      { code: "MORNING", label: "Morning" },
      { code: "AFTERNOON", label: "Afternoon" },
      { code: "EVENING", label: "Evening" },
      { code: "NIGHTTIME", label: "Nighttime" },
      { code: "SUNDOWNING", label: "Sundowning" },
    ],
  },
  {
    category: "Emotional",
    chips: [
      { code: "CONFUSION", label: "Confusion" },
      { code: "FEAR", label: "Fear" },
      { code: "BOREDOM", label: "Boredom" },
      { code: "LONELINESS", label: "Loneliness" },
      { code: "OVERSTIMULATION", label: "Overstimulation" },
    ],
  },
  {
    category: "Unknown",
    chips: [{ code: "UNKNOWN", label: "Unknown" }],
  },
];

export type StrategyOption = { code: string; label: string };

export const COACH_FLOW_STRATEGIES: StrategyOption[] = [
  { code: "REASSURANCE", label: "Reassurance" },
  { code: "QUIET_SPACE", label: "Quiet space" },
  { code: "MUSIC", label: "Music" },
  { code: "SNACK_DRINK", label: "Snack or drink" },
  { code: "BATHROOM_CHECK", label: "Bathroom check" },
  { code: "PAIN_CHECK", label: "Pain/discomfort check" },
  { code: "REDIRECTION", label: "Redirection" },
  { code: "FAVORITE_ACTIVITY", label: "Favorite activity" },
  { code: "SHORT_WALK", label: "Short walk" },
  { code: "REDUCED_NOISE", label: "Reduced noise" },
  { code: "CALLED_HELP", label: "Called someone for help" },
  { code: "DID_NOT_TRY", label: "Did not try anything yet" },
  { code: "OTHER", label: "Other" },
];

export const DID_NOT_TRY_CODE = "DID_NOT_TRY";

export function isCustomStrategyCode(code: string): boolean {
  return code.startsWith("CUSTOM_STRATEGY_");
}

export type CoachOutcomeUi =
  | "helped"
  | "helped_little"
  | "did_not_help"
  | "made_worse"
  | "not_sure"
  | "not_applicable";

export const COACH_OUTCOME_OPTIONS: { value: CoachOutcomeUi; label: string }[] = [
  { value: "helped", label: "Helped" },
  { value: "helped_little", label: "Helped a little" },
  { value: "did_not_help", label: "Did not help" },
  { value: "made_worse", label: "Made it worse" },
  { value: "not_sure", label: "Not sure yet" },
  { value: "not_applicable", label: "Not applicable / did not try yet" },
];

const TRIGGER_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  COACH_FLOW_TRIGGER_GROUPS.flatMap((g) => g.chips.map((c) => [c.code, c.label]))
);

const STRATEGY_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  COACH_FLOW_STRATEGIES.map((s) => [s.code, s.label])
);

export function isCoachFlowTriggerCode(code: string): boolean {
  return code in TRIGGER_CODE_TO_LABEL;
}

export function getCoachFlowTriggerLabel(code: string): string {
  return TRIGGER_CODE_TO_LABEL[code] ?? code;
}

export function getStrategyLabel(code: string, customStrategyLabels?: Record<string, string>): string {
  if (customStrategyLabels?.[code]) return customStrategyLabels[code];
  return STRATEGY_CODE_TO_LABEL[code] ?? code;
}

export function strategyCodesToLabels(
  codes: string[],
  customStrategyLabels?: Record<string, string>
): string[] {
  return codes.map((code) => getStrategyLabel(code, customStrategyLabels));
}

export function mapCoachOutcomeToDb(
  outcome: CoachOutcomeUi
): "better" | "same" | "worse" | "unknown" {
  switch (outcome) {
    case "helped":
      return "better";
    case "helped_little":
    case "did_not_help":
      return "same";
    case "made_worse":
      return "worse";
    case "not_sure":
    case "not_applicable":
      return "unknown";
  }
}

export const COACH_OUTCOME_DETAIL_PREFIX = "coach_outcome:";

export function encodeCoachOutcomeDetail(outcome: CoachOutcomeUi): string {
  return `${COACH_OUTCOME_DETAIL_PREFIX}${outcome}`;
}

export function parseCoachOutcomeFromDetail(detail: string | null | undefined): CoachOutcomeUi | null {
  if (!detail?.startsWith(COACH_OUTCOME_DETAIL_PREFIX)) return null;
  const value = detail.slice(COACH_OUTCOME_DETAIL_PREFIX.length);
  return COACH_OUTCOME_OPTIONS.some((o) => o.value === value) ? (value as CoachOutcomeUi) : null;
}

export function getCoachOutcomeLabel(outcome: CoachOutcomeUi): string {
  return COACH_OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome;
}
