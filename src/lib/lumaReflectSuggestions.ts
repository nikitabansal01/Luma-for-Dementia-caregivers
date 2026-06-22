/**
 * Phase 1 rule-based intervention suggestions for Reflect with Luma.
 */

import { DID_NOT_TRY_CODE, type CoachOutcomeUi } from "./coachFlowCatalog";
import {
  generateCoachRecommendations,
  type RecommendationCard,
} from "./coachFlowRecommendations";
import { applyDraftInference, primaryGap } from "./lumaConversationDesign";
import type { LumaDraft } from "./lumaEngine";

const TIME_PERIOD_TRIGGER_CODES = new Set([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHTTIME",
  "SUNDOWNING",
]);

function hasBehavior(draft: LumaDraft): boolean {
  return Boolean(draft.behavior_code || draft.behavior_is_custom);
}

/** Non-time trigger chip or free-text detail — enough to personalize suggestions. */
function hasPartialTriggerSignal(draft: LumaDraft): boolean {
  if (draft.trigger_detail?.trim()) return true;
  return draft.trigger_hypotheses.some((c) => !TIME_PERIOD_TRIGGER_CODES.has(c));
}

export function filterNonTimeTriggerCodes(codes: string[]): string[] {
  return codes.filter((c) => !TIME_PERIOD_TRIGGER_CODES.has(c));
}

export function coachRecommendationParamsFromDraft(draft: LumaDraft): {
  triggerCodes: string[];
  strategiesTried: string[];
  outcome: CoachOutcomeUi;
  severity: number;
} {
  const d = applyDraftInference(draft);
  const didNotTryOnly =
    d.strategies_tried.length === 1 && d.strategies_tried[0] === DID_NOT_TRY_CODE;
  const effectiveOutcome: CoachOutcomeUi = didNotTryOnly
    ? "not_applicable"
    : d.coach_outcome ?? "not_sure";

  return {
    triggerCodes: filterNonTimeTriggerCodes(d.trigger_hypotheses),
    strategiesTried: d.strategies_tried,
    outcome: effectiveOutcome,
    severity: d.severity ?? 2,
  };
}

/** Whether to show the passive suggestions panel during conversation (not final editor rules). */
export function shouldShowLumaReflectSuggestions(draft: LumaDraft): boolean {
  const d = applyDraftInference(draft);
  if (!hasBehavior(d)) return false;

  const gap = primaryGap(d);
  if (gap === "story" || gap === "timing" || gap === "intensity") return false;
  if (gap === "context") return hasPartialTriggerSignal(d);
  return gap === "response" || gap === "review";
}

export function getLumaReflectSuggestions(
  draft: LumaDraft,
  limit = 3
): RecommendationCard[] {
  const params = coachRecommendationParamsFromDraft(draft);
  return generateCoachRecommendations(params).slice(0, limit);
}
