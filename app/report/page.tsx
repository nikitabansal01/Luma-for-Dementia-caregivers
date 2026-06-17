"use client";

import { useState } from "react";
import { generateReportAction } from "../actions";
import type { ReportData } from "@/src/lib/repo";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDF from "./ReportPDF";
import { getBehaviorLabel } from "@/src/lib/behaviorMap";
import { getStrategyLabel } from "@/src/lib/coachFlowCatalog";
import { getTriggerDisplayLabel } from "@/src/lib/synopsisBuilder";

const PERIOD_OPTIONS = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
] as const;

function triggerLabel(trigger: string, behaviorCode: string): string {
  return getTriggerDisplayLabel(trigger, behaviorCode);
}

export default function ReportPage() {
  const [days, setDays] = useState(30);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const data = await generateReportAction(days);
      setReportData(data);
    } finally {
      setLoading(false);
    }
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.days === days)?.label ?? `${days} days`;

  return (
    <div className="space-y-8">
      <header className="no-print">
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">
          Synopsis
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-care-stone">
          A calm, factual summary you can bring to a neurologist or care-team appointment.
        </p>
      </header>

      <div className="synopsis-toolbar no-print flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="min-w-[160px] flex-1 sm:flex-none"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.days} value={p.days}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate synopsis"}
          </button>
          {reportData && (
            <>
              <button type="button" onClick={() => window.print()} className="btn-secondary">
                Print synopsis
              </button>
              <PDFDownloadLink
                document={<ReportPDF data={reportData} days={days} />}
                fileName={`care-log-synopsis-${days}days.pdf`}
                className="btn-secondary inline-flex items-center"
              >
                Export PDF
              </PDFDownloadLink>
            </>
          )}
        </div>
      </div>

      {reportData && (
        <div id="synopsis-content" className="synopsis-print space-y-6">
          <div className="print-only mb-6 border-b border-care-sage pb-4">
            <h1 className="font-serif text-2xl font-semibold text-care-forest">Care Log Synopsis</h1>
            <p className="mt-1 text-sm text-care-stone">{periodLabel}</p>
          </div>

          <section className="card report-section--data">
            <h2 className="card-heading mb-2">Executive summary</h2>
            <p className="text-sm leading-relaxed text-care-bark">{reportData.executiveSummary}</p>
            <p className="mt-3 text-xs text-care-stone">
              {reportData.daysWithLogs} of {reportData.totalDays} days included at least one log (
              {reportData.totalIncidents} incident{reportData.totalIncidents === 1 ? "" : "s"} total).
            </p>
          </section>

          <section className="card report-section--behaviors">
            <h2 className="card-heading mb-3">Behavior patterns</h2>
            {reportData.topBehaviors.length === 0 ? (
              <p className="text-sm text-care-stone">No behavior data recorded for this period.</p>
            ) : (
              <>
                <h3 className="mb-2 text-sm font-semibold text-care-forest">Most frequent behaviors</h3>
                <ul className="mb-4 space-y-2">
                  {reportData.topBehaviors.map((b) => (
                    <li key={b.behavior} className="text-sm text-care-bark">
                      <strong className="text-care-forest">{getBehaviorLabel(b.behavior)}</strong>:{" "}
                      {b.count} occurrence{b.count === 1 ? "" : "s"}, average severity{" "}
                      {b.avgSeverity.toFixed(1)} / 3
                    </li>
                  ))}
                </ul>
                {reportData.timeOfDayPattern.length > 0 && (
                  <>
                    <h3 className="mb-2 text-sm font-semibold text-care-forest">Time-of-day pattern</h3>
                    <ul className="space-y-1.5">
                      {reportData.timeOfDayPattern.map((p) => (
                        <li key={p.period} className="text-sm text-care-bark">
                          {p.period}: {p.count} incident{p.count === 1 ? "" : "s"} (
                          {p.percentage.toFixed(0)}%)
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          <section className="card report-section--triggers">
            <h2 className="card-heading mb-3">Trigger patterns</h2>
            {reportData.triggerCategories.length === 0 && reportData.topTriggersOverall.length === 0 ? (
              <p className="text-sm text-care-stone">Triggers were not consistently recorded.</p>
            ) : (
              <>
                {reportData.triggerCategories.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold text-care-forest">
                      Most common trigger categories
                    </h3>
                    <ul className="space-y-1.5">
                      {reportData.triggerCategories.map((c) => (
                        <li key={c.category} className="text-sm text-care-bark">
                          {c.category}: {c.count} mention{c.count === 1 ? "" : "s"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {reportData.topTriggersOverall.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-care-forest">
                      Specific repeated triggers
                    </h3>
                    <ul className="space-y-1.5">
                      {reportData.topTriggersOverall.map((t) => (
                        <li key={t.trigger} className="text-sm text-care-bark">
                          {triggerLabel(
                            t.trigger,
                            reportData.topBehaviors[0]?.behavior ?? "OTHER_BEHAVIOR"
                          )}
                          : {t.count} occurrence{t.count === 1 ? "" : "s"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card report-section--helped">
            <h2 className="card-heading mb-3">What strategies seem to help</h2>
            <div className="synopsis-stat-grid mb-4">
              <div className="synopsis-stat">
                <p className="synopsis-stat__label">Helped</p>
                <p className="synopsis-stat__value">{reportData.strategyOutcomes.helped}</p>
              </div>
              <div className="synopsis-stat">
                <p className="synopsis-stat__label">Helped a little / did not help</p>
                <p className="synopsis-stat__value">
                  {reportData.strategyOutcomes.helpedLittleOrDidNotHelp}
                </p>
              </div>
              <div className="synopsis-stat">
                <p className="synopsis-stat__label">Made worse</p>
                <p className="synopsis-stat__value">{reportData.strategyOutcomes.madeWorse}</p>
              </div>
              <div className="synopsis-stat">
                <p className="synopsis-stat__label">Not sure</p>
                <p className="synopsis-stat__value">{reportData.strategyOutcomes.notSure}</p>
              </div>
            </div>

            {reportData.topHelpfulStrategies.length > 0 && (
              <div className="synopsis-highlight mb-4">
                <h3 className="mb-1 text-sm font-semibold text-care-forest">
                  Strategies that appear most helpful
                </h3>
                <p className="text-sm leading-relaxed text-care-bark">
                  {reportData.topHelpfulStrategies.map(getStrategyLabel).join(", ")}
                </p>
              </div>
            )}

            {reportData.strategiesSummary.length > 0 ? (
              <>
                <h3 className="mb-2 text-sm font-semibold text-care-forest">Strategies tried</h3>
                <ul className="space-y-2">
                  {reportData.strategiesSummary.slice(0, 8).map((s) => (
                    <li key={s.strategy} className="text-sm text-care-bark">
                      <strong className="text-care-forest">{getStrategyLabel(s.strategy)}</strong>: tried{" "}
                      {s.totalCount} time{s.totalCount === 1 ? "" : "s"} — helped {s.helped}, unchanged{" "}
                      {s.unchanged}, made worse {s.madeWorse}, not sure {s.notSure}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-care-stone">No strategies were recorded for this period.</p>
            )}
          </section>

          <section className="card report-section--changes">
            <h2 className="card-heading mb-3">What to discuss with the neurologist</h2>
            <ul className="synopsis-questions list-none space-y-2 pl-0">
              {reportData.discussionQuestions.map((q) => (
                <li key={q} className="text-sm leading-relaxed text-care-bark">
                  {q}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {!reportData && (
        <div className="today-logs-empty no-print">
          <p className="today-logs-empty__title">No synopsis generated yet</p>
          <p className="today-logs-empty__text">
            Choose a period and click &ldquo;Generate synopsis&rdquo; to view your clinical summary.
          </p>
        </div>
      )}
    </div>
  );
}
