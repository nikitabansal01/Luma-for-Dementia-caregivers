import { db } from "./db";
import defaultRulesJson from "./coach_rules.json";

export type CoachRules = {
  default?: string[];
  [behavior: string]: string[] | Record<string, string[]> | undefined;
};

const defaultRules = defaultRulesJson as CoachRules;

const MAX_SUGGESTIONS = 3;

function isBehaviorEntry(
  value: string[] | Record<string, string[]> | undefined
): value is Record<string, string[]> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function getSuggestionsFromRules(rules: CoachRules, behavior: string, trigger: string): string[] {
  const behaviorEntry = rules[behavior];
  if (isBehaviorEntry(behaviorEntry)) {
    const forTrigger = behaviorEntry[trigger] ?? behaviorEntry["default"];
    if (Array.isArray(forTrigger) && forTrigger.length > 0) {
      return forTrigger.slice(0, MAX_SUGGESTIONS);
    }
  }
  const globalDefault = rules["default"];
  if (Array.isArray(globalDefault) && globalDefault.length > 0) {
    return globalDefault.slice(0, MAX_SUGGESTIONS);
  }
  return [];
}

/** Full list (no slice) for building tryNow + preventNext. */
function getSuggestionsFullFromRules(rules: CoachRules, behavior: string, trigger: string): string[] {
  const behaviorEntry = rules[behavior];
  if (isBehaviorEntry(behaviorEntry)) {
    const forTrigger = behaviorEntry[trigger] ?? behaviorEntry["default"];
    if (Array.isArray(forTrigger) && forTrigger.length > 0) return forTrigger;
  }
  const globalDefault = rules["default"];
  if (Array.isArray(globalDefault) && globalDefault.length > 0) return globalDefault;
  return [];
}

export function getCoachRules(): CoachRules {
  const row = db.prepare("SELECT content FROM coach_rules WHERE id = 1").get() as
    | { content: string }
    | undefined;
  if (row?.content?.trim()) {
    try {
      return JSON.parse(row.content) as CoachRules;
    } catch {
      return defaultRules;
    }
  }
  return defaultRules;
}

/** Raw JSON string for the editor (from DB or stringified default). */
export function getCoachRulesContent(): string {
  const row = db.prepare("SELECT content FROM coach_rules WHERE id = 1").get() as
    | { content: string }
    | undefined;
  if (row?.content?.trim()) {
    return row.content;
  }
  return JSON.stringify(defaultRules, null, 2);
}

export function saveCoachRules(content: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(content) as CoachRules;
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Invalid JSON: must be an object" };
    }
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO coach_rules (id, content, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
    ).run(content, now);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}

export function getSuggestions(behavior: string, trigger: string): string[] {
  const rules = getCoachRules();
  return getSuggestionsFromRules(rules, behavior, trigger);
}

const TRY_NOW_COUNT = 3;
const PREVENT_NEXT_COUNT = 3;

export type Recommendations = {
  tryNow: string[];
  preventNext: string[];
};

/** Get try-now and prevent-next interventions from (behavior, primary trigger). */
export function getRecommendations(
  behaviorCode: string,
  triggerCodes: string[]
): Recommendations {
  const rules = getCoachRules();
  const primary = triggerCodes[0];
  const all = primary
    ? getSuggestionsFullFromRules(rules, behaviorCode, primary)
    : (rules["default"] && Array.isArray(rules["default"]) ? rules["default"] : []);
  const tryNow = all.slice(0, TRY_NOW_COUNT);
  const preventNext = all.slice(TRY_NOW_COUNT, TRY_NOW_COUNT + PREVENT_NEXT_COUNT);
  return { tryNow, preventNext };
}
