"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEmptyDraft,
  finalizeLumaDraft,
  getInitialLumaMessages,
  type LumaDraft,
  type LumaMessage,
  type LumaStep,
} from "@/src/lib/lumaEngine";
import {
  applyDraftInference,
  buildDraftOpenItems,
  draftHasContent,
  primaryGap,
  userAskingForDraftSummary,
  userConfirmedSave,
} from "@/src/lib/lumaConversationDesign";
import {
  generateCoachRecommendations,
  recommendationActions,
} from "@/src/lib/coachFlowRecommendations";
import {
  DID_NOT_TRY_CODE,
  getCoachFlowTriggerLabel,
  mapCoachOutcomeToDb,
  strategyCodesToLabels,
} from "@/src/lib/coachFlowCatalog";
import {
  createCustomBehaviorAction,
  getLumaLlmStatusAction,
  lumaTurnAction,
  submitLumaLogAction,
  type LumaTurnActionResult,
} from "./actions";
import { parseLumaMessageBlocks } from "@/src/lib/lumaMessageFormat";
import { LUMA_VOICE_OPTIONS, type LumaVoiceId } from "@/src/lib/lumaTts";
import {
  getStoredLumaVoice,
  speakText,
  stopSpeaking,
  storeLumaVoice,
  useSpeechRecognition,
} from "./useSpeechRecognition";
import LumaFinalLogEditor from "./LumaFinalLogEditor";
import {
  clearLumaSession,
  formatLumaSessionSavedAt,
  loadLumaSession,
  saveLumaSession,
} from "@/src/lib/lumaSessionStorage";

const LUMA_AUTOSAVE_DEBOUNCE_MS = 3_000;
const LUMA_AUTOSAVE_INTERVAL_MS = 30_000;

let cachedInitialSession: ReturnType<typeof loadLumaSession> | undefined;

function getInitialSession() {
  if (cachedInitialSession === undefined) {
    cachedInitialSession = loadLumaSession();
  }
  return cachedInitialSession;
}

type CustomBehaviorOption = { code: string; label: string };

type LumaCompanionProps = {
  customBehaviors: CustomBehaviorOption[];
  onClose: () => void;
  onBehaviorsUpdated: (behaviors: CustomBehaviorOption[]) => void;
};

function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lumaNetworkErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (
    message === "Failed to fetch" ||
    message.includes("NetworkError") ||
    message.includes("ERR_CONNECTION_REFUSED")
  ) {
    return "Luma could not reach the server. Check that the app is running, then try again.";
  }
  return message || "Luma could not respond. Please try again.";
}

function isFailedTurnResult(
  result: LumaTurnActionResult | null | undefined
): result is { success: false; error: string } {
  return result != null && "success" in result && result.success === false;
}

export default function LumaCompanion({
  customBehaviors,
  onClose,
  onBehaviorsUpdated,
}: LumaCompanionProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<LumaMessage[]>(() => {
    const restored = getInitialSession();
    if (restored?.messages.length) return restored.messages;
    return getInitialLumaMessages().map((text) => ({ id: msgId(), role: "luma", text }));
  });
  const [draft, setDraft] = useState<LumaDraft>(
    () => getInitialSession()?.draft ?? createEmptyDraft()
  );
  const [step, setStep] = useState<LumaStep | "confirm">(
    () => getInitialSession()?.step ?? "welcome"
  );
  const [input, setInput] = useState("");
  const [pendingCustomLabel, setPendingCustomLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lumaVoice, setLumaVoice] = useState<LumaVoiceId>(() => getStoredLumaVoice());
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [llmProvider, setLlmProvider] = useState<"openai" | "anthropic" | null>(null);
  const [llmModels, setLlmModels] = useState<{
    companion: string | null;
    scribe: string | null;
  }>({ companion: null, scribe: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const behaviorsRef = useRef(customBehaviors);
  const draftRef = useRef(draft);
  const [draftOpen, setDraftOpen] = useState(true);
  const [keepTalkingDismissed, setKeepTalkingDismissed] = useState(
    () => getInitialSession()?.keepTalkingDismissed ?? false
  );
  const [restoredSession, setRestoredSession] = useState(() => {
    const restored = getInitialSession();
    if (!restored) return false;
    return (
      draftHasContent(restored.draft) || restored.messages.some((message) => message.role === "user")
    );
  });
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(
    () => getInitialSession()?.savedAt ?? null
  );
  const hadDraftContentRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    behaviorsRef.current = customBehaviors;
  }, [customBehaviors]);

  const persistSession = useCallback(() => {
    if (saving) return;
    const savedAt = saveLumaSession({
      draft: draftRef.current,
      messages,
      step,
      keepTalkingDismissed,
    });
    setLastAutoSavedAt(savedAt);
  }, [keepTalkingDismissed, messages, saving, step]);

  useEffect(() => {
    if (saving) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistSession();
    }, LUMA_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draft, messages, step, keepTalkingDismissed, saving, persistSession]);

  useEffect(() => {
    if (saving) return;
    const interval = setInterval(() => {
      persistSession();
    }, LUMA_AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [persistSession, saving]);

  useEffect(() => {
    getLumaLlmStatusAction()
      .then(({ configured, provider, companionModel, scribeModel, ttsAvailable: tts }) => {
        setTtsAvailable(tts);
        if (configured) {
          setLlmProvider(provider);
          setLlmModels({ companion: companionModel, scribe: scribeModel });
        }
      })
      .catch(() => {
        // Server unreachable on mount — Luma still works with heuristics.
      });
  }, []);

  const appendLuma = useCallback(
    (texts: string[]) => {
      stopSpeaking();
      setMessages((prev) => [
        ...prev,
        ...texts.map((text) => ({ id: msgId(), role: "luma" as const, text })),
      ]);
      if (voiceEnabled && texts[0]) {
        void speakText(texts[0], { voice: lumaVoice, useOpenAiTts: ttsAvailable });
      }
    },
    [lumaVoice, ttsAvailable, voiceEnabled]
  );

  const onVoiceChange = (voice: LumaVoiceId) => {
    setLumaVoice(voice);
    storeLumaVoice(voice);
  };

  const saveLog = useCallback(
    async (finalDraft: LumaDraft) => {
      setSaving(true);
      setError(null);
      const d = finalizeLumaDraft(finalDraft);
      const didNotTryOnly =
        d.strategies_tried.length === 1 && d.strategies_tried[0] === DID_NOT_TRY_CODE;
      const effectiveOutcome = didNotTryOnly ? "not_applicable" : d.coach_outcome ?? "not_sure";
      const recs = generateCoachRecommendations({
        triggerCodes: d.trigger_hypotheses,
        strategiesTried: d.strategies_tried,
        outcome: effectiveOutcome,
        severity: d.severity ?? 2,
      });

      const result = await submitLumaLogAction({
        behavior_type: d.behavior_code!,
        severity: d.severity ?? 2,
        episode_recency: d.episode_recency!,
        episode_time_of_day: d.episode_time_of_day!,
        episode_day_context: d.episode_day_context!,
        trigger_hypotheses: d.trigger_hypotheses,
        trigger_detail: d.trigger_detail,
        recommended_interventions: recommendationActions(recs),
        interventions_attempted: strategyCodesToLabels(d.strategies_tried),
        outcome: mapCoachOutcomeToDb(effectiveOutcome),
        coach_outcome: effectiveOutcome,
        notes: d.notes,
      });

      setSaving(false);
      if (result.success) {
        clearLumaSession();
        setLastAutoSavedAt(null);
        appendLuma(["Saved. Thank you for taking a moment to log this — it really helps over time."]);
        router.refresh();
        setTimeout(onClose, 1500);
      } else {
        setError(result.error);
      }
    },
    [appendLuma, onClose, router]
  );

  const handleTurn = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || saving || thinking) return;

      const userMessage = { id: msgId(), role: "user" as const, text: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      if (userAskingForDraftSummary(trimmed)) setDraftOpen(true);
      setInput("");
      setThinking(true);
      setError(null);

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const result = await lumaTurnAction({
          step,
          userText: trimmed,
          draft: draftRef.current,
          customBehaviors: behaviorsRef.current,
          history,
          pendingCustomLabel,
        });

        if (result == null) {
          setError("Luma could not respond. Check that the app is running, then try again.");
          return;
        }

        if (isFailedTurnResult(result)) {
          setError(result.error);
          return;
        }

        const turn = result as Exclude<LumaTurnActionResult, { success: false; error: string }>;
        if (turn.needsCustomBehavior) {
          setPendingCustomLabel(turn.needsCustomBehavior.label);
          setDraft(turn.draft);
          draftRef.current = turn.draft;
          appendLuma(turn.lumaMessages);
          return;
        }

        if (turn.draft.behavior_is_custom && !turn.draft.behavior_code && pendingCustomLabel) {
          const created = await createCustomBehaviorAction(pendingCustomLabel);
          if (!created.success) {
            setError(created.error);
            return;
          }
          const updatedBehaviors = [...behaviorsRef.current, created.behavior];
          behaviorsRef.current = updatedBehaviors;
          onBehaviorsUpdated(updatedBehaviors);
          const withCode = {
            ...turn.draft,
            behavior_code: created.behavior.code,
            behavior_label: created.behavior.label,
          };
          setPendingCustomLabel(null);
          setDraft(withCode);
          draftRef.current = withCode;
          setStep(turn.step === "done" ? "confirm" : turn.step);
          appendLuma(turn.lumaMessages);
          if (turn.step === "done" && userConfirmedSave(trimmed)) {
            await saveLog(draftRef.current);
          }
          return;
        }

        setPendingCustomLabel(null);
        const confirmingSave = turn.step === "done" && userConfirmedSave(trimmed);
        if (!confirmingSave) {
          setDraft(turn.draft);
          draftRef.current = turn.draft;
        }
        setStep(turn.step === "done" ? "confirm" : turn.step);
        appendLuma(turn.lumaMessages);
        if (draftHasContent(turn.draft)) setDraftOpen(true);

        if (confirmingSave) {
          await saveLog(draftRef.current);
        }
      } catch (err) {
        setError(lumaNetworkErrorMessage(err));
      } finally {
        setThinking(false);
      }
    },
    [
      appendLuma,
      messages,
      onBehaviorsUpdated,
      pendingCustomLabel,
      saveLog,
      saving,
      step,
      thinking,
    ]
  );

  const onSpeechResult = useCallback(
    (transcript: string) => {
      handleTurn(transcript);
    },
    [handleTurn]
  );

  const { listening, supported, interimTranscript, start, stop } = useSpeechRecognition({
    onFinalResult: onSpeechResult,
  });

  const inputValue = listening ? interimTranscript : input;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    const has = draftHasContent(draft);
    if (has && !hadDraftContentRef.current) setDraftOpen(true);
    hadDraftContentRef.current = has;
  }, [draft]);

  useEffect(() => {
    if (primaryGap(applyDraftInference(draft)) !== "review") {
      setKeepTalkingDismissed(false);
    }
  }, [draft]);

  const inferredDraft = applyDraftInference(draft);
  const showFinalLogEditor =
    Boolean(draft.behavior_code) &&
    (primaryGap(inferredDraft) === "review" || step === "confirm") &&
    !keepTalkingDismissed;

  const providerLabel =
    llmProvider === "openai"
      ? "OpenAI"
      : llmProvider === "anthropic"
        ? "Claude"
        : null;
  const modelHint =
    llmModels.companion && llmModels.scribe
      ? ` · ${llmModels.companion} + ${llmModels.scribe} scribe`
      : providerLabel
        ? ""
        : null;

  return (
    <div className="luma-companion">
      <header className="luma-companion__header">
        <div>
          <p className="luma-companion__eyebrow">Companion</p>
          <h2 className="luma-companion__title">Luma</h2>
          <p className="luma-companion__lead">
            Talk or type — I&apos;ll listen gently and help fill in your care log.
            {providerLabel && (
              <span className="luma-companion__provider">
                {" "}
                · Powered by {providerLabel}
                {modelHint}
              </span>
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} className="luma-companion__close">
          Close
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {restoredSession && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-care-sky/40 bg-care-sky/10 px-4 py-2 text-sm text-care-forest">
          <span>Restored your in-progress conversation.</span>
          <button
            type="button"
            className="text-care-forest underline decoration-care-sage underline-offset-2"
            onClick={() => setRestoredSession(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div ref={scrollRef} className="luma-companion__messages">
        {messages.map((m) => (
          <div key={m.id} className={`luma-message luma-message--${m.role}`}>
            {m.role === "luma" && <span className="luma-message__avatar">✦</span>}
            {m.role === "luma" ? (
              <LumaMessageBody text={m.text} />
            ) : (
              <p className="luma-message__text">{m.text}</p>
            )}
          </div>
        ))}
        {thinking && (
          <div className="luma-message luma-message--luma">
            <span className="luma-message__avatar">✦</span>
            <p className="luma-message__text luma-message__text--thinking">Thinking…</p>
          </div>
        )}
      </div>

      {showFinalLogEditor ? (
        <LumaFinalLogEditor
          draft={draft}
          customBehaviors={customBehaviors}
          saving={saving}
          lastAutoSavedAt={lastAutoSavedAt}
          onDraftChange={(next) => {
            draftRef.current = next;
            setDraft(next);
          }}
          onSave={() => void saveLog(draftRef.current)}
          onKeepTalking={() => {
            setKeepTalkingDismissed(true);
            appendLuma(["No problem — keep sharing whenever you're ready."]);
          }}
        />
      ) : (
        <LumaDraftPanel
          draft={draft}
          open={draftOpen}
          lastAutoSavedAt={lastAutoSavedAt}
          onToggle={() => setDraftOpen((v) => !v)}
        />
      )}

      <form
        className="luma-companion__input-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!listening) handleTurn(input);
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Talk to Luma…"}
          disabled={saving || thinking}
          readOnly={listening}
          className={`luma-companion__input${listening ? " luma-companion__input--listening" : ""}`}
        />
        {supported && (
          <button
            type="button"
            onClick={() => (listening ? stop() : start())}
            disabled={saving || thinking}
            className={`luma-companion__mic${listening ? " luma-companion__mic--active" : ""}`}
            aria-label={listening ? "Done speaking" : "Start voice input"}
            title={listening ? "Tap when you're done speaking" : "Start voice input"}
          >
            {listening ? "Done" : "🎙"}
          </button>
        )}
        <button
          type="submit"
          disabled={saving || thinking || listening || !input.trim()}
          className="btn-primary"
        >
          Send
        </button>
      </form>

      {listening && (
        <p className="luma-companion__listen-hint">
          Take your time — I&apos;ll keep listening until you tap <strong>Done</strong>.
        </p>
      )}

      <div className="luma-companion__voice-row">
        <label className="luma-companion__voice-toggle">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
          />
          Luma speaks replies aloud
        </label>
        {voiceEnabled && (
          <label className="luma-companion__voice-picker">
            <span className="luma-companion__voice-picker-label">Voice</span>
            <select
              value={lumaVoice}
              onChange={(e) => onVoiceChange(e.target.value as LumaVoiceId)}
              disabled={saving || thinking}
              className="luma-companion__voice-select"
            >
              {LUMA_VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {!ttsAvailable ? " (browser)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

function LumaMessageBody({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const blocks = parseLumaMessageBlocks(trimmed);

  return (
    <div className="luma-message__body">
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <p key={`p-${i}`} className="luma-message__text">
            {block.text}
          </p>
        ) : (
          <ul key={`ul-${i}`} className="luma-message__list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function LumaDraftPanel({
  draft,
  open,
  lastAutoSavedAt,
  onToggle,
}: {
  draft: LumaDraft;
  open: boolean;
  lastAutoSavedAt: string | null;
  onToggle: () => void;
}) {
  const items: { label: string; value: string }[] = [];
  if (draft.behavior_label || draft.behavior_code) {
    items.push({ label: "Moment", value: draft.behavior_label ?? draft.behavior_code ?? "" });
  }
  if (draft.episode_recency) {
    items.push({ label: "When", value: draft.episode_recency.replace(/_/g, " ") });
  }
  if (draft.episode_time_of_day) {
    items.push({ label: "Time of day", value: draft.episode_time_of_day.replace(/_/g, " ") });
  }
  if (draft.severity) {
    items.push({
      label: "Intensity",
      value:
        draft.severity === 1 ? "Mild" : draft.severity === 3 ? "Very hard" : "Moderate",
    });
  }
  if (draft.trigger_hypotheses.length > 0 || draft.trigger_detail) {
    const TIME_TRIGGERS = new Set(["MORNING", "AFTERNOON", "EVENING", "NIGHTTIME", "SUNDOWNING"]);
    const triggerLabels = draft.trigger_hypotheses
      .filter((c) => !TIME_TRIGGERS.has(c))
      .map((c) => getCoachFlowTriggerLabel(c));
    const parts = [...triggerLabels];
    if (draft.trigger_detail?.trim()) parts.push(draft.trigger_detail.trim());
    items.push({
      label: "Contributors",
      value: parts.length > 0 ? parts.join("; ") : "—",
    });
  }
  if (draft.strategies_tried.length > 0 && draft.strategies_tried[0] !== DID_NOT_TRY_CODE) {
    const labels = strategyCodesToLabels(draft.strategies_tried);
    items.push({
      label: "What you tried",
      value: labels.length > 0 ? labels.join(", ") : "—",
    });
  }
  if (draft.notes?.trim()) {
    const note = draft.notes.trim();
    items.push({
      label: "Notes",
      value: note.length > 80 ? `${note.slice(0, 80)}…` : note,
    });
  }

  const openItems = draftHasContent(draft) ? buildDraftOpenItems(draft) : [];
  const countLabel = items.length === 0 ? "Empty" : `${items.length} field${items.length === 1 ? "" : "s"}`;

  return (
    <div className={`luma-companion__summary${open ? " luma-companion__summary--open" : ""}`}>
      <button
        type="button"
        className="luma-companion__summary-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="luma-companion__summary-label">Your draft log</span>
        <span className="luma-companion__summary-badge">{countLabel}</span>
        <span className="luma-companion__summary-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="luma-companion__summary-body">
          {items.length === 0 ? (
            <p className="luma-companion__summary-empty">
              This fills in as you share — watch it update while we talk.
            </p>
          ) : (
            <dl className="luma-companion__summary-dl">
              {items.map((item) => (
                <div key={item.label} className="luma-companion__summary-row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {openItems.length > 0 && (
            <p className="luma-companion__summary-open">
              Still open if you want to add: {openItems.join(", ")}
            </p>
          )}
          {primaryGap(draft) === "review" && (
            <p className="luma-companion__summary-ready">
              Ready to save — say <strong>yes</strong> in chat when this looks right.
            </p>
          )}
          {lastAutoSavedAt && (
            <p className="luma-companion__autosave-hint">
              Auto-saved locally at {formatLumaSessionSavedAt(lastAutoSavedAt)} — you can keep
              editing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
