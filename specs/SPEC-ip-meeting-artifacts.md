# IP Meeting Artifacts

Two separate documents, not one. Everything in Artifact 1 is checked against the running code
as of 2026-08-03 (CLAUDE.md §25/§26 — lexical, concept, and behavioral verification; no claim
here rests on a comment, a doc-string, or a prior "COMPLETE" label taken at face value). Artifact
2 is intent — read it after the transition sentence, not before.

---

# ARTIFACT 1 — KRYLO Today

Everything below is Maturity A or B, with its verification level stated. Nothing here is
aspirational language.

## The core claim

**KRYLO separates intelligence generation from truth authorization.**

This is not a design goal — it is a running mechanism, as of today:

- `src/engine/cifengine.js` (CI-F) — expands a knowledge claim into a candidate causal graph.
- `src/engine/cirgate.js` (CI-R) — an absolute, binary gate: three predicates (edge legality,
  temporal legality, RKM anchor coverage ≥ 0.35), structurally forbidden from blending into a
  score (§21 — gates sit above scoring, never mixed into it).
- `src/engine/rbcsengine.js` (RBCS) — scores only what CI-R already admitted.

**Maturity: A. Verification: B** (behaviorally verified — executed against data shaped exactly
like a real SEC 8-K filing ingested by the live EDGAR connector; produced a correct, coherent
result: 1 branch admitted, scored 0.0736, correctly low for an isolated claim with no supporting
causal chain). Not yet Verification R — that requires confirming the pipeline fires inside the
deployed application, which requires a deploy and a live check. State this precisely in the room:
*"the mechanism runs correctly against production-shaped data; production-in-the-loop
confirmation is the next step, not yet taken."*

## Supporting, independently real capabilities

| Capability | Mechanism | Maturity / Verification |
|---|---|---|
| Signal stabilization | `rkmaterializer.js` (WO-2052) | A / R — genuinely live, called from `app.jsx` on every EDGAR sync |
| Formation detection — emerging | Combination Formation System (Line/Triangle/Diamond) | A |
| Formation detection — missing | `voidclassifier.js` (WO-1854) — absence is a classified state, not a null | A |
| Formation detection — breaking | `happypathdisplacementengine.js` (WO-1826) — hysteresis-gated displacement | A |
| Explainability | `whytracepanel.jsx` / `whytraceresolver.js` / `whytrace.js` — real, mounted, called | A |
| Relationship memory (narrow) | `entitytopologyregistry.js` (WO-1855) — static v1 registry, real writes via migration-edge tracking | B |
| Cognitive event capture (narrow) | `subsignalbuffer.js` — isolated, bounded, non-blocking event fan-out, proven in production for signal tuples | B |

## What to say when asked "is this all connected"

Be exact, not proud: three of the ten Platform Framework engines built in June (CI-F, CI-R, RBCS)
now have a real, verified execution path. The other seven (LFOS, IB, Decision, Execution,
Feedback, Calibration) are real code with zero live callers — built correctly, not yet wired.
That is a true, checkable statement. A reviewer who asks for the import graph gets the same
answer twice.

---

## Transition sentence (say this out loud before Artifact 2)

> "Nothing on the next diagram should be interpreted as claiming present implementation. It is
> the architectural direction enabled by the primitives we've already reduced to practice."

---

# ARTIFACT 2 — KRYLO Cognitive Evolution Model

Intent, not inventory. Every stage below is Research/Vision (Maturity C or D) unless it cites a
mechanism from Artifact 1.

**The one-line thesis:** KRYLO is not attempting to build an autonomous intelligence all at once.
It is evolving a governed cognitive architecture in stages. Each stage is independently valuable
and preserves a single truth authority while expanding the system's ability to observe, remember,
discover, and reason.

## Stages

1. **Observe** — signal ingestion, CI-F/CI-R. *Already partially real (Artifact 1).*
2. **Explain** — provenance, why-tracing. Why-Trace is real; general replay/provenance capture
   (`replayengine.js`, `causalos/provenance.js`) exists as code but is unconfirmed as wired to
   anything live — state this as Maturity B, not further along.
3. **Remember** — adaptive relationship memory ("the Necklace"). The static registry is real
   (Artifact 1); the adaptive, decaying version does not exist. The decay mechanism it would
   need already has a proven template in this codebase (`financialmarketconnector.js`'s
   DAILY-decay pattern) — worth naming as evidence of feasibility, not evidence of completion.
4. **Coordinate** — distributed reasoning ("Cognitive Fabric"). Ratified doctrine
   (KRYL-1136/1137/1138), zero implementation. Say so plainly if asked.
5. **Discover** — unified formation discovery. Three of four detection types already run as
   separate engines (Artifact 1); the fourth ("novel," no historical precedent) is an unproven
   design hypothesis, not a definition — present it as a candidate to prototype.
6. **Institutional Intelligence / Adaptive Organism** — no code, no doctrine, no technical
   contract. Long-term direction only. Do not describe this stage in technical terms in the
   room; a restraint statement is stronger than a fabricated one:
   > "This is the direction our architecture naturally enables. We are intentionally not
   > over-specifying it today because our immediate focus is validating each preceding stage."

## The governing constraint, stated once

Growth cannot equal uncontrolled self-modification. CI-R's constitutional gate is the concrete,
already-real mechanism that keeps this true — every later stage extends that boundary, none of
them are permitted to loosen it.
