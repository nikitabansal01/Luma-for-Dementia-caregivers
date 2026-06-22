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

function triggerLabel(trigger: string, behaviorCode: string): string {
  return getTriggerDisplayLabel(trigger, behaviorCode);
}

export default function SynopsisReportView({
  data,
  periodLabel,
}: {
  data: ReportData;
  periodLabel: string;
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

  return (
    <div id="synopsis-content" className="synopsis-print space-y-6">
      <div className="print-only mb-6 border-b border-care-sage pb-4">
        <h1 className="font-serif text-2xl font-semibold text-care-forest">Care Synopsis</h1>
        <p className="mt-1 text-sm text-care-stone">{periodLabel}</p>
      </div>

      <section className="card report-section--data">
        <h2 className="card-heading mb-3">At a glance</h2>
        {data.careContext && (
          <p className="mb-4 text-sm font-medium text-care-forest">{data.careContext}</p>
        )}
        <SynopsisMetricTiles
          daysWithLogs={data.daysWithLogs}
          totalDays={data.totalDays}
          totalIncidents={data.totalIncidents}
          trend={data.trend}
        />
      </section>

      <section className="card report-section--behaviors">
        <h2 className="card-heading mb-4">Behavior patterns</h2>
        {data.topBehaviors.length === 0 ? (
          <p className="text-sm text-care-stone">No behavior data recorded for this period.</p>
        ) : (
          <div className="synopsis-chart-grid">
            <SynopsisBarChart
              title="Most frequent behaviors"
              showSeverity
              items={data.topBehaviors.map((behavior) => ({
                label: getBehaviorLabel(behavior.behavior),
                value: behavior.count,
                severity: behavior.avgSeverity,
              }))}
            />
            {data.timeOfDayPattern.length > 0 && (
              <SynopsisTimelineBar
                title="When incidents happen"
                segments={data.timeOfDayPattern.map((period) => ({
                  label: period.period,
                  value: period.count,
                }))}
              />
            )}
          </div>
        )}
      </section>

      <section className="card report-section--triggers">
        <h2 className="card-heading mb-4">Trigger patterns</h2>
        {data.triggerCategories.length === 0 && data.topTriggersOverall.length === 0 ? (
          <p className="text-sm text-care-stone">Triggers were not consistently recorded.</p>
        ) : (
          <div className="synopsis-chart-grid">
            {data.triggerCategories.length > 0 && (
              <SynopsisDonutChart
                title="Trigger categories"
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
                  label: triggerLabel(trigger.trigger, primaryBehavior),
                  value: trigger.count,
                }))}
              />
            )}
          </div>
        )}
      </section>

      <section className="card report-section--helped">
        <h2 className="card-heading mb-4">What seems to help</h2>
        {data.strategiesSummary.length === 0 && outcomeSegments.length === 0 ? (
          <p className="text-sm text-care-stone">No strategies were recorded for this period.</p>
        ) : (
          <div className="synopsis-chart-grid">
            {outcomeSegments.length > 0 && (
              <SynopsisDonutChart
                title="Strategy outcomes"
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
        {data.topHelpfulStrategies.length > 0 && (
          <div className="synopsis-highlight mt-4">
            <h3 className="mb-1 text-sm font-semibold text-care-forest">Standouts</h3>
            <p className="text-sm leading-relaxed text-care-bark">
              {data.topHelpfulStrategies.map((code) => getStrategyLabel(code)).join(" · ")}
            </p>
          </div>
        )}
      </section>

      <section className="card report-section--changes">
        <h2 className="card-heading mb-4">Bring to your appointment</h2>
        <SynopsisQuestionCards questions={data.discussionQuestions} />
      </section>
    </div>
  );
}
