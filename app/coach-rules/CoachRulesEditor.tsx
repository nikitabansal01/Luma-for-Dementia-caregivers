"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCoachRulesAction } from "../actions";

export default function CoachRulesEditor({
  initialContent,
}: {
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleSave() {
    const result = await saveCoachRulesAction(content);
    if (result.ok) {
      setMessage({ type: "ok", text: "Saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  return (
    <div className="card section-band section-band--trigger space-y-4">
      <span className="section-label section-label--trigger">Edit JSON</span>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={24}
        className="w-full rounded-lg border border-care-sage bg-care-cream/50 px-3 py-3 font-mono text-sm text-care-bark focus:border-care-forest focus:outline-none focus:ring-2 focus:ring-care-forest/20"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} className="btn-primary">
          Save to database
        </button>
        {message && (
          <span
            className={
              message.type === "ok"
                ? "text-sm font-medium text-care-forest"
                : "text-sm font-medium text-amber-700"
            }
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
