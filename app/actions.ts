"use server";

import { revalidatePath } from "next/cache";
import {
  getOrCreateDefaultRecipient,
  createBehaviorLog,
  getBehaviorLog,
  updateLogOutcome,
  generateReport,
  getPastAttemptsForBehavior,
} from "@/src/lib/repo";
import type { ReportData } from "@/src/lib/repo";
import { saveCoachRules, getRecommendations } from "@/src/lib/coach";
import { encodeCoachOutcomeDetail } from "@/src/lib/logUtils";
import type { CoachOutcomeUi } from "@/src/lib/coachFlowCatalog";
import { z } from "zod";

const outcomeEnum = z.enum(["better", "same", "worse", "unknown"]);

export type CoachLogPayload = {
  behavior_type: string;
  severity: number;
  episode_recency: "just_now" | "earlier_today" | "yesterday" | "few_days_ago" | "not_sure";
  episode_time_of_day: "morning" | "afternoon" | "evening" | "night" | "overnight" | "not_sure";
  episode_day_context:
    | "weekday_usual"
    | "weekend"
    | "holiday_unusual"
    | "appointment_outing"
    | "not_sure";
  exact_episode_at?: string;
  trigger_hypotheses: string[];
  trigger_detail?: string;
  recommended_interventions: string[];
  interventions_attempted: string[];
  outcome: "better" | "same" | "worse" | "unknown";
  notes?: string;
  coach_outcome?: CoachOutcomeUi;
};

export type QuickLogPayload = {
  behavior_type: string;
  severity: number;
  episode_recency: "just_now" | "earlier_today" | "yesterday" | "few_days_ago" | "not_sure";
  episode_time_of_day: "morning" | "afternoon" | "evening" | "night" | "overnight" | "not_sure";
  episode_day_context:
    | "weekday_usual"
    | "weekend"
    | "holiday_unusual"
    | "appointment_outing"
    | "not_sure";
  exact_episode_at?: string;
  trigger_hypotheses?: string[];
  trigger_detail?: string;
};

export type SubmitCoachResult =
  | { success: true }
  | { success: false; error: string };

export type SubmitQuickResult =
  | { success: true }
  | { success: false; error: string };

export async function submitCoachLog(payload: CoachLogPayload): Promise<SubmitCoachResult> {
  try {
    const recipient = getOrCreateDefaultRecipient();
    createBehaviorLog({
      care_recipient_id: recipient.id,
      behavior_type: payload.behavior_type,
      severity: payload.severity,
      episode_recency: payload.episode_recency,
      episode_time_of_day: payload.episode_time_of_day,
      episode_day_context: payload.episode_day_context,
      exact_episode_at: payload.exact_episode_at,
      trigger_hypotheses: payload.trigger_hypotheses,
      trigger_detail: payload.trigger_detail,
      recommended_interventions: payload.recommended_interventions,
      interventions_attempted: payload.interventions_attempted,
      outcome: payload.outcome,
      notes: payload.notes,
      behavior_detail: encodeCoachOutcomeDetail(
        payload.coach_outcome ??
          (payload.outcome === "better"
            ? "helped"
            : payload.outcome === "worse"
              ? "made_worse"
              : payload.outcome === "same"
                ? "did_not_help"
                : "not_sure")
      ),
    });
    revalidatePath("/");
    revalidatePath("/history");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join("; ")
        : err instanceof Error
          ? err.message
          : "Failed to save";
    return { success: false, error: message };
  }
}

export async function submitQuickLog(payload: QuickLogPayload): Promise<SubmitQuickResult> {
  try {
    const recipient = getOrCreateDefaultRecipient();
    createBehaviorLog({
      care_recipient_id: recipient.id,
      behavior_type: payload.behavior_type,
      severity: payload.severity,
      episode_recency: payload.episode_recency,
      episode_time_of_day: payload.episode_time_of_day,
      episode_day_context: payload.episode_day_context,
      exact_episode_at: payload.exact_episode_at,
      trigger_hypotheses: payload.trigger_hypotheses ?? [],
      trigger_detail: payload.trigger_detail,
      recommended_interventions: [],
      interventions_attempted: [],
      outcome: "unknown",
      notes: undefined,
    });
    revalidatePath("/");
    revalidatePath("/history");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join("; ")
        : err instanceof Error
          ? err.message
          : "Failed to save";
    return { success: false, error: message };
  }
}

export async function updateLogOutcomeAction(
  id: string,
  outcome: string,
  interventions_attempted?: string[],
  notes?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const parsed = outcomeEnum.safeParse(outcome);
    if (!parsed.success) return { success: false, error: "Invalid outcome" };
    const updated = updateLogOutcome(id, {
      outcome: parsed.data,
      interventions_attempted,
      notes,
    });
    if (!updated) return { success: false, error: "Log not found" };
    revalidatePath("/");
    revalidatePath("/history");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update",
    };
  }
}

export async function generateReportAction(days: number): Promise<ReportData> {
  return generateReport(days);
}

export async function saveCoachRulesAction(
  content: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveCoachRules(content);
}

export async function getLogAction(id: string) {
  return getBehaviorLog(id);
}

export async function getRecommendationsAction(behaviorCode: string, triggerCodes: string[]) {
  return getRecommendations(behaviorCode, triggerCodes);
}

export type WhatToTryAfterLog = {
  behaviorCode: string;
  pastAttempts: { totalLogs: number; attempts: Array<{ intervention: string; better: number; same: number; worse: number }> };
  generalTips: string[];
};

export async function getWhatToTryAfterLogAction(
  behaviorCode: string,
  triggerCodes: string[]
): Promise<WhatToTryAfterLog> {
  const pastAttempts = getPastAttemptsForBehavior(behaviorCode);
  const { tryNow, preventNext } = getRecommendations(behaviorCode, triggerCodes);
  const generalTips = [...tryNow, ...preventNext];
  return { behaviorCode, pastAttempts, generalTips };
}
