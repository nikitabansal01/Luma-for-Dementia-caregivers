"use client";

import type { LumaDraft } from "@/src/lib/lumaEngine";
import type { RecommendationCard } from "@/src/lib/coachFlowRecommendations";
import { formatLumaSessionSavedAt } from "@/src/lib/lumaSessionStorage";
import LumaDraftFields from "./LumaDraftFields";
import LumaSuggestionPanel from "./LumaSuggestionPanel";

type CustomBehaviorOption = { code: string; label: string };

type LumaFinalLogEditorProps = {
  draft: LumaDraft;
  customBehaviors: CustomBehaviorOption[];
  saving: boolean;
  lastAutoSavedAt: string | null;
  suggestions?: RecommendationCard[];
  onDraftChange: (draft: LumaDraft) => void;
  onSave: () => void;
  onKeepTalking: () => void;
};

export default function LumaFinalLogEditor({
  draft,
  customBehaviors,
  saving,
  lastAutoSavedAt,
  suggestions,
  onDraftChange,
  onSave,
  onKeepTalking,
}: LumaFinalLogEditorProps) {
  return (
    <div className="luma-companion__final-log">
      <div className="luma-companion__final-log-header">
        <h3 className="luma-companion__final-log-title">Review your log</h3>
        <p className="luma-companion__final-log-lead">
          Fix anything that looks off, then save when you&apos;re ready. Your edits auto-save locally
          every few seconds so nothing is lost.
        </p>
        {lastAutoSavedAt && (
          <p className="luma-companion__autosave-hint">
            Auto-saved locally at {formatLumaSessionSavedAt(lastAutoSavedAt)}
          </p>
        )}
      </div>

      <LumaDraftFields
        draft={draft}
        customBehaviors={customBehaviors}
        saving={saving}
        idPrefix="luma-final"
        onDraftChange={onDraftChange}
      />

      {suggestions != null && (
        <LumaSuggestionPanel
          recommendations={suggestions}
          className="luma-companion__final-log-suggestions coach-suggestions-panel"
        />
      )}

      <div className="luma-companion__final-log-actions">
        <button
          type="button"
          onClick={onKeepTalking}
          className="btn-secondary"
          disabled={saving}
        >
          Keep talking
        </button>
        <button
          type="button"
          onClick={onSave}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || !draft.behavior_code}
          aria-busy={saving}
        >
          {saving ? "Saving…" : "Save to log"}
        </button>
      </div>
    </div>
  );
}
