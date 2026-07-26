# KRYL-1118A — CONVERGENCE Report Design Spec

STATUS: Built (analysisfield.jsx). Retroactive spec — this lens was built after an in-chat
doctrine explanation but before a written spec file existed. Written now to bring it into the
same documentation standard as OWNERSHIP/DRIFT/PRESSURE/FLOW.

## 1. What CONVERGENCE measures

Unlike OWNERSHIP (formation), DRIFT (relationship divergence), SIGNAL (raw intensity), PRESSURE
(constraint ratio), or FLOW (directed movement), CONVERGENCE is a **state classifier**. It answers:
**"Where are macro structural forces aligning?"** — a discrete classification, not a continuous
score, not a formation, not a relationship between two things.

CONVERGENCE is the one lens with a real, ALREADY-WORKING classifier: `classifyConvergenceState()`
(convergenceclassifier.js, WO-1126A.v2) — the same function that colors the cones today. It takes
a vector `{D, V, A, T}` (Density, Volatility, Alignment, Temporal) plus a telemetry-confidence gate
and returns one of five states. Every output is stamped `stateType: PROJECTION` (DEF-1863) — never
treated as an observed, closed outcome.

## 2. Real data sources and the one honest simplification

Vector construction mirrors `scoutingreportproducer.js`'s `coneConvergenceVector()` exactly, so a
domain's state here can never disagree with its own cone:

- `D = A = domainStats.mag` (leverageN, the same simplification the real cone code already makes)
- `V` = the REAL standard deviation of that domain's observed confidence readings (not invented —
  a genuine statistical property of already-observed signals; 0 for a single reading, honestly)
- `T = 0.5` (CONE_VECTOR_T, matches conemap.jsx's pin)
- `telemetryConfidence = 0.7` (CONE_TELEMETRY_CONFIDENCE, matches conemap.jsx's pin)

## 3. Five states and §6 locked color tokens

| State | Trigger | §6 token (locked, not new paint) |
|---|---|---|
| INSUFFICIENT SIGNAL | confidence < 0.50 or D/A both near-zero | `#3a3d4a` muted slate |
| LOW SIGNAL YIELD | D < 0.4 and A < 0.4 | `#1a1a1a` dark neutral |
| BUILDING CONVERGENCE | standard accumulation | `#66FF00` lime |
| TURBULENT CONVERGENCE | high volatility, poor temporal alignment | `#007FFF` signal blue |
| HIGH CONVERGENCE | D/A ≥0.75, T ≥0.6, V ≤0.6 | `#8A2BE2` unicorn purple |

CONVERGENCE is the **one lens where color is semantic doctrine, not decoration** — §6's
CONVERGENCE STATE COLOR + MOTION SEMANTICS already assigns this exact mapping. Reusing it here is
citing existing doctrine, not inventing new color (§15). Used sparingly — small dot markers and
labels only, never full-card fills (matches §6's "purple must remain rare" rule).

## 4. Macro framing (Founder correction, locked)

The field is the subject, never the domain as an individually-scored entity:
- ❌ "Technology has high convergence."
- ✅ "The macro technology domain contributes to the current convergence state."

This keeps CONVERGENCE consistent with the other five lenses' macro table and protects the
Palantir/Bloomberg positioning (Krylo is not a CB-Insights-style per-entity scorecard).

## 5. Report shape (7 sections)

```
01 Macro State Overview   — dominant field state (color dot + label) + PROJECTION/DEF-1863 caveat, early
02 Convergence Thesis     — derived: dominant state + real contributing domain names, not authored
03 Domain State Landscape — all 6 domains, dot rating + real classified state + §6 color dot, macro-framed
04 State Distribution     — 5-state tally across the field (real dot count per state, not a ranking)
05 Convergence Drivers    — field-average D/V/A/T bars (components exposed, not the formula as hero)
06 Temporal Persistence   — real hysteresis constant (PERSISTENCE_REQUIRED=3, convergenceclassifier.js)
07 Projection Boundary    — SUPPORTED (vectors, classification) / WITHHELD (future outcome) — DEF-1863
```

## 6. Deferred (not built)

**Cross-Domain Alignment** (06 in the originally proposed 8-section version) — a reinforcement/
tension diagram between domain pairs — needs pairwise comparison logic that isn't grounded yet.
Not fabricated; explicitly deferred rather than force-built.

## 7. Visual system

Shared dual-voice typography, hairline cards, `zoom: 0.9`, dark §6 base palette — same as every
other lens. The only lens permitted to use additional locked color tokens beyond lime, and only
because those tokens are the classifier's own semantic language, not a new design choice.
