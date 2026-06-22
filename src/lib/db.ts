import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Vercel serverless only allows writes under /tmp; local dev uses ./data */
function getDataDir(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "luma-data");
  }
  return path.join(process.cwd(), "data");
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_recipients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      stage TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS behavior_logs (
      id TEXT PRIMARY KEY,
      care_recipient_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      behavior_type TEXT NOT NULL,
      behavior_detail TEXT,
      severity INTEGER NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_detail TEXT,
      intervention_tried TEXT,
      outcome TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN behavior_detail TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN trigger_hypotheses TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN recommended_interventions TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN interventions_attempted TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN episode_recency TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN episode_time_of_day TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN episode_day_context TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE behavior_logs ADD COLUMN exact_episode_at TEXT`);
  } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_behaviors (
      code TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_rules (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  try {
    db.exec(`ALTER TABLE care_recipients ADD COLUMN caregiver_relationship TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE care_recipients ADD COLUMN age INTEGER`);
  } catch {}
  try {
    db.exec(`ALTER TABLE care_recipients ADD COLUMN living_situation TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE care_recipients ADD COLUMN onboarding_completed_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE care_recipients ADD COLUMN onboarding_skipped_at TEXT`);
  } catch {}
}

let dbInstance: Database.Database | null = null;
let dbInitError: Error | null = null;

/** Lazy SQLite connection — avoids crashing module load on Vercel when native bindings fail. */
export function getDb(): Database.Database {
  if (dbInitError) throw dbInitError;
  if (dbInstance) return dbInstance;

  try {
    const dataDir = getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "app.db");
    dbInstance = new Database(dbPath);
    initSchema(dbInstance);
    return dbInstance;
  } catch (err) {
    dbInitError = err instanceof Error ? err : new Error(String(err));
    throw dbInitError;
  }
}

export function isDbAvailable(): boolean {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}
