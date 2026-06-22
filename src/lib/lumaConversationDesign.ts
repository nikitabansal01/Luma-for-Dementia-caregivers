/**
 * Empathetic conversation design for Luma — narrative-first, not survey-first.
 */

import { DID_NOT_TRY_CODE } from "./coachFlowCatalog";
import type { LumaDraft, LumaStep } from "./lumaEngine";

export type ConversationGap =
  | "story"
  | "timing"
  | "intensity"
  | "context"
  | "response"
  | "review";

/** What still needs to be learned — one thematic gap at a time. */
export function primaryGap(draft: LumaDraft): ConversationGap {
  if (!draft.behavior_code && !draft.behavior_is_custom) return "story";
  if (!draft.episode_recency || !draft.episode_time_of_day || !draft.episode_day_context)
    return "timing";
  if (!draft.severity) return "intensity";
  if (!draft.triggers_answered) return "context";
  if (!draft.strategies_answered || !draft.outcome_answered) return "response";
  return "review";
}

/** Infer answered flags when the draft already contains the information. */
export function applyDraftInference(draft: LumaDraft): LumaDraft {
  const next = { ...draft };

  if (next.trigger_hypotheses.length > 0 || next.trigger_detail?.trim()) {
    next.triggers_answered = true;
  }

  const triedSomething =
    next.strategies_tried.length > 0 &&
    !(next.strategies_tried.length === 1 && next.strategies_tried[0] === DID_NOT_TRY_CODE);

  if (next.strategies_tried.length > 0) {
    next.strategies_answered = true;
  }

  if (next.coach_outcome) {
    next.outcome_answered = true;
  }

  if (
    next.strategies_tried.length === 1 &&
    next.strategies_tried[0] === DID_NOT_TRY_CODE &&
    !next.coach_outcome
  ) {
    next.coach_outcome = "not_applicable";
    next.outcome_answered = true;
  }

  if (triedSomething && !next.coach_outcome) {
    next.outcome_answered = false;
  }

  return next;
}

function behaviorPhrase(draft: LumaDraft): string | null {
  return draft.behavior_label ?? draft.behavior_code ?? null;
}

/** Internal hint for the LLM — never shown to the caregiver. */
export function describeConversationState(draft: LumaDraft): string {
  const have: string[] = [];
  const need: string[] = [];

  if (behaviorPhrase(draft)) have.push(`observation: ${behaviorPhrase(draft)}`);
  else need.push("what happened (the observation itself)");

  if (draft.episode_recency) have.push(`when: ${draft.episode_recency.replace(/_/g, " ")}`);
  else need.push("rough timing (just now vs earlier)");

  if (draft.episode_time_of_day)
    have.push(`time of day: ${draft.episode_time_of_day.replace(/_/g, " ")}`);
  else need.push("part of day");

  if (draft.episode_day_context)
    have.push(`day type: ${draft.episode_day_context.replace(/_/g, " ")}`);
  else need.push("whether it was a usual day or something different");

  if (draft.severity) {
    const word =
      draft.severity === 1 ? "mild" : draft.severity === 3 ? "very hard" : "moderate";
    have.push(`intensity: ${word}`);
  } else need.push("how intense it felt");

  if (draft.triggers_answered) have.push("possible triggers discussed");
  else need.push("possible triggers (optional — can skip)");

  if (draft.strategies_answered) have.push("what they tried");
  else need.push("whether they tried anything to help");

  if (draft.outcome_answered) have.push("whether it helped");
  else if (draft.strategies_answered) need.push("whether what they tried helped");

  return `Already understood: ${have.length ? have.join("; ") : "nothing yet"}.\nStill to weave in naturally (never list these): ${need.length ? need.join("; ") : "ready to recap"}.`;
}

const REFLECTIONS = [
  "Thank you for sharing that.",
  "I hear you.",
  "That sounds like a lot.",
  "I'm following.",
];

function pickReflection(userText: string): string {
  const n = userText.toLowerCase();
  if (/\b(hard|difficult|stress|overwhelm|tired|scared|upset)\b/.test(n)) {
    return "That sounds really hard.";
  }
  if (/\b(better|calm|ok|okay|fine)\b/.test(n)) {
    return "I'm glad you're telling me.";
  }
  return REFLECTIONS[Math.abs(userText.length) % REFLECTIONS.length];
}

/** One natural follow-up for the heuristic path when LLM is unavailable. */
export function generateNaturalFollowUp(draft: LumaDraft, userText: string): string {
  const gap = primaryGap(draft);
  const moment = behaviorPhrase(draft);
  const reflect = userText.trim().length > 12 ? `${pickReflection(userText)} ` : "";

  switch (gap) {
    case "story":
      return "What's been happening? You can start anywhere — I'll follow along.";

    case "timing": {
      if (moment) {
        return `${reflect}With the ${moment.toLowerCase()} — was that just now, or earlier? And roughly what part of the day was it?`;
      }
      return `${reflect}When did this happen — still fresh, or earlier today?`;
    }

    case "intensity":
      return moment
        ? `${reflect}When the ${moment.toLowerCase()} happened — was it manageable, pretty distressing, or really intense?`
        : `${reflect}How intense was it for you when it happened?`;

    case "context":
      return `${reflect}Do you have a sense of what might have led to it — a change in routine, hunger, noise, or something else? We can reflect on it together, and it's okay if you're not sure.`;

    case "response":
      if (!draft.strategies_answered) {
        return `${reflect}When it happened, did you try anything to help — or were you mostly just getting through it?`;
      }
      return `${reflect}Did any of that seem to help, even a little — or not really?`;

    case "review":
      return buildWarmRecap(draft);
  }
}

export function buildWarmRecap(draft: LumaDraft): string {
  const lines: string[] = [];
  const moment = behaviorPhrase(draft);
  if (moment) lines.push(`You mentioned ${moment.toLowerCase()}.`);

  if (draft.episode_recency) {
    lines.push(`Sounds like it was ${draft.episode_recency.replace(/_/g, " ")}.`);
  }

  if (draft.severity) {
    const feel =
      draft.severity === 1
        ? "on the milder side"
        : draft.severity === 3
          ? "really intense"
          : "pretty distressing";
    lines.push(`It felt ${feel}.`);
  }

  if (draft.trigger_hypotheses.length > 0 || draft.trigger_detail) {
    lines.push("You shared some possible triggers.");
  }

  const tried =
    draft.strategies_tried.length > 0 &&
    draft.strategies_tried[0] !== DID_NOT_TRY_CODE;
  if (tried) lines.push("And you tried something when it happened.");

  return `${lines.join(" ")} Would you like me to save this note? You can say yes, or tell me what to change.`;
}

export function buildDraftPanelPointer(draft: LumaDraft): string {
  if (!draftHasContent(draft)) {
    return "The draft note below is still empty — keep sharing and it'll fill in as we talk.";
  }
  return "Take a look at the draft note below — you can add or correct anything I missed.";
}

/** @deprecated Prefer on-screen draft panel; keep short for voice/accessibility only. */
export function buildDraftMirror(draft: LumaDraft): string {
  const parts: string[] = [];
  const moment = behaviorPhrase(draft);
  if (moment) parts.push(moment.toLowerCase());
  if (draft.episode_recency) parts.push(draft.episode_recency.replace(/_/g, " "));
  if (draft.episode_time_of_day) parts.push(draft.episode_time_of_day.replace(/_/g, " "));
  if (draft.severity) {
    parts.push(
      draft.severity === 1 ? "mild" : draft.severity === 3 ? "very hard" : "pretty distressing"
    );
  }
  if (draft.trigger_hypotheses.length > 0 || draft.trigger_detail) {
    parts.push("possible triggers");
  }
  if (draft.strategies_tried.length > 0 && draft.strategies_tried[0] !== DID_NOT_TRY_CODE) {
    parts.push("what you tried");
  }
  if (draft.notes?.trim()) parts.push("your notes");

  if (parts.length === 0) {
    return "I'm not noting anything specific yet — whenever you're ready, tell me about an observation and I'll capture it here as we talk.";
  }

  return `Here's what I'm holding in your draft note so far: ${parts.join("; ")}. Feel free to add, correct, or keep going — there's no rush.`;
}

/** Friendly labels for gaps still open in the draft. */
export function buildDraftOpenItems(draft: LumaDraft): string[] {
  const gap = primaryGap(draft);
  if (gap === "review") return [];
  switch (gap) {
    case "story":
      return ["the observation itself"];
    case "timing":
      return ["rough timing"];
    case "intensity":
      return ["how intense it felt"];
    case "context":
      return ["possible triggers (optional)"];
    case "response":
      return ["strategies you tried"];
    default:
      return [];
  }
}

export function draftHasContent(draft: LumaDraft): boolean {
  return Boolean(
    draft.behavior_code ||
      draft.behavior_is_custom ||
      draft.episode_recency ||
      draft.episode_frequency?.trim() ||
      draft.severity ||
      draft.trigger_hypotheses.length > 0 ||
      draft.trigger_detail?.trim() ||
      draft.strategies_tried.length > 0 ||
      draft.notes?.trim()
  );
}

export function userAskingForDraftSummary(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(what do you have|what've you got|what have you got|what's captured|what is captured|show me what|draft note|draft log|so far|what did you note|what are you noting|what are you logging|recap what|summarize what)\b/.test(
    n
  );
}

export function userSignalsWrappingUp(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(that's all|that's everything|nothing else|i think that's it|anything else you need|what else do you need|is that enough|should i add)\b/.test(
    n
  );
}

/** Reflect back a behavior in warm, friend-like language — never survey-style ("Would X fit?"). */
export function buildBehaviorMirrorMessage(proposedLabel: string): string {
  const label = proposedLabel.trim();
  if (!label || /^other behavior$/i.test(label)) {
    return "I'm with you — when you're ready, tell me a little about what you noticed happening.";
  }
  const spoken = label.toLowerCase();
  return `It sounds like ${spoken} might be what you're witnessing — does that feel about right?`;
}

/** When the story could map to more than one observation type. */
export function buildBehaviorAlternativesMessage(labels: string[]): string {
  const cleaned = labels.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length === 0) return buildBehaviorMirrorMessage("");
  if (cleaned.length === 1) return buildBehaviorMirrorMessage(cleaned[0]);
  const [a, b] = cleaned.slice(0, 2).map((l) => l.toLowerCase());
  return `From what you're sharing, it could sound like ${a} or ${b} — which feels closer to what you saw?`;
}

/** After caregiver confirms a behavior label. */
export function buildBehaviorAcknowledgedMessage(label: string): string {
  const spoken = label.trim().toLowerCase();
  if (!spoken) return "Okay — I'm following.";
  return `Got it — I'm holding ${spoken} in your draft as we keep going.`;
}

/** Reflect a strategy the scribe distilled — warm, not survey-style. */
export function buildStrategyMirrorMessage(proposedLabel: string): string {
  const label = proposedLabel.trim();
  if (!label) {
    return "What did you try, even quietly — sitting with them, redirecting, anything at all?";
  }
  const spoken = label.toLowerCase();
  return `It sounds like ${spoken} might be what you tried — should I add that to your draft?`;
}

/** After caregiver confirms a custom strategy label. */
export function buildStrategyAcknowledgedMessage(label: string): string {
  const spoken = label.trim().toLowerCase();
  if (!spoken) return "Okay — noted.";
  return `Got it — I'll add ${spoken} to what you tried.`;
}

/** Question only — for backstop when the companion already validated feelings. */
export function buildCompanionGapQuestionBrief(draft: LumaDraft): string {
  const d = applyDraftInference(draft);
  const gap = primaryGap(d);
  const moment = behaviorPhrase(d);

  switch (gap) {
    case "story":
      return "What's been happening? You can start anywhere.";
    case "timing":
      return moment
        ? `When did the ${moment.toLowerCase()} happen — just now, earlier today, or a few days ago?`
        : "When did this happen — was it recent, or a little while back?";
    case "intensity":
      return moment
        ? `How hard was the ${moment.toLowerCase()} for you — manageable, pretty distressing, or really intense?`
        : "How intense was it for you when it happened?";
    case "context":
      return "Do you have a sense of what might have led to it? We can reflect on it together — it's okay if you're not sure.";
    case "response":
      if (!d.strategies_answered) {
        return "Did you try anything to help when it was happening — or were you mostly just getting through it?";
      }
      return "Did any of that seem to help, even a little — or not really?";
    case "review":
      return "If the draft note below looks right, say yes to save — or tell me what to change.";
  }
}

/** Warm, concrete question for the companion to ask about the current gap. */
export function buildCompanionGapQuestion(draft: LumaDraft): string {
  const d = applyDraftInference(draft);
  const gap = primaryGap(d);
  const moment = behaviorPhrase(d);

  switch (gap) {
    case "story":
      return "What's been happening? You can start anywhere — I'll follow along.";
    case "timing":
      return buildCompanionGapQuestionBrief(d);
    case "intensity":
      return moment
        ? `That must have been a lot. ${buildCompanionGapQuestionBrief(d)}`
        : `That must have been hard. ${buildCompanionGapQuestionBrief(d)}`;
    case "context":
      return "Do you have a sense of what might have led to it — a change in routine, hunger, noise, or something else? We can reflect on it together, and it's okay if you're not sure.";
    case "response":
      return buildCompanionGapQuestionBrief(d);
    case "review":
      return buildCompanionGapQuestionBrief(d);
  }
}

/** Shared brief for companion + scribe — same capture picture, companion leads the next question. */
export function buildCompanionScribeBrief(draft: LumaDraft): string {
  const d = applyDraftInference(draft);
  const gap = primaryGap(d);

  return `[Capture status — shared with your scribe]
${describeConversationState(d)}

Current priority gap: ${gap}
After you acknowledge what they shared, ask ONE warm question about this gap (adapt naturally):
"${buildCompanionGapQuestion(d)}"

The scribe fills the draft note from their answer. Caregivers rarely ask what is missing — you lead the conversation there.`;
}

function shouldDeferGapNudge(userText: string, gap: ConversationGap): boolean {
  if (gap !== "story") return false;
  const n = userText.trim().toLowerCase();
  return (
    n.length < 24 &&
    /^(hi|hello|hey|thanks|thank you|good morning|good evening|how are you)\b/.test(n)
  );
}

/** Ensure the companion ends with a gap question when the LLM only validated feelings. */
export function ensureCompanionGapNudge(
  reply: string,
  draft: LumaDraft,
  userText: string,
  step: LumaStep | "confirm" | "done"
): string {
  if (step === "done" || step === "confirm") return reply;
  if (userAskingForDraftSummary(userText)) return reply;

  const d = applyDraftInference(draft);
  const gap = primaryGap(d);
  if (gap === "review") return reply;
  if (shouldDeferGapNudge(userText, gap)) return reply;
  if (/\?/.test(reply)) return reply;

  const question = buildCompanionGapQuestionBrief(d);
  const trimmed = reply.trim();
  return trimmed ? `${trimmed}\n\n${question}` : question;
}

/** @deprecated Use buildCompanionScribeBrief — kept for reference in docs. */
export function buildCompanionWeaveHint(draft: LumaDraft): string {
  return buildCompanionGapQuestion(applyDraftInference(draft));
}

export function userConfirmedSave(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(yes|yeah|yep|save|saved|correct|looks good|that's right|confirm|sure|please do|go ahead)\b/.test(
    n
  );
}

export const LUMA_OPENING =
  "Hi — I'm Luma. I'm here with you. Tell me what's going on, in whatever order feels right.";
