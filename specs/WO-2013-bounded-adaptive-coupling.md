# WO HARDENING — Bounded Adaptive Coupling
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2013 — Bounded Adaptive Coupling (BAC)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/baccoupling.js · src/engine/reconlayer.js
  (read-only consumers: surfacerouter.js, scpstore.js, timingproxy.js)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Compute a bounded scalar coupling value C that controls how much
narrative pressure (NarrativeVector) is permitted to influence attention routing
(what the Recon Layer investigates next) — without touching truth inference,
signal scoring, or path topology.

**Output:** A single coupling scalar `C ∈ [C_min, C_max]` — consumed by
reconlayer.js to weight exploration priority. No learning loop, no optimization,
no regime classifier.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- S (Regime Stability): derived from convergenceclassifier.js volatilityScore — read-only
- D (Narrative Drift): distance(NV_t, NV_{t-1}) from surfacerouter.js — read-only
- H (System Entropy): signal distribution spread from scpstore.js stats — read-only
- R (Cross-Layer Correlation): corr(NV, attention allocation) — read-only,
  computed from last N=5 routing decisions stored in reconlayer.js internal ring buffer

**Output contract:**
- `C`: scalar ∈ [0.1, 0.6] — coupling budget passed to reconlayer.js
- No other outputs. No side effects.

**Explicit exclusions:**
- No writes to Truth Engine, convergenceclassifier.js, or metricsengine.js
- No modification of NarrativeVector itself
- No learning loop, reward function, or coefficient optimization
- No regime labeling or regime transition detection
- No external API calls
- No modification of SCP schema or scpstore.js content

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  NOTE: BAC reads NarrativeVector drift only. It does not alter signal schema
  or define what narrative means. It measures distance between two NV snapshots.

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: C is an attention routing weight, not a recommendation or path score.
  Reconlayer.js uses C to prioritize exploration order only.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: No path from baccoupling.js back to convergenceclassifier.js or
  metricsengine.js exists. C only controls exploration priority in reconlayer.js.

**Drift notes:** The audit of the prior ACPE design correctly identified that
a learned coupling policy contaminates the Truth Engine indirectly via
attention routing. BAC prevents this by using static weights and hard clamps.
No optimization loop means no feedback path into truth inference.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The Recon Layer (WO-2007) currently explores all signal
candidates with uniform priority. Under high narrative stress, the system
wastes epistemic budget on already-known paths. BAC meters narrative influence
as a bounded routing signal — exploration concentrates on uncertain, novel,
contradictory candidates precisely when the narrative is loudest. This is
the anti-conviction-lock mechanism the system needs.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a bounded coupling
scalar C — a number between 0.1 and 0.6 that tells the Recon Layer how much
weight to give narrative pressure when deciding what to investigate next,
with hard limits that prevent narrative from dominating or being ignored."**

---

## 6. FORMULA / CONTRACT

### Input normalization (all inputs must be 0–1 before use)

| Signal | Raw source | Normalization |
|--------|-----------|---------------|
| S (stability) | 1 - convergenceclassifier volatilityScore | already 0–1 |
| D (drift) | cosine distance(NV_t, NV_{t-1}) | already 0–1 |
| H (entropy) | Shannon entropy of domain pressure distribution | normalize by log(6) — 6 domains |
| R (correlation) | Pearson(NV_last5, attentionWeights_last5) | already -1 to 1, clamp to 0–1 |

### BAC formula (locked)

```
C = clamp(
  w1 · (1 - S)
+ w2 · D
+ w3 · H
- w4 · R,
  C_min,
  C_max
)
```

Default weights (static, manually calibrated):
- w1 = 0.30  (instability allows more narrative influence)
- w2 = 0.25  (drift allows more exploration)
- w3 = 0.25  (entropy allows more exploration)
- w4 = 0.20  (correlation forcibly reduces coupling — anti-bias lock)

Bounds:
- C_min = 0.10  (narrative never fully silenced)
- C_max = 0.60  (narrative never dominates — Truth Engine retains 40% floor)

### Anti-bias lock (hard rule)

When R > 0.75 (narrative and attention are too correlated):
```
C = C_min  // force floor regardless of other inputs
```

This is the "conviction lock-in prevention" mechanism. It overrides the
formula when the system is at risk of echo-chamber collapse.

### Ring buffer for R computation

reconlayer.js maintains an internal ring buffer of length N=5:
- `nv_history[5]`: last 5 NarrativeVector snapshots
- `attention_history[5]`: last 5 attention weight vectors

R is computed fresh each cycle from these buffers. Buffer is write-isolated
from all external consumers — no external read access.

### C consumer contract (reconlayer.js)

```
explorationWeight(candidate_i) = base_weight_i + C · narrativePressure_i
```

Where `narrativePressure_i` is the narrative alignment score for candidate i
(already computed in reconlayer.js, not new).

C = 0.1 → near-uniform exploration (narrative barely heard)
C = 0.6 → narrative steers 60% of exploration priority

Truth inference unchanged in either case.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/baccoupling.js` | NEW — computeS(), computeD(), computeH(), computeR(), computeC() | — |
| `src/engine/reconlayer.js` | EXTEND — import baccoupling.js, apply C to explorationWeight per candidate; add ring buffer for NV + attention history | SCP schema, epistemic budget, causal validity gate untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — coupling is now a formula, not implicit uniform weighting |
| Does this have a single dominant output? | YES — C is the only output; one number controls narrative influence |
| Are all boundaries explicitly defined? | YES — C_min/C_max are numeric; anti-bias lock is a hard rule; all inputs sourced from existing files |
| Can this be built without touching an undefined dependency? | YES — all 4 inputs exist in the codebase (verified in §6); ring buffer is internal to reconlayer.js |
| Does this avoid increasing expressive flexibility in core? | YES — no new signal types, no new path logic, no Truth Engine changes |

**Verdict: PASS — BUILD-READY.**

**Critical dependency:** WO-2007 (Recon Layer) must be mounted and operational.
reconlayer.js must exist before baccoupling.js can be wired. WO-2007 is COMPLETE (SHA: ddb29b5).

---

## 9. DEFINITION OF DONE

1. `grep -n "convergenceclassifier\|metricsengine\|dispatchBatch"` in baccoupling.js
   returns zero write references.
2. Anti-bias lock test: inject R = 0.80 → confirm C = C_min = 0.10 regardless of S/D/H.
3. Formula bounds test: inject extreme inputs (all max) → confirm C ≤ 0.60.
4. Formula bounds test: inject all zeros → confirm C ≥ 0.10.
5. High instability test: S = 0.1, D = 0.9, H = 0.8, R = 0.1 → C should approach C_max.
6. Stability test: S = 0.9, D = 0.1, H = 0.1, R = 0.7 → C should approach C_min.
7. reconlayer.js: confirm explorationWeight formula uses C correctly.
8. Ring buffer test: after 3 cycles, confirm R is computed from actual history,
   not defaulting to 0.

---

## NOTES

**Why not learned weights?** The audit of the ACPE design (the precursor to this WO)
correctly identified that learned coupling requires: regime labeling, reward signal
definition, ground-truth calibration, and optimization infrastructure — none of which
exist. BAC uses static weights calibrated by inspection. Recalibration is manual and
offline, not autonomous.

**Why C_max = 0.60?** The Truth Engine must retain at least 40% of attention routing
authority at all times. Narrative is an exploration allocator, not a truth signal.
If narrative could dominate (C → 1.0), it would eventually steer the Recon Layer
away from structurally valid but narratively unpopular paths — the opposite of
"finding advantageous positions before they become obvious" (§19).

**Relationship to WO-2012 (SCPRL):** WO-2013 governs the Recon Layer's internal
exploration routing. WO-2012 governs what the user sees in targetpacket.jsx.
They operate on different layers and do not depend on each other.

**Relationship to §19 (Closed-Loop Leverage Principle):** BAC is an upstream
anti-bias mechanism. It ensures the Recon Layer explores non-obvious paths even
when the narrative pushes toward consensus — preserving the "before it becomes
obvious" mission at the exploration layer.
