"use client";

import {
  EPISODE_DAY_CONTEXT_OPTIONS,
  EPISODE_RECENCY_OPTIONS,
  EPISODE_TIME_OF_DAY_OPTIONS,
  toDatetimeLocal,
  type EpisodeDayContext,
  type EpisodeRecency,
  type EpisodeTimeOfDay,
} from "@/src/lib/episodeTiming";

type EpisodeTimingSelectorProps = {
  episodeRecency: EpisodeRecency;
  episodeTimeOfDay: EpisodeTimeOfDay;
  episodeDayContext: EpisodeDayContext;
  exactEpisodeAt: string;
  showExact: boolean;
  onRecencyChange: (value: EpisodeRecency) => void;
  onTimeOfDayChange: (value: EpisodeTimeOfDay) => void;
  onDayContextChange: (value: EpisodeDayContext) => void;
  onExactEpisodeAtChange: (value: string) => void;
  onShowExactChange: (show: boolean) => void;
};

function OptionGroup<T extends string>({
  question,
  options,
  value,
  onChange,
  name,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <fieldset className="episode-timing-group">
      <legend className="episode-timing-group__question">{question}</legend>
      <div className="episode-timing-group__options">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`coach-flow-chip ${selected ? "coach-flow-chip--selected" : "coach-flow-chip--idle"}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function EpisodeTimingSelector({
  episodeRecency,
  episodeTimeOfDay,
  episodeDayContext,
  exactEpisodeAt,
  showExact,
  onRecencyChange,
  onTimeOfDayChange,
  onDayContextChange,
  onExactEpisodeAtChange,
  onShowExactChange,
}: EpisodeTimingSelectorProps) {
  return (
    <div className="episode-timing">
      <OptionGroup
        question="When did this happen?"
        options={EPISODE_RECENCY_OPTIONS}
        value={episodeRecency}
        onChange={onRecencyChange}
        name="episode-recency"
      />

      <OptionGroup
        question="About what time of day?"
        options={EPISODE_TIME_OF_DAY_OPTIONS}
        value={episodeTimeOfDay}
        onChange={onTimeOfDayChange}
        name="episode-time-of-day"
      />

      <OptionGroup
        question="Was this a usual day?"
        options={EPISODE_DAY_CONTEXT_OPTIONS}
        value={episodeDayContext}
        onChange={onDayContextChange}
        name="episode-day-context"
      />

      <div className="episode-timing__advanced">
        {!showExact ? (
          <button
            type="button"
            onClick={() => {
              onShowExactChange(true);
              if (!exactEpisodeAt) {
                onExactEpisodeAtChange(toDatetimeLocal(new Date().toISOString()));
              }
            }}
            className="episode-timing__link"
          >
            Add exact date and time
          </button>
        ) : (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="exact-episode-at" className="coach-flow-field-label">
                Exact date and time
              </label>
              <button
                type="button"
                onClick={() => {
                  onShowExactChange(false);
                  onExactEpisodeAtChange("");
                }}
                className="episode-timing__link"
              >
                Remove
              </button>
            </div>
            <input
              id="exact-episode-at"
              type="datetime-local"
              value={exactEpisodeAt}
              onChange={(e) => onExactEpisodeAtChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
