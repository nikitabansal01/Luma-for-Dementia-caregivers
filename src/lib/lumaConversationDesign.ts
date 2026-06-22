/**
 * Empathetic conversation design for Luma — narrative-first, not survey-first.
 */

import { DID_NOT_TRY_CODE } from "./coachFlowCatalog";
import type { LumaDraft } from "./lumaEngine";

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

  if (behaviorPhrase(draft)) have.push(`moment: ${behaviorPhrase(draft)}`);
  else need.push("what happened (the moment itself)");

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

  if (draft.triggers_answered) have.push("possible contributors discussed");
  else need.push("anything that might have set it off (optional — can skip)");

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
        : `${reflect}How intense was it for you in the moment?`;

    case "context":
      return `${reflect}Do you have any sense of what might have been going on underneath — noise, hunger, a change in routine, or something else? It's okay if you're not sure.`;

    case "response":
      if (!draft.strategies_answered) {
        return `${reflect}In the moment, did you try anything to help — or were you mostly just getting through it?`;
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
    lines.push("You shared some thoughts on what might have contributed.");
  }

  const tried =
    draft.strategies_tried.length > 0 &&
    draft.strategies_tried[0] !== DID_NOT_TRY_CODE;
  if (tried) lines.push("And you tried something in the moment.");

  return `${lines.join(" ")} Would you like me to save this to your log? You can say yes, or tell me what to change.`;
}

export function buildDraftPanelPointer(draft: LumaDraft): string {
  if (!draftHasContent(draft)) {
    return "Your draft log below is still empty — keep sharing and it'll fill in as we talk.";
  }
  return "Take a look at your draft log below — you can add or correct anything I missed.";
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
    parts.push("possible contributors");
  }
  if (draft.strategies_tried.length > 0 && draft.strategies_tried[0] !== DID_NOT_TRY_CODE) {
    parts.push("what you tried");
  }
  if (draft.notes?.trim()) parts.push("your notes");

  if (parts.length === 0) {
    return "I'm not noting anything specific yet — whenever you're ready, tell me about a moment and I'll capture it here as we talk.";
  }

  return `Here's what I'm holding in your draft log so far: ${parts.join("; ")}. Feel free to add, correct, or keep going — there's no rush.`;
}

/** Friendly labels for gaps still open in the draft. */
export function buildDraftOpenItems(draft: LumaDraft): string[] {
  const gap = primaryGap(draft);
  if (gap === "review") return [];
  switch (gap) {
    case "story":
      return ["the moment itself"];
    case "timing":
      return ["rough timing"];
    case "intensity":
      return ["how intense it felt"];
    case "context":
      return ["what might have contributed (optional)"];
    case "response":
      return ["whether you tried anything to help"];
    default:
      return [];
  }
}

export function draftHasContent(draft: LumaDraft): boolean {
  return Boolean(
    draft.behavior_code ||
      draft.behavior_is_custom ||
      draft.episode_recency ||
      draft.severity ||
      draft.trigger_hypotheses.length > 0 ||
      draft.trigger_detail?.trim() ||
      draft.strategies_tried.length > 0 ||
      draft.notes?.trim()
  );
}

export function userAskingForDraftSummary(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(what do you have|what've you got|what have you got|what's captured|what is captured|show me what|draft log|so far|what did you note|what are you noting|what are you logging|recap what|summarize what)\b/.test(
    n
  );
}

export function userSignalsWrappingUp(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(that's all|that's everything|nothing else|i think that's it|anything else you need|what else do you need|is that enough|should i add)\b/.test(
    n
  );
}

/** Soft nudge for the companion — human language, not form fields. */
export function buildCompanionWeaveHint(draft: LumaDraft): string {
  const gap = primaryGap(draft);
  switch (gap) {
    case "story":
      return "If they seem ready to describe a specific moment, gently invite them — no rush.";
    case "timing":
      return "If the moment feels right, you may wonder when this happened — recent or a little while ago — woven into your reply, not as a separate form question.";
    case "intensity":
      return "If they're ready to continue, you might gently sense how hard it felt — in their words, not as a scale.";
    case "context":
      return "If they're open to it, you could wonder what might have been going on underneath — or stay with feelings if they're still processing.";
    case "response":
      return "If the moment fits, you might ask whether they tried anything to help — or were mostly just getting through it.";
    case "review":
      return "One short sentence: invite them to check the draft log below and say yes to save. Do not recap log fields in chat.";
  }
}

export function userConfirmedSave(text: string): boolean {
  const n = text.toLowerCase();
  return /\b(yes|yeah|yep|save|saved|correct|looks good|that's right|confirm|sure|please do|go ahead)\b/.test(
    n
  );
}

export const LUMA_OPENING =
  "Hi — I'm Luma. I'm here with you. Tell me what's going on, in whatever order feels right.";
