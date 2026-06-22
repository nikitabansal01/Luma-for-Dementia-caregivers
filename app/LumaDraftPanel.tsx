"use client";

import { useEffect, useState } from "react";
import {
  applyDraftInference,
  buildDraftOpenItems,
  draftHasContent,
  primaryGap,
} from "@/src/lib/lumaConversationDesign";
import type { LumaDraft } from "@/src/lib/lumaEngine";
import { formatLumaSessionSavedAt } from "@/src/lib/lumaSessionStorage";
import LumaDraftFields from "./LumaDraftFields";
import LumaDraftPreview, { buildLumaDraftPreviewItems, lumaDraftNotesSnippet } from "./LumaDraftPreview";
import LumaDraftSaveCta from "./LumaDraftSaveCta";

type CustomBehaviorOption = { code: string; label: string };

type CustomStrategyOption = { code: string; label: string };

type LumaDraftPanelProps = {
  draft: LumaDraft;
  open: boolean;
  saving: boolean;
  saveReady: boolean;
  customBehaviors: CustomBehaviorOption[];
  customStrategies: CustomStrategyOption[];
  customStrategyLabels: Record<string, string>;
  lastAutoSavedAt: string | null;
  forceEdit?: boolean;
  onForceEditHandled?: () => void;
  onToggle: () => void;
  onDraftChange: (draft: LumaDraft) => void;
  onSave: () => void;
};

export default function LumaDraftPanel({
  draft,
  open,
  saving,
  saveReady,
  customBehaviors,
  customStrategies,
  customStrategyLabels,
  lastAutoSavedAt,
  forceEdit = false,
  onForceEditHandled,
  onToggle,
  onDraftChange,
  onSave,
}: LumaDraftPanelProps) {
  const [editing, setEditing] = useState(false);
  const inferredDraft = applyDraftInference(draft);
  const openItems = draftHasContent(draft) ? buildDraftOpenItems(inferredDraft) : [];
  const previewItems = buildLumaDraftPreviewItems(draft, customStrategyLabels);
  const countLabel =
    previewItems.length === 0 ? "Empty" : `${previewItems.length} field${previewItems.length === 1 ? "" : "s"}`;
  const notesSnippet = lumaDraftNotesSnippet(draft);

  useEffect(() => {
    if (!forceEdit) return;
    setEditing(true);
    onForceEditHandled?.();
  }, [forceEdit, onForceEditHandled]);

  function handleToggle() {
    if (open && editing) {
      setEditing(false);
    }
    onToggle();
  }

  function handleEdit() {
    setEditing(true);
    if (!open) onToggle();
  }

  function handleDoneEditing() {
    setEditing(false);
  }

  return (
    <div
      className={`luma-companion__summary${open ? " luma-companion__summary--open" : ""}${
        editing ? " luma-companion__summary--editing" : ""
      }`}
    >
      <div className="luma-companion__summary-header">
        <button
          type="button"
          className="luma-companion__summary-toggle"
          onClick={handleToggle}
          aria-expanded={open}
        >
          <span className="luma-companion__summary-label">Draft note</span>
          <span className="luma-companion__summary-badge">{countLabel}</span>
          {!open && notesSnippet && (
            <span className="luma-companion__summary-snippet">{notesSnippet}</span>
          )}
          <span className="luma-companion__summary-chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
        {draftHasContent(draft) && (
          <LumaDraftSaveCta saveReady={saveReady} saving={saving} onSave={onSave} />
        )}
        <button
          type="button"
          className="luma-companion__summary-edit"
          onClick={handleEdit}
          aria-label="Edit draft note"
          title="Edit draft note"
        >
          ✎
        </button>
      </div>

      {open && (
        <div className="luma-companion__summary-body">
          {editing ? (
            <>
              <p className="luma-companion__summary-edit-hint">
                Fill in or adjust anything Luma missed — unanswered fields stay blank.
              </p>
              <LumaDraftFields
                draft={draft}
                customBehaviors={customBehaviors}
                customStrategies={customStrategies}
                saving={saving}
                idPrefix="luma-draft"
                emptyDefaults
                onDraftChange={onDraftChange}
              />
              <button
                type="button"
                className="luma-companion__summary-done-edit"
                onClick={handleDoneEditing}
              >
                Done editing
              </button>
            </>
          ) : (
            <>
              <LumaDraftPreview draft={draft} customStrategyLabels={customStrategyLabels} />
              {openItems.length > 0 && (
                <p className="luma-companion__summary-open">
                  Still open if you want to add: {openItems.join(", ")}
                </p>
              )}
            </>
          )}

          {primaryGap(inferredDraft) === "review" && !editing && (
            <p className="luma-companion__summary-ready">
              Looks complete — save when you&apos;re ready, or say <strong>yes</strong> in chat.
            </p>
          )}
          {lastAutoSavedAt && (
            <p className="luma-companion__autosave-hint">
              Draft backed up on this device at {formatLumaSessionSavedAt(lastAutoSavedAt)} — not saved until you confirm.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
