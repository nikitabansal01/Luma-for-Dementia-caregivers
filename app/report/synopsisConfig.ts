export const SYNOPSIS_PERIOD_OPTIONS = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
] as const;

export type SynopsisTab = "caregiver" | "clinician";

export const SYNOPSIS_TABS: {
  id: SynopsisTab;
  label: string;
  subtitle: string;
  defaultDays: number;
}[] = [
  {
    id: "caregiver",
    label: "For caregivers",
    subtitle: "Patterns and actionable insights from your observations",
    defaultDays: 30,
  },
  {
    id: "clinician",
    label: "For clinicians",
    subtitle: "Observational summary for your care team",
    defaultDays: 180,
  },
];

export const SYNOPSIS_DISCLAIMER =
  "Based on caregiver-entered logs. Not medical advice.";

export const SYNOPSIS_SAMPLE_LABEL = "Sample report";

/** Minimum logged observations before showing the user's real synopsis. */
export const SYNOPSIS_MIN_LOGS_FOR_REAL = 3;

export function logsUntilRealSynopsis(logCount: number): number {
  return Math.max(0, SYNOPSIS_MIN_LOGS_FOR_REAL - logCount);
}

export function periodLabelForDays(days: number): string {
  return SYNOPSIS_PERIOD_OPTIONS.find((option) => option.days === days)?.label ?? `${days} days`;
}
