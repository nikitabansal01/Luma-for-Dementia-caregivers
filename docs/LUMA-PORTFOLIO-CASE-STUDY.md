# Luma — AI Product Case Study (Dementia Caregiving)

**Role lens:** AI Product Manager · Healthcare  
**Project:** Luma for Dementia caregivers  
**Scope:** Conversational incident logging for family caregivers  
**Stack:** Next.js · SQLite · OpenAI/Anthropic · Web Speech · OpenAI TTS

---

## Executive summary

Dementia caregivers need **clarity** after hard moments — what happened, what might have contributed, and what actually helped — so patterns emerge over time and neurologist visits are productive. We did not jump straight to AI chat. We **earned** conversational Luma by shipping and learning through three deliberate product generations, all writing to the same structured care log.

| Generation | What we shipped | What we learned |
|------------|-----------------|-----------------|
| **MVP 1 — Clarity log** | Rule-based UI: dropdowns, chips, coach wizard, quick log | Structured data works; forms feel clinical and get skipped in the moment |
| **MVP 2 — Conversational text** | Single LLM chat that mirrored the wizard field-by-field | Faster to start talking, but felt **robotic and survey-like** — the model sounded like the form, not a person |
| **MVP 3 — Companion + Scribe** | Two agents: empathetic companion (voice) + silent scribe (structure) | Warmth and extraction are different jobs; one prompt cannot do both well |
| **Current — Balanced trust** | Live draft panel, editable final log, voice, explicit save | Caregivers need to **see** capture, **edit** mistakes, and **own** the record that feeds history and clinician synopsis |

**North star:** Help caregivers reduce avoidable behavioral episodes by logging what happened, what contributed, and what worked — with an experience that feels like talking to someone who listens, not filling out paperwork for a neurologist.

This case study documents those product decisions, not just the final architecture.

---

## Problem & opportunity

| Stakeholder | Pain | Product implication |
|-------------|------|-------------------|
| **Caregiver** | Logging after a hard moment feels like homework; forms re-traumatize | Lead with empathy and narrative, not schema |
| **Care team / clinician** | Needs structured, comparable incident data over time | Same `behavior_logs` schema regardless of entry path |
| **Product / eng** | One LLM asked to chat *and* extract JSON produces stiff UX and missed fields | Split **Companion** (voice) and **Scribe** (structure) |

**Opportunity:** Use generative AI where it adds humanity (listening, reflecting) and keep the **clarity log** schema and UI patterns where they add control (review, edit, synopsis export).

---

## Product evolution — how we got to Luma

This is the core product story: we did not replace the clarity log. We **layered** conversation on top of it, then corrected course when AI made the experience worse, not better.

### MVP 1 — The clarity log (structured, rule-based UI)

**Hypothesis:** Caregivers need a reliable way to capture incidents with enough structure to spot patterns and prepare for neurology visits.

**What we built:**
- **Quick log** — behavior dropdown, episode timing, severity cards, trigger chips
- **Coach wizard** — step-by-step flow with recommendations (“what to try next”)
- Shared catalogs: behavior codes, trigger hypotheses, strategies tried, outcomes
- **History** and **clinician synopsis PDF** downstream

**Core value delivered:** A consistent `behavior_logs` schema — the “source of truth” for what happened, when, how intense, what might have contributed, what was tried, and whether it helped.

**Limitation discovered:** After an agitation or wandering episode, a multi-field form feels like homework. Caregivers want to *talk*, not translate their experience into dropdowns in real time. But we **kept** this layer — it became the review surface and the fallback, not something to throw away.

---

### MVP 2 — Conversational logging (text-first Luma)

**Hypothesis:** Natural language lowers the barrier — describe the incident in your own words and let the system fill the log.

**What we built:**
- Chat-based Luma on the home screen
- Single LLM call tasked with **both** replying empathetically **and** extracting structured fields
- Conversation that **mirrored the coach wizard** — recency, then time of day, then severity, then triggers…

**What went wrong (critical learning):**
- Luma sounded **robotic and clinical** — essentially a spoken form
- Users heard schema language (“episode recency,” severity scales) instead of human conversation
- One model optimizing for JSON extraction produced stiff, survey-like replies
- Caregivers could not **see** what was being captured — extraction was invisible
- The companion asked questions **about the log**, not about their experience — breaking trust immediately

**PM decision:** Text-only conversation was the right direction; **single-agent, wizard-mirroring** was the wrong implementation. We did not abandon structured logging — we separated **how it feels** from **what gets stored**.

---

### MVP 3 — Companion + Scribe (two agents, one draft)

**Hypothesis:** Split emotional labor from data extraction so each can be optimized independently.

**What we built:**

| Agent | Job | User sees |
|-------|-----|-----------|
| **Companion** (stronger model) | Listen, reflect, one gentle follow-up | Warm plain-text chat only — no JSON, no field names |
| **Scribe** (lighter model) | Merge utterance → `draft_updates` | Nothing spoken — silent parallel extraction |
| **Heuristics** (rules) | Always-on backfill + offline fallback | Same draft, no API required |

**Architecture insight:** Empathy and JSON compliance compete in one context window. Parallel calls let the companion be short and human while the scribe chases completeness.

**Still not enough:** Even with two agents, users reported:
- “What did you get?” — invisible capture
- Companion still occasionally recapped the log in chat
- Questions felt anchored to **missing fields**, not **their story**
- Voice felt robotic (browser TTS); mic cut off mid-sentence

---

### Current — Balanced companion + clarity log (trust loop)

**Hypothesis:** The product must simultaneously (1) feel emotionally safe and (2) produce a defensible record for the caregiver and neurologist.

**What we added on top of MVP 3:**

1. **Live draft panel** — “Your draft log” updates on screen; companion points to it instead of reading fields aloud  
2. **Narrative gaps, not wizard steps** — story → timing → intensity → context → response → review (`lumaConversationDesign.ts`)  
3. **Editable final log** — full form at review; user fixes scribe errors before commit  
4. **Explicit save** — nothing writes to `behavior_logs` until the caregiver confirms  
5. **Local auto-save** — session survives refresh; distinct from clinical record integrity  
6. **Voice UX** — continuous mic + manual Done; OpenAI TTS personas  
7. **Taxonomy fixes** — e.g. “morning” as time-of-day, not a trigger; sleep → fatigue  

**The balance we were optimizing for:**

```
         Emotional companion                Structured clarity log
    (listen, pace, don’t retraumatize)    (history, patterns, synopsis)
                    │                              │
                    └──────── draft + review ──────┘
                              │
                    Caregiver stays in control
```

**Why this matters for outcomes:** Structured logs over time help caregivers and clinicians see which behaviors may be **avoidable**, which **triggers** recur, and which **strategies** actually reduced intensity — not just what happened once. Luma’s job is to lower the cost of that clarity, not replace caregiver judgment.

**What stayed from MVP 1:** Quick log and coach wizard remain — not every moment needs conversation. All paths share one schema.

---

## Skills this project demonstrates (AI PM in healthcare)

1. **Domain-aware product thinking** — Designed for caregiver cognitive load and emotional state, not generic chatbot patterns.
2. **AI system design** — Parallel Companion + Scribe architecture; heuristic fallback; prompt contracts that forbid clinical jargon in user-facing copy.
3. **Trust & safety UX** — Live draft transparency, editable final log before commit, no silent auto-write to clinical record, graceful degradation when models fail.
4. **Cross-functional delivery** — Paired conversation design (`lumaConversationDesign.ts`) with eng constraints (server actions, SQLite, ephemeral Vercel storage).
5. **Iteration from qualitative feedback** — “Robotic,” “survey-like,” “couldn’t see what was captured,” “mic cut off,” “morning wrongly logged as trigger” → shipped targeted fixes.
6. **Healthcare humility** — Clear scope: caregiver support tool, not diagnosis/treatment; env-secured keys; honest deployment limits (SQLite on serverless).
7. **Voice as accessibility** — Continuous STT with manual Done; OpenAI TTS personas; skimmable on-screen formatting for tired readers.
8. **Downstream product value** — Structured logs feed Today, History, and PDF synopsis — AI extraction serves a longitudinal care narrative, not chat for its own sake.

---

## Product architecture (conceptual)

```
Caregiver speaks/types
        │
        ▼
┌───────────────────┐     ┌───────────────────┐
│ Companion (LLM)   │     │ Scribe (LLM)      │
│ Empathy, pacing   │     │ JSON draft_updates  │
│ Plain text only   │     │ Silent extraction   │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          └──────────┬──────────────┘
                     ▼
            Heuristic layer (always)
            lumaEngine + conversation gaps
                     │
                     ▼
         Live draft panel → Final log editor
         (local auto-save)   (user edits + Save)
                     │
                     ▼
              behavior_logs (SQLite)
         Today · History · Clinician synopsis
```

**Design principle:** Conversation follows *story gaps* (what happened → when → intensity → context → response → review), not wizard field order.

---

## Key product decisions (within the evolution)

These decisions make sense only in context of MVP 1 → 2 → 3 → current. Each corrects a specific failure mode.

### 1. Keep the clarity log schema; change the capture experience

**Decision:** Never fork data models. Luma, coach, and quick log all write `behavior_logs`.  
**Why:** MVP 1 proved structured fields power History and synopsis. MVP 2 failed on *capture UX*, not on schema.  
**PM skill:** Separate **interface generation** from **core value** — don’t throw away what works for clinicians.

### 2. Companion + Scribe (not one prompt)

**Decision:** Two parallel model calls after MVP 2’s single-agent failure.  
**Why:** Empathy and JSON compliance compete in a single context window. Splitting improved warmth *and* capture quality.  
**PM skill:** Match model capability to job shape; know when to split agents.

### 3. Show the draft, don’t read it aloud

**Decision:** Collapsible **Your draft log** panel; companion instructed to point to it.  
**Why:** MVP 2’s invisible extraction caused “what did you get?” and duplicate survey readback in chat.  
**PM skill:** Transparency without turning transparency into more cognitive load.

### 4. Ask about the story, not the log

**Decision:** Thematic gaps (story → timing → … → review), not wizard field order; prompts forbid schema jargon.  
**Why:** Users rejected questions that existed only because a field was empty — it felt like the model cared about the form, not them.  
**PM skill:** Conversation design is product design; gap logic lives in code (`primaryGap`), not in the LLM’s improvisation.

### 5. Editable final log + explicit save

**Decision:** **LumaFinalLogEditor** at review; DB write only on Save or explicit “yes.”  
**Why:** Scribe will mislabel triggers and conflate time with contributors. Caregivers must own the record that neurologists see.  
**PM skill:** Human-in-the-loop for health-adjacent data; model confidence ≠ user consent.

### 6. Local session auto-save (not DB auto-save)

**Decision:** Debounced + interval save to `localStorage`; clear on successful commit.  
**Why:** Prevents loss on refresh without creating duplicate or premature clinical entries.  
**PM skill:** Draft resilience ≠ record integrity.

### 7. Rule-based fallback that still respects humans

**Decision:** Heuristics alongside Scribe; greeting guard; offline path without API key.  
**Why:** MVP 2 also showed that bad fallback (“Would ‘Hi’ work as a behavior?”) destroys trust as fast as bad LLM tone.  
**PM skill:** AI product = primary path + credible backup.

### 8. Voice UX as first-class

**Decision:** Continuous mic + **Done**; OpenAI TTS with selectable voice.  
**Why:** Caregivers often can’t type mid-crisis; robotic TTS undermined companion positioning after MVP 2’s clinical tone problem.  
**PM skill:** Multimodal design for real-world constraints.

---

## Iteration log (problems → resolutions)

### P0 — Trust & stability

| Issue | Resolution | PM takeaway |
|-------|------------|-------------|
| Blank/broken app (stale `.next`, port conflicts) | Single dev server on 3002; `dev:clean` / `start:clean:alt` | Infrastructure debt blocks all UX learning |
| Greetings parsed as behaviors | `isGreetingOrSmallTalk` + LLM-first path | First turn sets trust contract |
| White screen opening Luma | Normalize persisted draft on load (`normalizeLumaDraft`) | AI features need defensive data contracts |
| Logs missing from History | Filter by `created_at`, local timezone date ranges | PM must validate downstream surfaces, not just capture |

### P1 — Experience quality

| Issue | Resolution | PM takeaway |
|-------|------------|-------------|
| Felt like clinical survey | Narrative gaps in `lumaConversationDesign.ts`; forbid form language in prompts | Schema is backend; story is frontend |
| One model, two jobs | Companion + Scribe split in `lumaLlm.ts` | Decompose AI workloads by success metric |
| Invisible extraction | Live `LumaDraftPanel`; auto-expand on capture | Make AI legible without narrating JSON |
| LLM silent failure | Log server-side; `getLumaLlmStatusAction`; user-facing network errors | Observability is a product feature |
| Mic cut off mid-sentence | Continuous STT + manual Done + 120s cap | Don’t optimize for developer keyboard flows |
| Replies too long / hard to scan | Shorter companion prompt; `parseLumaMessageBlocks` | Mobile, stressed users need scannable UI |
| “Morning” as trigger not time | Exclude Time-category chips from trigger extraction; scribe rules + heuristics | Domain taxonomy errors erode clinician trust |
| Robotic TTS | OpenAI TTS + voice picker; browser fallback | Brand tone includes voice, not just copy |

### P2 — Polish & extensibility

| Issue | Resolution | PM takeaway |
|-------|------------|-------------|
| Unknown behaviors | Dynamic `CUSTOM_*` codes in SQLite | Vocabulary should grow with users |
| Intensity buttons unclickable | Fixed severity card hit targets (`SeveritySelector`) | QA on touch targets, not just happy path |
| Custom behaviors from conversation | Propose label → confirm → reuse | Progressive disclosure beats upfront taxonomy |
| Dual LLM provider | OpenAI + Anthropic via env | Vendor flexibility for cost/compliance reviews |

---

## Conversation design (what “good” looks like)

**Bad (survey mode):**  
“What was the episode recency? Select mild, moderate, or severe.”

**Good (narrative mode):**  
Caregiver: *“She wandered after lunch — hadn’t slept, got scared when the neighbor knocked.”*  
Luma: Short acknowledgment + one gentle follow-up if intensity or outcome still missing.  
Draft panel: Wandering · earlier today · afternoon · fatigue · fear · …  
Review: Caregiver edits, then saves.

**Gap sequence:** `story → timing → intensity → context → response → review`

---

## Healthcare & responsible-AI notes

- **Not a medical device** — Supports caregiver documentation and reflection; does not diagnose, prescribe, or replace clinical judgment.
- **PHI awareness** — API keys server-side only; portfolio demo uses local SQLite; production would need auth, encryption, BAA-covered vendors, and persistent DB — documented as explicit gaps.
- **Human confirmation** — Structured log is committed only after user review/save; local auto-save is not the medical record.
- **Fallback honesty** — UI indicates when browser TTS or heuristics are active vs OpenAI-powered paths.

---

## Outcomes & metrics (demo / qualitative)

- Caregivers can complete a wandering/sleep/agitation story in one or two turns with visible draft fill-in.
- Same log appears in **Today** and **History** after save.
- Voice path usable without typing; **Done** prevents premature cut-off.
- Product survives API outage via heuristics without greeting-as-behavior failure mode.

**Future metrics (if shipped):** log completion rate, time-to-save, edit rate on final log (proxy for scribe accuracy), 7-day return logging, synopsis export usage.

---

## Stack (portfolio sidebar)

| Layer | Choice |
|-------|--------|
| UI | Next.js 14, React, TypeScript, Tailwind |
| Conversation | Companion: GPT-4o / Claude Sonnet · Scribe: GPT-4o-mini / Claude Haiku |
| Speech in | Web Speech API (continuous STT, manual Done) |
| Speech out | OpenAI TTS (`tts-1`), browser fallback |
| Session | `localStorage` draft auto-save (`lumaSessionStorage.ts`) |
| Persistence | SQLite (`better-sqlite3`) — shared `behavior_logs` schema |
| Extraction | Scribe JSON + heuristics → `LumaDraft` → editable review → save |
| Deploy | Vercel + env vars (SQLite ephemeral on serverless — documented limit) |

---

## Copy-ready portfolio blurb

> I evolved **Luma** through three product generations: a rule-based **clarity log** (dropdowns, coach wizard, synopsis-ready schema) → conversational text (fast to ship, but robotic and clinical) → **Companion + Scribe** agents with a trust loop (live draft panel, narrative gaps instead of wizard mirroring, editable final log, explicit save, voice). The north star: help dementia caregivers capture what happened and what worked — so they regain control over avoidable behaviors and arrive at neurology visits with structured history — without the product feeling like paperwork.

---

## What I’d do next (roadmap thinking)

1. **Persistent hosting** — Turso/Postgres + auth for real multi-session data  
2. **Scribe eval harness** — Golden transcripts → expected `LumaDraft`; track edit distance at save  
3. **Clinician-facing summary** — Highlight confidence gaps (“caregiver edited triggers”)  
4. **Offline-first mobile** — PWA + on-device STT where HIPAA path requires it  
5. **Caregiver research** — 5–8 contextual interviews to validate save/edit flow under stress  
