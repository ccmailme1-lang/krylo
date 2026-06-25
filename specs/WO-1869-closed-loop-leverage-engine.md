# WO-1869 — Closed-Loop Leverage Engine (Leverage Realization + Path Memory)
## STATUS: GOVERNING SPEC — BLOCKED (open decisions below). North-star subsystem, not next-week build.

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

## 4. OPEN DECISIONS — BLOCKERS (TBD = do not build, per hardening protocol)
1. **Outcome-capture mechanism** — how/when are outcomes reported? (manual prompt, scheduled
   follow-up, feed integration). Long time-lag. UNDEFINED.
2. **Attribution method** — how to estimate the route's causal contribution vs. confounders. UNDEFINED.
3. **Route-similarity definition** — how a new route matches historical routes (graph proximity). UNDEFINED.
4. **Sample-size threshold** — minimum N before a route-leverage claim is surfaced. UNDEFINED.
5. **Non-obviousness weighting** — how "earliness/non-consensus" enters Route Ranking. UNDEFINED.

## 5. LOCKED GUARDRAILS (from §19)
- Completeness is a SPECTRUM — Path Memory learns from the captured-outcome subset (engine + survivorship bias).
- Attribution = highest-risk layer. WITHHOLD BEATS FABRICATE — no route-leverage claim without N + rigor.
  Coincidence is not causation.
- Not prediction / recommendation / autonomous adaptation. Evidence accumulation only.

## 6. BOTTLE TEST
Reduces ambiguity? YES. Single dominant output? YES (route→outcome evidence). Boundaries defined?
NO (5 open decisions). No undefined deps? NO. Avoids core flexibility growth? YES.
**Verdict: BLOCKED** — governing spec stands; cut child WOs once decisions 1–5 are made.

## 7. DEFINITION OF DONE (when unblocked)
A route emitted, its outcome captured, attributed, stored, and surfaced as LR-prior on a future
matching route with N ≥ threshold. Sequence: after classifier/extraction hardening + WO-1868 metrics.
