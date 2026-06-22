"use client";

import dynamic from "next/dynamic";
import type { ReportData } from "@/src/lib/repo";

const SynopsisPdfExport = dynamic(() => import("./SynopsisPdfExport"), {
  ssr: false,
  loading: () => (
    <span className="btn-secondary inline-flex cursor-wait items-center opacity-60">Export PDF</span>
  ),
});

export default function SynopsisExportActions({
  data,
  days,
}: {
  data: ReportData;
  days: number;
}) {
  return (
    <>
      <button type="button" onClick={() => window.print()} className="btn-secondary">
        Print synopsis
      </button>
      <SynopsisPdfExport data={data} days={days} />
    </>
  );
}
