# Care Log — Tech Architecture Summary

**Audience:** Engineering manager review  
**Last updated:** Feb 2026

---

## 1. Stack overview

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **UI** | React 18, TypeScript |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer |
| **Database** | SQLite via `better-sqlite3` (file-based, no separate server) |
| **Validation** | Zod |
| **PDF export** | `@react-pdf/renderer` |

Single Node process: Next.js serves the app and talks to SQLite on disk. No external API server or separate backend.

---

## 2. Repository layout

```
app/                    # Next.js App Router
  layout.tsx            # Root layout, nav, globals.css, fonts (DM Sans, Lora)
  page.tsx              # Home (server): fetches today’s logs, renders HomeClient
  HomeClient.tsx        # Home client: “Coach me now” / “Quick log”, today’s list
  CoachWizard.tsx       # 4-step coach flow (behavior → triggers → recommendations → feedback)
  QuickLogForm.tsx      # Quick log form (behavior, severity, time, optional triggers)
  actions.ts            # Server actions only: submit logs, update outcome, report, coach rules, recommendations
  globals.css           # Tailwind + custom components (buttons, section bands, outcome borders)
  history/
    page.tsx            # List/filter logs by date, behavior, trigger
    [id]/page.tsx       # Log detail + outcome form
    [id]/LogOutcomeForm.tsx
  report/page.tsx      # Report UI + PDF download
  report/ReportPDF.tsx  # PDF layout for @react-pdf/renderer
  coach-rules/
    page.tsx            # Coach rules editor (load/save JSON)
    CoachRulesEditor.tsx

src/lib/                # Shared logic (no React)
  db.ts                 # SQLite init, schema, migrations (ALTER TABLE in try/catch)
  repo.ts               # CRUD + list + report; Zod schemas; BehaviorLog type
  coach.ts              # Coach rules (DB + JSON fallback), getRecommendations(behavior, triggers)
  coach_rules.json      # Default rules: behavior → trigger → suggestions
  behaviorMap.ts        # Behavior codes ↔ labels (UI labels, DB codes)
  triggerMap.ts         # Trigger codes ↔ labels (report/history)
  triggerCatalog.ts     # behavior → list of trigger options (for wizard/quick form)
  logUtils.ts           # Client-safe: getLogTriggerCodes, getLogInterventionsAttempted (no DB)
```

---

## 3. Data flow

- **Reads:** Server components (e.g. `app/page.tsx`, `app/history/page.tsx`) call `repo` and pass data as props to client components. No REST API; no `getServerSideProps` (pure RSC + props).
- **Writes:** Client components call **server actions** in `app/actions.ts`. Actions call `repo` and `coach`, then `revalidatePath("/")` / `revalidatePath("/history")` so the next request sees fresh data.
- **Client-safe code:** Components that run in the browser must not import `repo` or `db` (would pull Node/DB into the bundle). They use `logUtils`, `behaviorMap`, `triggerCatalog`, and server actions for recommendations and persistence.

---

## 4. Database

- **File:** `data/app.db` (created at runtime; `data/` is git-ignored).
- **Tables:** `care_recipients` (single default recipient for MVP), `behavior_logs`, `coach_rules` (single row, id=1).
- **behavior_logs:** identity, timestamps, behavior_type (code), severity, trigger_type (legacy), trigger_hypotheses (JSON array), trigger_detail, recommended_interventions / interventions_attempted (JSON), outcome, notes. Migrations are additive `ALTER TABLE` in try/catch in `db.ts`.

---

## 5. Key patterns

- **Structured behavior/triggers:** UI shows human-friendly labels; DB stores codes. `behaviorMap` and `triggerMap` define code ↔ label; `triggerCatalog` drives “which triggers to show for this behavior.”
- **Coach rules:** JSON shape: behavior → trigger → array of suggestion strings. Stored in DB; fallback to `coach_rules.json`. Recommendations (try now / prevent next) come from `getRecommendations(behaviorCode, triggerCodes)` in `coach.ts`, invoked via `getRecommendationsAction` so the client never imports DB.
- **Outcome lifecycle:** Quick log creates logs with outcome `unknown`; history detail page allows updating outcome and interventions attempted via `updateLogOutcomeAction`.

---

## 6. Build & run

- **Dev:** `npm run dev` (Next dev server + SQLite on disk).
- **Build:** `npm run build` (Next build; no DB migration step).
- **Start:** `npm run start` (production server; same SQLite file).
- **Lint:** `npm run lint` (Next ESLint; optional strict/base setup).

---

## 7. Risks / follow-ups for manager

| Area | Note |
|------|------|
| **SQLite** | Single file, no backups in repo. Fine for MVP/single user; consider backup strategy or migration path if multi-user or hosted. |
| **No auth** | No login or tenant isolation; single default care recipient. |
| **Client boundary** | `repo`/`db`/`coach` are server-only; `logUtils` + server actions used to keep client bundle free of DB. |
| **Tests** | No test suite in repo yet; MVP discipline suggests adding after stabilizing. |

---

## 8. One-line summary

Next.js 14 App Router app with React + Tailwind, file-based SQLite, server actions for all writes, and a single-process deploy with no separate backend service.
