/**
 * Behavior-specific trigger options for reflection.
 * Each option has: trigger_code, label (caregiver-friendly), trigger_type (taxonomy).
 * Triggers are grouped into 4 categories for quick scanning.
 * MVP: 4 behavioral categories with track-focused trigger labels.
 */

import { getCoachFlowTriggerLabel, isCoachFlowTriggerCode } from "./coachFlowCatalog";

export type TriggerOption = {
  trigger_code: string;
  label: string;
  trigger_type: "EVENT" | "ENVIRONMENT" | "UNMET_NEED" | "UNAVOIDABLE" | "UNKNOWN";
};

/** Category labels for grouping triggers (event-based, environment, need-based, other). */
export const TRIGGER_CATEGORIES: Record<
  string,
  { id: string; label: string }
> = {
  EVENT: { id: "event", label: "Event or activity" },
  ENVIRONMENT: { id: "environment", label: "Environment" },
  UNMET_NEED: { id: "need", label: "Need or discomfort" },
  UNAVOIDABLE: { id: "other", label: "Disease progression or unclear" },
  UNKNOWN: { id: "other", label: "Disease progression or unclear" },
};

/** Display order for categories. */
const CATEGORY_ORDER = ["event", "environment", "need", "other"] as const;

/** Emoji per category for quicker scanning. */
export const TRIGGER_CATEGORY_EMOJI: Record<string, string> = {
  event: "📌",
  environment: "🏠",
  need: "💬",
  other: "❓",
};

export function getTriggerCategoryEmoji(categoryId: string): string {
  return TRIGGER_CATEGORY_EMOJI[categoryId] ?? "";
}

export type TriggerOptionGroup = {
  categoryId: string;
  categoryLabel: string;
  options: TriggerOption[];
};

/** Returns trigger options for a behavior, grouped by category for UI. */
export function getTriggerOptionsByCategory(
  behaviorCode: string
): TriggerOptionGroup[] {
  const options = getTriggerOptionsForBehavior(behaviorCode);
  const byCategory = new Map<string, TriggerOption[]>();
  for (const opt of options) {
    const cat = TRIGGER_CATEGORIES[opt.trigger_type];
    const id = cat?.id ?? "other";
    if (!byCategory.has(id)) byCategory.set(id, []);
    byCategory.get(id)!.push(opt);
  }
  return CATEGORY_ORDER.filter((id) => byCategory.has(id)).map((id) => {
    const opts = byCategory.get(id)!;
    const categoryLabel =
      TRIGGER_CATEGORIES[opts[0].trigger_type]?.label ?? "Other";
    return { categoryId: id, categoryLabel, options: opts };
  });
}

/** Trigger options per behavior_code. Track-focused labels for MVP. */
export const TRIGGER_CATALOG: Record<string, TriggerOption[]> = {
  AGITATION_AGGRESSION: [
    { trigger_code: "EVENT", label: "During a specific activity (e.g. bath, meal)", trigger_type: "EVENT" },
    { trigger_code: "ENVIRONMENT", label: "Noise, crowding, or invasion of space", trigger_type: "ENVIRONMENT" },
    { trigger_code: "UNMET_NEED", label: "Pain, fear, or feeling controlled", trigger_type: "UNMET_NEED" },
    { trigger_code: "UNAVOIDABLE", label: "Reaction that’s hard to prevent", trigger_type: "UNAVOIDABLE" },
    { trigger_code: "UNKNOWN", label: "Not sure", trigger_type: "UNKNOWN" },
  ],
  SLEEP_SUNDOWNING: [
    { trigger_code: "EVENT", label: "Night awakenings or after a change", trigger_type: "EVENT" },
    { trigger_code: "ENVIRONMENT", label: "Less light or more noise in evening", trigger_type: "ENVIRONMENT" },
    { trigger_code: "UNMET_NEED", label: "Pain, need to toilet, or thirst", trigger_type: "UNMET_NEED" },
    { trigger_code: "UNAVOIDABLE", label: "Day-night reversal or sleep pattern changes", trigger_type: "UNAVOIDABLE" },
    { trigger_code: "UNKNOWN", label: "Not sure", trigger_type: "UNKNOWN" },
  ],
  MEDICATION_ADHERENCE: [
    { trigger_code: "EVENT", label: "Missed doses or new med / dose change", trigger_type: "EVENT" },
    { trigger_code: "ENVIRONMENT", label: "Routine or setting change", trigger_type: "ENVIRONMENT" },
    { trigger_code: "UNMET_NEED", label: "Drowsiness, dizziness, or GI issues", trigger_type: "UNMET_NEED" },
    { trigger_code: "UNAVOIDABLE", label: "Known side effect or part of treatment", trigger_type: "UNAVOIDABLE" },
    { trigger_code: "UNKNOWN", label: "Not sure", trigger_type: "UNKNOWN" },
  ],
  FUNCTIONAL_DECLINE: [
    { trigger_code: "EVENT", label: "Dressing, bathing, or eating", trigger_type: "EVENT" },
    { trigger_code: "ENVIRONMENT", label: "Unfamiliar setting or change in routine", trigger_type: "ENVIRONMENT" },
    { trigger_code: "UNMET_NEED", label: "More assistance required", trigger_type: "UNMET_NEED" },
    { trigger_code: "UNAVOIDABLE", label: "Mobility or stage changes", trigger_type: "UNAVOIDABLE" },
    { trigger_code: "UNKNOWN", label: "Not sure", trigger_type: "UNKNOWN" },
  ],
  OTHER_BEHAVIOR: [
    { trigger_code: "EVENT", label: "During a specific activity or event", trigger_type: "EVENT" },
    { trigger_code: "ENVIRONMENT", label: "Something in the environment", trigger_type: "ENVIRONMENT" },
    { trigger_code: "UNMET_NEED", label: "Trying to communicate a need", trigger_type: "UNMET_NEED" },
    { trigger_code: "UNAVOIDABLE", label: "May be unavoidable", trigger_type: "UNAVOIDABLE" },
    { trigger_code: "UNKNOWN", label: "Not sure", trigger_type: "UNKNOWN" },
  ],
};

export function getTriggerOptionsForBehavior(behaviorCode: string): TriggerOption[] {
  return TRIGGER_CATALOG[behaviorCode] ?? TRIGGER_CATALOG.OTHER_BEHAVIOR ?? [];
}

export function getTriggerLabelByCode(triggerCode: string, behaviorCode: string): string {
  if (isCoachFlowTriggerCode(triggerCode)) {
    return getCoachFlowTriggerLabel(triggerCode);
  }
  const opts = getTriggerOptionsForBehavior(behaviorCode);
  const found = opts.find((o) => o.trigger_code === triggerCode);
  return found?.label ?? triggerCode;
}
