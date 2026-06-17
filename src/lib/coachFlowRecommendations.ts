/**
 * Step 4 recommendations from wizard state — client-safe, no DB/API.
 */

import {
  type CoachOutcomeUi,
  getStrategyLabel,
  DID_NOT_TRY_CODE,
} from "./coachFlowCatalog";

export type RecommendationCard = {
  action: string;
  why: string;
  when: string;
  safetyNote?: string;
  /** Keywords used to avoid repeating failed strategies */
  excludeKeys: string[];
};

const NOISE_STIM_TRIGGERS = new Set([
  "NOISE",
  "OVERSTIMULATION",
  "CLUTTER",
  "TOO_MANY_PEOPLE",
  "RAISED_VOICE",
]);

const BODY_NEED_TRIGGERS = new Set(["HUNGER", "THIRST", "BATHROOM", "PAIN", "FATIGUE"]);

const TIME_EVENING_TRIGGERS = new Set(["EVENING", "NIGHTTIME", "SUNDOWNING"]);

/** Map strategy codes to recommendation exclude keys when attempt failed */
const STRATEGY_EXCLUDE_KEYS: Record<string, string[]> = {
  REASSURANCE: ["reassurance", "calm tone", "gentle"],
  QUIET_SPACE: ["quiet", "quieter space"],
  MUSIC: ["music", "calming routine"],
  SNACK_DRINK: ["snack", "drink", "hunger", "thirst", "basic needs"],
  BATHROOM_CHECK: ["bathroom", "toilet", "basic needs"],
  PAIN_CHECK: ["pain", "discomfort", "basic needs"],
  REDIRECTION: ["redirect", "redirection", "activity"],
  FAVORITE_ACTIVITY: ["favorite activity", "redirect", "activity"],
  SHORT_WALK: ["walk", "movement"],
  REDUCED_NOISE: ["noise", "reduce noise", "quieter"],
  CALLED_HELP: ["call", "support", "help"],
};

const POOL: RecommendationCard[] = [
  {
    action: "Reduce noise and move to a quieter space",
    why: "Noise and overstimulation often worsen agitation and confusion.",
    when: "Now, during the episode",
    excludeKeys: ["noise", "quiet", "quieter"],
  },
  {
    action: "Offer a short calming routine (soft music, slow breathing, gentle touch if welcomed)",
    why: "A predictable calming routine can lower arousal when stimulation is a factor.",
    when: "After reducing noise, if they can engage",
    excludeKeys: ["music", "calming routine", "calm"],
  },
  {
    action: "Check basic needs first: bathroom, pain, hunger, thirst, and fatigue",
    why: "Unmet physical needs are a common driver of distress behaviors.",
    when: "Before trying complex strategies",
    excludeKeys: ["basic needs", "bathroom", "pain", "hunger", "thirst"],
  },
  {
    action: "Start a predictable evening routine and reduce stimulation after late afternoon",
    why: "Evening and sundowning periods often respond to lower stimulation and familiar routines.",
    when: "This evening and at the same time tomorrow",
    excludeKeys: ["evening", "routine", "stimulation"],
  },
  {
    action: "Use simple redirection to a familiar, low-demand activity",
    why: "A familiar activity can shift focus without adding pressure.",
    when: "Once immediate safety needs are addressed",
    excludeKeys: ["redirect", "activity"],
  },
  {
    action: "Give space, lower your voice, and reduce demands",
    why: "Less pressure can help de-escalate when the person is overwhelmed.",
    when: "During the episode; pause extra tasks",
    excludeKeys: ["space", "demands", "calm tone"],
  },
  {
    action: "Note what happened and share with your care team at the next check-in",
    why: "Patterns across visits help clinicians adjust care plans.",
    when: "After the episode settles",
    excludeKeys: ["note", "care team"],
  },
];

const SAFETY_CARD: RecommendationCard = {
  action: "Prioritize safety: reduce demands, give space, keep both people safe, and contact care support if there is risk of harm",
  why: "Higher-severity episodes may need a safety-first approach before other strategies.",
  when: "Immediately",
  safetyNote: "If anyone is at risk of injury, seek help right away.",
  excludeKeys: ["safety", "space", "demands"],
};

function hasAnyTrigger(triggers: Set<string>, codes: string[]): boolean {
  return codes.some((c) => triggers.has(c));
}

function triggerSetToArray(triggerSet: Set<string>): string[] {
  return Array.from(triggerSet);
}

function attemptFailed(outcome: CoachOutcomeUi): boolean {
  return outcome === "did_not_help" || outcome === "made_worse";
}

function buildExcludedKeys(
  strategiesTried: string[],
  outcome: CoachOutcomeUi
): string[] {
  const excluded: string[] = [];
  if (!attemptFailed(outcome)) return excluded;
  for (const code of strategiesTried) {
    if (code === DID_NOT_TRY_CODE) continue;
    const keys = STRATEGY_EXCLUDE_KEYS[code] ?? [getStrategyLabel(code).toLowerCase()];
    for (const k of keys) {
      if (!excluded.includes(k)) excluded.push(k);
    }
  }
  return excluded;
}

function cardMatchesTriggers(card: RecommendationCard, triggerSet: Set<string>): boolean {
  const text = `${card.action} ${card.why}`.toLowerCase();
  if (hasAnyTrigger(NOISE_STIM_TRIGGERS, triggerSetToArray(triggerSet)) && card.excludeKeys.some((k) => ["noise", "quiet", "calming routine"].includes(k))) {
    return true;
  }
  if (hasAnyTrigger(BODY_NEED_TRIGGERS, triggerSetToArray(triggerSet)) && text.includes("basic needs")) {
    return true;
  }
  if (hasAnyTrigger(TIME_EVENING_TRIGGERS, triggerSetToArray(triggerSet)) && text.includes("evening")) {
    return true;
  }
  return false;
}

function scoreCard(
  card: RecommendationCard,
  triggerSet: Set<string>,
  severity: number
): number {
  let score = 0;
  if (cardMatchesTriggers(card, triggerSet)) score += 10;
  if (severity >= 3 && card.safetyNote) score += 20;
  if (hasAnyTrigger(NOISE_STIM_TRIGGERS, triggerSetToArray(triggerSet)) && card.excludeKeys.some((k) => k.includes("noise") || k.includes("quiet"))) {
    score += 15;
  }
  if (hasAnyTrigger(BODY_NEED_TRIGGERS, triggerSetToArray(triggerSet)) && card.action.includes("basic needs")) {
    score += 15;
  }
  if (hasAnyTrigger(TIME_EVENING_TRIGGERS, triggerSetToArray(triggerSet)) && card.action.includes("evening")) {
    score += 15;
  }
  return score;
}

function isExcluded(card: RecommendationCard, excluded: string[]): boolean {
  const haystack = `${card.action} ${card.why}`.toLowerCase();
  for (const key of excluded) {
    if (haystack.includes(key)) return true;
  }
  for (const key of card.excludeKeys) {
    if (excluded.includes(key)) return true;
  }
  return false;
}

export function generateCoachRecommendations(params: {
  triggerCodes: string[];
  strategiesTried: string[];
  outcome: CoachOutcomeUi;
  severity: number;
}): RecommendationCard[] {
  const triggerSet = new Set(params.triggerCodes);
  const excluded = buildExcludedKeys(params.strategiesTried, params.outcome);

  const candidates: RecommendationCard[] = [];

  if (params.severity >= 3) {
    candidates.push(SAFETY_CARD);
  }

  if (hasAnyTrigger(NOISE_STIM_TRIGGERS, triggerSetToArray(triggerSet))) {
    candidates.push(POOL[0], POOL[1]);
  }
  if (hasAnyTrigger(BODY_NEED_TRIGGERS, triggerSetToArray(triggerSet))) {
    candidates.push(POOL[2]);
  }
  if (hasAnyTrigger(TIME_EVENING_TRIGGERS, triggerSetToArray(triggerSet))) {
    candidates.push(POOL[3]);
  }

  candidates.push(...POOL);

  const seen = new Set<string>();
  const ranked = candidates
    .filter((c) => {
      if (seen.has(c.action)) return false;
      seen.add(c.action);
      return !isExcluded(c, excluded);
    })
    .sort((a, b) => scoreCard(b, triggerSet, params.severity) - scoreCard(a, triggerSet, params.severity));

  const result = ranked.slice(0, 3);

  if (result.length < 3) {
    for (const card of POOL) {
      if (result.length >= 3) break;
      if (result.some((r) => r.action === card.action)) continue;
      if (isExcluded(card, excluded)) continue;
      result.push(card);
    }
  }

  return result.slice(0, 3);
}

export function recommendationActions(cards: RecommendationCard[]): string[] {
  return cards.map((c) => c.action);
}
