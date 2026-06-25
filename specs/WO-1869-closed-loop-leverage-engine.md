# WO-1869 — Closed-Loop Leverage Engine (Leverage Realization + Path Memory)
## STATUS: DECISIONS ACCEPTED (defaults, "for now" — revisitable) 2026-06-25. Recorder is BUILD-READY.
## The 5 design calls did not need data — they're made. Store starts empty, fills over time; claims at N≥5.

Implements the Closed-Loop Leverage Principle (CLAUDE.md §19). Closes the missing half of the
system: KRYLO remembers emissions but not outcomes. This engine records what happened after an
emission and accumulates evidence of which routes produced leverage.

## 1. SINGLE RESPONSIBILITY
**Job:** Connect each emitted decision (route) to its realized outcome, attribute it, store it in
Path Memory, and rank routes by realized leverage × non-obviousness.
**Output:** Per route: `{ route, outcomeObserved, leverageRealization, attributionConfidence, n }`.

## 2. SUB-COMPONENTS (each likely its own child WO when unblocked)
- **Outcome Capture** — mechanism to record post-decision actuals (user report / connected feed).
- **Outcome Attribution** — link outcome back to the emitted route; estimate causal contribution.
- **Path Memory** — append-only store of route → outcome (NOT pattern recognition; routes, ranked).
- **Leverage Realization metric** — `Observed Outcome ÷ Projected Outcome` (the 7th vital metric;
  two faces: LR(decision) retrospective; LR-prior(route-class) shown at emission with N).
- **Route Ranking** — `f(leverage realization, current non-obviousness)`. Maps routes consensus
  roads; KRYLO must route the non-obvious ("before it becomes obvious").

## 3. BUILDS ON (search before build)
`convictionstore.js` — WO-1823 Conviction Record (CommitEvent), WO-1824 Thesis Monitoring,
WO-1825 Decision Lineage + `computeCalibration`. This is the metric/memory layer ON TOP of that
lineage store, not greenfield.

## 4. DECISIONS — LOCKED 2026-06-25 (defaults accepted; revisitable)
1. **Outcome capture** — manual "Log Outcome" action on resolved conviction + prompt at time-horizon.
   Builds on convictionstore.js (CommitEvent + thesis monitoring). Feed-based auto-capture = phase 2.
2. **Attribution** — capture `followed: full | partial | none` with outcome; attribute leverage only when
   followed; `attributionConfidence` stays low until N builds. No counterfactual claims. Coincidence ≠ causation.
3. **Route similarity** — exact match on `{domain|convergenceBand|lens}` key; nearest-neighbor on numeric
   profile where exact misses. NOT ML / embeddings — inspectable string key.
4. **Sample threshold** — record from n=1; surface LR-prior only at **N ≥ 5** with a confidence band.
   Below N=5: "recording — not enough history yet" (withhold discipline enforced in pathstore.js).
5. **Earliness weighting** — `rank = LR × earlinessFactor`, where `earlinessFactor = 0.5 + earlyRatio × 0.5`.
   3-tier tag (early/mid/late) assigned at emission based on convergence state. Rewards non-obvious payoffs.

## 5. LOCKED GUARDRAILS (from §19)
- Completeness is a SPECTRUM — Path Memory learns from the captured-outcome subset (engine + survivorship bias).
- Attribution = highest-risk layer. WITHHOLD BEATS FABRICATE — no route-leverage claim without N + rigor.
  Coincidence is not causation.
- Not prediction / recommendation / autonomous adaptation. Evidence accumulation only.

## 6. BOTTLE TEST
Reduces ambiguity? YES. Single dominant output? YES (route→outcome evidence). Boundaries defined?
YES (5 decisions locked). No undefined deps? YES. Avoids core flexibility growth? YES.
**Verdict: BUILD-READY** — recorder built in pathstore.js; LR-prior wired in metricsengine.js + metricstrip.jsx.
Usefulness gated on outcome data accrual. Claims at N≥5.

## 7. DEFINITION OF DONE (when unblocked)
A route emitted, its outcome captured, attributed, stored, and surfaced as LR-prior on a future
matching route with N ≥ threshold. Sequence: after classifier/extraction hardening + WO-1868 metrics.
