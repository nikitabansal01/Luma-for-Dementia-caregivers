/**
 * Luma — empathetic conversational logging engine (client-safe heuristics).
 */

import { BEHAVIOR_OPTIONS } from "./behaviorMap";
import {
  COACH_FLOW_STRATEGIES,
  COACH_FLOW_TRIGGER_GROUPS,
  DID_NOT_TRY_CODE,
  type CoachOutcomeUi,
} from "./coachFlowCatalog";
import {
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
  inferEpisodeDayContext,
  inferEpisodeTimeOfDay,
} from "./episodeTiming";
import {
  applyDraftInference,
  buildWarmRecap,
  generateNaturalFollowUp,
  LUMA_OPENING,
  primaryGap,
  type ConversationGap,
} from "./lumaConversationDesign";

export type LumaMessage = {
  id: string;
  role: "luma" | "user";
  text: string;
};

export type LumaDraft = {
  behavior_code?: string;
  behavior_label?: string;
  behavior_is_custom?: boolean;
  episode_recency?: EpisodeRecency;
  episode_time_of_day?: EpisodeTimeOfDay;
  episode_day_context?: EpisodeDayContext;
  severity?: number;
  trigger_hypotheses: string[];
  trigger_detail?: string;
  strategies_tried: string[];
  coach_outcome?: CoachOutcomeUi;
  notes?: string;
  triggers_answered?: boolean;
  strategies_answered?: boolean;
  outcome_answered?: boolean;
};

export type LumaStep =
  | "welcome"
  | "behavior"
  | "recency"
  | "time_of_day"
  | "day_context"
  | "severity"
  | "triggers"
  | "strategies"
  | "outcome"
  | "notes"
  | "confirm";

export function createEmptyDraft(): LumaDraft {
  return {
    trigger_hypotheses: [],
    strategies_tried: [],
  };
}

/** Ensure persisted or partial drafts always have required array fields. */
export function normalizeLumaDraft(draft: Partial<LumaDraft> | null | undefined): LumaDraft {
  const base = createEmptyDraft();
  if (!draft || typeof draft !== "object") return base;
  return {
    ...base,
    ...draft,
    trigger_hypotheses: Array.isArray(draft.trigger_hypotheses) ? [...draft.trigger_hypotheses] : [],
    strategies_tried: Array.isArray(draft.strategies_tried) ? [...draft.strategies_tried] : [],
  };
}

/** Build a short label from free text — max 3 words. */
export function keywordsToBehaviorLabel(text: string): string {
  if (isGreetingOrSmallTalk(text)) return "Other behavior";

  const stop = new Set([
    "a",
    "an",
    "the",
    "was",
    "were",
    "is",
    "are",
    "he",
    "she",
    "they",
    "my",
    "and",
    "but",
    "very",
    "really",
    "just",
    "about",
    "with",
    "when",
    "then",
    "that",
    "this",
    "had",
    "has",
    "have",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stop.has(w))
    .slice(0, 3);

  if (words.length === 0) return "Other behavior";

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const BEHAVIOR_HINTS: { code: string; terms: string[] }[] = [
  { code: "AGITATION_RESTLESSNESS", terms: ["agitat", "restless", "pacing", "fidget", "anxious"] },
  { code: "REPETITION_CALLING_OUT", terms: ["repeat", "calling out", "yelling my name", "same question"] },
  { code: "REFUSING_CARE", terms: ["refus", "won't let", "resist care", "declined"] },
  { code: "WANDERING", terms: ["wander", "wondered off", "walked off", "elop", "left the house", "drive the car", "driving alone", "wanted to drive", "took the keys", "home address"] },
  { code: "SUSPICION_PARANOIA", terms: ["paranoi", "suspicion", "accused", "stealing"] },
  { code: "VERBAL_AGGRESSION", terms: ["yell", "shout", "verbal", "insult", "swear"] },
  { code: "PHYSICAL_AGGRESSION", terms: ["hit", "kick", "bite", "push", "physical", "violent"] },
  { code: "WITHDRAWAL_CRYING", terms: ["withdraw", "cry", "crying", "teary", "shut down"] },
  { code: "SLEEP_DISRUPTION", terms: ["sleep", "insomnia", "woke up", "night"] },
];

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

/** Greetings and filler — not behavior descriptions. */
export function isGreetingOrSmallTalk(text: string): boolean {
  const n = normalize(text).replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
  const exact = new Set([
    "hi",
    "hello",
    "hey",
    "hiya",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "howdy",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "sure",
    "help",
    "start",
    "sup",
    "what's up",
    "whats up",
  ]);
  if (exact.has(n)) return true;
  if (/^(hi|hello|hey|thanks|thank you)\b/.test(n) && n.split(" ").length <= 4) return true;
  if (/\b(i am|i'm|im)\b.*\b(caregiver|carer|care giver)\b/.test(n)) return true;
  if (/\b(caregiver|carer)\b/.test(n) && n.split(" ").length <= 10) return true;
  return false;
}

export function looksLikeBehaviorDescription(text: string): boolean {
  if (isGreetingOrSmallTalk(text)) return false;
  const n = normalize(text);
  if (n.length < 6) return false;
  const words = n.split(/\s+/).filter(Boolean);
  return words.length >= 2 || n.length >= 14;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((t) => text.includes(t));
}

const TIME_PERIOD_TRIGGER_CODES = new Set([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHTTIME",
  "SUNDOWNING",
]);

function filterTimePeriodTriggers(
  codes: string[],
  episodeTimeOfDay?: EpisodeTimeOfDay
): string[] {
  if (!episodeTimeOfDay) return codes;
  return codes.filter((c) => !TIME_PERIOD_TRIGGER_CODES.has(c));
}

export function parseBehaviorFromText(
  text: string,
  customBehaviors: { code: string; label: string }[] = []
): { code: string; label: string; isCustom: boolean } | null {
  const n = normalize(text);

  for (const { code, label } of BEHAVIOR_OPTIONS) {
    const labelNorm = label.toLowerCase();
    if (n.includes(labelNorm) || labelNorm.split("/").some((p) => n.includes(p.trim()))) {
      return { code, label, isCustom: false };
    }
  }

  for (const { code, terms } of BEHAVIOR_HINTS) {
    if (includesAny(n, terms)) {
      const label = BEHAVIOR_OPTIONS.find((o) => o.code === code)?.label ?? code;
      return { code, label, isCustom: false };
    }
  }

  for (const custom of customBehaviors) {
    if (n.includes(custom.label.toLowerCase())) {
      return { code: custom.code, label: custom.label, isCustom: true };
    }
  }

  return null;
}

export function parseRecency(text: string): EpisodeRecency | null {
  const n = normalize(text);
  if (includesAny(n, ["just now", "right now", "happening now", "still going"])) return "just_now";
  if (includesAny(n, ["earlier today", "this morning", "this afternoon", "few hours"])) return "earlier_today";
  if (includesAny(n, ["yesterday", "last night"])) return "yesterday";
  if (
    includesAny(n, [
      "few days",
      "couple days",
      "last week",
      "past weekend",
      "this weekend",
      "last weekend",
    ])
  )
    return "few_days_ago";
  if (includesAny(n, ["not sure", "don't know", "unsure", "can't remember"])) return "not_sure";
  return null;
}

export function parseTimeOfDay(text: string): EpisodeTimeOfDay | null {
  const n = normalize(text);
  if (includesAny(n, ["overnight", "middle of the night", "3 am", "4 am"])) return "overnight";
  if (includesAny(n, ["morning", "breakfast"])) return "morning";
  if (includesAny(n, ["afternoon", "lunch", "midday"])) return "afternoon";
  if (includesAny(n, ["evening", "dinner", "sundown", "dusk"])) return "evening";
  if (includesAny(n, ["night", "bedtime", "late"])) return "night";
  if (includesAny(n, ["not sure", "don't know", "unsure"])) return "not_sure";
  return null;
}

export function parseDayContext(text: string): EpisodeDayContext | null {
  const n = normalize(text);
  if (includesAny(n, ["weekend", "saturday", "sunday"])) return "weekend";
  if (includesAny(n, ["holiday", "unusual", "special day"])) return "holiday_unusual";
  if (includesAny(n, ["appointment", "doctor", "outting", "outing", "visit"])) return "appointment_outing";
  if (includesAny(n, ["usual", "normal day", "weekday", "typical"])) return "weekday_usual";
  if (includesAny(n, ["not sure", "don't know", "unsure"])) return "not_sure";
  return null;
}

export function parseSeverity(text: string): number | null {
  const n = normalize(text);
  if (/\b1\b/.test(n) || includesAny(n, ["mild", "manageable", "small", "not too bad", "little"])) return 1;
  if (/\b3\b/.test(n) || includesAny(n, ["severe", "very challenging", "crisis", "emergency", "worst", "extreme"])) return 3;
  if (/\b2\b/.test(n) || includesAny(n, ["moderate", "distressing", "medium", "pretty bad"])) return 2;
  return null;
}

export function parseTriggers(text: string): string[] {
  const n = normalize(text);
  const found: string[] = [];

  if (
    includesAny(n, [
      "lack of sleep",
      "didn't sleep",
      "did not sleep",
      "no sleep",
      "poor sleep",
      "restless night",
      "couldn't sleep",
      "could not sleep",
      "not sleep well",
      "slept poorly",
    ])
  ) {
    found.push("FATIGUE");
  }
  if (includesAny(n, ["uneasy", "unsettled", "anxious", "worried the night"])) {
    found.push("FEAR");
  }

  for (const group of COACH_FLOW_TRIGGER_GROUPS) {
    // Time-of-day chips (Morning, Evening…) are episode timing — not triggers.
    if (group.category === "Time") continue;
    for (const chip of group.chips) {
      if (n.includes(chip.label.toLowerCase())) found.push(chip.code);
    }
  }
  return found;
}

export function parseStrategies(text: string): string[] {
  const n = normalize(text);
  if (includesAny(n, ["didn't try", "did not try", "nothing yet", "not yet", "no strategy"])) {
    return [DID_NOT_TRY_CODE];
  }
  const found: string[] = [];
  if (
    includesAny(n, [
      "called neighbor",
      "calling neighbor",
      "called all my",
      "called his",
      "called her",
      "called friends",
      "called relative",
      "called family",
      "called someone",
    ])
  ) {
    found.push("CALLED_HELP");
  }
  for (const s of COACH_FLOW_STRATEGIES) {
    if (n.includes(s.label.toLowerCase())) found.push(s.code);
  }
  return found;
}

export function parseOutcome(text: string): CoachOutcomeUi | null {
  const n = normalize(text);
  if (includesAny(n, ["helped a little", "helped little", "somewhat"])) return "helped_little";
  if (includesAny(n, ["helped", "better", "calmed", "worked"])) return "helped";
  if (includesAny(n, ["worse", "escalat", "made it"])) return "made_worse";
  if (includesAny(n, ["did not help", "didn't help", "no change", "same"])) return "did_not_help";
  if (includesAny(n, ["not sure", "don't know", "too soon", "skip"])) return "not_sure";
  return null;
}

export function isSkipIntent(text: string): boolean {
  const n = normalize(text);
  return includesAny(n, ["skip", "not sure", "don't know", "later", "pass", "none", "nothing"]);
}

export function absorbFreeform(
  text: string,
  draft: LumaDraft,
  customBehaviors: { code: string; label: string }[]
): LumaDraft {
  const next = {
    ...draft,
    trigger_hypotheses: [...draft.trigger_hypotheses],
    strategies_tried: [...draft.strategies_tried],
  };

  if (!next.behavior_code && looksLikeBehaviorDescription(text)) {
    const b = parseBehaviorFromText(text, customBehaviors);
    if (b) {
      next.behavior_code = b.code;
      next.behavior_label = b.label;
      next.behavior_is_custom = b.isCustom;
    }
  }

  if (!next.episode_recency) next.episode_recency = parseRecency(text) ?? undefined;
  if (!next.episode_time_of_day) next.episode_time_of_day = parseTimeOfDay(text) ?? undefined;
  if (!next.episode_day_context) next.episode_day_context = parseDayContext(text) ?? undefined;
  if (!next.severity) next.severity = parseSeverity(text) ?? undefined;

  const triggers = parseTriggers(text);
  if (triggers.length > 0) {
    const merged = Array.from(new Set([...next.trigger_hypotheses, ...triggers]));
    next.trigger_hypotheses = filterTimePeriodTriggers(merged, next.episode_time_of_day);
  }

  const strategies = parseStrategies(text);
  if (strategies.length > 0) next.strategies_tried = strategies;

  if (!next.coach_outcome) next.coach_outcome = parseOutcome(text) ?? undefined;

  if (!next.behavior_code && looksLikeBehaviorDescription(text) && text.trim().length > 30) {
    if (!next.notes) next.notes = text.trim().slice(0, 500);
  }

  return next;
}

function gapToStep(gap: ConversationGap): LumaStep | "confirm" {
  switch (gap) {
    case "story":
      return "behavior";
    case "timing":
      return "recency";
    case "intensity":
      return "severity";
    case "context":
      return "triggers";
    case "response":
      return "strategies";
    case "review":
      return "confirm";
  }
}

export function absorbGapResponse(userText: string, draft: LumaDraft): LumaDraft {
  const gap = primaryGap(draft);
  let next = { ...draft };

  if (gap === "context" || parseTriggers(userText).length > 0) {
    const triggers = parseTriggers(userText);
    if (triggers.length > 0) next.trigger_hypotheses = triggers;
    else if (!isSkipIntent(userText) && userText.trim().length > 8) {
      next.trigger_detail = userText.trim().slice(0, 500);
    }
    if (triggers.length > 0 || next.trigger_detail || isSkipIntent(userText)) {
      next.triggers_answered = true;
    }
  }

  if (gap === "response" || parseStrategies(userText).length > 0) {
    const strategies = parseStrategies(userText);
    if (strategies.length > 0) {
      next.strategies_tried = strategies;
      next.strategies_answered = true;
    } else if (gap === "response" && isSkipIntent(userText)) {
      next.strategies_tried = [DID_NOT_TRY_CODE];
      next.strategies_answered = true;
      next.coach_outcome = "not_applicable";
      next.outcome_answered = true;
    }
  }

  if (
    (gap === "response" && next.strategies_answered) ||
    parseOutcome(userText)
  ) {
    const outcome = parseOutcome(userText);
    if (outcome) {
      next.coach_outcome = outcome;
      next.outcome_answered = true;
    } else if (gap === "response" && next.strategies_answered && isSkipIntent(userText)) {
      next.coach_outcome = "not_sure";
      next.outcome_answered = true;
    }
  }

  if (gap === "timing") {
    if (!next.episode_recency) {
      const r = parseRecency(userText);
      if (r) next.episode_recency = r;
      else if (isSkipIntent(userText)) next.episode_recency = "not_sure";
    }
    if (!next.episode_time_of_day) {
      const t = parseTimeOfDay(userText);
      if (t) next.episode_time_of_day = t;
      else if (isSkipIntent(userText)) next.episode_time_of_day = "not_sure";
    }
    if (!next.episode_day_context) {
      const d = parseDayContext(userText);
      if (d) next.episode_day_context = d;
      else if (isSkipIntent(userText)) next.episode_day_context = "not_sure";
    }
  }

  if (gap === "intensity") {
    const s = parseSeverity(userText);
    if (s) next.severity = s;
  }

  return next;
}

export function nextMissingStep(draft: LumaDraft): LumaStep | "confirm" {
  return gapToStep(primaryGap(applyDraftInference(draft)));
}

/** Rule-based extraction — always runs alongside the scribe LLM. */
export function applyHeuristicExtraction(
  userText: string,
  draft: LumaDraft,
  customBehaviors: { code: string; label: string }[]
): LumaDraft {
  let next = absorbFreeform(userText, draft, customBehaviors);
  next = absorbGapResponse(userText, next);
  return applyDraftInference(next);
}

export type LumaTurnResult = {
  draft: LumaDraft;
  step: LumaStep | "confirm" | "done";
  lumaMessages: string[];
  needsCustomBehavior?: { label: string };
};

export function processLumaTurn(
  step: LumaStep | "confirm",
  userText: string,
  draft: LumaDraft,
  customBehaviors: { code: string; label: string }[]
): LumaTurnResult {
  let nextDraft = absorbFreeform(userText, draft, customBehaviors);
  nextDraft = absorbGapResponse(userText, nextDraft);
  nextDraft = applyDraftInference(nextDraft);

  if (step === "welcome" || step === "behavior" || primaryGap(nextDraft) === "story") {
    if (!nextDraft.behavior_code) {
      if (isGreetingOrSmallTalk(userText) || !looksLikeBehaviorDescription(userText)) {
        return {
          draft: nextDraft,
          step: "behavior",
          lumaMessages: [
            isGreetingOrSmallTalk(userText)
              ? /\b(caregiver|carer)\b/.test(normalize(userText))
                ? "Thank you for being here — caregiving asks a lot of you. When a moment comes to mind, tell me about it. We'll take it one piece at a time."
                : "Hi — I'm glad you're here. There's no rush. What's been going on?"
              : generateNaturalFollowUp(nextDraft, userText),
          ],
        };
      }
      const label = keywordsToBehaviorLabel(userText);
      if (label === "Other behavior") {
        return {
          draft: nextDraft,
          step: "behavior",
          lumaMessages: [generateNaturalFollowUp(nextDraft, userText)],
        };
      }
      return {
        draft: nextDraft,
        step: "behavior",
        lumaMessages: [
          `I want to name this in a way that feels right — would "${label}" fit? You can say yes, or put it differently.`,
        ],
        needsCustomBehavior: { label },
      };
    }
  }

  if (step === "confirm" || primaryGap(nextDraft) === "review") {
    if (includesAny(normalize(userText), ["yes", "save", "correct", "looks good", "confirm", "sure"])) {
      return { draft: nextDraft, step: "done", lumaMessages: ["Saving this for you now…"] };
    }
    if (includesAny(normalize(userText), ["no", "change", "edit", "wait"])) {
      return {
        draft: nextDraft,
        step: "behavior",
        lumaMessages: ["Of course — what would you like to adjust?"],
      };
    }
    if (primaryGap(nextDraft) === "review") {
      return {
        draft: nextDraft,
        step: "confirm",
        lumaMessages: [buildWarmRecap(nextDraft)],
      };
    }
  }

  const gap = primaryGap(nextDraft);
  return {
    draft: nextDraft,
    step: gapToStep(gap),
    lumaMessages: [generateNaturalFollowUp(nextDraft, userText)],
  };
}

export function confirmCustomBehavior(
  userText: string,
  proposedLabel: string,
  draft: LumaDraft,
  customBehaviors: { code: string; label: string }[]
): LumaTurnResult {
  const n = normalize(userText);
  if (includesAny(n, ["yes", "yeah", "yep", "correct", "that's right", "ok", "okay", "sure"])) {
    return {
      draft: { ...draft, behavior_label: proposedLabel, behavior_is_custom: true },
      step: "behavior",
      lumaMessages: [`Got it — we'll call it "${proposedLabel}".`],
    };
  }
  const reparsed = parseBehaviorFromText(userText, customBehaviors);
  if (reparsed) {
    const nextDraft = {
      ...draft,
      behavior_code: reparsed.code,
      behavior_label: reparsed.label,
      behavior_is_custom: reparsed.isCustom,
    };
    return processLumaTurn("behavior", userText, nextDraft, customBehaviors);
  }
  const label = keywordsToBehaviorLabel(userText);
  return {
    draft,
    step: "behavior",
    lumaMessages: [`How about "${label}"? Say yes if that works.`],
    needsCustomBehavior: { label },
  };
}

export function finalizeLumaDraft(draft: LumaDraft): LumaDraft {
  return {
    ...draft,
    episode_recency: draft.episode_recency ?? "just_now",
    episode_time_of_day: draft.episode_time_of_day ?? inferEpisodeTimeOfDay(),
    episode_day_context: draft.episode_day_context ?? inferEpisodeDayContext(),
    severity: draft.severity ?? 2,
    strategies_tried:
      draft.strategies_tried.length > 0 ? draft.strategies_tried : [DID_NOT_TRY_CODE],
    coach_outcome: draft.coach_outcome ?? "not_sure",
  };
}

export function getInitialLumaMessages(): string[] {
  return [LUMA_OPENING];
}
