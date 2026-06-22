"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  generateReportAction,
  getSynopsisLogPreviewsAction,
  getSynopsisProfileAction,
} from "../actions";
import type { ReportData, SynopsisLogPreview } from "@/src/lib/repo";
import CaregiverPatternsView from "./CaregiverPatternsView";
import ClinicianSummaryView from "./ClinicianSummaryView";
import SynopsisExportActions from "./SynopsisExportActions";
import { getSampleSynopsisReport, MOCK_SYNOPSIS_EXTRAS } from "./sampleSynopsis";
import {
  periodLabelForDays,
  SYNOPSIS_DISCLAIMER,
  SYNOPSIS_MIN_LOGS_FOR_REAL,
  SYNOPSIS_PERIOD_OPTIONS,
  SYNOPSIS_SAMPLE_LABEL,
  SYNOPSIS_TABS,
  logsUntilRealSynopsis,
  type SynopsisTab,
} from "./synopsisConfig";
import type { SynopsisProfileLines } from "./synopsisHelpers";
export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<SynopsisTab>("caregiver");
  const [caregiverDays, setCaregiverDays] = useState(30);
  const [clinicianDays, setClinicianDays] = useState(180);
  const [displayData, setDisplayData] = useState<ReportData | null>(null);
  const [realReportData, setRealReportData] = useState<ReportData | null>(null);
  const [isSample, setIsSample] = useState(true);
  const [realLogCount, setRealLogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SynopsisProfileLines>({
    fullContext: null,
    caregiverLine: null,
    caredForLine: null,
  });
  const [recentMoments, setRecentMoments] = useState<SynopsisLogPreview[]>([]);

  const days = activeTab === "caregiver" ? caregiverDays : clinicianDays;
  const periodLabel = isSample
    ? `${SYNOPSIS_SAMPLE_LABEL} · ${periodLabelForDays(days).toLowerCase()}`
    : periodLabelForDays(days);

  useEffect(() => {
    let cancelled = false;

    async function loadSynopsis() {
      setLoading(true);
      try {
        const [report, profileData, logPreviews] = await Promise.all([
          generateReportAction(days),
          getSynopsisProfileAction(),
          getSynopsisLogPreviewsAction(days, 5),
        ]);

        if (cancelled) return;

        const usingSample = report.totalIncidents < SYNOPSIS_MIN_LOGS_FOR_REAL;
        setRealLogCount(report.totalIncidents);
        setIsSample(usingSample);
        setRealReportData(usingSample && report.totalIncidents === 0 ? null : report);
        setDisplayData(usingSample ? getSampleSynopsisReport(days) : report);

        if (usingSample && report.totalIncidents === 0) {
          setProfile({
            fullContext: null,
            caregiverLine: MOCK_SYNOPSIS_EXTRAS.caregiverProfileLine,
            caredForLine: MOCK_SYNOPSIS_EXTRAS.caredForProfileLine,
          });
          setRecentMoments([...MOCK_SYNOPSIS_EXTRAS.recentMoments]);
        } else {
          setProfile({
            fullContext: profileData.fullContext,
            caregiverLine: profileData.caregiverLine,
            caredForLine: profileData.caredForLine,
          });
          setRecentMoments(logPreviews);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSynopsis();
    return () => {
      cancelled = true;
    };
  }, [activeTab, days]);

  function handleTabChange(tab: SynopsisTab) {
    setActiveTab(tab);
  }

  function handleDaysChange(nextDays: number) {
    if (activeTab === "caregiver") {
      setCaregiverDays(nextDays);
    } else {
      setClinicianDays(nextDays);
    }
  }

  return (
    <div className="space-y-6">
      <header className="no-print">
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">Synopsis</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-care-stone">
          {isSample
            ? realLogCount === 0
              ? "You're viewing an example synopsis. Log 3 care observations to see your own."
              : `You've logged ${realLogCount} of ${SYNOPSIS_MIN_LOGS_FOR_REAL}. Example data below until you reach 3.`
            : "Patterns and summaries from care observations you've logged."}
        </p>
        <p className="synopsis-disclaimer mt-3">{SYNOPSIS_DISCLAIMER}</p>
      </header>

      <div className="synopsis-shell no-print">
        <div className="synopsis-controls">
          <div className="synopsis-tabs" role="tablist" aria-label="Synopsis view">
            {SYNOPSIS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`synopsis-tab${activeTab === tab.id ? " synopsis-tab--active" : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="synopsis-controls__actions">
            <select
              value={days}
              onChange={(e) => handleDaysChange(Number(e.target.value))}
              className="synopsis-period-select"
              aria-label="Time range"
            >
              {SYNOPSIS_PERIOD_OPTIONS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>

            {activeTab === "clinician" && !isSample && realReportData && (
              <SynopsisExportActions data={realReportData} days={days} />
            )}
          </div>
        </div>
      </div>

      {isSample && !loading && (
        <div className="synopsis-sample-notice no-print" role="status" aria-live="polite">
          <div className="synopsis-sample-notice__body">
            <span className="synopsis-sample-notice__badge">{SYNOPSIS_SAMPLE_LABEL}</span>
            <h2 className="synopsis-sample-notice__title">Example synopsis — not your data yet</h2>
            <p className="synopsis-sample-notice__text">
              {realLogCount === 0
                ? "Everything below is sample data showing what Luma can surface after a few logs."
                : `You have ${realLogCount} log${realLogCount === 1 ? "" : "s"} so far. Log ${logsUntilRealSynopsis(realLogCount)} more to unlock your personal synopsis.`}
            </p>
            <div className="synopsis-sample-notice__progress">
              <div
                className="synopsis-sample-notice__progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={SYNOPSIS_MIN_LOGS_FOR_REAL}
                aria-valuenow={realLogCount}
                aria-label="Progress toward your personal synopsis"
              >
                <div
                  className="synopsis-sample-notice__progress-fill"
                  style={{ width: `${Math.min(100, (realLogCount / SYNOPSIS_MIN_LOGS_FOR_REAL) * 100)}%` }}
                />
              </div>
              <span className="synopsis-sample-notice__progress-label">
                {realLogCount}/{SYNOPSIS_MIN_LOGS_FOR_REAL} logs
              </span>
            </div>
          </div>
          <Link href="/" className="synopsis-sample-notice__cta">
            Log a care moment →
          </Link>
        </div>
      )}

      {loading || !displayData ? (
        <div className="card synopsis-loading">
          <p className="text-sm text-care-stone">Loading {activeTab === "caregiver" ? "for caregivers" : "for clinicians"}…</p>
        </div>
      ) : (
        <div
          className={`synopsis-report-wrap${isSample ? " synopsis-report-wrap--sample" : ""}`}
        >
          {activeTab === "caregiver" ? (
            <CaregiverPatternsView
              data={displayData}
              periodLabel={periodLabel}
              profile={profile}
              recentMoments={recentMoments}
              isSample={isSample}
            />
          ) : (
            <ClinicianSummaryView
              data={displayData}
              periodLabel={periodLabel}
              profile={profile}
            />
          )}

          {isSample && (
            <section className="synopsis-sample-footer no-print">
              <div className="synopsis-sample-footer__content">
                <h2 className="synopsis-sample-footer__title">Ready to see your own insights?</h2>
                <p className="synopsis-sample-footer__text">
                  Log care observations on the home screen — this synopsis fills in from what you note.
                </p>
              </div>
              <Link href="/" className="synopsis-sample-footer__cta">
                Start logging today →
              </Link>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
