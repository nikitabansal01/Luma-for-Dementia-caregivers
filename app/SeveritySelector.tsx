"use client";

import { SEVERITY_OPTIONS } from "@/src/lib/severityCatalog";

type SeveritySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  hintWhenDisabled?: string;
  required?: boolean;
};

export default function SeveritySelector({
  value,
  onChange,
  disabled = false,
  title = "Severity",
  subtitle = "How intense or disruptive was the behavior?",
  hintWhenDisabled,
  required = false,
}: SeveritySelectorProps) {
  return (
    <div className="severity-selector">
      <div className="severity-selector__header">
        <p className="severity-selector__title">
          {title}
          {disabled && hintWhenDisabled && (
            <span className="ml-1 font-normal text-care-stone">— {hintWhenDisabled}</span>
          )}
        </p>
        <p className="severity-selector__subtitle">{subtitle}</p>
      </div>

      <div
        className="severity-selector__grid"
        role="radiogroup"
        aria-label={title}
        aria-required={required || undefined}
      >
        {SEVERITY_OPTIONS.map(({ value: level, label: levelLabel, hint, emoji, tone }) => {
          const isSelected = value === level;
          const stateClass = disabled
            ? "severity-card--disabled"
            : isSelected
              ? `severity-card--selected severity-card--selected-${tone}`
              : "severity-card--idle";

          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`severity-card ${stateClass}`}
            >
              <span className={`severity-card__icon severity-card__icon--${tone}`} aria-hidden>
                <span className="severity-card__emoji">{emoji}</span>
              </span>
              <span className="severity-card__text">
                <span className="severity-card__level">{level}</span>
                <span className="severity-card__label">{levelLabel}</span>
                <span className="severity-card__hint">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
