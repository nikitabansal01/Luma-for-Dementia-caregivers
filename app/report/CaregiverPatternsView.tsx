import type { ReportData, SynopsisLogPreview } from "@/src/lib/repo";
import {
  buildCaregiverAppointmentQuestions,
  buildCaregiverBehaviorRows,
  buildCaregiverHighlightChips,
  buildCaregiverPeriodSummary,
  buildHelpfulStrategies,
  buildReducibleTriggers,
  buildStrategiesToRethink,
  buildTryNextMonthTips,
  getTimePillClass,
  type SynopsisProfileLines,
} from "./synopsisHelpers";
import {
  CgIcon,
  ConfidenceBadge,
  DashboardCard,
  EffectivenessBar,
  SeverityMeter,
  strategyHelpLabel,
  strategyRethinkLabel,
} from "./CaregiverSynopsisVisuals";

export default function CaregiverPatternsView({
  data,
  periodLabel,
  profile: _profile,
  recentMoments: _recentMoments,
  isSample = false,
}: {
  data: ReportData;
  periodLabel: string;
  profile: SynopsisProfileLines;
  recentMoments: SynopsisLogPreview[];
  isSample?: boolean;
}) {
  const periodSummary = buildCaregiverPeriodSummary(data);
  const highlightChips = buildCaregiverHighlightChips(data);
  const behaviorRows = buildCaregiverBehaviorRows(data);
  const reducibleTriggers = buildReducibleTriggers(data);
  const helpfulStrategies = buildHelpfulStrategies(data);
  const rethinkStrategies = buildStrategiesToRethink(data);
  const tryNextTips = buildTryNextMonthTips(data);
  const appointmentQuestions = buildCaregiverAppointmentQuestions(data);
  const hasData = data.totalIncidents > 0;

  return (
    <div id="synopsis-content" className="synopsis-view synopsis-view--caregiver cg-dashboard synopsis-print space-y-6">
      <div className="print-only mb-6 border-b border-care-sage pb-4">
        <h1 className="font-serif text-2xl font-semibold text-care-forest">For caregivers</h1>
        <p className="mt-1 text-sm text-care-stone">{periodLabel}</p>
      </div>

      <section className={`cg-summary${isSample ? " cg-summary--sample" : ""}`}>
        <div className="cg-summary__header">
          <h2 className="cg-summary__heading">What stood out this period</h2>
          {isSample && (
            <span className="cg-summary__sample-pill no-print">Example data</span>
          )}
        </div>
        <p className="cg-summary__text">{periodSummary}</p>
        {highlightChips.length > 0 && (
          <div className="cg-summary__chips">
            {highlightChips.map((chip) => (
              <div key={chip.id} className={`cg-summary__chip cg-summary__chip--${chip.id}`}>
                <span className="cg-summary__chip-label">{chip.label}</span>
                <span className="cg-summary__chip-value">{chip.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="cg-dashboard-grid">
        <DashboardCard title="Questions to bring up during appointment" className="cg-card--questions cg-card--wide">
          <ul className="cg-question-list">
            {appointmentQuestions.map((question) => (
              <li key={question.id} className="cg-question-list__item">
                <span className="cg-question-list__icon">
                  <CgIcon name="question" />
                </span>
                <p>{question.text}</p>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="Top recurring behaviors" className="cg-card--behaviors">
          {!hasData || behaviorRows.length === 0 ? (
            <p className="cg-empty">Log behaviors to see what shows up most.</p>
          ) : (
            <div className="cg-table">
              <div className="cg-table__head cg-table__row">
                <span>Behavior</span>
                <span>Count</span>
                <span>Avg. severity</span>
                <span>Common time</span>
              </div>
              {behaviorRows.map((row) => (
                <div key={row.behaviorCode} className="cg-table__row">
                  <span className="cg-table__behavior">
                    <CgIcon name="behavior" />
                    <span>
                      {row.label}
                      <ConfidenceBadge confidence={row.confidence} />
                    </span>
                  </span>
                  <span className="cg-table__count">{row.count}</span>
                  <SeverityMeter value={row.avgSeverity} />
                  <span className={`cg-time-pill ${getTimePillClass(row.peakTime)}`}>
                    {row.peakTime ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Triggers you may be able to reduce" className="cg-card--triggers">
          {reducibleTriggers.length === 0 ? (
            <p className="cg-empty">Note triggers when you log — patterns appear here.</p>
          ) : (
            <ul className="cg-trigger-list">
              {reducibleTriggers.map((trigger) => (
                <li key={trigger.triggerCode} className="cg-trigger-list__item">
                  <span className="cg-trigger-list__icon">
                    <CgIcon name="trigger" />
                  </span>
                  <div className="cg-trigger-list__body">
                    <div className="cg-trigger-list__top">
                      <span className="cg-trigger-list__name">{trigger.label}</span>
                      <span className="cg-trigger-list__count">{trigger.count} logs</span>
                    </div>
                    <ConfidenceBadge confidence={trigger.confidence} />
                    {trigger.linkedBehaviors.length > 0 && (
                      <p className="cg-trigger-list__linked">
                        Linked: {trigger.linkedBehaviors.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Strategies that seemed to help" className="cg-card--helped">
          {helpfulStrategies.length === 0 ? (
            <p className="cg-empty">When something helps, log the outcome here.</p>
          ) : (
            <ul className="cg-strategy-list">
              {helpfulStrategies.map((strategy) => (
                <li key={strategy.code} className="cg-strategy-list__item">
                  <div className="cg-strategy-list__header">
                    <span className="cg-strategy-list__name">{strategy.label}</span>
                    <span className="cg-strategy-list__result">{strategyHelpLabel(strategy)}</span>
                  </div>
                  <EffectivenessBar
                    helped={strategy.helped}
                    total={strategy.total}
                    variant={strategy.isMixed ? "mixed" : "positive"}
                  />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Strategies to rethink" className="cg-card--rethink">
          {rethinkStrategies.length === 0 ? (
            <p className="cg-empty">No strategies flagged yet — keep noting outcomes.</p>
          ) : (
            <ul className="cg-strategy-list">
              {rethinkStrategies.map((strategy) => (
                <li key={strategy.code} className="cg-strategy-list__item cg-strategy-list__item--rethink">
                  <div className="cg-strategy-list__header">
                    <span className="cg-strategy-list__name">{strategy.label}</span>
                    <span className="cg-strategy-list__result cg-strategy-list__result--warn">
                      {strategyRethinkLabel(strategy)}
                    </span>
                  </div>
                  <EffectivenessBar
                    helped={strategy.didNotHelp + strategy.madeWorse}
                    total={strategy.total}
                    variant="negative"
                  />
                  {strategy.rethinkNote && (
                    <p className="cg-strategy-list__note">{strategy.rethinkNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Try this next month" className="cg-card--next">
          <ul className="cg-tip-list">
            {tryNextTips.map((tip) => (
              <li key={tip.id} className="cg-tip-list__item">
                <span className="cg-tip-list__icon">
                  <CgIcon
                    name={
                      tip.verb === "Watch for"
                        ? "eye"
                        : tip.verb === "Repeat"
                          ? "repeat"
                          : tip.verb === "Adjust"
                            ? "adjust"
                            : "note"
                    }
                  />
                </span>
                <p className="cg-tip-list__text">
                  <strong>{tip.verb}</strong> {tip.detail}
                </p>
              </li>
            ))}
          </ul>
        </DashboardCard>

      </div>
    </div>
  );
}
