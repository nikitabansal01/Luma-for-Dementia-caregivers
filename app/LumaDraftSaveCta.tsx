"use client";

type LumaDraftSaveCtaProps = {
  saveReady: boolean;
  saving: boolean;
  onSave: () => void;
};

const SAVE_BLOCKED_HINT = "Choose what happened to save today's note";

export default function LumaDraftSaveCta({ saveReady, saving, onSave }: LumaDraftSaveCtaProps) {
  const blocked = !saveReady && !saving;

  return (
    <span
      className="luma-draft-save"
      title={blocked ? SAVE_BLOCKED_HINT : undefined}
    >
      <button
        type="button"
        onClick={onSave}
        className={`luma-draft-save__pill${saveReady ? " luma-draft-save__pill--ready" : ""}`}
        disabled={saving || !saveReady}
        aria-busy={saving}
      >
        {saving ? "Saving…" : "Save note"}
      </button>
    </span>
  );
}
