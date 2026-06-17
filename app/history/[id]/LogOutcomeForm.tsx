"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BehaviorLog } from "@/src/lib/repo";
import { getLogInterventionsAttempted } from "@/src/lib/logUtils";
import { updateLogOutcomeAction } from "@/app/actions";

export default function LogOutcomeForm({ log }: { log: BehaviorLog }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState(log.outcome === "unknown" ? "same" : log.outcome);
  const [notes, setNotes] = useState(log.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const attempted = getLogInterventionsAttempted(log);
  const recommended = [...(log.recommended_interventions ?? [])];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await updateLogOutcomeAction(log.id, outcome, attempted.length > 0 ? attempted : undefined, notes.trim() || undefined);
    if (result.success) {
      setSaved(true);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="card section-band section-band--response">
      <h2 className="card-heading mb-3">Add or update outcome</h2>
      {saved && (
        <p className="mb-3 text-sm font-medium text-care-forest">Saved.</p>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm font-medium">What happened?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["better", "same", "worse"] as const).map((o) => (
              <label
                key={o}
                className="group flex cursor-pointer items-center rounded-lg border border-care-sage bg-white px-4 py-2.5 text-sm font-medium capitalize transition-colors group-has-[:checked]:border-care-forest group-has-[:checked]:bg-care-mint/30 group-has-[:checked]:text-care-forest"
              >
                <input
                  type="radio"
                  name="outcome"
                  value={o}
                  checked={outcome === o}
                  onChange={() => setOutcome(o)}
                  className="sr-only"
                />
                {o}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember" />
        </div>
        {recommended.length > 0 && attempted.length > 0 && (
          <p className="text-xs text-care-stone">You had tried: {attempted.join("; ")}</p>
        )}
        <button type="submit" className="btn-primary">
          Save outcome
        </button>
      </form>
    </div>
  );
}
