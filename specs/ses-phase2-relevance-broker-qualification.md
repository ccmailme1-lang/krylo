# SES Phase 2 — Relevance Broker — Qualification Note (intake/gate, not a spec)

Source: `specs/New- Krylo Marketability Analysis.md` (brainstorm transcript).
Founder confirmation: "SES design. this is EXACTLY what it is." → This item is the **second half of SES**, not a separate engine.
Role of this note: qualification gate before WO generation.

## Disposition
**Qualified — this is the completion of the SES design.** WO-ready pending scope framing (§ Positioning).

## What it actually is
The **Optimized Information Surface** — a relevance *broker*. Given the SES-detected condition, it surfaces evidence by **decision-value to that emerging condition** (not topic retrieval):
- critical signals · leading indicators · contradictions · opportunity/risk zones.

"Marketability Analysis"/"Market Analytics" is a working title; the real subject is perceived-state → relevance-broker.

## Fit — already anticipated by the codebase
`searchenvironmentstate.js` describes itself as the precondition layer that "ANNOTATES and **(later) conditions retrieval**." That reserved hook *is this item.*
- **SES Phase 1 (done, yesterday):** perceived state — what condition is emerging, confidence, dissonance (`computeSES`, `sescard.jsx`).
- **SES Phase 2 (this item):** condition → brokered, relevance-ranked evidence surface.

Inherits SES discipline directly: no grounded-score mutation; withhold over fabricate; real observed evidence only.

## Positioning flag (load-bearing)
~two-thirds of the source doc re-articulates **already-locked doctrine**: Perceived State (SES), observer-lens-after-state (existing lens model + Perception Dimension doctrine), convergence, evidence tiers, observation integrity. **Scope the WO as the relevance-brokering layer that CONSUMES SES output — not a second perceived-state engine** — or it duplicates locked work.

## Genuinely net-new core (confirmed absent in code)
Condition → evidence relevance ranking. No relevance-broker exists (`grep` clean). The doc names the hard part (line 367): *"defining what evidence matters for a condition, not just what evidence exists about a topic."*
Real build = **(a) condition → evidence-requirements map + (b) relevance scorer.**

## Reuse
- SES (`computeSES`) — condition input.
- Evidence tiers — `rkmstore.js` / `identitykernel.js`.
- Candidate evidence pool — `reconlayer.js`, `availabilityfilter.js` (eliminates, never deprioritizes — §21).
- §21 route-don't-aggregate: rank atomic evidence by condition-relevance; do not pre-aggregate.

## Risk
Primary fabrication surface: relevance must be computed over **real observed evidence**, never invented. Must carry the same §19 (withhold-beats-fabricate) and §22 (absence-is-signal) discipline. A relevance claim without grounded evidence is fabrication by ranking.

## Confidence
- Concept: **high** (doctrine-aligned; SES hook already reserved).
- Execution: **medium** — the condition→relevance mapping is the hard, unbuilt piece and the main risk locus.

## Cross-flag
Shares the truth substrate with STEE (see `stee-qualification-note.md`). STEE outputs a Pareto candidate-graph frontier; this outputs a ranked evidence surface. Distinct outputs — keep the substrate shared, avoid two overlapping relevance engines.
