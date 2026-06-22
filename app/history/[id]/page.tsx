import Link from "next/link";
import { notFound } from "next/navigation";
import { getBehaviorLog } from "@/src/lib/repo";
import { getBehaviorLabel } from "@/src/lib/behaviorMap";
import { getTriggerLabelByCode } from "@/src/lib/triggerCatalog";
import { getLogTriggerCodes } from "@/src/lib/repo";
import { formatEpisodeTimingSummary } from "@/src/lib/logUtils";
import LogOutcomeForm from "./LogOutcomeForm";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LogDetailPage({ params }: { params: { id: string } }) {
  const log = getBehaviorLog(params.id);
  if (!log) notFound();

  const triggerCodes = getLogTriggerCodes(log);

  return (
    <div className="space-y-6">
      <Link href="/history" className="text-sm font-medium text-care-forest hover:underline">
        ← Back to history
      </Link>
      <header>
        <h1 className="font-serif text-2xl font-semibold text-care-forest">Note detail</h1>
        <p className="mt-1 text-sm text-care-stone">{formatEpisodeTimingSummary(log)}</p>
        <p className="mt-1 text-xs text-care-stone/80">
          Noted {formatDateTime(log.created_at)}
        </p>
      </header>
      <div className="card">
        <p className="text-sm text-care-bark">
          <strong>{getBehaviorLabel(log.behavior_type)}</strong> · Severity {log.severity}
        </p>
        {triggerCodes.length > 0 && (
          <p className="mt-1 text-sm text-care-stone">
            Triggers: {triggerCodes.map((c) => getTriggerLabelByCode(c, log.behavior_type)).join(", ")}
          </p>
        )}
        {log.trigger_detail && <p className="mt-1 text-sm text-care-stone">{log.trigger_detail}</p>}
        <p className="mt-2 text-sm">
          Outcome: <strong className={log.outcome === "unknown" ? "text-care-stone" : ""}>{log.outcome === "unknown" ? "Not set" : log.outcome}</strong>
        </p>
      </div>
      <LogOutcomeForm log={log} />
    </div>
  );
}
