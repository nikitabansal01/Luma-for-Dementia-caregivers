import {
  normalizeLumaDraft,
  type LumaDraft,
  type LumaMessage,
  type LumaStep,
} from "./lumaEngine";

const STORAGE_KEY = "luma-session-v1";
const SESSION_VERSION = 1;

export type LumaSessionSnapshot = {
  version: typeof SESSION_VERSION;
  savedAt: string;
  draft: LumaDraft;
  messages: LumaMessage[];
  step: LumaStep | "confirm";
  keepTalkingDismissed?: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadLumaSession(): LumaSessionSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LumaSessionSnapshot;
    if (parsed.version !== SESSION_VERSION) return null;
    if (!parsed.draft || !Array.isArray(parsed.messages)) return null;
    return {
      ...parsed,
      draft: normalizeLumaDraft(parsed.draft),
      messages: parsed.messages.filter(
        (message): message is LumaMessage =>
          message != null &&
          typeof message === "object" &&
          typeof message.id === "string" &&
          (message.role === "luma" || message.role === "user") &&
          typeof message.text === "string"
      ),
    };
  } catch {
    return null;
  }
}

export function saveLumaSession(snapshot: Omit<LumaSessionSnapshot, "version" | "savedAt">): string {
  const savedAt = new Date().toISOString();
  const payload: LumaSessionSnapshot = {
    version: SESSION_VERSION,
    savedAt,
    ...snapshot,
  };
  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  return savedAt;
}

export function clearLumaSession(): void {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function formatLumaSessionSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
