const CHART_COLORS = [
  "#1E5532",
  "#4a7c62",
  "#3d6b85",
  "#9a6b2e",
  "#6b6b6b",
  "#265939",
  "#5c7c64",
  "#c9a227",
] as const;

export type ChartSegment = {
  label: string;
  value: number;
  color?: string;
};

function chartTotal(segments: ChartSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.value, 0);
}

function segmentColor(segments: ChartSegment[], index: number): string {
  return segments[index]?.color ?? CHART_COLORS[index % CHART_COLORS.length];
}

export function SynopsisMetricTiles({
  daysWithLogs,
  totalDays,
  totalIncidents,
  trend,
}: {
  daysWithLogs: number;
  totalDays: number;
  totalIncidents: number;
  trend: string;
}) {
  const coverage = totalDays > 0 ? Math.round((daysWithLogs / totalDays) * 100) : 0;
  const trendLabel =
    trend === "improving"
      ? "Improving"
      : trend === "worsening"
        ? "Worsening"
        : trend === "stable"
          ? "Stable"
          : "Early data";

  return (
    <div className="synopsis-metrics">
      <div className="synopsis-metrics__tile">
        <SynopsisCoverageRing percent={coverage} />
        <p className="synopsis-metrics__label">Days with notes</p>
        <p className="synopsis-metrics__value">
          {daysWithLogs}/{totalDays}
        </p>
      </div>
      <div className="synopsis-metrics__tile">
        <div className="synopsis-metrics__count" aria-hidden>
          {totalIncidents}
        </div>
        <p className="synopsis-metrics__label">Incidents</p>
        <p className="synopsis-metrics__value">in period</p>
      </div>
      <div className="synopsis-metrics__tile">
        <span className={`synopsis-trend synopsis-trend--${trend}`}>{trendLabel}</span>
        <p className="synopsis-metrics__label">Overall trend</p>
        <p className="synopsis-metrics__value">vs prior period</p>
      </div>
    </div>
  );
}

function SynopsisCoverageRing({ percent }: { percent: number }) {
  const radius = 34;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="synopsis-ring" width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle
        cx="36"
        cy="36"
        r={normalizedRadius}
        fill="none"
        stroke="#EAF2EC"
        strokeWidth={stroke}
      />
      <circle
        cx="36"
        cy="36"
        r={normalizedRadius}
        fill="none"
        stroke="#1E5532"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" className="synopsis-ring__text">
        {percent}%
      </text>
    </svg>
  );
}

export function SynopsisDonutChart({
  segments,
  title,
  centerLabel,
}: {
  segments: ChartSegment[];
  title: string;
  centerLabel?: string;
}) {
  const total = chartTotal(segments);
  if (total === 0) {
    return <p className="text-sm text-care-stone">Not enough data yet.</p>;
  }

  let cursor = 0;
  const arcs = segments.map((segment, index) => {
    const fraction = segment.value / total;
    const start = cursor;
    cursor += fraction;
    return {
      ...segment,
      start,
      end: cursor,
      color: segmentColor(segments, index),
      percent: Math.round(fraction * 100),
    };
  });

  return (
    <div className="synopsis-donut">
      <p className="synopsis-chart__title">{title}</p>
      <div className="synopsis-donut__body">
        <div
          className="synopsis-donut__wheel"
          style={{
            width: "10rem",
            height: "10rem",
            background: `conic-gradient(${arcs
              .map((arc) => `${arc.color} ${arc.start * 360}deg ${arc.end * 360}deg`)
              .join(", ")})`,
          }}
          aria-hidden
        >
          <div className="synopsis-donut__hole">
            {centerLabel && <span className="synopsis-donut__center">{centerLabel}</span>}
          </div>
        </div>
        <ul className="synopsis-donut__legend">
          {arcs.map((arc) => (
            <li key={arc.label} className="synopsis-donut__legend-item">
              <span className="synopsis-donut__swatch" style={{ backgroundColor: arc.color }} />
              <span className="synopsis-donut__legend-label">{arc.label}</span>
              <span className="synopsis-donut__legend-value">
                {arc.value} ({arc.percent}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SynopsisBarChart({
  title,
  items,
  maxValue,
  showSeverity,
}: {
  title: string;
  items: Array<{ label: string; value: number; severity?: number; color?: string }>;
  maxValue?: number;
  showSeverity?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-care-stone">Not enough data yet.</p>;
  }

  const peak = maxValue ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="synopsis-bars">
      <p className="synopsis-chart__title">{title}</p>
      <ul className="synopsis-bars__list">
        {items.map((item, index) => {
          const width = Math.max(8, Math.round((item.value / peak) * 100));
          const color = item.color ?? CHART_COLORS[index % CHART_COLORS.length];
          return (
            <li key={item.label} className="synopsis-bars__row">
              <div className="synopsis-bars__meta">
                <span className="synopsis-bars__label">{item.label}</span>
                {showSeverity && item.severity !== undefined && (
                  <span className="synopsis-bars__severity">Avg {item.severity.toFixed(1)}/3</span>
                )}
              </div>
              <div className="synopsis-bars__track" aria-hidden>
                <span
                  className="synopsis-bars__fill"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
              <span className="synopsis-bars__value">{item.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SynopsisTimelineBar({
  title,
  segments,
}: {
  title: string;
  segments: ChartSegment[];
}) {
  const total = chartTotal(segments);
  if (total === 0) {
    return <p className="text-sm text-care-stone">Not enough data yet.</p>;
  }

  return (
    <div className="synopsis-timeline">
      <p className="synopsis-chart__title">{title}</p>
      <div className="synopsis-timeline__track" aria-hidden>
        {segments.map((segment, index) => {
          const width = (segment.value / total) * 100;
          if (width <= 0) return null;
          return (
            <span
              key={segment.label}
              className="synopsis-timeline__segment"
              style={{
                width: `${width}%`,
                backgroundColor: segmentColor(segments, index),
              }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
      <ul className="synopsis-timeline__legend">
        {segments.map((segment, index) => (
          <li key={segment.label} className="synopsis-timeline__legend-item">
            <span
              className="synopsis-timeline__swatch"
              style={{ backgroundColor: segmentColor(segments, index) }}
            />
            <span>{segment.label}</span>
            <span className="synopsis-timeline__count">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SynopsisStrategyBars({
  title,
  strategies,
}: {
  title: string;
  strategies: Array<{ label: string; helped: number; total: number }>;
}) {
  if (strategies.length === 0) {
    return <p className="text-sm text-care-stone">No strategies recorded yet.</p>;
  }

  return (
    <div className="synopsis-strategy-bars">
      <p className="synopsis-chart__title">{title}</p>
      <ul className="synopsis-strategy-bars__list">
        {strategies.map((strategy) => {
          const rate = strategy.total > 0 ? strategy.helped / strategy.total : 0;
          const percent = Math.round(rate * 100);
          return (
            <li key={strategy.label} className="synopsis-strategy-bars__row">
              <div className="synopsis-strategy-bars__header">
                <span className="synopsis-strategy-bars__label">{strategy.label}</span>
                <span className="synopsis-strategy-bars__rate">{percent}% helped</span>
              </div>
              <div className="synopsis-strategy-bars__track" aria-hidden>
                <span
                  className="synopsis-strategy-bars__fill"
                  style={{ width: `${Math.max(percent, 4)}%` }}
                />
              </div>
              <p className="synopsis-strategy-bars__meta">
                {strategy.helped} of {strategy.total} tries
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SynopsisQuestionCards({ questions }: { questions: string[] }) {
  return (
    <ul className="synopsis-question-cards">
      {questions.map((question) => (
        <li key={question} className="synopsis-question-cards__item">
          <span className="synopsis-question-cards__icon" aria-hidden>
            ?
          </span>
          <p>{question}</p>
        </li>
      ))}
    </ul>
  );
}
