"use client";

import { useState } from "react";
import type { LumaDraft } from "@/src/lib/lumaEngine";
import type { RecommendationCard } from "@/src/lib/coachFlowRecommendations";
import { formatLumaSessionSavedAt } from "@/src/lib/lumaSessionStorage";
import LumaDraftFields from "./LumaDraftFields";
import LumaDraftPreview from "./LumaDraftPreview";
import LumaDraftSaveCta from "./LumaDraftSaveCta";
import LumaSuggestionPanel from "./LumaSuggestionPanel";

type CustomBehaviorOption = { code: string; label: string };

type CustomStrategyOption = { code: string; label: string };

type LumaFinalLogEditorProps = {
  draft: LumaDraft;
  customBehaviors: CustomBehaviorOption[];
  customStrategies: CustomStrategyOption[];
  customStrategyLabels: Record<string, string>;
  saving: boolean;
  saveReady: boolean;
  lastAutoSavedAt: string | null;
  suggestions?: RecommendationCard[];
  onDraftChange: (draft: LumaDraft) => void;
  onSave: () => void;
  onKeepTalking: () => void;
};

export default function LumaFinalLogEditor({
  draft,
  customBehaviors,
  customStrategies,
  customStrategyLabels,
  saving,
  saveReady,
  lastAutoSavedAt,
  suggestions,
  onDraftChange,
  onSave,
  onKeepTalking,
}: LumaFinalLogEditorProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={`luma-companion__final-log${editing ? " luma-companion__final-log--editing" : ""}`}>
      <div className="luma-companion__final-log-header">
        <p className="luma-companion__final-log-title">Review your draft</p>
        <div className="luma-companion__final-log-actions">
          <LumaDraftSaveCta saveReady={saveReady} saving={saving} onSave={onSave} />
          {!editing ? (
            <button
              type="button"
              className="luma-companion__summary-edit luma-companion__summary-edit--inline"
              onClick={() => setEditing(true)}
              aria-label="Edit draft note"
              title="Edit draft note"
            >
              ✎
            </button>
          ) : (
            <button
              type="button"
              className="luma-companion__summary-done-edit luma-companion__summary-done-edit--inline"
              onClick={() => setEditing(false)}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <LumaDraftFields
          draft={draft}
          customBehaviors={customBehaviors}
          customStrategies={customStrategies}
          saving={saving}
          idPrefix="luma-final"
          emptyDefaults
          onDraftChange={onDraftChange}
        />
      ) : (
        <LumaDraftPreview
          draft={draft}
          customStrategyLabels={customStrategyLabels}
          emptyMessage="Nothing captured yet — keep talking or tap edit to fill in manually."
        />
      )}

      {suggestions != null && (
        <LumaSuggestionPanel
          recommendations={suggestions}
          className="luma-companion__final-log-suggestions coach-suggestions-panel"
        />
      )}

      <button
        type="button"
        onClick={onKeepTalking}
        className="luma-companion__keep-talking"
        disabled={saving}
      >
        Keep talking
      </button>

      {lastAutoSavedAt && (
        <p className="luma-companion__autosave-hint">
          Draft backed up on this device at {formatLumaSessionSavedAt(lastAutoSavedAt)}.
        </p>
      )}
    </div>
  );
}
