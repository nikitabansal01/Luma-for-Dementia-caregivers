/**
 * Caregiver-friendly labels → standardized uppercase codes for trigger type.
 * DB stores only codes. UI shows labels.
 */

export const TRIGGER_LABEL_TO_CODE: Record<string, string> = {
  "During a specific activity or event (e.g., bath time)": "EVENT",
  "Something in the environment (noise, lighting, visitors)": "ENVIRONMENT",
  "Trying to communicate a need (pain, hunger, bathroom, boredom)": "UNMET_NEED",
  "Part of disease progression (may be unavoidable)": "UNAVOIDABLE",
  "Not sure what caused it": "UNKNOWN",
};

export const TRIGGER_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TRIGGER_LABEL_TO_CODE).map(([label, code]) => [code, label])
);

/** All trigger codes (for validation and dropdowns). */
export const TRIGGER_CODES = [
  "EVENT",
  "ENVIRONMENT",
  "UNMET_NEED",
  "UNAVOIDABLE",
  "UNKNOWN",
] as const;

export type TriggerCode = (typeof TRIGGER_CODES)[number];

/** Options for UI: { label, code } in display order. */
export const TRIGGER_OPTIONS: { label: string; code: string }[] = [
  { label: "During a specific activity or event (e.g., bath time)", code: "EVENT" },
  { label: "Something in the environment (noise, lighting, visitors)", code: "ENVIRONMENT" },
  { label: "Trying to communicate a need (pain, hunger, bathroom, boredom)", code: "UNMET_NEED" },
  { label: "Part of disease progression (may be unavoidable)", code: "UNAVOIDABLE" },
  { label: "Not sure what caused it", code: "UNKNOWN" },
];

export function getTriggerLabel(code: string): string {
  return TRIGGER_CODE_TO_LABEL[code] ?? code;
}
