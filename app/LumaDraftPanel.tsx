"use client";

import {
  applyDraftInference,
  buildDraftOpenItems,
  draftHasContent,
  primaryGap,
} from "@/src/lib/lumaConversationDesign";
import type { LumaDraft } from "@/src/lib/lumaEngine";
import { formatLumaSessionSavedAt } from "@/src/lib/lumaSessionStorage";
import LumaDraftFields from "./LumaDraftFields";

type CustomBehaviorOption = { code: string; label: string };

type LumaDraftPanelProps = {
  draft: LumaDraft;
  open: boolean;
  saving: boolean;
  customBehaviors: CustomBehaviorOption[];
  lastAutoSavedAt: string | null;
  onToggle: () => void;
  onDraftChange: (draft: LumaDraft) => void;
};

function countCapturedFields(draft: LumaDraft): number {
  let count = 0;
  if (draft.behavior_code || draft.behavior_label) count += 1;
  if (draft.episode_recency) count += 1;
  if (draft.episode_time_of_day) count += 1;
  if (draft.episode_day_context) count += 1;
  if (draft.severity) count += 1;
  if (draft.trigger_hypotheses.length > 0 || draft.trigger_detail?.trim()) count += 1;
  if (draft.strategies_tried.length > 0) count += 1;
  if (draft.coach_outcome) count += 1;
  if (draft.notes?.trim()) count += 1;
  return count;
}

export default function LumaDraftPanel({
  draft,
  open,
  saving,
  customBehaviors,
  lastAutoSavedAt,
  onToggle,
  onDraftChange,
}: LumaDraftPanelProps) {
  const inferredDraft = applyDraftInference(draft);
  const openItems = draftHasContent(draft) ? buildDraftOpenItems(draft) : [];
  const fieldCount = countCapturedFields(draft);
  const countLabel =
    fieldCount === 0 ? "Empty" : `${fieldCount} field${fieldCount === 1 ? "" : "s"}`;

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
          {!draftHasContent(draft) && (
            <p className="luma-companion__summary-empty">
              This fills in as you share — or edit any field below directly.
            </p>
          )}
          <LumaDraftFields
            draft={draft}
            customBehaviors={customBehaviors}
            saving={saving}
            idPrefix="luma-draft"
            onDraftChange={onDraftChange}
          />
          {openItems.length > 0 && (
            <p className="luma-companion__summary-open">
              Still open if you want to add: {openItems.join(", ")}
            </p>
          )}
          {primaryGap(inferredDraft) === "review" && (
            <p className="luma-companion__summary-ready">
              Ready to save — say <strong>yes</strong> in chat when this looks right, or keep
              editing here.
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
