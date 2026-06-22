"use client";

import { DID_NOT_TRY_CODE, getCoachFlowTriggerLabel, getCoachOutcomeLabel, strategyCodesToLabels } from "@/src/lib/coachFlowCatalog";
import type { LumaDraft } from "@/src/lib/lumaEngine";

export type LumaDraftPreviewItem = { label: string; value: string };

export function buildLumaDraftPreviewItems(
  draft: LumaDraft,
  customStrategyLabels: Record<string, string> = {}
): LumaDraftPreviewItem[] {
  const items: LumaDraftPreviewItem[] = [];

  if (draft.behavior_label || draft.behavior_code) {
    items.push({
      label: "Observation",
      value: draft.behavior_label ?? draft.behavior_code ?? "",
    });
  }
  if (draft.episode_recency) {
    items.push({ label: "When", value: draft.episode_recency.replace(/_/g, " ") });
  }
  if (draft.episode_time_of_day) {
    items.push({ label: "Time of day", value: draft.episode_time_of_day.replace(/_/g, " ") });
  }
  if (draft.episode_day_context) {
    items.push({ label: "Day", value: draft.episode_day_context.replace(/_/g, " ") });
  }
  if (draft.episode_frequency?.trim()) {
    items.push({ label: "How often", value: draft.episode_frequency.trim() });
  }
  if (draft.severity) {
    items.push({
      label: "Intensity",
      value: draft.severity === 1 ? "Mild" : draft.severity === 3 ? "Very hard" : "Moderate",
    });
  }
  if (draft.trigger_hypotheses.length > 0 || draft.trigger_detail?.trim()) {
    const TIME_TRIGGERS = new Set(["MORNING", "AFTERNOON", "EVENING", "NIGHTTIME", "SUNDOWNING"]);
    const triggerLabels = draft.trigger_hypotheses
      .filter((c) => !TIME_TRIGGERS.has(c))
      .map((c) => getCoachFlowTriggerLabel(c));
    const parts = [...triggerLabels];
    if (draft.trigger_detail?.trim()) parts.push(draft.trigger_detail.trim());
    items.push({
      label: "Possible triggers",
      value: parts.length > 0 ? parts.join("; ") : "—",
    });
  }
  if (draft.strategies_tried.length > 0) {
    if (draft.strategies_tried[0] === DID_NOT_TRY_CODE) {
      items.push({ label: "What you tried", value: "Didn't try anything yet" });
    } else {
      const labels = strategyCodesToLabels(draft.strategies_tried, customStrategyLabels);
      items.push({
        label: "What you tried",
        value: labels.length > 0 ? labels.join(", ") : "—",
      });
    }
  }
  if (draft.coach_outcome && draft.outcome_answered) {
    items.push({ label: "How it went", value: getCoachOutcomeLabel(draft.coach_outcome) });
  }
  if (draft.notes?.trim()) {
    const note = draft.notes.trim();
    items.push({
      label: "Notes",
      value: note.length > 120 ? `${note.slice(0, 120)}…` : note,
    });
  }

  return items;
}

export function lumaDraftNotesSnippet(draft: LumaDraft, maxLen = 48): string | null {
  const note = draft.notes?.trim();
  if (!note) return null;
  return note.length > maxLen ? `${note.slice(0, maxLen)}…` : note;
}

type LumaDraftPreviewProps = {
  draft: LumaDraft;
  emptyMessage?: string;
  customStrategyLabels?: Record<string, string>;
};

export default function LumaDraftPreview({
  draft,
  emptyMessage = "This fills in as you share — watch it update while we talk.",
  customStrategyLabels = {},
}: LumaDraftPreviewProps) {
  const items = buildLumaDraftPreviewItems(draft, customStrategyLabels);

  if (items.length === 0) {
    return <p className="luma-companion__summary-empty">{emptyMessage}</p>;
  }

  return (
    <dl className="luma-companion__summary-dl">
      {items.map((item) => (
        <div key={item.label} className="luma-companion__summary-row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
