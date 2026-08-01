# SPEC — Subsignal Fan-Out Substrate
Jira: KRYL-1132 — Implement Subsignal Fan-Out Substrate Boundary
Date: 2026-08-01
Author: drafted by agent at Founder's explicit request ("spec both now while it's fresh")
Target file(s): src/engine/surfacerouter.js (additive), src/engine/subsignalbuffer.js (NEW)

Status: SPEC COMPLETE — BUILD BLOCKED. Filed as KRYL-1132. No local WO-#### numbering (that
convention is retired — it caused collisions with prior work; see
project_jira_exclusive_numbering). The two artifacts are this spec and KRYL-1132 — nothing
else tracks this work.
One open decision blocks Bottle Test item 5 — see §6 and §8 below. Do not start build until
KRYL-1132's retention-policy blocker is resolved by the Founder.

Depends on: `DOCTRINE-subsignal-floor-principle.md` (§25 proposed) for vocabulary. This spec
is buildable independent of whether §25 gets locked — the doctrine names the concept, this
spec is the one concrete engineering implication of it.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Give the raw subsignal stream already flowing through `surfacerouter.js` a second,
read-only exit point, so more than one consumer can read the same subsignals without each
new consumer requiring a change to ingestion.

**Output:** A shared, append-only log of subsignal tuples that supports replay within the
retention boundary defined in §6, which any future detector (anomaly, trend,
absence-transition) can subscribe to.

---

## 2. BOUNDARY DECLARATION

**Input contract:** The same `{ source, domain, signal, confidence, ts }` tuple every
connector already produces under §16, at the exact point `dispatchBatch()` receives it —
no new fields, no new normalization.

**Output contract:** `subsignalbuffer.js` exposes:
- `append(tuple)` — called once per dispatched subsignal, from inside `dispatchBatch()`.
- `subscribe(fn)` — registers a read-only callback invoked on every appended tuple.
- `read({ since, domain, limit })` — pull-based read of recent history (bounded, see §6).

**Explicit exclusions:** Does NOT touch CI-F, CI-R, RBCS, LFOS, or IB. Does NOT score,
classify, or aggregate anything — it is a pass-through log, not a second pipeline. Does NOT
change `dispatchBatch()`'s existing signature or its existing single-consumer routing
behavior — this is one additional line inside it, not a rewrite. Does NOT persist across
server restarts unless the open retention question in §6 is resolved in favor of that.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. **Confirmed not
  violated** — the tuple shape is read-only and unchanged; this spec adds a reader, not a
  transformer.
- [ ] Scoring layer touched → N/A, not touched.
- [ ] Inference layer touched → N/A, not touched.
- [ ] UI layer touched → N/A, not touched.

**Drift notes:** The only real drift risk is scope creep — a future change "just adding a little
logic" into `subsignalbuffer.js` (e.g. a filter, a score) would turn the floor into a second
scoring layer and violate §21 (Route-Don't-Aggregate) by the back door. This file must stay
pass-through, forever, by construction — enforce by code review, not runtime check.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Every new detection capability today requires touching the connector/ingestion
layer to get access to raw signals; this spec decouples "build a new detector" from "modify
ingestion," which is the asymmetry that lets KRYLO add anomaly/trend/absence detection later
without re-plumbing §16 each time.

---

## 5. OUTPUT GRAVITY

**"The single thing this spec produces that matters most is a shared, replayable subsignal log
that any future detector can subscribe to without touching ingestion."**

---

## 6. FORMULA / CONTRACT

No calculation — this is a data contract, not a scoring formula.

**Contract — split so ingestion and enrichment can't be conflated:**

`BaseSubsignalTuple = { source: string, domain: string, signal: number(0-100),
confidence: number(0-100), ts: number }` — exactly the existing §16 tuple, unchanged. This is
what `append()` receives from `dispatchBatch()`; the substrate's ingestion path has no
dependency beyond this.

`SubsignalRecord = BaseSubsignalTuple + { canonicalEventId?: string }` — the stored/read
shape. `canonicalEventId` is an **enrichment reference**, attached only when WO-2004's
CanonicalEvent assignment has already happened upstream — never a prerequisite for capture.
A subsignal must be appendable before any CanonicalEvent id exists, or this substrate
silently becomes dependent on the identity kernel, which §2's boundary forbids.

**Normalization:** Unchanged — inherits the existing 0–100 scale from §16. This spec adds no
new normalization step.

**Retention (RESOLVED 2026-08-01 — Founder decision):** In-memory, bounded ring buffer.
Retains the most recent **10,000 records OR the last 24 hours, whichever bound is hit
first** — self-pruning on every `append()`, no timer required. Lost on process restart.

**Why this shape, not persistence:** matches existing precedent already in this codebase
(`rfereconciler.js`'s per-session ring buffer; `petrolocator.js`'s self-expiring day-cache) —
this engine layer already favors small, bounded, in-memory structures over new persistent
storage. No detector consumes this substrate yet, so building a persistent store now would be
infrastructure for a hypothetical consumer, not a real one. If a future detector needs deeper
history than 24h/10k records, the fix is contained: swap `subsignalbuffer.js`'s internal
storage for a persistent one behind the same `append/subscribe/read` API — §2's boundary
means that change never touches `surfacerouter.js` or any subscriber.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/subsignalbuffer.js` | NEW — `append()`, `subscribe()`, `read()`, retention per §6 | — |
| `src/engine/surfacerouter.js` | `dispatchBatch()` gains one additive call: `subsignalbuffer.append(tuple)` per dispatched tuple, before/alongside existing routing | Existing routing logic, existing `dispatchBatch()` signature and return value |

No other file changes. CI-F/CI-R/RBCS/LFOS/IB engines are not in this File Map because they
are not touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — gives "subsignal" a concrete, queryable data shape instead of an implicit one. |
| Does this have a single dominant output? | YES — the buffer/subscription API. |
| Are all boundaries explicitly defined? | YES — see §2. |
| Can this be built without touching an undefined dependency? | **YES** — retention policy (§6) resolved 2026-08-01: in-memory bounded ring buffer, 10,000 records / 24h, whichever first. |
| Does this avoid increasing expressive flexibility in the core? | YES — flexibility is added only at the periphery (a new read path); the CI-F→RBCS→LFOS→IB core gains no new branches, formulas, or knobs. |

**Verdict: PASS** — §6 retention resolved 2026-08-01 (in-memory bounded ring buffer, 10,000
records / 24h). No remaining blockers on this table.

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** Preserves existing invariants — `dispatchBatch()`'s current
behavior and return value are unchanged; the new call is additive and cannot fail the
existing path (buffer write should be fire-and-forget, never blocking or throwing into the
router). No hidden dependencies introduced.

**2. Semantic Consistency (SC):** Terminology aligns with the proposed §25 doctrine
(subsignal = the §16 tuple). No duplication of an existing construct — nothing today gives
external read access to the raw dispatch stream.

**3. Execution Containment (EC):** Requires one small runtime change (the additive call in
`surfacerouter.js`); side effects are fully bounded to `subsignalbuffer.js` plus that one
line. No implicit cross-module mutation — subscribers receive read-only data.

**Runtime isolation requirement (hardening, not a new feature):** `subsignalbuffer.append()`
MUST NOT block on, or allow exceptions from, any subscriber to bubble up into the caller.
`dispatchBatch()`'s existing behavior must be unaffected by a slow or throwing subscriber —
store the tuple, then notify subscribers in a way that can't fail or stall the router (e.g.
each subscriber call wrapped/isolated so one bad subscriber can't take down routing or the
others). This is an execution invariant on the boundary already declared in §2, not new
scope — closes the realistic failure mode where a future detector's bug silently breaks
existing routing.

**4. Drift Exposure (DE):** Low, provided the "pass-through forever" rule in §3 holds. The
risk is entirely social/process (someone adding logic to the buffer later), not architectural.

**Outcome tag: CONSTRAINED** — acceptable to build, with one standing condition: flag the §3
pass-through rule (subsignalbuffer.js stays a log, never gains filtering/scoring/weighting
logic) to any future agent/engineer who touches this file. Not a blocker — a permanent
code-review note.

---

## 10. DEFINITION OF DONE

**Verification:**
1. `grep -n "export function append\|export function subscribe\|export function read" src/engine/subsignalbuffer.js` returns all three.
2. `grep -n "subsignalbuffer" src/engine/surfacerouter.js` shows exactly one additive call inside `dispatchBatch()`.
3. A QA script dispatches one real connector's batch and confirms the same tuple appears via `subsignalbuffer.read()` — proves the tap is real, not decorative.
4. No existing test/QA harness for `surfacerouter.js` regresses (run whatever currently covers dispatchBatch, e.g. relevant `qa_*.mjs`).

Memory/registry updated only after all four pass — per §12a, no partial completion reported as done.

---

## NOTES

This spec is small on purpose (Bottle Test discipline) — it deliberately does not include
building the first actual consumer (anomaly/trend/absence detector). That's follow-on work,
scoped separately, once this substrate exists and Founder picks which detector to build first.
