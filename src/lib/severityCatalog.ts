/**
 * Severity levels for logging — client-safe.
 */

export type SeverityTone = "mild" | "moderate" | "severe";

export type SeverityOption = {
  value: 1 | 2 | 3;
  label: string;
  hint: string;
  emoji: string;
  tone: SeverityTone;
};

export const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    value: 1,
    label: "Mild",
    hint: "Manageable",
    emoji: "🙂",
    tone: "mild",
  },
  {
    value: 2,
    label: "Moderate",
    hint: "Distressing",
    emoji: "😐",
    tone: "moderate",
  },
  {
    value: 3,
    label: "Severe",
    hint: "Very challenging",
    emoji: "☹️",
    tone: "severe",
  },
];

export function getSeverityOption(severity: number): SeverityOption | undefined {
  return SEVERITY_OPTIONS.find((o) => o.value === severity);
}

export function getSeverityLabel(severity: number): string {
  return getSeverityOption(severity)?.label ?? `Level ${severity}`;
}

export function getSeverityEmoji(severity: number): string {
  return getSeverityOption(severity)?.emoji ?? "";
}

export function getSeverityDisplay(severity: number): string {
  const option = getSeverityOption(severity);
  if (!option) return `Level ${severity}`;
  return `${option.emoji} ${option.label}`;
}
