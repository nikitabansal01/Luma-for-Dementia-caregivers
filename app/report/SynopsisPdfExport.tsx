"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import type { ReportData } from "@/src/lib/repo";
import ReportPDF from "./ReportPDF";

export default function SynopsisPdfExport({
  data,
  days,
}: {
  data: ReportData;
  days: number;
}) {
  return (
    <PDFDownloadLink
      document={<ReportPDF data={data} days={days} />}
      fileName={`care-log-synopsis-${days}days.pdf`}
      className="btn-secondary inline-flex items-center"
    >
      Export PDF
    </PDFDownloadLink>
  );
}
