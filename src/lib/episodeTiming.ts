/**
 * Episode timing model — rough caregiver-friendly timing instead of exact timestamps.
 * loggedAt (created_at) is set on save; episode fields drive display and pattern analysis.
 */

export type EpisodeRecency =
  | "just_now"
  | "earlier_today"
  | "yesterday"
  | "few_days_ago"
  | "not_sure";

export type EpisodeTimeOfDay =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "overnight"
  | "not_sure";

export type EpisodeDayContext =
  | "weekday_usual"
  | "weekend"
  | "holiday_unusual"
  | "appointment_outing"
  | "not_sure";

export type EpisodeTimingFields = {
  episode_recency: EpisodeRecency;
  episode_time_of_day: EpisodeTimeOfDay;
  episode_day_context: EpisodeDayContext;
  exact_episode_at?: string | null;
};

export const EPISODE_RECENCY_OPTIONS: { value: EpisodeRecency; label: string }[] = [
  { value: "just_now", label: "Just now" },
  { value: "earlier_today", label: "Earlier today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "few_days_ago", label: "A few days ago" },
  { value: "not_sure", label: "Not sure" },
];

export const EPISODE_TIME_OF_DAY_OPTIONS: { value: EpisodeTimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "overnight", label: "Overnight" },
  { value: "not_sure", label: "Not sure" },
];

export const EPISODE_DAY_CONTEXT_OPTIONS: { value: EpisodeDayContext; label: string }[] = [
  { value: "weekday_usual", label: "Usual weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "holiday_unusual", label: "Holiday or unusual day" },
  { value: "appointment_outing", label: "Appointment or outing day" },
  { value: "not_sure", label: "Not sure" },
];

export function getEpisodeRecencyLabel(value: EpisodeRecency | string | null | undefined): string {
  return EPISODE_RECENCY_OPTIONS.find((o) => o.value === value)?.label ?? "Not sure";
}

export function getEpisodeTimeOfDayLabel(value: EpisodeTimeOfDay | string | null | undefined): string {
  return EPISODE_TIME_OF_DAY_OPTIONS.find((o) => o.value === value)?.label ?? "Not sure";
}

export function getEpisodeDayContextLabel(value: EpisodeDayContext | string | null | undefined): string {
  return EPISODE_DAY_CONTEXT_OPTIONS.find((o) => o.value === value)?.label ?? "Not sure";
}

export function inferEpisodeTimeOfDay(date: Date = new Date()): EpisodeTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21) return "night";
  return "overnight";
}

export function inferEpisodeDayContext(date: Date = new Date()): EpisodeDayContext {
  const day = date.getDay();
  if (day === 0 || day === 6) return "weekend";
  return "weekday_usual";
}

export function defaultEpisodeTiming(): EpisodeTimingFields {
  const now = new Date();
  return {
    episode_recency: "just_now",
    episode_time_of_day: inferEpisodeTimeOfDay(now),
    episode_day_context: inferEpisodeDayContext(now),
    exact_episode_at: null,
  };
}

const TIME_OF_DAY_HOUR: Record<Exclude<EpisodeTimeOfDay, "not_sure">, number> = {
  morning: 9,
  afternoon: 14,
  evening: 18,
  night: 21,
  overnight: 2,
};

/** Estimate occurred_at for sorting, grouping, and fallback analysis. */
export function deriveOccurredAt(
  loggedAt: Date,
  timing: EpisodeTimingFields
): string {
  if (timing.exact_episode_at) {
    return new Date(timing.exact_episode_at).toISOString();
  }

  const estimate = new Date(loggedAt);

  switch (timing.episode_recency) {
    case "just_now":
      break;
    case "earlier_today":
      estimate.setHours(Math.max(estimate.getHours() - 3, 6), 0, 0, 0);
      break;
    case "yesterday":
      estimate.setDate(estimate.getDate() - 1);
      break;
    case "few_days_ago":
      estimate.setDate(estimate.getDate() - 3);
      break;
    case "not_sure":
    default:
      break;
  }

  if (timing.episode_time_of_day !== "not_sure") {
    estimate.setHours(TIME_OF_DAY_HOUR[timing.episode_time_of_day], 0, 0, 0);
  }

  return estimate.toISOString();
}

export type SynopsisTimePeriod = "Morning" | "Afternoon" | "Evening" | "Night" | "Overnight";

const EPISODE_TO_SYNOPSIS_PERIOD: Record<Exclude<EpisodeTimeOfDay, "not_sure">, SynopsisTimePeriod> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  overnight: "Overnight",
};

export function getTimeOfDayPeriodFromIso(iso: string): Exclude<SynopsisTimePeriod, "Overnight"> | "Overnight" {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  if (hour >= 21) return "Night";
  return "Overnight";
}

/** Prefer stored episode time-of-day; fall back to loggedAt hour. */
export function getLogTimeOfDayPeriod(log: {
  episode_time_of_day?: string | null;
  created_at: string;
}): SynopsisTimePeriod {
  const episode = log.episode_time_of_day as EpisodeTimeOfDay | null | undefined;
  if (episode && episode !== "not_sure") {
    return EPISODE_TO_SYNOPSIS_PERIOD[episode];
  }
  return getTimeOfDayPeriodFromIso(log.created_at);
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

export function formatLoggedAtTime(iso: string): { time: string; meridiem: string } {
  const formatted = new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const [time, meridiem] = formatted.split(" ");
  return { time: time ?? formatted, meridiem: meridiem ?? "" };
}

export type EpisodeTimingDisplay = {
  primary: string;
  secondary?: string;
};

/** Display timing in Today's logs — episode fields first, loggedAt as fallback. */
export function getEpisodeTimingDisplay(log: {
  episode_recency?: string | null;
  episode_time_of_day?: string | null;
  episode_day_context?: string | null;
  exact_episode_at?: string | null;
  created_at: string;
}): EpisodeTimingDisplay {
  if (log.exact_episode_at) {
    const { time, meridiem } = formatLoggedAtTime(log.exact_episode_at);
    return { primary: time, secondary: meridiem || undefined };
  }

  const timeLabel =
    log.episode_time_of_day && log.episode_time_of_day !== "not_sure"
      ? getEpisodeTimeOfDayLabel(log.episode_time_of_day)
      : null;

  const recency = log.episode_recency as EpisodeRecency | null | undefined;
  const recencyLabel =
    recency && recency !== "just_now" && recency !== "earlier_today"
      ? getEpisodeRecencyLabel(recency)
      : null;

  if (timeLabel) {
    return { primary: timeLabel, secondary: recencyLabel ?? undefined };
  }

  const { time, meridiem } = formatLoggedAtTime(log.created_at);
  return {
    primary: time,
    secondary: recencyLabel ?? (meridiem || undefined),
  };
}

export function formatEpisodeTimingSummary(log: {
  episode_recency?: string | null;
  episode_time_of_day?: string | null;
  episode_day_context?: string | null;
  exact_episode_at?: string | null;
  created_at: string;
}): string {
  if (log.exact_episode_at) {
    return new Date(log.exact_episode_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const parts: string[] = [];
  const recency = log.episode_recency as EpisodeRecency | null | undefined;
  if (recency && recency !== "not_sure") {
    parts.push(getEpisodeRecencyLabel(recency));
  }
  if (log.episode_time_of_day && log.episode_time_of_day !== "not_sure") {
    parts.push(getEpisodeTimeOfDayLabel(log.episode_time_of_day));
  }
  if (log.episode_day_context && log.episode_day_context !== "not_sure") {
    parts.push(getEpisodeDayContextLabel(log.episode_day_context));
  }

  if (parts.length > 0) return parts.join(" · ");

  return new Date(log.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
