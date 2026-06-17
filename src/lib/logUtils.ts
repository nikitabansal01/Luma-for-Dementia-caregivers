/**
 * Pure helpers for log display. Safe to import from client components.
 */

import {
  COACH_FLOW_STRATEGIES,
  encodeCoachOutcomeDetail,
  getCoachFlowTriggerLabel,
  getCoachOutcomeLabel,
  getStrategyLabel,
  isCoachFlowTriggerCode,
  parseCoachOutcomeFromDetail,
  type CoachOutcomeUi,
} from "./coachFlowCatalog";
import { getTriggerLabelByCode } from "./triggerCatalog";
import { getSeverityDisplay, getSeverityLabel } from "./severityCatalog";
import { getEpisodeTimingDisplay, formatEpisodeTimingSummary } from "./episodeTiming";

/** Get trigger codes from a log (parsed array or legacy single trigger_type). */
export function getLogTriggerCodes(log: {
  trigger_hypotheses?: string[] | null;
  trigger_type?: string | null;
}): string[] {
  if (log.trigger_hypotheses && log.trigger_hypotheses.length > 0) return log.trigger_hypotheses;
  if (log.trigger_type) return [log.trigger_type];
  return [];
}

/** Get interventions attempted from a log (parsed array or legacy single intervention_tried). */
export function getLogInterventionsAttempted(log: {
  interventions_attempted?: string[] | null;
  intervention_tried?: string | null;
}): string[] {
  if (log.interventions_attempted && log.interventions_attempted.length > 0) return log.interventions_attempted;
  if (log.intervention_tried) return [log.intervention_tried];
  return [];
}

const STRATEGY_CODE_SET = new Set(COACH_FLOW_STRATEGIES.map((s) => s.code));

/** Coach flow stores strategy labels; legacy logs may store codes. */
export function getLogInterventionLabel(value: string): string {
  if (STRATEGY_CODE_SET.has(value)) return getStrategyLabel(value);
  return value;
}

/** Match coach-flow trigger chip labels. */
export function getLogTriggerLabel(code: string, behaviorType: string): string {
  if (isCoachFlowTriggerCode(code)) return getCoachFlowTriggerLabel(code);
  return getTriggerLabelByCode(code, behaviorType);
}

export type LogOutcomeDisplay = {
  label: string;
  tone: "helped" | "mixed" | "worse" | "neutral";
};

/** Prefer stored coach-flow outcome; fall back to simplified DB outcome. */
export function getLogOutcomeDisplay(log: {
  outcome: string;
  behavior_detail?: string | null;
}): LogOutcomeDisplay | null {
  const coachOutcome = parseCoachOutcomeFromDetail(log.behavior_detail);
  if (coachOutcome) {
    return {
      label: getCoachOutcomeLabel(coachOutcome),
      tone: coachOutcomeTone(coachOutcome),
    };
  }

  switch (log.outcome) {
    case "better":
      return { label: "Helped", tone: "helped" };
    case "worse":
      return { label: "Made it worse", tone: "worse" };
    case "same":
      return { label: "Did not help", tone: "mixed" };
    case "unknown":
      return null;
    default:
      return null;
  }
}

function coachOutcomeTone(outcome: CoachOutcomeUi): LogOutcomeDisplay["tone"] {
  if (outcome === "helped" || outcome === "helped_little") return "helped";
  if (outcome === "made_worse") return "worse";
  if (outcome === "did_not_help") return "mixed";
  return "neutral";
}

export { encodeCoachOutcomeDetail, parseCoachOutcomeFromDetail };

export function getLogSeverityLabel(severity: number): string {
  return getSeverityLabel(severity);
}

export function getLogSeverityDisplay(severity: number): string {
  return getSeverityDisplay(severity);
}

export function notePreview(notes: string | null | undefined, maxLen = 90): string | null {
  if (!notes?.trim()) return null;
  const trimmed = notes.trim();
  return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen).trim()}…`;
}

export { getEpisodeTimingDisplay, formatEpisodeTimingSummary };
