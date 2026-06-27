# WO HARDENING — State-Conditioned Path Rendering Layer
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2012 — State-Conditioned Path Rendering Layer (SCPRL)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/scprl.js · src/components/analysis/targetpacket.jsx
  (read-only consumers: reconlayer.js domain pressure, convergenceclassifier.js state)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Modulate the display ordering, tone label, and risk emphasis of existing
paths in the output surface based on a computed DistressIndex — without altering
the path topology, signal definitions, or convergence state equations.

**Output:** A `RenderDirective` object — `{ toneLabel, sortedPathIds, riskHighlightLevel }` —
consumed only by the rendering layer. No path is created, removed, or scored differently
in the engine.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- Domain pressure states from surfacerouter.js (read-only)
- Convergence state from convergenceclassifier.js (read-only)
- Existing path list from current synthesis output (read-only)
- DistressIndex (computed internally from 4 inputs — see §6)

**Output contract:**
- `RenderDirective`: `{ toneLabel, sortedPathIds[], riskHighlightLevel }`
- Consumed only by targetpacket.jsx rendering layer
- No write path to any engine, store, or production schema

**Explicit exclusions:**
- No modification of path topology (what paths exist)
- No modification of signal definitions or cone geometry
- No modification of convergence state equations
- No modification of HP qualification logic
- No writes to scpstore.js, surfacerouter.js, dispatchBatch(), or any cone
- No new data sources or external API calls

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  NOTE: SCPRL reads domain pressure states. It does not alter signal schema.
  All outputs are RenderDirective artifacts, not schema writes.

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: DisplayWeight modifies sort order only. No path promotion, no SCP emission,
  no convergence score change.

- [x] UI layer touched → display does NOT introduce new data dependencies
  NOTE: targetpacket.jsx reads RenderDirective only. No new engine hooks,
  no new store subscriptions.

**Drift notes:** The hard/soft layer invariant is structural. Hard layer
(path topology, signal definitions, state equations) is never touched.
Soft layer (ordering, tone, emphasis) is the only surface.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Under distress conditions, the system currently presents all paths
with identical visual weight — forcing the user to manually re-rank under cognitive
load. SCPRL surfaces the same structural truth with regime-appropriate attention
ordering, fulfilling the Direction Honesty Principle (§20): fracture paths rise,
speculative paths dim. Reality is shown, not suppressed.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a RenderDirective —
a bounded, display-only artifact that orders existing paths and sets tone label
based on measured distress, without altering what those paths say or whether
they exist."**

---

## 6. FORMULA / CONTRACT

### DistressIndex (DI) — locked formula

```
DI = clamp(
  w_vol · NormalizedVolatility
+ w_comp · NarrativeCompression
+ w_liq · LiquidityStress
+ w_red · SignalRedundancy,
0, 1
)
```

Default weights (manually calibrated, not learned):
- w_vol = 0.35
- w_comp = 0.25
- w_liq = 0.25
- w_red = 0.15

All inputs normalized 0–1 before weighting.
Weights sum to 1.0. Clamp enforced at both bounds.

### Input sourcing (no phantom dependencies)

| Input | Source | Already exists? |
|-------|--------|----------------|
| NormalizedVolatility | convergenceclassifier.js volatilityScore | YES |
| NarrativeCompression | surfacerouter.js domain pressure variance | YES — derived |
| LiquidityStress | timingproxy.js DFC output | YES |
| SignalRedundancy | scpstore.js stats.byValidity.CONFOUNDED ratio | YES (WO-2007) |

No new data sources required.

### Tone mapping (discrete, 3 states)

| DI range | toneLabel | Behavior |
|----------|-----------|----------|
| 0.0 – 0.35 | `NEUTRAL` | default path order, no additional risk emphasis |
| 0.35 – 0.70 | `COMPRESSED` | defensive paths rise, speculative paths dim |
| 0.70 – 1.0 | `CAUTIONARY` | fracture paths top-ranked, abbreviated framing |

### DisplayWeight — sort only, no engine mutation

```
DisplayWeight(path_i) = base_weight_i × (1 + DistressBias_i × DI)
```

Where `DistressBias_i` is a static tag on each path type:
- `DEFENSIVE` / `LIQUIDITY`: DistressBias = +1.0
- `NEUTRAL`: DistressBias = 0
- `SPECULATIVE` / `EXPANSION`: DistressBias = -0.8

Paths are sorted by DisplayWeight descending. No path is removed.

### RenderDirective schema

```js
{
  toneLabel:         'NEUTRAL' | 'COMPRESSED' | 'CAUTIONARY',
  sortedPathIds:     string[],   // same paths, different order
  riskHighlightLevel: 0 | 1 | 2  // 0=none, 1=moderate, 2=dominant
}
```

`sortedPathIds` contains exactly the same IDs as the input path list.
No path may be added or removed by this function.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/scprl.js` | NEW — computeDistressIndex(), computeDisplayWeights(), buildRenderDirective() | — |
| `src/components/analysis/targetpacket.jsx` | EXTEND — import scprl.js, apply RenderDirective to path sort order + tone label display | Path scoring, HP logic, convergence state untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — tone and path order are now explicitly derived from a formula, not implicit |
| Does this have a single dominant output? | YES — RenderDirective is the only output; all display decisions flow from it |
| Are all boundaries explicitly defined? | YES — hard layer is immutable; soft layer is the only surface; exclusions are enumerated |
| Can this be built without touching an undefined dependency? | YES — all 4 DI inputs exist in the codebase today (verified above) |
| Does this avoid increasing expressive flexibility in core? | YES — no new signal types, no new path types, no engine changes |

**Verdict: PASS — BUILD-READY.**

---

## 9. DEFINITION OF DONE

1. `grep -n "dispatchBatch\|surfacerouter.*write\|scpStore.*set"` in scprl.js
   returns zero production-write references.
2. DI test: inject volatilityScore=0.9, DFC=high → confirm DI > 0.70,
   toneLabel = `CAUTIONARY`.
3. Sort test: path list with mixed DEFENSIVE/SPECULATIVE types → confirm
   DEFENSIVE paths rank above SPECULATIVE when DI > 0.35.
4. Identity test: `sortedPathIds.length === inputPaths.length` always true.
5. Neutral test: DI = 0.1 → toneLabel = `NEUTRAL`, path order unchanged.
6. targetpacket.jsx: confirm tone label renders correctly for all 3 states.
7. Regression: HP qualification score unchanged before and after SCPRL mount.

---

## NOTES

**Hard/soft invariant (load-bearing):** This is not a constraint to be relaxed.
If a future WO proposes modifying path existence or signal scoring based on
distress, it must be filed separately and must explicitly declare the invariant
violation. SCPRL never crosses this line.

**Relationship to §20 (Direction Honesty):** SCPRL makes fracture visibility
regime-sensitive. Under CAUTIONARY tone, fracture paths are top-ranked — the
system speaks more loudly about downside when structural stress is high. This
is honest signal amplification, not fabrication.

**Relationship to WO-2013 (BAC):** SCPRL is the rendering consumer.
WO-2013 (BAC) governs how narrative influence is metered into the attention
routing layer. They are complementary but independent. SCPRL does not depend
on WO-2013 being built first.
