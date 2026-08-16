# KRYLO — Phase Chronicle

**Document:** 030-phase-chronicle
**Audience:** External / investor
**Status:** Draft — owner review required
**Period covered:** January 2026 – August 2026
**Last updated:** 2026-08-12

---

## How to read this

This is the build record. It exists because the most useful thing about
KRYLO is not its current feature set but the fact that its founding
constraints were written down first and have not been relaxed since.

Where a date is approximate, it is marked. Where a claim rests on
internal assessment rather than external evidence, it says so.

---

## Era 1 — Proof of mechanism (January 2026)

**2026-01-18 — POC charter issued.** A four-business-day timebox with
acceptance criteria written before any code. The objective was narrow by
design: prove that signal → aggregation → state change → explanation →
reversion worked end to end. Not persistence, not scale, not polish.

The charter named its own allowances rather than hiding them: 100%
synthetic data tagged `source: synthetic_poc`, in-memory storage only, no
auth, debug endpoints exposed. Each was listed as temporary and scoped to
the POC.

**2026-01-20 — POC live.** Two days from charter to running service.
Python 3 / FastAPI / Uvicorn on Render. Acceptance #3 — the aggregation
loop — passed, verifying signal ingestion, deterministic aggregation,
time-based expiry, and clean reversion to baseline.

**Same period — architectural direction set.** A HUD architecture
specification and working implementation demo were produced alongside the
backend, establishing the visual and interaction language the platform
still uses.

**Deliberately unbuilt at this point:** a CALM/WATCH/ALERT state machine,
multi-signal convergence, and a HUD visualization layer. All three were
listed as future phases. All three now exist.

---

## Era 2 — Scope lock (January – February 2026)

**Pilot domain locked: technology risk / adoption friction.** Narrow by
design — one organization, internal technical audience, no cross-org
aggregation. The target was pre-incident recognition: tooling resistance,
operational brittleness, silent workarounds, reversion behavior. Explicitly
not postmortems, uptime, or performance metrics.

The success criteria are the notable part. The pilot counted as successful
if a risk surfaced before formal escalation, **or if the system correctly
remained silent despite noise.** A null result was defined as a valid
outcome before any data existed to produce one.

---

## Era 3 — Platform build (March – May 2026)

**Phase 4 Block 1** delivered the first production interface components.
**Phase 5A** introduced the five engine metrics — Heartbeat, Velocity,
Headroom, Reaction, and Signal Strength — with threshold alerting, live
feed control, and external news ingestion.

A kinetic visual series followed, along with the Friction Record: a GLSL
shader layer mapping fidelity components to particle physics, making
signal quality legible as motion rather than as a number.

**Structural consolidation.** The codebase moved to a Yarn workspace
monorepo, and a written standard operating procedure was authored as the
governing document for all development work.

---

## Era 4 — Doctrine hardening (May – July 2026)

This is the period that shaped the product more than any feature.

**The Two-Zone Doctrine was locked.** Truth computation and guest
perception are permanently decoupled. The engine holds hard invariants and
admits no design latitude; the interface layer has full creative latitude
and cannot influence computation.

**All numerical metrics were removed from the guest view.** Every one of
the five engine metrics moved to the Audit Desk. The guest-facing surface
carries no numbers, no text assertions, and no visibility at all when the
system state is CALM. If the product's claim is epistemic honesty,
displaying figures the system cannot fully stand behind contradicts it.

**Validation strategy inverted.** The team moved from instance-based
verification — fix the bug, confirm the fix — to invariant-based hardening,
in which every fixed defect becomes a permanent regression vector. The
runtime fails open; the test harness fails closed. That asymmetry is
deliberate and enforced.

**Two governance events, both recorded rather than buried:**

- A work order previously marked parked was executed in error. Root cause
  analysis produced permanent process controls: pre-execution ticket
  verification, and block manifest approval required before any build
  command. The work order was removed from consideration entirely.
- An attempted prompt injection — a fabricated system message citing
  nonexistent internals, styled with false authority — was identified and
  neutralized. The underlying genuine defect was separated from the
  injected instruction and fixed against real classifier output.

---

## Era 5 — Instrumentation and first live run (July – August 2026)

**Decision Velocity telemetry** was built as a pure-observability module
and hardened across pipeline boundaries. A proposal to extend it with
convergence weighting was rejected for exceeding the work order's
observability-only scope — a scope refusal recorded as a decision rather
than quietly absorbed.

Two defects fixed in this period are worth naming because they were both
correctness-of-meaning failures rather than crashes: bare queries
escalating to inappropriate domains, and an internal domain field
surfacing to guests in place of the actual query subject. Both were cases
of the system asserting something it had no basis to assert. Both were
closed as invariants.

**August 2026 — first complete payload processed end to end.** The result
was a refusal.

| Invariant | Observed | Result |
|---|---|---|
| Withholding gate | Confidence ungrounded | Clean withhold |
| State typing | 50% projection | Explicitly typed |
| Structural provenance | Structural absence | Refused fabrication |
| Export gate | Fs 0% vs. 70% required | Export blocked |
| Financial metrics | CAC / ROAS / LTV ungrounded | Zero hallucination |

Handed a payload it could not substantiate, the system declined to assert
anything about it and blocked export. The behavior traces directly to a
principle written seven months earlier — silence is data — and to a pilot
specification in which correct silence was defined as success.

---

## Current status (as of 2026-08-12)

- Engine validated end to end
- **5 external testers** to date
- Coordinated testing with a **20+ user focal group** planned, timed to the
  Gas Go release · `[TBD — owner: date]`
- Active work: registry integrity, layer architecture lock, retrieval and
  intent-routing workstreams in backlog

---

## Provenance note

This chronicle draws on primary source documents dated 2026-01-18 through
2026-08-12. Two categories of early material are excluded as evidence:
simulated advisory feedback attributed to named public figures, and an
AI-authored architecture self-assessment. Neither constitutes third-party
validation and neither is represented as such. An early plan to blend
simulated test cycles into the coordinated testing round was withdrawn; no
simulated results are counted anywhere in this document.