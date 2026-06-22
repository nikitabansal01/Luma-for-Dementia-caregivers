/**
 * Caregiver-created strategy labels (1–3 keywords). Stored in SQLite.
 */

import { getDb } from "./db";
import { isCustomStrategyCode } from "./coachFlowCatalog";
import { keywordsToShortLabel } from "./lumaEngine";

export type CustomStrategy = {
  code: string;
  label: string;
  created_at: string;
};

const CUSTOM_PREFIX = "CUSTOM_STRATEGY_";

export { isCustomStrategyCode };

function slugifyLabel(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function createCustomStrategy(labelInput: string): CustomStrategy {
  const db = getDb();
  const label = keywordsToShortLabel(labelInput, "Other strategy");
  const base = `${CUSTOM_PREFIX}${slugifyLabel(label) || "OTHER"}`;
  let code = base;
  let n = 2;
  while (db.prepare("SELECT code FROM custom_strategies WHERE code = ?").get(code)) {
    code = `${base}_${n}`;
    n++;
  }

  const created_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO custom_strategies (code, label, created_at) VALUES (?, ?, ?)"
  ).run(code, label, created_at);

  return { code, label, created_at };
}

export function listCustomStrategies(): CustomStrategy[] {
  try {
    const db = getDb();
    return db
      .prepare("SELECT code, label, created_at FROM custom_strategies ORDER BY label ASC")
      .all() as CustomStrategy[];
  } catch {
    return [];
  }
}

export function getCustomStrategyLabel(code: string): string | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT label FROM custom_strategies WHERE code = ?")
      .get(code) as { label: string } | undefined;
    return row?.label ?? null;
  } catch {
    return null;
  }
}

export function findCustomStrategyByLabel(
  label: string,
  customStrategies: { code: string; label: string }[] = listCustomStrategies()
): { code: string; label: string } | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  return (
    customStrategies.find((s) => s.label.trim().toLowerCase() === normalized) ?? null
  );
}
