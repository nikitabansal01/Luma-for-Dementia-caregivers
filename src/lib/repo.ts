import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import {
  getOrCreateDefaultRecipientFromCookie,
  readCareProfileCookie,
  writeCareProfileCookie,
} from "./careProfileCookie";
import { BEHAVIOR_CODES } from "./behaviorMap";
import { isKnownBehaviorCode } from "./customBehaviors";
import {
  buildDiscussionQuestions,
  buildExecutiveSummary,
  computeTrend,
  countStrategyOutcomes,
  getTriggerCategoryLabel,
  getTriggerDisplayLabel,
  type StrategyOutcomeCounts,
  type SynopsisTrend,
} from "./synopsisBuilder";
import { buildCareContextLine } from "./careProfile";
import { getBehaviorLabel } from "./behaviorMap";
import { getStrategyLabel } from "./coachFlowCatalog";
import {
  deriveOccurredAt,
  getLogTimeOfDayPeriod,
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
} from "./episodeTiming";

const outcomeEnum = z.enum(["better", "same", "worse", "unknown"]);

const episodeRecencyEnum = z.enum([
  "just_now",
  "earlier_today",
  "yesterday",
  "few_days_ago",
  "not_sure",
]);

const episodeTimeOfDayEnum = z.enum([
  "morning",
  "afternoon",
  "evening",
  "night",
  "overnight",
  "not_sure",
]);

const episodeDayContextEnum = z.enum([
  "weekday_usual",
  "weekend",
  "holiday_unusual",
  "appointment_outing",
  "not_sure",
]);

export const createBehaviorLogSchema = z.object({
  care_recipient_id: z.string().min(1),
  behavior_type: z
    .string()
    .min(1)
    .refine((code) => isKnownBehaviorCode(code), { message: "Unknown behavior type" }),
  severity: z.number().int().min(1).max(3),
  episode_recency: episodeRecencyEnum,
  episode_time_of_day: episodeTimeOfDayEnum,
  episode_day_context: episodeDayContextEnum,
  exact_episode_at: z.string().optional(),
  trigger_hypotheses: z.array(z.string()).default([]),
  trigger_detail: z.string().max(500).optional(),
  recommended_interventions: z.array(z.string()).default([]),
  interventions_attempted: z.array(z.string()).default([]),
  outcome: outcomeEnum.default("unknown"),
  notes: z.string().max(2000).optional(),
  behavior_detail: z.string().max(100).optional(),
});

export type CreateBehaviorLogPayload = z.infer<typeof createBehaviorLogSchema>;

export const listBehaviorLogsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  behaviorType: z.string().optional(),
  triggerCode: z.string().optional(),
});

export type ListBehaviorLogsParams = z.infer<typeof listBehaviorLogsSchema>;

export const listBehaviorLogsByDaySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export type ListBehaviorLogsByDayParams = z.infer<typeof listBehaviorLogsByDaySchema>;

export const updateLogOutcomeSchema = z.object({
  outcome: outcomeEnum,
  interventions_attempted: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateLogOutcomePayload = z.infer<typeof updateLogOutcomeSchema>;

export type CareRecipient = {
  id: string;
  name: string;
  stage: string | null;
  caregiver_relationship: string | null;
  age: number | null;
  age_range: string | null;
  living_situation: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visit_purpose: string | null;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  created_at: string;
};

const dementiaStageEnum = z.enum(["MCI", "MILD", "MODERATE", "SEVERE", "NOT_SURE"]);
const ageRangeEnum = z.enum(["UNDER_65", "AGE_65_74", "AGE_75_84", "AGE_85_PLUS", "NOT_SURE"]);
const caregiverRelationshipEnum = z.enum([
  "SPOUSE",
  "ADULT_CHILD",
  "GRANDPARENT",
  "PARENT",
  "SIBLING",
  "OTHER_FAMILY",
  "PROFESSIONAL",
  "OTHER",
]);
const livingSituationEnum = z.enum([
  "LIVES_WITH_ME",
  "LIVES_WITH_FAMILY",
  "LIVES_ALONE",
  "ASSISTED_LIVING",
  "MEMORY_CARE",
  "NURSING_FACILITY",
  "OTHER",
  "SAME_CITY_SEPARATE",
]);
const visitPurposeEnum = z.enum(["CURIOUS", "COLLABORATE", "CAREGIVER", "OTHER"]);

export const saveCareProfileSchema = z.object({
  visitor_name: z.string().trim().min(1, "Add your name or nickname").max(60),
  visitor_email: z.string().trim().email("Enter a valid email address").max(120),
  visit_purpose: visitPurposeEnum,
  name: z.string().trim().max(60).optional(),
  stage: dementiaStageEnum,
  caregiver_relationship: caregiverRelationshipEnum,
  age_range: ageRangeEnum,
  living_situation: livingSituationEnum.nullable().optional(),
});

export type SaveCareProfilePayload = z.infer<typeof saveCareProfileSchema>;

function persistCareProfileCookie(recipient: CareRecipient): void {
  try {
    writeCareProfileCookie(recipient);
  } catch (err) {
    console.error("Could not write care profile cookie:", err);
  }
}

function readCareProfileCookieSafe(): CareRecipient | null {
  try {
    return readCareProfileCookie();
  } catch {
    return null;
  }
}

function mapCareRecipientRow(row: Record<string, unknown>): CareRecipient {
  return {
    id: row.id as string,
    name: row.name as string,
    stage: (row.stage as string | null) ?? null,
    caregiver_relationship: (row.caregiver_relationship as string | null) ?? null,
    age: row.age != null ? Number(row.age) : null,
    age_range: (row.age_range as string | null) ?? null,
    living_situation: (row.living_situation as string | null) ?? null,
    visitor_name: (row.visitor_name as string | null) ?? null,
    visitor_email: (row.visitor_email as string | null) ?? null,
    visit_purpose: (row.visit_purpose as string | null) ?? null,
    onboarding_completed_at: (row.onboarding_completed_at as string | null) ?? null,
    onboarding_skipped_at: (row.onboarding_skipped_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export function isOnboardingPending(recipient: CareRecipient): boolean {
  return !recipient.onboarding_completed_at && !recipient.onboarding_skipped_at;
}

export function saveCareProfile(payload: unknown): CareRecipient {
  const parsed = saveCareProfileSchema.parse(payload);
  const recipient = getOrCreateDefaultRecipient();
  const now = new Date().toISOString();
  const careRecipientName = parsed.name?.trim() || "";

  const updated: CareRecipient = {
    ...recipient,
    visitor_name: parsed.visitor_name,
    visitor_email: parsed.visitor_email,
    visit_purpose: parsed.visit_purpose,
    name: careRecipientName,
    stage: parsed.stage,
    caregiver_relationship: parsed.caregiver_relationship,
    age: null,
    age_range: parsed.age_range,
    living_situation: parsed.living_situation ?? null,
    onboarding_completed_at: now,
    onboarding_skipped_at: null,
  };

  try {
    const db = getDb();
    db.prepare(
      `UPDATE care_recipients SET
        visitor_name = ?,
        visitor_email = ?,
        visit_purpose = ?,
        name = ?,
        stage = ?,
        caregiver_relationship = ?,
        age = NULL,
        age_range = ?,
        living_situation = ?,
        onboarding_completed_at = ?,
        onboarding_skipped_at = NULL
      WHERE id = ?`
    ).run(
      parsed.visitor_name,
      parsed.visitor_email,
      parsed.visit_purpose,
      careRecipientName,
      parsed.stage,
      parsed.caregiver_relationship,
      parsed.age_range,
      parsed.living_situation ?? null,
      now,
      recipient.id
    );

    const row = db.prepare("SELECT * FROM care_recipients WHERE id = ?").get(recipient.id);
    const saved = mapCareRecipientRow(row as Record<string, unknown>);
    persistCareProfileCookie(saved);
    return saved;
  } catch (err) {
    console.error("SQLite saveCareProfile failed, using cookie fallback:", err);
    persistCareProfileCookie(updated);
    return updated;
  }
}

export function skipOnboarding(): CareRecipient {
  const recipient = getOrCreateDefaultRecipient();
  const now = new Date().toISOString();
  const updated: CareRecipient = {
    ...recipient,
    onboarding_skipped_at: now,
  };

  try {
    const db = getDb();
    db.prepare("UPDATE care_recipients SET onboarding_skipped_at = ? WHERE id = ?").run(
      now,
      recipient.id
    );
    const row = db.prepare("SELECT * FROM care_recipients WHERE id = ?").get(recipient.id);
    const saved = mapCareRecipientRow(row as Record<string, unknown>);
    persistCareProfileCookie(saved);
    return saved;
  } catch (err) {
    console.error("SQLite skipOnboarding failed, using cookie fallback:", err);
    persistCareProfileCookie(updated);
    return updated;
  }
}

export type BehaviorLog = {
  id: string;
  care_recipient_id: string;
  occurred_at: string;
  behavior_type: string;
  behavior_detail: string | null;
  severity: number;
  trigger_type: string | null;
  trigger_detail: string | null;
  trigger_hypotheses: string[] | null;
  recommended_interventions: string[] | null;
  interventions_attempted: string[] | null;
  intervention_tried: string | null;
  outcome: string;
  notes: string | null;
  episode_recency: EpisodeRecency | null;
  episode_time_of_day: EpisodeTimeOfDay | null;
  episode_day_context: EpisodeDayContext | null;
  exact_episode_at: string | null;
  created_at: string;
};

function parseJsonArray(val: string | null): string[] | null {
  if (val == null || val === "") return null;
  try {
    const a = JSON.parse(val);
    return Array.isArray(a) ? a : null;
  } catch {
    return null;
  }
}

function rowToBehaviorLog(row: Record<string, unknown>): BehaviorLog {
  const triggerHypotheses = parseJsonArray(row.trigger_hypotheses as string | null);
  const recommendedInterventions = parseJsonArray(row.recommended_interventions as string | null);
  const interventionsAttempted = parseJsonArray(row.interventions_attempted as string | null);
  return {
    id: row.id as string,
    care_recipient_id: row.care_recipient_id as string,
    occurred_at: row.occurred_at as string,
    behavior_type: row.behavior_type as string,
    behavior_detail: (row.behavior_detail as string) ?? null,
    severity: row.severity as number,
    trigger_type: (row.trigger_type as string) ?? null,
    trigger_detail: (row.trigger_detail as string) ?? null,
    trigger_hypotheses: triggerHypotheses,
    recommended_interventions: recommendedInterventions,
    interventions_attempted: interventionsAttempted,
    intervention_tried: (row.intervention_tried as string) ?? null,
    outcome: row.outcome as string,
    notes: (row.notes as string) ?? null,
    episode_recency: (row.episode_recency as EpisodeRecency) ?? null,
    episode_time_of_day: (row.episode_time_of_day as EpisodeTimeOfDay) ?? null,
    episode_day_context: (row.episode_day_context as EpisodeDayContext) ?? null,
    exact_episode_at: (row.exact_episode_at as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function getOrCreateDefaultRecipient(): CareRecipient {
  const cookieProfile = readCareProfileCookieSafe();

  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM care_recipients LIMIT 1").get() as
      | Record<string, unknown>
      | undefined;
    if (row) {
      const fromDb = mapCareRecipientRow(row);
      if (
        cookieProfile &&
        cookieProfile.visitor_email &&
        !fromDb.visitor_email &&
        cookieProfile.onboarding_completed_at
      ) {
        return cookieProfile;
      }
      return fromDb;
    }
    if (cookieProfile) return cookieProfile;

    const id = randomUUID();
    const created_at = new Date().toISOString();
    db.prepare(
      "INSERT INTO care_recipients (id, name, stage, created_at) VALUES (?, ?, ?, ?)"
    ).run(id, "", null, created_at);
    return mapCareRecipientRow(
      db.prepare("SELECT * FROM care_recipients WHERE id = ?").get(id) as Record<string, unknown>
    );
  } catch (err) {
    console.error("SQLite getOrCreateDefaultRecipient failed, using cookie fallback:", err);
    return cookieProfile ?? getOrCreateDefaultRecipientFromCookie();
  }
}

export function createBehaviorLog(payload: unknown): BehaviorLog {
  const db = getDb();
  const parsed = createBehaviorLogSchema.parse(payload);
  const id = randomUUID();
  const created_at = new Date().toISOString();
  const occurred_at = deriveOccurredAt(new Date(created_at), {
    episode_recency: parsed.episode_recency,
    episode_time_of_day: parsed.episode_time_of_day,
    episode_day_context: parsed.episode_day_context,
    exact_episode_at: parsed.exact_episode_at ?? null,
  });
  const triggerHypothesesJson = JSON.stringify(parsed.trigger_hypotheses);
  const recommendedJson = JSON.stringify(parsed.recommended_interventions);
  const attemptedJson = JSON.stringify(parsed.interventions_attempted);
  db.prepare(
    `INSERT INTO behavior_logs (
      id, care_recipient_id, occurred_at, behavior_type, behavior_detail, severity,
      trigger_type, trigger_detail, trigger_hypotheses, recommended_interventions, interventions_attempted,
      intervention_tried, outcome, notes, episode_recency, episode_time_of_day, episode_day_context,
      exact_episode_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.care_recipient_id,
    occurred_at,
    parsed.behavior_type,
    parsed.behavior_detail ?? null,
    parsed.severity,
    parsed.trigger_hypotheses[0] ?? "",
    parsed.trigger_detail ?? null,
    triggerHypothesesJson,
    recommendedJson,
    attemptedJson,
    null,
    parsed.outcome,
    parsed.notes ?? null,
    parsed.episode_recency,
    parsed.episode_time_of_day,
    parsed.episode_day_context,
    parsed.exact_episode_at ?? null,
    created_at
  );
  const row = db.prepare("SELECT * FROM behavior_logs WHERE id = ?").get(id) as Record<string, unknown>;
  return rowToBehaviorLog(row);
}

export function getBehaviorLog(id: string): BehaviorLog | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM behavior_logs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToBehaviorLog(row);
}

export function updateLogOutcome(id: string, payload: unknown): BehaviorLog | null {
  const db = getDb();
  const parsed = updateLogOutcomeSchema.parse(payload);
  const attemptedJson = parsed.interventions_attempted != null
    ? JSON.stringify(parsed.interventions_attempted)
    : null;
  const result = db
    .prepare(
      `UPDATE behavior_logs SET outcome = ?, interventions_attempted = COALESCE(?, interventions_attempted), notes = COALESCE(?, notes) WHERE id = ?`
    )
    .run(parsed.outcome, attemptedJson, parsed.notes ?? null, id);
  if (result.changes === 0) return null;
  return getBehaviorLog(id);
}

export function listBehaviorLogs(params: ListBehaviorLogsParams): BehaviorLog[] {
  const db = getDb();
  const parsed = listBehaviorLogsSchema.parse(params);
  let sql = "SELECT * FROM behavior_logs WHERE 1=1";
  const args: (string | number)[] = [];
  if (parsed.from) {
    sql += " AND created_at >= ?";
    args.push(parsed.from);
  }
  if (parsed.to) {
    sql += " AND created_at <= ?";
    args.push(parsed.to);
  }
  if (parsed.behaviorType) {
    sql += " AND behavior_type = ?";
    args.push(parsed.behaviorType);
  }
  if (parsed.triggerCode) {
    sql += " AND (trigger_type = ? OR trigger_hypotheses LIKE ?)";
    args.push(parsed.triggerCode, `%"${parsed.triggerCode}"%`);
  }
  sql += " ORDER BY created_at DESC";
  const stmt = db.prepare(sql);
  const rows = (args.length ? stmt.all(...args) : stmt.all()) as Record<string, unknown>[];
  return rows.map(rowToBehaviorLog);
}

export function listBehaviorLogsByDay(params: ListBehaviorLogsByDayParams): { day: string; logs: BehaviorLog[] }[] {
  const db = getDb();
  const parsed = listBehaviorLogsByDaySchema.parse(params);
  const rows = db
    .prepare(
      `SELECT * FROM behavior_logs
       WHERE date(occurred_at) >= date(?) AND date(occurred_at) <= date(?)
       ORDER BY occurred_at ASC`
    )
    .all(parsed.from, parsed.to) as Record<string, unknown>[];
  const byDay = new Map<string, BehaviorLog[]>();
  for (const row of rows) {
    const log = rowToBehaviorLog(row);
    const day = log.occurred_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(log);
  }
  return Array.from(byDay.entries()).map(([day, logs]) => ({ day, logs }));
}

function getTodayRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function getTodayLogs(): BehaviorLog[] {
  const db = getDb();
  const { from, to } = getTodayRange();
  const rows = db
    .prepare(
      `SELECT * FROM behavior_logs
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`
    )
    .all(from, to) as Record<string, unknown>[];
  return rows.map(rowToBehaviorLog);
}

/** Get trigger codes from a log (new schema: trigger_hypotheses; fallback: trigger_type). */
export function getLogTriggerCodes(log: BehaviorLog): string[] {
  if (log.trigger_hypotheses && log.trigger_hypotheses.length > 0) {
    return log.trigger_hypotheses;
  }
  if (log.trigger_type) return [log.trigger_type];
  return [];
}

/** Get interventions attempted from a log (new schema: interventions_attempted; fallback: intervention_tried). */
export function getLogInterventionsAttempted(log: BehaviorLog): string[] {
  if (log.interventions_attempted && log.interventions_attempted.length > 0) {
    return log.interventions_attempted;
  }
  if (log.intervention_tried) return [log.intervention_tried];
  return [];
}

export type WhatWorkedForBehavior = {
  totalCount: number;
  suggestions: string[];
};

const MAX_PREVIOUS_SUGGESTIONS = 5;

/** For "what to try next": count of previous logs for this behavior and interventions that appeared when outcome was better. */
export function getWhatWorkedForBehavior(behaviorType: string): WhatWorkedForBehavior {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT outcome, interventions_attempted FROM behavior_logs WHERE behavior_type = ? ORDER BY occurred_at DESC`
    )
    .all(behaviorType) as Array<{ outcome: string; interventions_attempted: string | null }>;
  const totalCount = rows.length;
  const byFreq = new Map<string, number>();
  for (const row of rows) {
    if (row.outcome !== "better") continue;
    const arr = parseJsonArray(row.interventions_attempted);
    if (!arr?.length) continue;
    for (const s of arr) {
      const t = String(s).trim();
      if (!t) continue;
      byFreq.set(t, (byFreq.get(t) ?? 0) + 1);
    }
  }
  const suggestions = Array.from(byFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PREVIOUS_SUGGESTIONS)
    .map(([text]) => text);
  return { totalCount, suggestions };
}

export type PastAttemptOutcomes = {
  intervention: string;
  better: number;
  same: number;
  worse: number;
};

export type PastAttemptsForBehavior = {
  totalLogs: number;
  attempts: PastAttemptOutcomes[];
};

/** What the caregiver has tried before for this behavior and whether it worked (better/same/worse). */
export function getPastAttemptsForBehavior(behaviorType: string): PastAttemptsForBehavior {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT outcome, interventions_attempted FROM behavior_logs WHERE behavior_type = ?`
    )
    .all(behaviorType) as Array<{ outcome: string; interventions_attempted: string | null }>;
  const totalLogs = rows.length;
  const byIntervention = new Map<string, { better: number; same: number; worse: number }>();
  for (const row of rows) {
    const arr = parseJsonArray(row.interventions_attempted);
    if (!arr?.length) continue;
    const o = row.outcome === "better" ? "better" : row.outcome === "worse" ? "worse" : "same";
    for (const s of arr) {
      const t = String(s).trim();
      if (!t) continue;
      const cur = byIntervention.get(t) ?? { better: 0, same: 0, worse: 0 };
      if (o === "better") cur.better++;
      else if (o === "worse") cur.worse++;
      else cur.same++;
      byIntervention.set(t, cur);
    }
  }
  const attempts = Array.from(byIntervention.entries())
    .map(([intervention, counts]) => ({
      intervention,
      better: counts.better,
      same: counts.same,
      worse: counts.worse,
    }))
    .sort((a, b) => b.better - a.better || (b.same + b.worse) - (a.same + a.worse));
  return { totalLogs, attempts };
}

export type StrategySummary = {
  strategy: string;
  totalCount: number;
  helped: number;
  unchanged: number;
  madeWorse: number;
  notSure: number;
};

export type ReportData = {
  daysWithLogs: number;
  totalDays: number;
  totalIncidents: number;
  careContext: string | null;
  executiveSummary: string;
  trend: SynopsisTrend;
  topBehaviors: Array<{ behavior: string; count: number; avgSeverity: number }>;
  previousPeriodComparison: Array<{
    behavior: string;
    countChange: number;
    severityChange: number;
  }>;
  timeOfDayPattern: Array<{ period: string; count: number; percentage: number }>;
  topTriggersOverall: Array<{ trigger: string; count: number }>;
  triggerCategories: Array<{ category: string; count: number }>;
  topTriggersByBehavior: Record<string, Array<{ trigger: string; count: number }>>;
  strategyOutcomes: StrategyOutcomeCounts;
  strategiesSummary: StrategySummary[];
  topHelpfulStrategies: string[];
  helpfulInterventions: Array<{ intervention: string; betterRate: number; totalCount: number }>;
  discussionQuestions: string[];
};

function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  from.setUTCHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function daysBetween(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function generateReport(days: number): ReportData {
  const { from, to } = getDateRange(days);
  const logs = listBehaviorLogs({ from, to });

  const uniqueDays = new Set<string>();
  for (const log of logs) {
    uniqueDays.add(log.occurred_at.slice(0, 10));
  }
  const daysWithLogs = uniqueDays.size;
  const totalDays = daysBetween(from, to);

  const byBehavior: Record<string, { count: number; totalSeverity: number }> = {};
  for (const log of logs) {
    if (!byBehavior[log.behavior_type]) {
      byBehavior[log.behavior_type] = { count: 0, totalSeverity: 0 };
    }
    byBehavior[log.behavior_type].count++;
    byBehavior[log.behavior_type].totalSeverity += log.severity;
  }

  const topBehaviors = Object.entries(byBehavior)
    .map(([behavior, data]) => ({
      behavior,
      count: data.count,
      avgSeverity: data.totalSeverity / data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const prevRange = getDateRange(days * 2);
  prevRange.to = from;
  const prevLogs = listBehaviorLogs({ from: prevRange.from, to: prevRange.to });
  const prevByBehavior: Record<string, { count: number; totalSeverity: number }> = {};
  for (const log of prevLogs) {
    if (!prevByBehavior[log.behavior_type]) {
      prevByBehavior[log.behavior_type] = { count: 0, totalSeverity: 0 };
    }
    prevByBehavior[log.behavior_type].count++;
    prevByBehavior[log.behavior_type].totalSeverity += log.severity;
  }

  const previousPeriodComparison = topBehaviors.map(({ behavior, count, avgSeverity }) => {
    const prev = prevByBehavior[behavior];
    const prevCount = prev?.count ?? 0;
    const prevAvgSeverity = prev ? prev.totalSeverity / prev.count : 0;
    return {
      behavior,
      countChange: count - prevCount,
      severityChange: avgSeverity - prevAvgSeverity,
    };
  });

  const triggersOverall: Record<string, number> = {};
  for (const log of logs) {
    const codes = getLogTriggerCodes(log);
    for (const code of codes) {
      triggersOverall[code] = (triggersOverall[code] ?? 0) + 1;
    }
  }
  const topTriggersOverall = Object.entries(triggersOverall)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTriggersByBehavior: Record<string, Array<{ trigger: string; count: number }>> = {};
  for (const { behavior } of topBehaviors) {
    const behaviorLogs = logs.filter((l) => l.behavior_type === behavior);
    const triggers: Record<string, number> = {};
    for (const log of behaviorLogs) {
      for (const code of getLogTriggerCodes(log)) {
        triggers[code] = (triggers[code] ?? 0) + 1;
      }
    }
    topTriggersByBehavior[behavior] = Object.entries(triggers)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const byIntervention: Record<string, { better: number; total: number }> = {};
  for (const log of logs) {
    const attempted = getLogInterventionsAttempted(log);
    for (const intervention of attempted) {
      if (!byIntervention[intervention]) {
        byIntervention[intervention] = { better: 0, total: 0 };
      }
      byIntervention[intervention].total++;
      if (log.outcome === "better") {
        byIntervention[intervention].better++;
      }
    }
  }

  const helpfulInterventions = Object.entries(byIntervention)
    .filter(([, data]) => data.total >= 3)
    .map(([intervention, data]) => ({
      intervention,
      betterRate: data.better / data.total,
      totalCount: data.total,
    }))
    .sort((a, b) => b.betterRate - a.betterRate)
    .slice(0, 5);

  const totalIncidents = logs.length;
  const currentAvgSeverity =
    totalIncidents > 0 ? logs.reduce((sum, log) => sum + log.severity, 0) / totalIncidents : 0;
  const prevTotalIncidents = prevLogs.length;
  const prevAvgSeverity =
    prevTotalIncidents > 0
      ? prevLogs.reduce((sum, log) => sum + log.severity, 0) / prevTotalIncidents
      : 0;
  const trend = computeTrend(
    totalIncidents,
    currentAvgSeverity,
    prevTotalIncidents,
    prevAvgSeverity
  );

  const timeBuckets: Record<string, number> = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
    Night: 0,
    Overnight: 0,
  };
  for (const log of logs) {
    timeBuckets[getLogTimeOfDayPeriod(log)]++;
  }
  const timeOfDayPattern = Object.entries(timeBuckets)
    .map(([period, count]) => ({
      period,
      count,
      percentage: totalIncidents > 0 ? (count / totalIncidents) * 100 : 0,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const categoryCounts: Record<string, number> = {};
  for (const log of logs) {
    for (const code of getLogTriggerCodes(log)) {
      const cat = getTriggerCategoryLabel(code, log.behavior_type);
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    }
  }
  const triggerCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const strategyOutcomes = countStrategyOutcomes(logs, (log) =>
    getLogInterventionsAttempted(log).length > 0
  );

  const strategyStats = new Map<
    string,
    { totalCount: number; helped: number; unchanged: number; madeWorse: number; notSure: number }
  >();
  for (const log of logs) {
    for (const strategy of getLogInterventionsAttempted(log)) {
      const cur = strategyStats.get(strategy) ?? {
        totalCount: 0,
        helped: 0,
        unchanged: 0,
        madeWorse: 0,
        notSure: 0,
      };
      cur.totalCount++;
      if (log.outcome === "better") cur.helped++;
      else if (log.outcome === "worse") cur.madeWorse++;
      else if (log.outcome === "same") cur.unchanged++;
      else cur.notSure++;
      strategyStats.set(strategy, cur);
    }
  }
  const strategiesSummary = Array.from(strategyStats.entries())
    .map(([strategy, stats]) => ({ strategy, ...stats }))
    .sort((a, b) => b.helped - a.helped || b.totalCount - a.totalCount);

  const topHelpfulStrategies = strategiesSummary
    .filter((s) => s.helped >= 1 && s.helped >= s.madeWorse)
    .slice(0, 5)
    .map((s) => s.strategy);

  const topBehaviorCode = topBehaviors[0]?.behavior ?? null;
  const topTriggerLabels = topTriggersOverall.map((t) => {
    const sampleLog = logs.find((l) => getLogTriggerCodes(l).includes(t.trigger));
    return getTriggerDisplayLabel(
      t.trigger,
      sampleLog?.behavior_type ?? topBehaviorCode ?? "OTHER_BEHAVIOR"
    );
  });

  const executiveSummary = buildExecutiveSummary({
    days,
    totalIncidents,
    topBehaviorCode,
    topTriggerLabels,
    trend,
  });

  const discussionQuestions = buildDiscussionQuestions({
    triggerCategories,
    timeOfDayPattern,
    topBehaviors: topBehaviors.map(({ behavior, count }) => ({ behavior, count })),
    trend,
    avgSeverity: currentAvgSeverity,
  });

  const recipient = getOrCreateDefaultRecipient();
  const careContext = buildCareContextLine(recipient);

  return {
    daysWithLogs,
    totalDays,
    totalIncidents,
    careContext,
    executiveSummary,
    trend,
    topBehaviors,
    previousPeriodComparison,
    timeOfDayPattern,
    topTriggersOverall,
    triggerCategories,
    topTriggersByBehavior,
    strategyOutcomes,
    strategiesSummary,
    topHelpfulStrategies,
    helpfulInterventions,
    discussionQuestions,
  };
}

export type SynopsisLogPreview = {
  id: string;
  dateLabel: string;
  timeOfDay: string | null;
  behaviorLabel: string;
  severity: number;
  outcome: string;
  notes: string | null;
  triggerLabels: string[];
  strategyLabels: string[];
  recommendedLabels: string[];
};

function formatSynopsisLogDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getSynopsisLogPreviews(days: number, limit = 5): SynopsisLogPreview[] {
  const { from, to } = getDateRange(days);
  const logs = listBehaviorLogs({ from, to })
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, limit);

  return logs.map((log) => {
    const triggerCodes = getLogTriggerCodes(log);
    const strategyCodes = getLogInterventionsAttempted(log);
    const recommended = log.recommended_interventions ?? [];

    return {
      id: log.id,
      dateLabel: formatSynopsisLogDate(log.occurred_at),
      timeOfDay: log.episode_time_of_day,
      behaviorLabel: getBehaviorLabel(log.behavior_type),
      severity: log.severity,
      outcome: log.outcome,
      notes: log.notes,
      triggerLabels: triggerCodes.map((code) => getTriggerDisplayLabel(code, log.behavior_type)),
      strategyLabels: strategyCodes.map(getStrategyLabel),
      recommendedLabels: recommended.map(getStrategyLabel),
    };
  });
}
