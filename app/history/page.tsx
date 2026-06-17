import Link from "next/link";
import { listBehaviorLogs } from "@/src/lib/repo";
import type { BehaviorLog } from "@/src/lib/repo";
import { getLogTriggerCodes } from "@/src/lib/repo";
import { getEpisodeTimingDisplay } from "@/src/lib/logUtils";
import { BEHAVIOR_OPTIONS, getBehaviorLabel } from "@/src/lib/behaviorMap";
import { TRIGGER_OPTIONS } from "@/src/lib/triggerMap";
import { getTriggerLabelByCode } from "@/src/lib/triggerCatalog";

function dateToFromISO(dateStr: string): string {
  return new Date(dateStr + "T00:00:00.000Z").toISOString();
}

function dateToToISO(dateStr: string): string {
  return new Date(dateStr + "T23:59:59.999Z").toISOString();
}

function defaultFrom(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 6);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(log: BehaviorLog): string {
  const { primary, secondary } = getEpisodeTimingDisplay(log);
  return secondary ? `${primary} · ${secondary}` : primary;
}

function patternHints(logs: BehaviorLog[]): { topBehavior: string; topTrigger: string; outcomes: { better: number; same: number; worse: number; unknown: number } } {
  if (logs.length === 0) {
    return { topBehavior: "—", topTrigger: "—", outcomes: { better: 0, same: 0, worse: 0, unknown: 0 } };
  }
  const byBehavior: Record<string, number> = {};
  const byTrigger: Record<string, number> = {};
  const outcomes = { better: 0, same: 0, worse: 0, unknown: 0 };
  for (const log of logs) {
    byBehavior[log.behavior_type] = (byBehavior[log.behavior_type] ?? 0) + 1;
    for (const code of getLogTriggerCodes(log)) {
      byTrigger[code] = (byTrigger[code] ?? 0) + 1;
    }
    if (log.outcome === "better") outcomes.better++;
    else if (log.outcome === "same") outcomes.same++;
    else if (log.outcome === "worse") outcomes.worse++;
    else outcomes.unknown++;
  }
  const topBehaviorCode = Object.entries(byBehavior).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTriggerCode = Object.entries(byTrigger).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    topBehavior: topBehaviorCode ? getBehaviorLabel(topBehaviorCode) : "—",
    topTrigger: topTriggerCode ? TRIGGER_OPTIONS.find((o) => o.code === topTriggerCode)?.label ?? topTriggerCode : "—",
    outcomes,
  };
}

function groupLogsByDay(logs: BehaviorLog[]): { day: string; logs: BehaviorLog[] }[] {
  const byDay = new Map<string, BehaviorLog[]>();
  for (const log of logs) {
    const day = log.occurred_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(log);
  }
  return Array.from(byDay.entries())
    .map(([day, dayLogs]) => ({ day, logs: dayLogs }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

type SearchParams = { from?: string; to?: string; behaviorType?: string; triggerCode?: string };

export default function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const from = searchParams.from ?? defaultFrom();
  const to = searchParams.to ?? defaultTo();
  const behaviorType = searchParams.behaviorType ?? "";
  const triggerCode = searchParams.triggerCode ?? "";

  const logs = listBehaviorLogs({
    from: dateToFromISO(from),
    to: dateToToISO(to),
    behaviorType: behaviorType || undefined,
    triggerCode: triggerCode || undefined,
  });

  const hints = patternHints(logs);
  const byDay = groupLogsByDay(logs);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">History</h1>
        <p className="mt-1 text-sm text-care-stone">
          Filter and review past logs. Open a log to add or update outcome.
        </p>
      </header>

      <form method="get" action="/history" className="section-band section-band--when flex flex-wrap items-end gap-4">
        <span className="section-label section-label--when w-full">Filter</span>
        <div className="grid gap-1">
          <label htmlFor="from" className="text-xs font-medium text-care-stone">From</label>
          <input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="to" className="text-xs font-medium text-care-stone">To</label>
          <input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="behaviorType" className="text-xs font-medium text-care-stone">Behavior</label>
          <select id="behaviorType" name="behaviorType" defaultValue={behaviorType} className="min-w-[180px]">
            <option value="">All</option>
            {BEHAVIOR_OPTIONS.map(({ label, code }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="triggerCode" className="text-xs font-medium text-care-stone">Trigger</label>
          <select id="triggerCode" name="triggerCode" defaultValue={triggerCode} className="min-w-[180px]">
            <option value="">All</option>
            {TRIGGER_OPTIONS.map(({ label, code }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Apply</button>
      </form>

      {logs.length > 0 && (
        <div className="section-band section-band--trigger">
          <span className="section-label section-label--trigger">Pattern hints</span>
          <p className="mt-2 text-sm text-care-bark">
            <strong className="text-care-forest">Summary:</strong> {logs.length} log{logs.length !== 1 ? "s" : ""} in period · Most common behavior: <strong>{hints.topBehavior}</strong> · Most common trigger: <strong>{hints.topTrigger}</strong> · Outcomes: {hints.outcomes.better} better, {hints.outcomes.same} same, {hints.outcomes.worse} worse{hints.outcomes.unknown ? `, ${hints.outcomes.unknown} not yet set` : ""}
          </p>
        </div>
      )}

      {byDay.length === 0 ? (
        <p className="rounded-xl border border-dashed border-care-sage bg-care-sage/30 py-10 text-center text-sm text-care-stone">
          No logs in this range.
        </p>
      ) : (
        <div className="space-y-6">
          {byDay.map(({ day, logs: dayLogs }) => (
            <section key={day} className="section-band section-band--when">
              <span className="section-label section-label--when">{formatDate(day)}</span>
              <ul className="mt-3 space-y-2">
                {dayLogs.map((log) => {
                  const triggerCodes = getLogTriggerCodes(log);
                  return (
                    <li
                      key={log.id}
                      className={`flex flex-wrap items-baseline gap-x-1.5 rounded-xl border border-care-sage border-l-4 bg-white px-4 py-3 text-sm shadow-card transition-shadow hover:shadow-cardHover ${
                        log.outcome === "better" ? "log-row--better" : log.outcome === "worse" ? "log-row--worse" : "log-row--same"
                      }`}
                    >
                      <span className="font-semibold text-care-forest">{formatTime(log)}</span>
                      <span className="text-care-bark">{getBehaviorLabel(log.behavior_type)}</span>
                      <span className="rounded-full bg-care-sage px-2 py-0.5 text-xs font-medium text-care-stone">sev {log.severity}</span>
                      {triggerCodes.length > 0 && (
                        <>
                          <span className="text-care-stone">·</span>
                          <span className="text-care-bark">
                            {triggerCodes.map((c) => getTriggerLabelByCode(c, log.behavior_type)).join(", ")}
                          </span>
                        </>
                      )}
                      {log.trigger_detail && <span className="text-care-stone">· {log.trigger_detail}</span>}
                      <span className={`ml-auto font-medium ${log.outcome === "better" ? "text-care-forest" : log.outcome === "worse" ? "text-amber-700" : "text-care-stone"}`}>
                        {log.outcome === "unknown" ? "—" : log.outcome}
                      </span>
                      <Link href={`/history/${log.id}`} className="ml-2 text-sm font-medium text-care-forest hover:underline">
                        {log.outcome === "unknown" ? "Add outcome" : "Edit"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
