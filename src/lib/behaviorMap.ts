/**
 * Caregiver-friendly labels → standardized uppercase codes for behavior type.
 * DB stores only codes. UI shows labels.
 */

export const BEHAVIOR_LABEL_TO_CODE: Record<string, string> = {
  "Agitation / restlessness": "AGITATION_RESTLESSNESS",
  "Repetition / calling out": "REPETITION_CALLING_OUT",
  "Refusing care": "REFUSING_CARE",
  Wandering: "WANDERING",
  "Suspicion / paranoia": "SUSPICION_PARANOIA",
  "Verbal aggression": "VERBAL_AGGRESSION",
  "Physical aggression": "PHYSICAL_AGGRESSION",
  "Withdrawal / crying": "WITHDRAWAL_CRYING",
  "Sleep disruption": "SLEEP_DISRUPTION",
  Other: "OTHER_BEHAVIOR",
};

export const BEHAVIOR_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(BEHAVIOR_LABEL_TO_CODE).map(([label, code]) => [code, label])
);

/** All behavior codes (for validation and dropdowns). */
export const BEHAVIOR_CODES = [
  "AGITATION_RESTLESSNESS",
  "REPETITION_CALLING_OUT",
  "REFUSING_CARE",
  "WANDERING",
  "SUSPICION_PARANOIA",
  "VERBAL_AGGRESSION",
  "PHYSICAL_AGGRESSION",
  "WITHDRAWAL_CRYING",
  "SLEEP_DISRUPTION",
  "OTHER_BEHAVIOR",
] as const;

export type BehaviorCode = (typeof BEHAVIOR_CODES)[number];

/** Short label for compact UI (e.g. history, badges). */
export const BEHAVIOR_CODE_TO_SHORT_LABEL: Record<string, string> = {
  ...BEHAVIOR_CODE_TO_LABEL,
};

/** Options for UI: { label, code } in display order. */
export const BEHAVIOR_OPTIONS: { label: string; code: string }[] = [
  { label: "Agitation / restlessness", code: "AGITATION_RESTLESSNESS" },
  { label: "Repetition / calling out", code: "REPETITION_CALLING_OUT" },
  { label: "Refusing care", code: "REFUSING_CARE" },
  { label: "Wandering", code: "WANDERING" },
  { label: "Suspicion / paranoia", code: "SUSPICION_PARANOIA" },
  { label: "Verbal aggression", code: "VERBAL_AGGRESSION" },
  { label: "Physical aggression", code: "PHYSICAL_AGGRESSION" },
  { label: "Withdrawal / crying", code: "WITHDRAWAL_CRYING" },
  { label: "Sleep disruption", code: "SLEEP_DISRUPTION" },
  { label: "Other", code: "OTHER_BEHAVIOR" },
];

/** Legacy codes (old logs) → readable label for display only. */
const LEGACY_BEHAVIOR_LABELS: Record<string, string> = {
  AGITATION_AGGRESSION: "Agitation / Aggression (legacy)",
  SLEEP_SUNDOWNING: "Sleep disturbance / Sundowning (legacy)",
  MEDICATION_ADHERENCE: "Medication adherence (legacy)",
  FUNCTIONAL_DECLINE: "Functional decline (legacy)",
  AGITATION: "Agitation (legacy)",
  REFUSAL_OF_CARE: "Resisting care (legacy)",
  HALLUCINATIONS: "Seeing/hearing things (legacy)",
  REPETITIVE_QUESTIONING: "Repetitive questioning (legacy)",
  AGGRESSION: "Aggression (legacy)",
  ANXIETY: "Anxiety (legacy)",
  APPETITE_CHANGE: "Appetite change (legacy)",
  SUNDOWNING: "Sundowning (legacy)",
};

export function getBehaviorLabel(code: string): string {
  return BEHAVIOR_CODE_TO_LABEL[code] ?? LEGACY_BEHAVIOR_LABELS[code] ?? code;
}

export function getBehaviorShortLabel(code: string): string {
  return BEHAVIOR_CODE_TO_SHORT_LABEL[code] ?? getBehaviorLabel(code);
}
