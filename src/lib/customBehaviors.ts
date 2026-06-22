/**
 * Caregiver-created behavior types (1–3 keywords). Stored in SQLite.
 */

import { BEHAVIOR_CODES } from "./behaviorMap";
import { getDb } from "./db";
import { keywordsToBehaviorLabel } from "./lumaEngine";

export type CustomBehavior = {
  code: string;
  label: string;
  created_at: string;
};

const CUSTOM_PREFIX = "CUSTOM_";

export function isCustomBehaviorCode(code: string): boolean {
  return code.startsWith(CUSTOM_PREFIX);
}

export function isKnownBehaviorCode(code: string): boolean {
  if ((BEHAVIOR_CODES as readonly string[]).includes(code)) return true;
  if (!isCustomBehaviorCode(code)) return false;
  try {
    const db = getDb();
    const row = db.prepare("SELECT code FROM custom_behaviors WHERE code = ?").get(code);
    return Boolean(row);
  } catch {
    return false;
  }
}

function slugifyLabel(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function createCustomBehavior(labelInput: string): CustomBehavior {
  const db = getDb();
  const label = keywordsToBehaviorLabel(labelInput);
  const base = `${CUSTOM_PREFIX}${slugifyLabel(label) || "OTHER"}`;
  let code = base;
  let n = 2;
  while (db.prepare("SELECT code FROM custom_behaviors WHERE code = ?").get(code)) {
    code = `${base}_${n}`;
    n++;
  }

  const created_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO custom_behaviors (code, label, created_at) VALUES (?, ?, ?)"
  ).run(code, label, created_at);

  return { code, label, created_at };
}

export function listCustomBehaviors(): CustomBehavior[] {
  try {
    const db = getDb();
    return db
      .prepare("SELECT code, label, created_at FROM custom_behaviors ORDER BY label ASC")
      .all() as CustomBehavior[];
  } catch {
    return [];
  }
}

export function getCustomBehaviorLabel(code: string): string | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT label FROM custom_behaviors WHERE code = ?")
      .get(code) as { label: string } | undefined;
    return row?.label ?? null;
  } catch {
    return null;
  }
}
