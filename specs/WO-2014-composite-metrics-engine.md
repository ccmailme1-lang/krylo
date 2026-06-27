# WO HARDENING — Composite Metrics Engine
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2014 — Composite Metrics Engine (CME)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/compositemetrics.js
  (read-only consumers: structuralconfirmation.js, convergenceclassifier.js,
  evidencetiers.js, timingproxy.js, metricsengine.js)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Derive four composite metrics — LEVERAGE, ADVANTAGE, VISIBILITY, EDGE —
from structural evidence already present in the engine. No new data sources.
No new signal ingestion. Pure derivation from existing outputs.

**Output:** `{ leverage, advantage, visibility, edge }` — a single plain object
attached to `synthesis.compositeMetrics` at synthesizeQuery return time, consumed
by MetricStrip and the Divergence Spectrum (WO-2016).

---

## 2. BOUNDARY DECLARATION

**Input contract (all read-only, all already exist):**
- SCI score from structuralconfirmation.js — Structural Confirmation Index
- Convergence state + volatility from convergenceclassifier.js
- Evidence tier distribution from evidencetiers.js EVIDENCE_DESCRIPTORS
- Predictive horizon depth from timingproxy.js computeFsStar output
- Narrative consensus proxy: MEDIA domain pressure from surfacerouter.js
- Existing synthesis.metrics from metricsengine.js (signal, validity, convergence)

**Output contract:**
- `compositeMetrics: { leverage, advantage, visibility, edge }` — all values 0–1
- Attached to synthesis object only. No store writes, no dispatch.

**Explicit exclusions:**
- No writes to metricsengine.js, convergenceclassifier.js, or scpstore.js
- No new signal sources or external API calls
- No modification of existing synthesis.metrics (they remain unchanged)
- No modification of HP qualification logic

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: compositeMetrics are display values. They do not alter HP scores,
  convergence state, or action plan generation.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: No path from compositemetrics.js back to convergenceclassifier.js,
  metricsengine.js, or dispatchBatch().

**Drift notes:** All four metrics are derivations, not new measurements.
The engine's truth layer is read-only from CME's perspective.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The engine already computes the components needed to answer
"do I have a real position, how big is it, and is now the right time?" —
but surfaces them as raw scores (signal %, convergence %, SCI). CME composes
these into mission-language outputs: the advantage you hold, how long it reaches,
how actionable it is, and whether it's growing. Zero new data cost.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a compositeMetrics
object — four normalized scores that translate structural evidence into
position-quality language: LEVERAGE (worth acting?), ADVANTAGE (how far ahead?),
VISIBILITY (how long does the evidence reach?), EDGE (is the gap growing?)."**

---

## 6. FORMULA / CONTRACT

All outputs normalized 0–1. All inputs already computed elsewhere.

### LEVERAGE — Actionability-to-effort ratio
```
leverage = clamp(
  (signal × validity × SCI) / (1 + volatilityScore),
  0, 1
)
```
High signal + high validity + high SCI + low volatility = high leverage.
Volatility in denominator: volatile evidence is expensive to act on.

### ADVANTAGE — Structural confidence vs. narrative consensus gap
```
narrativeConsensus = MEDIA domain pressure / 100   // normalized
advantage = clamp(SCI - narrativeConsensus, 0, 1)
```
Positive = structural read is ahead of media narrative.
Zero or negative = consensus has caught up; edge is gone.

### VISIBILITY — Furthest verified horizon
```
horizonDepths = { SHORT: 0.25, MED: 0.55, LONG: 0.85, YEARS: 1.0 }
visibility = horizonDepths[timingproxy.resolvedHorizon] × validity
```
Horizon reach × evidence validity. Long horizon with weak validity = low visibility.

### EDGE — Rate of divergence from consensus
```
edge = clamp(
  (advantage × convergenceScore) / (1 + narrativeConsensus),
  0, 1
)
```
Growing convergence + growing advantage = high edge.
If consensus is rising (narrative catching up), edge compresses.

### compositeMetrics schema
```js
{
  leverage:   number,  // 0–1
  advantage:  number,  // 0–1
  visibility: number,  // 0–1
  edge:       number,  // 0–1
}
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/compositemetrics.js` | NEW — computeCompositeMetrics(synthesis, timingState) | — |
| `src/engine/querysynthesis.js` | EXTEND — call computeCompositeMetrics() at return, attach as synthesis.compositeMetrics | All routing, domain logic untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity? | YES — four named values replace implicit interpretation of raw scores |
| Single dominant output? | YES — compositeMetrics object, four fields |
| All boundaries defined? | YES — all inputs sourced from existing files; no new data sources |
| No undefined dependencies? | YES — SCI, convergence, volatility, horizon, MEDIA pressure all exist today |
| No expressive flexibility increase in core? | YES — read-only consumer; no engine mutations |

**Verdict: PASS — BUILD-READY.**

---

## 9. DEFINITION OF DONE

1. `grep -n "dispatchBatch\|convergenceclassifier.*set\|metricsengine.*write"` in
   compositemetrics.js returns zero.
2. LEVERAGE test: inject signal=0.9, validity=0.9, SCI=0.85, volatility=0.1
   → leverage > 0.7.
3. ADVANTAGE test: inject SCI=0.8, MEDIA pressure=30 → advantage ≈ 0.5.
4. ADVANTAGE test: inject SCI=0.4, MEDIA pressure=80 → advantage ≤ 0.
5. VISIBILITY test: horizon=LONG, validity=0.9 → visibility ≈ 0.76.
6. EDGE test: high advantage + high convergence + low consensus → edge > 0.6.
7. synthesis.metrics unchanged before and after CME mount (regression).
8. AMBIGUOUS/INSUFFICIENT query → compositeMetrics all return 0 or near-0.
