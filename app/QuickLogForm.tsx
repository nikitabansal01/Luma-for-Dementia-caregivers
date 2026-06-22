"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BEHAVIOR_OPTIONS } from "@/src/lib/behaviorMap";
import { COACH_FLOW_TRIGGER_GROUPS } from "@/src/lib/coachFlowCatalog";
import {
  defaultEpisodeTiming,
  fromDatetimeLocal,
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
} from "@/src/lib/episodeTiming";
import { submitQuickLog, getWhatToTryAfterLogAction } from "./actions";
import WhatToTryNextCard, { type WhatToTryData } from "./WhatToTryNextCard";
import SeveritySelector from "./SeveritySelector";
import EpisodeTimingSelector from "./EpisodeTimingSelector";

export default function QuickLogForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const defaults = defaultEpisodeTiming();
  const [episodeRecency, setEpisodeRecency] = useState<EpisodeRecency>(defaults.episode_recency);
  const [episodeTimeOfDay, setEpisodeTimeOfDay] = useState<EpisodeTimeOfDay>(
    defaults.episode_time_of_day
  );
  const [episodeDayContext, setEpisodeDayContext] = useState<EpisodeDayContext>(
    defaults.episode_day_context
  );
  const [exactEpisodeAt, setExactEpisodeAt] = useState("");
  const [showExactEpisode, setShowExactEpisode] = useState(false);
  const [behaviorCode, setBehaviorCode] = useState("");
  const [severity, setSeverity] = useState<number>(2);
  const [triggerHypotheses, setTriggerHypotheses] = useState<string[]>([]);
  const [triggerDetail, setTriggerDetail] = useState("");
  const [showWhatToTry, setShowWhatToTry] = useState(false);
  const [whatToTryData, setWhatToTryData] = useState<WhatToTryData | null>(null);

  function toggleTrigger(code: string) {
    setTriggerHypotheses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await submitQuickLog({
      behavior_type: behaviorCode,
      severity,
      episode_recency: episodeRecency,
      episode_time_of_day: episodeTimeOfDay,
      episode_day_context: episodeDayContext,
      exact_episode_at:
        showExactEpisode && exactEpisodeAt ? fromDatetimeLocal(exactEpisodeAt) : undefined,
      trigger_hypotheses: triggerHypotheses.length > 0 ? triggerHypotheses : undefined,
      trigger_detail: triggerDetail.trim() || undefined,
    });
    if (result.success) {
      router.refresh();
      const data = await getWhatToTryAfterLogAction(behaviorCode, triggerHypotheses);
      setWhatToTryData(data);
      setShowWhatToTry(true);
    } else {
      setError(result.error);
    }
  }

  if (showWhatToTry && whatToTryData) {
    return (
      <WhatToTryNextCard
        behaviorCode={behaviorCode}
        data={whatToTryData}
        onDone={() => {
          router.refresh();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="card-heading">Quick note</h2>
        <button type="button" onClick={onClose} className="text-care-stone hover:text-care-bark">
          Cancel
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Behavior</label>
          <select
            value={behaviorCode}
            onChange={(e) => setBehaviorCode(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {BEHAVIOR_OPTIONS.map(({ label, code }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <EpisodeTimingSelector
          episodeRecency={episodeRecency}
          episodeTimeOfDay={episodeTimeOfDay}
          episodeDayContext={episodeDayContext}
          exactEpisodeAt={exactEpisodeAt}
          showExact={showExactEpisode}
          onRecencyChange={setEpisodeRecency}
          onTimeOfDayChange={setEpisodeTimeOfDay}
          onDayContextChange={setEpisodeDayContext}
          onExactEpisodeAtChange={setExactEpisodeAt}
          onShowExactChange={setShowExactEpisode}
        />
        <SeveritySelector value={severity} onChange={setSeverity} required />
        <div className="section-band section-band--trigger">
          <span className="section-label section-label--trigger">Triggers (optional)</span>
          <div className="mt-4 space-y-4">
            {COACH_FLOW_TRIGGER_GROUPS.map((group) => (
              <div
                key={group.category}
                className="rounded-xl border border-care-sage/80 bg-white/80 p-4 shadow-sm"
              >
                <p className="mb-3 text-sm font-semibold text-care-forest">{group.category}</p>
                <div className="flex flex-wrap gap-2">
                  {group.chips.map((chip) => {
                    const selected = triggerHypotheses.includes(chip.code);
                    return (
                      <button
                        key={chip.code}
                        type="button"
                        onClick={() => toggleTrigger(chip.code)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? "border-care-forest bg-care-mint/30 font-medium text-care-forest"
                            : "border-care-sage bg-white text-care-bark hover:border-care-mint"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-1">
            <label className="text-sm font-medium">Detail (optional)</label>
            <input
              type="text"
              placeholder="Short note"
              value={triggerDetail}
              onChange={(e) => setTriggerDetail(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary">
          Save note
        </button>
      </form>
    </div>
  );
}
