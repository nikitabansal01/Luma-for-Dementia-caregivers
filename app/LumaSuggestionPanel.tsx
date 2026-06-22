"use client";

import type { RecommendationCard } from "@/src/lib/coachFlowRecommendations";

type LumaSuggestionPanelProps = {
  recommendations: RecommendationCard[];
  className?: string;
};

export default function LumaSuggestionPanel({
  recommendations,
  className = "",
}: LumaSuggestionPanelProps) {
  return (
    <div className={className}>
      <h3 className="font-serif text-lg font-semibold text-care-forest">Suggested next steps</h3>
      <p className="mt-1 text-sm leading-relaxed text-care-stone">
        Based on what happened, possible triggers, and what you already tried.
      </p>
      <div className="mt-4 space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-sm leading-relaxed text-care-stone">
            No specific suggestions right now. Save this note and share with your care team when
            you&apos;re ready.
          </p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className="coach-suggestion-card">
              <p className="font-semibold text-care-forest">{rec.action}</p>
              <p className="mt-2 text-care-bark">
                <span className="font-medium text-care-stone">Why this may help: </span>
                {rec.why}
              </p>
              <p className="mt-1 text-care-bark">
                <span className="font-medium text-care-stone">When to try it: </span>
                {rec.when}
              </p>
              {rec.safetyNote && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Safety: {rec.safetyNote}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
