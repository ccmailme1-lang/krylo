# DEF-1373 — Temporal Alignment & Classifier Reachability, reconciled to the five locked states

Version: v0.5-DRAFT · 2026-10-08 · Founder rulings 1-5 applied (2026-10-08). For review. Not approved. No code until approved.

Supersedes, as a draft only, `spec-def-1373-temporal-alignment-classifier-v0.3.4-M-20261008.md`. Per the Founder's ruling (2026-10-08): the new T and V' feed the **existing five-state model**; the five locked states and colors of CLAUDE.md section 6 are unchanged; no MEDIUM or UNCERTAIN product state; HIGH CONVERGENCE keeps its meaning; INSUFFICIENT SIGNAL covers missing or invalid evidence.

## 1. What stays from v0.3.4-M (mathematics only)

- **T** (temporal alignment): from real source event dates (not ingestion time). `T = 1 - min(1, sigma_t / kappa)`, `kappa = W / sqrt(12)`, `W = 365 days`, `sigma_t` the population standard deviation of the event dates in days. Fewer than two valid event dates: `T = null` with reason `insufficient temporal evidence`; no default value.
- **V'** (confidence dispersion): `V' = min(1, sigma_c / 0.5)`, `sigma_c` the population standard deviation of the domain's signal confidences scaled 0..1. This corrects the old defect where `V > 0.8` could never be true (the maximum standard deviation of values in [0,1] is 0.5).
- **D and A** (magnitude inputs): kept as two separate inputs (Founder ruling 5: identical values in the current callers show redundancy, not proven semantic equivalence; do not merge here). Both are read through the declared scale: `config.magnitude_scale` is declared (`"0-1"` or `"0-100"`), fixed mapping, startup `CONFIGURATION_ERROR` when missing or unsupported, never inferred from the data.
- R1 (robust dispersion estimator) stays open, outside this patch.

## 2. Input validity

`D`, `A` and `V'` must be present, numeric, finite, within [0,1]. `T` must be either null (insufficient evidence) or numeric, finite, within [0,1]. Anything else is invalid.

## 3. Mapping to the five locked states (precedence as in the current classifier: 0, 1, 3, 4, 2)

| Order | State (CLAUDE.md section 6 color, unchanged) | Condition (proposed) | Notes |
|---|---|---|---|
| 0 | INSUFFICIENT SIGNAL `#3a3d4a` | telemetry confidence < 0.50, or `D < 0.1 and A < 0.1`, or `D`, `A` or `V'` invalid/missing | Invalid or missing core evidence lands here. The existing rule is unchanged. |
| 1 | LOW SIGNAL YIELD `#1A1A1A` | `D < 0.4 and A < 0.4` | Unchanged threshold (0.4). Not drawn on the MAP (removed 2026-10-08); still a state elsewhere. |
| 3 | TURBULENT CONVERGENCE `#007FFF` | `T` computed and `T < 0.50` and `V' >= 0.80` | Original temporal boundary kept (ruling 3); no magnitude gate (ruling 4). Now reachable (V' reaches 1). |
| 4 | HIGH CONVERGENCE `#8A2BE2` | `D >= 0.75 and A >= 0.75` and `T` computed and `T >= 0.65` and `V' <= 0.60` (ruling 2) | Meaning kept: strong, aligned, low volatility. |
| 2 | BUILDING CONVERGENCE `#66FF00` | everything else | Includes `T = null` with valid D, A and V' (ruling 1): the T-dependent states are unavailable, so at most BUILDING. This outcome means temporal alignment was NOT measured; it does not establish alignment. |

Motion and bloom per state: unchanged (CLAUDE.md section 6; MAP motion per KRYL-1378). No hatch overlay and no new indicator are introduced.

## 4. Boundary conditions

- Operators follow the existing classifier except where noted: `<` for LOW (`D < 0.4 and A < 0.4`), `>=` for HIGH's `D >= 0.75 and A >= 0.75`, `T >= 0.65`. For V' the approved threshold is inclusive (`V' >= 0.80` TURBULENT).
- Exactly `T = 0.50`: not TURBULENT (TURBULENT is `T < 0.50`). Exactly `T = 0.65`: HIGH-eligible. Exactly `V' = 0.80`: TURBULENT-eligible. Exactly `V' = 0.60`: HIGH-eligible. Exactly `D` and `A = 0.75`: HIGH-eligible; `D` and `A = 0.40`: not LOW; `D` and `A = 0.10`: not INSUFFICIENT. `0.50 <= T < 0.65` is BUILDING.
- `T = null`: never TURBULENT, never HIGH.

## 5. Founder rulings applied (2026-10-08)

1. T unavailable with valid D, A and V': **BUILDING** (not INSUFFICIENT SIGNAL). Reason: only one of 34 connectors (EDGAR 8-K) carries a real event date, so INSUFFICIENT SIGNAL would gray out most of the map.
2. HIGH CONVERGENCE: **V' <= 0.60** (sigma_c <= 0.30), subject to scale verification against the locked contract. CLAUDE.md section 6 lists state names, colors and motion only and gives no thresholds, so the scale cannot be checked against it; the original `V <= 0.6` sat on the standard-deviation scale.
3. TURBULENT temporal threshold: **T < 0.50**.
4. TURBULENT: **no magnitude gate**.
5. D and A: **kept separate**.

### Left open (a question, not decided)

- HIGH's temporal threshold: the original classifier used `T >= 0.6`; v0.3.4-M's approved threshold is 0.65. This draft uses 0.65. Keep 0.65 or return to 0.6?

## 6. Callers to change (after approval)

`convergenceclassifier.js` (inputs), `conemap.jsx`, `formationadapter.js` (constants `0.7`), `analysisfield.jsx` (constant `0.5`), `structurepanel.jsx` (MAP `mapExtras`, `T: 0.7`), plus a pure helper for T and V' and the magnitude-scale config check. Callers pass D and A separately (equal today).

## 7. Validation (reachability gate, Full Gate)

1. Fixed-scale conversion for both `magnitude_scale` values; startup rejection of missing or unsupported value.
2. Null, malformed, NaN, infinite, out-of-range values for D, A, V': each lands in INSUFFICIENT SIGNAL. T null with valid D, A, V' lands in BUILDING (ruling 1); an invalid (non-null) T is INSUFFICIENT SIGNAL.
3. Exact boundary values and values immediately above and below each threshold in section 4.
4. Each of the five states is reachable from measured inputs, including TURBULENT and HIGH.
5. Mathematical reference tests for T and V' (v0.3.4-M tables).
6. Real source event dates traced through T and the classifier for a live query (for example Sysco, Oracle).
7. Rendered MAP ring colors match section 6 for each state; legend lists only encodings the MAP draws.
8. Caller audit: no fixed T remains; magnitude scale consistent; D and A usages recorded (not merged).

## 8. Rollback

Revert the helper and the caller edits to the commit before the change (git); constants restored.

Acceptance: DEF-1373 is validated only when the behavior above is verified through the real path and the rendered MAP, not by synthetic tests alone.
