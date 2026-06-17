"use client";

import { getBehaviorLabel } from "@/src/lib/behaviorMap";

export type PastAttemptOutcome = {
  intervention: string;
  better: number;
  same: number;
  worse: number;
};

export type WhatToTryData = {
  behaviorCode: string;
  pastAttempts: { totalLogs: number; attempts: PastAttemptOutcome[] };
  generalTips: string[];
};

function verdict(better: number, same: number, worse: number): string {
  const total = better + same + worse;
  if (total === 0) return "";
  if (better > same + worse) return "— Usually helped";
  if (worse >= better && worse > 0) return "— Didn’t help much";
  return "— Mixed results";
}

export default function WhatToTryNextCard({
  behaviorCode,
  data,
  onDone,
}: {
  behaviorCode: string;
  data: WhatToTryData;
  onDone: () => void;
}) {
  const behaviorLabel = getBehaviorLabel(behaviorCode);
  const { pastAttempts, generalTips } = data;
  const hasAttempts = pastAttempts.attempts.length > 0;

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="card-heading">What to try for {behaviorLabel}</h2>
          <p className="mt-1 text-sm text-care-stone">
            Based on your {pastAttempts.totalLogs} past log{pastAttempts.totalLogs !== 1 ? "s" : ""} for this behavior.
          </p>
        </div>
        <button type="button" onClick={onDone} className="btn-primary">
          Done
        </button>
      </div>

      {hasAttempts ? (
        <div className="section-band section-band--suggestions">
          <span className="section-label section-label--suggestions">What you’ve tried before — and what worked</span>
          <p className="mt-2 text-sm text-care-bark">
            From your logs: how often each approach was better, same, or worse.
          </p>
          <ul className="mt-3 space-y-3">
            {pastAttempts.attempts.map((a, i) => (
              <li key={i} className="rounded-lg border border-care-sage bg-white p-3 text-sm">
                <p className="font-medium text-care-bark">{a.intervention}</p>
                <p className="mt-1 text-care-stone">
                  Better {a.better} · Same {a.same} · Worse {a.worse}
                  <span className="ml-1 font-medium text-care-forest">
                    {verdict(a.better, a.same, a.worse)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-care-stone">
            Consider trying again what usually helped. Avoid what didn’t help much.
          </p>
        </div>
      ) : (
        <div className="section-band section-band--trigger">
          <span className="section-label section-label--trigger">No past tries yet for this behavior</span>
          <p className="mt-2 text-sm text-care-bark">
            You don’t have past logs for <strong>{behaviorLabel}</strong> yet. After you try something and set the outcome in History, we’ll show what worked for you here.
          </p>
        </div>
      )}

      {generalTips.length > 0 && (
        <div className="section-band section-band--trigger">
          <span className="section-label section-label--trigger">General tips (from care guidelines)</span>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-care-bark">
            {generalTips.slice(0, 5).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onDone} className="btn-primary">
          Done
        </button>
      </div>
    </div>
  );
}
