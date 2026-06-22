/**
 * Luma LLM — Companion + Scribe architecture.
 * Companion: natural empathetic conversation (stronger model, plain text).
 * Scribe: structured care-log extraction (lower model, JSON) — runs in parallel.
 * Server-only (uses API keys from env).
 */

import { BEHAVIOR_CODES, BEHAVIOR_OPTIONS } from "./behaviorMap";
import {
  COACH_FLOW_STRATEGIES,
  COACH_FLOW_TRIGGER_GROUPS,
  DID_NOT_TRY_CODE,
  type CoachOutcomeUi,
} from "./coachFlowCatalog";
import type { EpisodeDayContext, EpisodeRecency, EpisodeTimeOfDay } from "./episodeTiming";
import type { LumaDraft, LumaStep } from "./lumaEngine";
import { applyHeuristicExtraction, isGreetingOrSmallTalk, isKnownStrategyCode, keywordsToBehaviorLabel, keywordsToShortLabel } from "./lumaEngine";
import { findCustomStrategyByLabel } from "./customStrategies";
import { buildStrategyMirrorMessage } from "./lumaConversationDesign";
import {
  applyDraftInference,
  buildBehaviorMirrorMessage,
  buildCompanionScribeBrief,
  buildDraftPanelPointer,
  describeConversationState,
  draftHasContent,
  ensureCompanionGapNudge,
  primaryGap,
  userAskingForDraftSummary,
  userConfirmedSave,
  userSignalsWrappingUp,
} from "./lumaConversationDesign";
import {
  buildCareContextLine,
  buildLumaCareProfileBrief,
  type LumaCareProfileInput,
} from "./careProfile";
import { z } from "zod";

export type LumaChatTurn = { role: "user" | "assistant"; content: string };
export type { LumaCareProfileInput };

const episodeRecencySchema = z.enum([
  "just_now",
  "earlier_today",
  "yesterday",
  "few_days_ago",
  "not_sure",
]);

const episodeTimeSchema = z.enum([
  "morning",
  "afternoon",
  "evening",
  "night",
  "overnight",
  "not_sure",
]);

const episodeDaySchema = z.enum([
  "weekday_usual",
  "weekend",
  "holiday_unusual",
  "appointment_outing",
  "not_sure",
]);

const outcomeSchema = z.enum([
  "helped",
  "helped_little",
  "did_not_help",
  "made_worse",
  "not_sure",
  "not_applicable",
]);

const draftUpdatesSchema = z.object({
  behavior_code: z.string().nullable().optional(),
  behavior_label: z.string().nullable().optional(),
  behavior_is_custom: z.boolean().optional(),
  proposed_custom_behavior_label: z.string().nullable().optional(),
  proposed_custom_strategy_label: z.string().nullable().optional(),
  episode_recency: episodeRecencySchema.nullable().optional(),
  episode_time_of_day: episodeTimeSchema.nullable().optional(),
  episode_day_context: episodeDaySchema.nullable().optional(),
  episode_frequency: z.string().nullable().optional(),
  severity: z.number().int().min(1).max(3).nullable().optional(),
  trigger_hypotheses: z.array(z.string()).optional(),
  trigger_detail: z.string().nullable().optional(),
  strategies_tried: z.array(z.string()).optional(),
  coach_outcome: outcomeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  triggers_answered: z.boolean().optional(),
  strategies_answered: z.boolean().optional(),
  outcome_answered: z.boolean().optional(),
});

const scribeResponseSchema = z.object({
  draft_updates: draftUpdatesSchema.optional(),
  ready_to_save: z.boolean().optional(),
});

export type LumaLlmResult = {
  reply: string;
  draft: LumaDraft;
  step: LumaStep | "confirm" | "done";
  needsCustomBehavior?: { label: string };
  needsCustomStrategy?: { label: string };
};

type LlmProvider = "openai" | "anthropic";

function resolveProvider(): LlmProvider | null {
  const forced = process.env.LUMA_LLM_PROVIDER?.toLowerCase();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function isLumaLlmConfigured(): boolean {
  return resolveProvider() !== null;
}

export function getLumaModelConfig(): {
  companionModel: string;
  scribeModel: string;
} | null {
  const provider = resolveProvider();
  if (!provider) return null;
  if (provider === "openai") {
    return {
      companionModel: process.env.LUMA_COMPANION_OPENAI_MODEL ?? "gpt-4o",
      scribeModel:
        process.env.LUMA_SCRIBE_OPENAI_MODEL ??
        process.env.LUMA_OPENAI_MODEL ??
        "gpt-4o-mini",
    };
  }
  return {
    companionModel:
      process.env.LUMA_COMPANION_ANTHROPIC_MODEL ??
      process.env.LUMA_ANTHROPIC_MODEL ??
      "claude-3-5-sonnet-latest",
    scribeModel:
      process.env.LUMA_SCRIBE_ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  };
}

const TIME_PERIOD_TRIGGER_CODES = new Set([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHTTIME",
  "SUNDOWNING",
]);

const TRIGGER_CODES = new Set(
  COACH_FLOW_TRIGGER_GROUPS.flatMap((g) => g.chips.map((c) => c.code))
);
const STRATEGY_CODES = new Set(COACH_FLOW_STRATEGIES.map((s) => s.code));

function sanitizeTriggerCodes(codes: string[], draft: LumaDraft): string[] {
  return codes.filter((c) => {
    if (!TIME_PERIOD_TRIGGER_CODES.has(c)) return true;
    return !draft.episode_time_of_day;
  });
}

function buildCompanionSystemPrompt(
  draft: LumaDraft,
  step: LumaStep | "confirm",
  careProfileBrief: string
): string {
  const d = applyDraftInference(draft);
  const gap = primaryGap(d);
  const scribeBrief = buildCompanionScribeBrief(d);
  const turnDirective =
    gap === "review" || step === "confirm"
      ? `\n## Required now\nInvite them to check the draft note below and say yes to save. Do not recap note fields in chat.`
      : `\n## Your move this turn
1. Briefly acknowledge what they shared (one or two sentences — validate feelings first if they're upset).
2. Then ask ONE warm question about the current priority gap (see Capture status below).
Do not wait for them to ask what else you need. Do not ask about multiple gaps at once.`;

  const transparencyBlock = draftHasContent(d)
    ? `\n## Draft transparency\nA draft note panel is visible on screen and updates as you and your scribe capture details. Do NOT read out the full note in chat — point to the draft panel in one sentence if helpful.`
    : `\n## Draft transparency\nA draft note panel on screen will fill in as you talk. When the first detail is captured, you may mention in one sentence that it's appearing in their draft note below.`;

  return `You are Luma — a calm, emotionally attuned companion for caregivers of people with dementia.

Your job is to be present with the caregiver AND gently guide the conversation so their notes reveal useful patterns over time. You are NOT a cold survey — but you are also not passive. After you listen and reflect, you lead with the next natural question.

## Partnership with your scribe
You work in parallel with a silent scribe that extracts structured data into the draft note. You share the same picture of what's captured and what's still open. Your questions give the scribe material to write down; the scribe's notes tell you what to ask next. Never mention "scribe" or "agent" to the caregiver.
${careProfileBrief}
${scribeBrief}${turnDirective}${transparencyBlock}

## How to talk
- Warm, everyday language. Contractions are fine. Usually one gentle thought or question at a time.
- Reflect what you heard before asking anything new.
- When they share a lot at once, absorb it all — do not re-ask what they already told you.
- Validate feelings first, especially after frightening events (wandering, aggression, falls).
- Offer brief, compassionate dementia context when it helps (e.g. searching for a childhood home often reflects time/place confusion).
- When they seem to pause or finish a thought, ask about the current priority gap — still in conversational language.
- When naming what happened, **mirror** what you heard like a friend: "It sounds like wandering might be what you're witnessing" — never "Would X fit?" or "Say yes if that works."
- If you're unsure between two observations, offer gently: "It could sound like X or Y — which feels closer?"

## Formatting (for on-screen reading)
- Use short paragraphs (1–3 sentences), separated by a blank line between each.
- When sharing multiple ideas, reflections, or gentle suggestions, use a short bullet list with "- " at the start of each line.
- Do not use numbered lists or survey-style option lists.

## Length (critical)
- Keep each reply short: ideally 2-3 sentences (acknowledgment + one question), max ~4 sentences per turn.
- Do not stack validation + multiple questions + save prompt in one message.
- Never recap note fields in chat; the draft panel on screen shows that.

## Never mention
Logging, forms, fields, severity scales, trigger codes, episode timing categories, or databases.

## Forbidden phrasing
- "How intense on a scale of..."
- "What was the episode time of day?"
- "What else do you need from me?" (they won't ask — you lead)
- "Would [behavior] fit?" / "Does that work for you?" / "Say yes if..."
- "I want to name this..." / clinical intake or form language
- Numbered questions or bullet lists of options
- Survey-style back-to-back questions

Respond with plain text only — your message to the caregiver, nothing else.`;
}

function buildScribeSystemPrompt(
  customBehaviors: { code: string; label: string }[],
  customStrategies: { code: string; label: string }[]
): string {
  const behaviorList = BEHAVIOR_OPTIONS.map((b) => `${b.code}: ${b.label}`).join("\n");
  const customBehaviorList =
    customBehaviors.length > 0
      ? customBehaviors.map((b) => `${b.code}: ${b.label}`).join("\n")
      : "(none yet)";
  const customStrategyList =
    customStrategies.length > 0
      ? customStrategies.map((s) => `${s.code}: ${s.label}`).join("\n")
      : "(none yet)";
  const triggerList = COACH_FLOW_TRIGGER_GROUPS.flatMap((g) =>
    g.chips.map((c) => c.code)
  ).join(", ");
  const strategyList = COACH_FLOW_STRATEGIES.map((s) => s.code).join(", ");

  return `You are the silent scribe for Luma's care notes. You read the conversation transcript and extract structured data. You never speak to the caregiver.

Your companion asks warm questions about what's still open; your job is to capture answers into the draft. Extract into draft_updates whenever the transcript contains relevant information. Merge with the current draft — only add or update fields supported by what was said. Never invent details.

Known behavior codes:
${behaviorList}

Custom behaviors:
${customBehaviorList}

Custom strategies (caregiver's own):
${customStrategyList}

Only set proposed_custom_behavior_label when they clearly describe a behavior NOT in the list (max 3 words). Never use greetings as labels.
Only set proposed_custom_strategy_label when they describe something they tried that is NOT in the strategy list — distill to 1–3 skimmable words (e.g. "Silent presence", "Monthly" is for frequency not strategy). Never use greetings as labels.

Field codes for draft_updates:
Episode recency: just_now | earlier_today | yesterday | few_days_ago | not_sure
Time of day: morning | afternoon | evening | night | overnight | not_sure
Day context: weekday_usual | weekend | holiday_unusual | appointment_outing | not_sure
episode_frequency: how often the pattern recurs — short label only, max 3 words (e.g. "Monthly", "Weekly", "Rare"). NOT when this single episode happened.
Severity: 1 (mild) | 2 (moderate) | 3 (very hard)
Possible triggers (why it might have happened, NOT when): ${triggerList}
Strategies: ${strategyList} plus custom strategy codes above
Outcome: helped | helped_little | did_not_help | made_worse | not_sure | not_applicable
trigger_detail: short prose for what changed right before the behavior (optional)
notes: free-form narrative — emotional context, quotes, details that do not fit a chip or dropdown. Merge with existing notes; append new details from this turn rather than wiping prior notes.

CRITICAL — time vs trigger:
- episode_time_of_day = when the behavior happened (morning, evening, etc.)
- trigger_hypotheses = possible triggers only (fatigue, fear, noise, hunger…)
- NEVER put MORNING, AFTERNOON, EVENING, NIGHTTIME, or SUNDOWNING in trigger_hypotheses — those are times, not causes
- "lack of sleep" / "didn't sleep" / "restless night" → FATIGUE in trigger_hypotheses; put detail in trigger_detail
- "uneasy the night before" / "anxious" → FEAR or trigger_detail
- "wandered in the morning" → episode_time_of_day: morning ONLY, not MORNING trigger
- "calling neighbors" / "called friends" → CALLED_HELP in strategies_tried

Set triggers_answered, strategies_answered, outcome_answered true when discussed or clearly skipped.
Use DID_NOT_TRY when they didn't try anything.
Set ready_to_save true ONLY when the user clearly confirms saving (yes, save, looks good, that's right).

Respond ONLY with JSON: { "draft_updates": {}, "ready_to_save": false }`;
}

function buildScribeContextMessage(draft: LumaDraft, careContextLine: string | null): string {
  const profileBlock = careContextLine ? `\n\n[Care profile context]\n${careContextLine}` : "";
  return `[Current draft JSON]\n${JSON.stringify(draft)}\n\n[Extraction guide]\n${describeConversationState(draft)}${profileBlock}`;
}

function gapToStep(gap: ReturnType<typeof primaryGap>): LumaStep | "confirm" {
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

const LLM_TIMEOUT_MS = 25_000;
const COMPANION_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = LLM_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Luma took too long to respond — please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function historyToOpenAiMessages(history: LumaChatTurn[]) {
  return history.slice(-16).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

async function callOpenAiChat(
  messages: Array<{ role: string; content: string }>,
  options: { model: string; json?: boolean; temperature?: number; timeoutMs?: number }
): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        temperature: options.temperature ?? 0.78,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    },
    options.timeoutMs ?? LLM_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty response");
  return content;
}

async function callOpenAiCompanion(
  draft: LumaDraft,
  history: LumaChatTurn[],
  step: LumaStep | "confirm",
  careProfileBrief: string
): Promise<string> {
  const model = process.env.LUMA_COMPANION_OPENAI_MODEL ?? "gpt-4o";

  return callOpenAiChat(
    [
      { role: "system", content: buildCompanionSystemPrompt(draft, step, careProfileBrief) },
      ...historyToOpenAiMessages(history),
    ],
    { model, temperature: 0.85, timeoutMs: COMPANION_TIMEOUT_MS }
  );
}

async function callOpenAiScribe(
  draft: LumaDraft,
  history: LumaChatTurn[],
  customBehaviors: { code: string; label: string }[],
  customStrategies: { code: string; label: string }[],
  careContextLine: string | null
): Promise<z.infer<typeof scribeResponseSchema>> {
  const model =
    process.env.LUMA_SCRIBE_OPENAI_MODEL ??
    process.env.LUMA_OPENAI_MODEL ??
    "gpt-4o-mini";

  const raw = await callOpenAiChat(
    [
      { role: "system", content: buildScribeSystemPrompt(customBehaviors, customStrategies) },
      ...historyToOpenAiMessages(history),
      { role: "system", content: buildScribeContextMessage(draft, careContextLine) },
    ],
    { model, json: true, temperature: 0.2 }
  );

  return parseScribeResponse(raw);
}

async function callAnthropicChat(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: { model: string; json?: boolean; temperature?: number; timeoutMs?: number }
): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 1024,
        temperature: options.temperature ?? 0.78,
        system: options.json ? `${system}\n\nRespond with JSON only, no markdown fences.` : system,
        messages,
      }),
    },
    options.timeoutMs ?? LLM_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) throw new Error("Anthropic returned empty response");
  return text;
}

async function callAnthropicCompanion(
  draft: LumaDraft,
  history: LumaChatTurn[],
  step: LumaStep | "confirm",
  careProfileBrief: string
): Promise<string> {
  const model =
    process.env.LUMA_COMPANION_ANTHROPIC_MODEL ??
    process.env.LUMA_ANTHROPIC_MODEL ??
    "claude-3-5-sonnet-latest";

  return callAnthropicChat(
    buildCompanionSystemPrompt(draft, step, careProfileBrief),
    historyToOpenAiMessages(history),
    { model, temperature: 0.85, timeoutMs: COMPANION_TIMEOUT_MS }
  );
}

async function callAnthropicScribe(
  draft: LumaDraft,
  history: LumaChatTurn[],
  customBehaviors: { code: string; label: string }[],
  customStrategies: { code: string; label: string }[],
  careContextLine: string | null
): Promise<z.infer<typeof scribeResponseSchema>> {
  const model = process.env.LUMA_SCRIBE_ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";

  const raw = await callAnthropicChat(
    buildScribeSystemPrompt(customBehaviors, customStrategies),
    [
      ...historyToOpenAiMessages(history),
      { role: "user", content: buildScribeContextMessage(draft, careContextLine) },
    ],
    { model, json: true, temperature: 0.2 }
  );

  return parseScribeResponse(raw);
}

function parseScribeResponse(raw: string): z.infer<typeof scribeResponseSchema> {
  try {
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim());
    return scribeResponseSchema.parse(json);
  } catch {
    throw new Error("Scribe returned invalid JSON");
  }
}

function isKnownBehavior(code: string, customBehaviors: { code: string }[]): boolean {
  if ((BEHAVIOR_CODES as readonly string[]).includes(code)) return true;
  return customBehaviors.some((b) => b.code === code);
}

function mergeDraft(
  draft: LumaDraft,
  updates: z.infer<typeof draftUpdatesSchema> | undefined,
  customBehaviors: { code: string; label: string }[],
  customStrategies: { code: string; label: string }[] = []
): {
  draft: LumaDraft;
  needsCustomBehavior?: { label: string };
  needsCustomStrategy?: { label: string };
} {
  if (!updates) return { draft };

  const next: LumaDraft = {
    ...draft,
    trigger_hypotheses: [...draft.trigger_hypotheses],
    strategies_tried: [...draft.strategies_tried],
  };

  if (updates.behavior_code && isKnownBehavior(updates.behavior_code, customBehaviors)) {
    next.behavior_code = updates.behavior_code;
    next.behavior_label =
      updates.behavior_label ??
      BEHAVIOR_OPTIONS.find((b) => b.code === updates.behavior_code)?.label ??
      customBehaviors.find((b) => b.code === updates.behavior_code)?.label ??
      updates.behavior_code;
    next.behavior_is_custom = customBehaviors.some((b) => b.code === updates.behavior_code);
  } else if (updates.proposed_custom_behavior_label?.trim()) {
    const raw = updates.proposed_custom_behavior_label.trim();
    if (!isGreetingOrSmallTalk(raw)) {
      const label = keywordsToBehaviorLabel(raw);
      if (label !== "Other behavior") {
        return { draft: next, needsCustomBehavior: { label } };
      }
    }
  } else if (updates.behavior_label?.trim() && !next.behavior_code) {
    const raw = updates.behavior_label.trim();
    if (!isGreetingOrSmallTalk(raw)) {
      const label = keywordsToBehaviorLabel(raw);
      if (label !== "Other behavior") {
        return { draft: next, needsCustomBehavior: { label } };
      }
    }
  }

  if (updates.episode_recency) next.episode_recency = updates.episode_recency as EpisodeRecency;
  if (updates.episode_time_of_day)
    next.episode_time_of_day = updates.episode_time_of_day as EpisodeTimeOfDay;
  if (updates.episode_day_context)
    next.episode_day_context = updates.episode_day_context as EpisodeDayContext;
  if (updates.episode_frequency != null) {
    const freq =
      keywordsToShortLabel(updates.episode_frequency, "") ||
      updates.episode_frequency.trim().slice(0, 24);
    next.episode_frequency = freq || undefined;
  }
  if (updates.severity != null) next.severity = updates.severity;

  if (updates.trigger_hypotheses?.length) {
    next.trigger_hypotheses = sanitizeTriggerCodes(
      updates.trigger_hypotheses.filter((c) => TRIGGER_CODES.has(c)),
      next
    );
  }
  if (updates.trigger_detail != null)
    next.trigger_detail = updates.trigger_detail.slice(0, 500) || undefined;
  if (updates.triggers_answered != null) next.triggers_answered = updates.triggers_answered;

  if (updates.strategies_tried?.length) {
    next.strategies_tried = updates.strategies_tried.filter((c) =>
      isKnownStrategyCode(c, customStrategies)
    );
    if (next.strategies_tried.length === 0) next.strategies_tried = [DID_NOT_TRY_CODE];
  }
  if (updates.strategies_answered != null) next.strategies_answered = updates.strategies_answered;

  if (updates.proposed_custom_strategy_label?.trim()) {
    const raw = updates.proposed_custom_strategy_label.trim();
    if (!isGreetingOrSmallTalk(raw)) {
      const label = keywordsToShortLabel(raw, "");
      if (label) {
        const existing = findCustomStrategyByLabel(label, customStrategies);
        if (existing) {
          const codes = next.strategies_tried.filter((c) => c !== DID_NOT_TRY_CODE);
          if (!codes.includes(existing.code)) {
            next.strategies_tried = [...codes, existing.code];
            next.strategies_answered = true;
          }
        } else if (!COACH_FLOW_STRATEGIES.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
          return { draft: next, needsCustomStrategy: { label } };
        }
      }
    }
  }

  if (updates.coach_outcome != null)
    next.coach_outcome = updates.coach_outcome as CoachOutcomeUi;
  if (updates.outcome_answered != null) next.outcome_answered = updates.outcome_answered;

  if (updates.notes != null) {
    const incoming = updates.notes.trim().slice(0, 2000);
    if (!incoming) {
      // Scribe explicitly cleared notes
      if (updates.notes === "") next.notes = undefined;
    } else if (!next.notes?.trim()) {
      next.notes = incoming;
    } else if (!next.notes.includes(incoming.slice(0, Math.min(incoming.length, 80)))) {
      next.notes = `${next.notes.trim()}\n\n${incoming}`.slice(0, 2000);
    }
  }

  return { draft: applyDraftInference(next) };
}

function resolveTurnStep(
  step: LumaStep | "confirm",
  userText: string,
  draft: LumaDraft,
  scribeReadyToSave: boolean
): LumaStep | "confirm" | "done" {
  const gap = primaryGap(draft);
  const canSave = Boolean(draft.behavior_code || draft.behavior_is_custom);
  const confirmed =
    scribeReadyToSave ||
    (userConfirmedSave(userText) && canSave && (step === "confirm" || gap === "review"));

  if (confirmed) return "done";
  return gapToStep(gap);
}

function finalizeCompanionReply(
  reply: string,
  draft: LumaDraft,
  userText: string,
  step: LumaStep | "confirm" | "done",
  priorDraft: LumaDraft
): string {
  let finalReply = reply.trim();

  // Save prompt — keep chat short; draft panel holds the recap
  if (step === "confirm" && !userConfirmedSave(userText)) {
    if (!/\b(save|draft note|draft log)\b/i.test(finalReply)) {
      finalReply = `${finalReply}\n\nIf the draft note below looks right, say yes to save — or tell me what to change.`;
    }
    return finalReply;
  }

  if (step === "done") return finalReply;

  const hadContent = draftHasContent(priorDraft);
  const hasContent = draftHasContent(draft);
  const firstCapture = !hadContent && hasContent;
  const askMirror = userAskingForDraftSummary(userText);
  const wrapUp = userSignalsWrappingUp(userText);

  if (askMirror) {
    const pointer = buildDraftPanelPointer(draft);
    if (!/\bdraft note\b/i.test(finalReply) && !/\bdraft log\b/i.test(finalReply)) {
      finalReply = `${finalReply}\n\n${pointer}`;
    }
    return finalReply;
  }

  if (wrapUp || firstCapture) {
    const pointer = firstCapture
      ? "I'm adding this to your draft note below — feel free to keep going or correct anything."
      : buildDraftPanelPointer(draft);
    if (!/\bdraft note\b/i.test(finalReply) && !/\bdraft log\b/i.test(finalReply)) {
      finalReply = `${finalReply}\n\n${pointer}`;
    }
  }

  finalReply = ensureCompanionGapNudge(finalReply, draft, userText, step);

  return finalReply;
}

export async function processLumaTurnWithLlm(
  step: LumaStep | "confirm",
  userText: string,
  draft: LumaDraft,
  customBehaviors: { code: string; label: string }[],
  customStrategies: { code: string; label: string }[],
  history: LumaChatTurn[],
  careProfile: LumaCareProfileInput
): Promise<LumaLlmResult> {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error("No LLM provider configured");
  }

  const workingDraft = applyHeuristicExtraction(
    userText,
    draft,
    customBehaviors,
    customStrategies
  );
  const careProfileBrief = buildLumaCareProfileBrief(careProfile);
  const careContextLine = buildCareContextLine(careProfile);

  const companionPromise =
    provider === "openai"
      ? callOpenAiCompanion(workingDraft, history, step, careProfileBrief)
      : callAnthropicCompanion(workingDraft, history, step, careProfileBrief);

  const scribePromise = (
    provider === "openai"
      ? callOpenAiScribe(workingDraft, history, customBehaviors, customStrategies, careContextLine)
      : callAnthropicScribe(workingDraft, history, customBehaviors, customStrategies, careContextLine)
  ).catch((err) => {
    console.error("Luma scribe failed (using heuristic extraction):", err);
    return null;
  });

  const [reply, scribeResult] = await Promise.all([companionPromise, scribePromise]);

  let nextDraft = workingDraft;
  let scribeReadyToSave = false;

  if (scribeResult) {
    const merged = mergeDraft(
      workingDraft,
      scribeResult.draft_updates,
      customBehaviors,
      customStrategies
    );
    if (merged.needsCustomBehavior) {
      const mirror = buildBehaviorMirrorMessage(merged.needsCustomBehavior.label);
      const trimmedReply = reply.trim();
      const behaviorReply =
        trimmedReply && /\?/.test(trimmedReply)
          ? trimmedReply
          : trimmedReply
            ? `${trimmedReply}\n\n${mirror}`
            : mirror;
      return {
        reply: behaviorReply,
        draft: merged.draft,
        step: "behavior",
        needsCustomBehavior: merged.needsCustomBehavior,
      };
    }
    if (merged.needsCustomStrategy) {
      const mirror = buildStrategyMirrorMessage(merged.needsCustomStrategy.label);
      const trimmedReply = reply.trim();
      const strategyReply =
        trimmedReply && /\?/.test(trimmedReply)
          ? trimmedReply
          : trimmedReply
            ? `${trimmedReply}\n\n${mirror}`
            : mirror;
      return {
        reply: strategyReply,
        draft: merged.draft,
        step: "strategies",
        needsCustomStrategy: merged.needsCustomStrategy,
      };
    }
    nextDraft = merged.draft;
    scribeReadyToSave = scribeResult.ready_to_save ?? false;
  }

  const nextStep = resolveTurnStep(step, userText, nextDraft, scribeReadyToSave);
  const finalReply = finalizeCompanionReply(reply, nextDraft, userText, nextStep, draft);

  return {
    reply: finalReply,
    draft: nextDraft,
    step: nextStep,
  };
}
