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
  SYNOPSIS_PERIOD_OPTIONS,
  SYNOPSIS_SAMPLE_LABEL,
  SYNOPSIS_TABS,
  type SynopsisTab,
} from "./synopsisConfig";
import type { SynopsisProfileLines } from "./synopsisHelpers";
import { SynopsisTabIcon } from "./SynopsisTabIcon";

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<SynopsisTab>("caregiver");
  const [caregiverDays, setCaregiverDays] = useState(30);
  const [clinicianDays, setClinicianDays] = useState(180);
  const [displayData, setDisplayData] = useState<ReportData | null>(null);
  const [realReportData, setRealReportData] = useState<ReportData | null>(null);
  const [isSample, setIsSample] = useState(true);
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

        const usingSample = report.totalIncidents === 0;
        setIsSample(usingSample);
        setRealReportData(usingSample ? null : report);
        setDisplayData(usingSample ? getSampleSynopsisReport(days) : report);

        if (usingSample) {
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
    <div className="space-y-8">
      <header className="no-print">
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">Synopsis</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-care-stone">
          {isSample
            ? "Example insights below — log care observations to replace this with your own synopsis."
            : "Patterns and summaries from care observations you've logged."}
        </p>
        <p className="synopsis-disclaimer mt-3">{SYNOPSIS_DISCLAIMER}</p>
      </header>

      <div className="synopsis-shell no-print">
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
              <SynopsisTabIcon tab={tab.id} />
              <span className="synopsis-tab__text">
                <span className="synopsis-tab__title">{tab.label}</span>
                <span className="synopsis-tab__subtitle">{tab.subtitle}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="synopsis-toolbar">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={days}
              onChange={(e) => handleDaysChange(Number(e.target.value))}
              className="min-w-[160px] flex-1 sm:flex-none"
              aria-label="Time range"
            >
              {SYNOPSIS_PERIOD_OPTIONS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>

            {activeTab === "clinician" && !isSample && realReportData && (
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <SynopsisExportActions data={realReportData} days={days} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isSample && (
        <div className="synopsis-sample-banner no-print">
          <div className="synopsis-sample-banner__content">
            <p className="synopsis-sample-banner__eyebrow">{SYNOPSIS_SAMPLE_LABEL}</p>
            <h2 className="synopsis-sample-banner__title">This is what your synopsis could look like</h2>
            <p className="synopsis-sample-banner__text">
              After a few weeks of logging, Luma turns everyday notes into patterns, trigger insights,
              and appointment-ready questions — like the example below.
            </p>
          </div>
          <Link href="/" className="synopsis-sample-banner__cta">
            Start logging today →
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
          {isSample && (
            <div className="synopsis-sample-badge no-print" role="status" aria-live="polite">
              <p className="synopsis-sample-badge__text">
                <span className="synopsis-sample-badge__label">{SYNOPSIS_SAMPLE_LABEL}</span>
                Example data only — log care observations to see your own patterns
              </p>
              <Link href="/" className="synopsis-sample-badge__cta">
                Start logging →
              </Link>
            </div>
          )}

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
              isSample={isSample}
            />
          )}
        </div>
      )}
    </div>
  );
}
