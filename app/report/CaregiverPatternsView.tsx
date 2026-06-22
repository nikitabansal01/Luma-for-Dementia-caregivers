import type { ReportData, SynopsisLogPreview } from "@/src/lib/repo";
import Link from "next/link";
import {
  buildCaregiverAppointmentQuestions,
  buildCaregiverBehaviorRows,
  buildCaregiverGlanceStats,
  buildHelpfulStrategies,
  buildReducibleTriggers,
  buildStrategiesToRethink,
  buildTryNextMonthTips,
  getTimePillClass,
  type SynopsisProfileLines,
} from "./synopsisHelpers";
import { SYNOPSIS_SAMPLE_LABEL } from "./synopsisConfig";
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
  profile,
  recentMoments: _recentMoments,
  isSample = false,
}: {
  data: ReportData;
  periodLabel: string;
  profile: SynopsisProfileLines;
  recentMoments: SynopsisLogPreview[];
  isSample?: boolean;
}) {
  const glanceStats = buildCaregiverGlanceStats(data);
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

      {isSample && (
        <p className="synopsis-section__sample-label no-print">{SYNOPSIS_SAMPLE_LABEL}</p>
      )}

      <section className="cg-glance">
        <h2 className="cg-glance__heading">This period at a glance</h2>
        <div className="cg-glance-strip" role="list">
          {glanceStats.map((stat) => (
            <div
              key={stat.id}
              role="listitem"
              className={`cg-glance-cell cg-glance-cell--${stat.id}`}
            >
              <span className={`cg-glance-cell__icon cg-glance-cell__icon--${stat.icon}`}>
                <CgIcon name={stat.icon} />
              </span>
              <p className="cg-glance-cell__label">{stat.label}</p>
              <p className="cg-glance-cell__value">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {(profile.caregiverLine || profile.caredForLine) && (
        <div className="synopsis-profile-lines cg-profile-strip">
          {profile.caregiverLine && (
            <p className="synopsis-profile-lines__item">
              <span className="synopsis-profile-lines__label">You</span>
              {profile.caregiverLine}
            </p>
          )}
          {profile.caredForLine && (
            <p className="synopsis-profile-lines__item">
              <span className="synopsis-profile-lines__label">Person you care for</span>
              {profile.caredForLine}
            </p>
          )}
        </div>
      )}

      <div className="cg-dashboard-grid">
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

        <DashboardCard title="Questions to bring up during appointment" className="cg-card--questions">
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
      </div>
    </div>
  );
}
