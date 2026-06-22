# Luma — AI Product Case Study (Dementia Caregiving)

**Role lens:** AI Product Manager · Healthcare  
**Project:** Luma for Dementia caregivers  
**Scope:** Conversational incident logging for family caregivers  
**Stack:** Next.js · SQLite · OpenAI/Anthropic · Web Speech · OpenAI TTS

---

## Executive summary

Dementia caregivers often skip structured logging because forms feel clinical and exhausting in the moment. **Luma** is a voice-and-text companion that lets caregivers describe an incident naturally while the product silently builds the same structured record used by coach and quick-log flows — for history, patterns, and clinician synopsis export.

This case study shows how I shipped an AI-native feature end-to-end: problem framing, conversation design, model architecture, trust UX, failure modes, and iteration from a broken MVP to a demo-ready product — without pretending the app is a regulated medical device.

---

## Problem & opportunity

| Stakeholder | Pain | Product implication |
|-------------|------|-------------------|
| **Caregiver** | Logging after a hard moment feels like homework; forms re-traumatize | Lead with empathy and narrative, not schema |
| **Care team / clinician** | Needs structured, comparable incident data over time | Same `behavior_logs` schema regardless of entry path |
| **Product / eng** | One LLM asked to chat *and* extract JSON produces stiff UX and missed fields | Split **Companion** (voice) and **Scribe** (structure) |

**Opportunity:** Use generative AI where it adds humanity (listening, reflecting) and classical product patterns where they add reliability (editable review, explicit save, rule-based fallback).

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

## Key product decisions

### 1. Companion + Scribe (not one prompt)

**Decision:** Two parallel model calls — stronger model for reply, lighter model for extraction.  
**Why:** Empathy and JSON compliance compete in a single context window. Splitting improved warmth *and* capture quality.  
**PM skill:** Matching model capability to job shape, not defaulting to one “smart” call.

### 2. Show the draft, don’t read it aloud

**Decision:** Collapsible **Your draft log** panel; LLM points to it instead of reciting fields.  
**Why:** Caregivers asked “what did you get?” — readback felt like a survey. Panel builds trust without polluting chat.  
**PM skill:** Transparency without turning transparency into more cognitive load.

### 3. Editable final log + explicit save

**Decision:** At review, show **LumaFinalLogEditor** (full form); persist to DB only on **Save to log** or explicit chat “yes.”  
**Why:** AI will mislabel triggers, conflate time-of-day with contributors, or miss nuance. Caregivers must own the record.  
**PM skill:** Human-in-the-loop for health-adjacent data; never equate model confidence with user consent.

### 4. Local session auto-save (not DB auto-save)

**Decision:** Debounced + interval save to `localStorage` (`luma-session-v1`); clear on successful commit.  
**Why:** Prevents loss on refresh/tab crash without creating duplicate or premature clinical entries.  
**PM skill:** Separating *draft resilience* from *record integrity*.

### 5. Rule-based fallback that still respects humans

**Decision:** Heuristics run alongside Scribe; full offline path when no API key. Greeting detection prevents “Would ‘Hi’ work as a behavior?”  
**Why:** Demos, outages, and cost caps shouldn’t produce a hostile UX.  
**PM skill:** AI product = primary path + credible backup, not AI-or-nothing.

### 6. Voice UX as first-class

**Decision:** Continuous mic + **Done** button; OpenAI TTS with selectable voice; browser fallback labeled honestly.  
**Why:** Caregivers often can’t type mid-crisis; robotic TTS undermines “companion” positioning.  
**PM skill:** Multimodal design for real-world constraints, not feature checklist parity.

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

> As AI PM, I built **Luma** — a conversational logging companion for dementia caregivers. I decomposed the AI layer into **Companion** (empathetic dialogue) and **Scribe** (silent structured extraction), designed narrative-first conversation gaps instead of form mirroring, and closed the trust loop with a live draft panel, **editable final log**, and explicit save. I shipped voice UX (continuous mic + OpenAI TTS), local session resilience, and heuristic fallbacks for demo reliability — all writing into the same care log used for history and clinician synopsis. Iterated from P0 stability and trust failures through qualitative feedback on robotic tone, invisible capture, and misclassified triggers.

---

## What I’d do next (roadmap thinking)

1. **Persistent hosting** — Turso/Postgres + auth for real multi-session data  
2. **Scribe eval harness** — Golden transcripts → expected `LumaDraft`; track edit distance at save  
3. **Clinician-facing summary** — Highlight confidence gaps (“caregiver edited triggers”)  
4. **Offline-first mobile** — PWA + on-device STT where HIPAA path requires it  
5. **Caregiver research** — 5–8 contextual interviews to validate save/edit flow under stress  
