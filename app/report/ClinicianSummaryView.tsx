import type { ReportData } from "@/src/lib/repo";
import { getBehaviorLabel } from "@/src/lib/behaviorMap";
import { getStrategyLabel } from "@/src/lib/coachFlowCatalog";
import { getTriggerDisplayLabel } from "@/src/lib/synopsisBuilder";
import {
  SynopsisBarChart,
  SynopsisDonutChart,
  SynopsisMetricTiles,
  SynopsisQuestionCards,
  SynopsisStrategyBars,
  SynopsisTimelineBar,
} from "./SynopsisCharts";
import {
  trendClinicianLabel,
  type SynopsisProfileLines,
} from "./synopsisHelpers";

function formatComparisonChange(value: number, unit: string): string {
  if (value === 0) return `No change in ${unit}`;
  const direction = value > 0 ? "+" : "";
  return `${direction}${value} ${unit} vs prior period`;
}

export default function ClinicianSummaryView({
  data,
  periodLabel,
  profile,
}: {
  data: ReportData;
  periodLabel: string;
  profile: SynopsisProfileLines;
}) {
  const primaryBehavior = data.topBehaviors[0]?.behavior ?? "OTHER_BEHAVIOR";
  const outcomeSegments = [
    { label: "Helped", value: data.strategyOutcomes.helped, color: "#1E5532" },
    {
      label: "Mixed / no change",
      value: data.strategyOutcomes.helpedLittleOrDidNotHelp,
      color: "#9a6b2e",
    },
    { label: "Made worse", value: data.strategyOutcomes.madeWorse, color: "#c45c4a" },
    { label: "Not sure", value: data.strategyOutcomes.notSure, color: "#6b6b6b" },
  ].filter((segment) => segment.value > 0);
  const contextLine = profile.fullContext ?? data.careContext;

  return (
    <div id="synopsis-content" className="synopsis-view synopsis-view--clinician synopsis-print space-y-6">
      <div className="print-only mb-6 border-b border-care-sage pb-4">
        <h1 className="font-serif text-2xl font-semibold text-care-forest">For clinicians</h1>
        <p className="mt-1 text-sm text-care-stone">{periodLabel}</p>
      </div>

      {contextLine && (
        <section className="card synopsis-section synopsis-section--context">
          <h2 className="card-heading mb-3">Care context</h2>
          <p className="text-sm font-medium leading-relaxed text-care-forest">{contextLine}</p>
          {(profile.caregiverLine || profile.caredForLine) && (
            <dl className="synopsis-context-grid mt-4">
              {profile.caregiverLine && (
                <>
                  <dt>Caregiver</dt>
                  <dd>{profile.caregiverLine}</dd>
                </>
              )}
              {profile.caredForLine && (
                <>
                  <dt>Person cared for</dt>
                  <dd>{profile.caredForLine}</dd>
                </>
              )}
            </dl>
          )}
        </section>
      )}

      <section className="card synopsis-section synopsis-section--data">
        <h2 className="card-heading mb-3">Data coverage</h2>
        <SynopsisMetricTiles
          daysWithLogs={data.daysWithLogs}
          totalDays={data.totalDays}
          totalIncidents={data.totalIncidents}
          trend={data.trend}
        />
        <p className="synopsis-insight mt-4">{trendClinicianLabel(data.trend)}</p>
      </section>

      <section className="card synopsis-section synopsis-section--behaviors">
        <h2 className="card-heading mb-4">Behavior frequency &amp; severity</h2>
        {data.topBehaviors.length === 0 ? (
          <p className="text-sm text-care-stone">No behavior observations recorded for this period.</p>
        ) : (
          <>
            <div className="synopsis-chart-grid">
              <SynopsisBarChart
                title="Most frequently logged behaviors"
                showSeverity
                items={data.topBehaviors.map((behavior) => ({
                  label: getBehaviorLabel(behavior.behavior),
                  value: behavior.count,
                  severity: behavior.avgSeverity,
                }))}
              />
              {data.timeOfDayPattern.length > 0 && (
                <SynopsisTimelineBar
                  title="Temporal distribution"
                  segments={data.timeOfDayPattern.map((period) => ({
                    label: period.period,
                    value: period.count,
                  }))}
                />
              )}
            </div>
            {data.previousPeriodComparison.length > 0 && (
              <div className="synopsis-comparison mt-4">
                <h3 className="mb-2 text-sm font-semibold text-care-forest">Vs prior period</h3>
                <ul className="synopsis-comparison__list">
                  {data.previousPeriodComparison.slice(0, 4).map((item) => (
                    <li key={item.behavior} className="synopsis-comparison__item">
                      <span className="synopsis-comparison__label">
                        {getBehaviorLabel(item.behavior)}
                      </span>
                      <span className="synopsis-comparison__values">
                        {formatComparisonChange(item.countChange, "incidents")}
                        {item.severityChange !== 0 &&
                          ` · ${formatComparisonChange(
                            Math.round(item.severityChange * 10) / 10,
                            "avg severity"
                          )}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card synopsis-section synopsis-section--triggers">
        <h2 className="card-heading mb-4">Reported trigger associations</h2>
        {data.triggerCategories.length === 0 && data.topTriggersOverall.length === 0 ? (
          <p className="text-sm text-care-stone">Triggers were not consistently recorded by the caregiver.</p>
        ) : (
          <div className="synopsis-chart-grid">
            {data.triggerCategories.length > 0 && (
              <SynopsisDonutChart
                title="Trigger categories (caregiver-reported)"
                centerLabel={`${data.triggerCategories.reduce((sum, item) => sum + item.count, 0)}`}
                segments={data.triggerCategories.map((category) => ({
                  label: category.category,
                  value: category.count,
                }))}
              />
            )}
            {data.topTriggersOverall.length > 0 && (
              <SynopsisBarChart
                title="Most repeated triggers"
                items={data.topTriggersOverall.map((trigger) => ({
                  label: getTriggerDisplayLabel(trigger.trigger, primaryBehavior),
                  value: trigger.count,
                }))}
              />
            )}
          </div>
        )}
        {Object.keys(data.topTriggersByBehavior).length > 0 && (
          <div className="synopsis-trigger-matrix mt-4">
            <h3 className="mb-2 text-sm font-semibold text-care-forest">By behavior</h3>
            <div className="synopsis-trigger-matrix__grid">
              {Object.entries(data.topTriggersByBehavior)
                .slice(0, 3)
                .map(([behavior, triggers]) => (
                  <div key={behavior} className="synopsis-trigger-matrix__cell">
                    <p className="synopsis-trigger-matrix__behavior">{getBehaviorLabel(behavior)}</p>
                    <ul className="synopsis-trigger-matrix__list">
                      {triggers.slice(0, 3).map((trigger) => (
                        <li key={trigger.trigger}>
                          {getTriggerDisplayLabel(trigger.trigger, behavior)} ({trigger.count})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      <section className="card synopsis-section synopsis-section--helped">
        <h2 className="card-heading mb-4">Intervention response (caregiver-reported)</h2>
        {data.strategiesSummary.length === 0 && outcomeSegments.length === 0 ? (
          <p className="text-sm text-care-stone">No interventions recorded for this period.</p>
        ) : (
          <div className="synopsis-chart-grid">
            {outcomeSegments.length > 0 && (
              <SynopsisDonutChart
                title="Reported outcomes after intervention"
                centerLabel={`${outcomeSegments.reduce((sum, item) => sum + item.value, 0)}`}
                segments={outcomeSegments}
              />
            )}
            {data.strategiesSummary.length > 0 && (
              <SynopsisStrategyBars
                title="Help rate by strategy"
                strategies={data.strategiesSummary.slice(0, 6).map((strategy) => ({
                  label: getStrategyLabel(strategy.strategy),
                  helped: strategy.helped,
                  total: strategy.totalCount,
                }))}
              />
            )}
          </div>
        )}
        {data.helpfulInterventions.length > 0 && (
          <div className="synopsis-highlight mt-4">
            <h3 className="mb-1 text-sm font-semibold text-care-forest">Higher reported benefit</h3>
            <p className="text-sm leading-relaxed text-care-bark">
              {data.helpfulInterventions
                .slice(0, 3)
                .map(
                  (item) =>
                    `${getStrategyLabel(item.intervention)} (${Math.round(item.betterRate * 100)}% reported helped, n=${item.totalCount})`
                )
                .join(" · ")}
            </p>
          </div>
        )}
      </section>

      <section className="card synopsis-section synopsis-section--changes">
        <h2 className="card-heading mb-2">Suggested topics for care conversation</h2>
        <p className="mb-4 text-sm text-care-stone">
          Questions derived from logged patterns — starting points for discussion, not recommendations.
        </p>
        <SynopsisQuestionCards questions={data.discussionQuestions} />
      </section>
    </div>
  );
}
