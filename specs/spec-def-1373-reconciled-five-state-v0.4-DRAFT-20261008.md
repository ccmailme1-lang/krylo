# DEF-1373 — Temporal Alignment & Classifier Reachability, reconciled to the five locked states

Version: v0.4-DRAFT · 2026-10-08 · for Founder review. Not approved. No code until approved.

Supersedes, as a draft only, `spec-def-1373-temporal-alignment-classifier-v0.3.4-M-20261008.md`. Per the Founder's ruling (2026-10-08): the new T and V' feed the **existing five-state model**; the five locked states and colors of CLAUDE.md section 6 are unchanged; no MEDIUM or UNCERTAIN product state; HIGH CONVERGENCE keeps its meaning; INSUFFICIENT SIGNAL covers missing or invalid evidence.

## 1. What stays from v0.3.4-M (mathematics only)

- **T** (temporal alignment): from real source event dates (not ingestion time). `T = 1 - min(1, sigma_t / kappa)`, `kappa = W / sqrt(12)`, `W = 365 days`, `sigma_t` the population standard deviation of the event dates in days. Fewer than two valid event dates: `T = null` with reason `insufficient temporal evidence`; no default value.
- **V'** (confidence dispersion): `V' = min(1, sigma_c / 0.5)`, `sigma_c` the population standard deviation of the domain's signal confidences scaled 0..1. This corrects the old defect where `V > 0.8` could never be true (the maximum standard deviation of values in [0,1] is 0.5).
- **M** (magnitude): one effective magnitude replaces the identical D and A inputs. `config.magnitude_scale` is declared (`"0-1"` or `"0-100"`), fixed mapping, startup `CONFIGURATION_ERROR` when missing or unsupported, never inferred from the data.
- R1 (robust dispersion estimator) stays open, outside this patch.

## 2. Input validity

`M` and `V'` must be present, numeric, finite, within [0,1]. `T` must be either null (insufficient evidence) or numeric, finite, within [0,1]. Anything else is invalid.

## 3. Mapping to the five locked states (precedence as in the current classifier: 0, 1, 3, 4, 2)

| Order | State (CLAUDE.md section 6 color, unchanged) | Condition (proposed) | Notes |
|---|---|---|---|
| 0 | INSUFFICIENT SIGNAL `#3a3d4a` | telemetry confidence < 0.50, or `M < 0.1`, or `M` invalid/missing, or `V'` invalid/missing | Missing or invalid evidence lands here, never in BUILDING. Current rule `D < 0.1 and A < 0.1` becomes `M < 0.1`. |
| 1 | LOW SIGNAL YIELD `#1A1A1A` | `M < 0.4` | Unchanged threshold (0.4). Not drawn on the MAP (removed 2026-10-08); still a state elsewhere. |
| 3 | TURBULENT CONVERGENCE `#007FFF` | `T` computed and `T < 0.65` and `V' >= 0.80` | Meaning kept: high volatility with poor temporal alignment. Now reachable (V' reaches 1). |
| 4 | HIGH CONVERGENCE `#8A2BE2` | `M >= 0.75` and `T` computed and `T >= 0.65` and `V' <= 0.60` | Meaning kept: strong, aligned, low volatility. |
| 2 | BUILDING CONVERGENCE `#66FF00` | everything else | Includes `T = null` with valid M and V' (T-dependent states unavailable, so at most BUILDING). |

Motion and bloom per state: unchanged (CLAUDE.md section 6; MAP motion per KRYL-1378). No hatch overlay and no new indicator are introduced.

## 4. Boundary conditions

- Operators follow the existing classifier except where noted: `<` for LOW (`M < 0.4`), `>=` for HIGH's `M >= 0.75`, `T >= 0.65`. For V' the approved threshold is inclusive (`V' >= 0.80` TURBULENT).
- Exactly `T = 0.65`: aligned (HIGH-eligible, not TURBULENT). Exactly `V' = 0.80`: TURBULENT-eligible. Exactly `V' = 0.60`: HIGH-eligible. Exactly `M = 0.75`: HIGH-eligible; `M = 0.40`: not LOW; `M = 0.10`: not INSUFFICIENT.
- `T = null`: never TURBULENT, never HIGH.

## 5. Items for Founder decision (values and meanings, not engineering choices)

1. **`T = null` handling.** Proposed: valid `M` and `V'` with `T = null` gives BUILDING (the T-dependent states are unavailable). Alternative: INSUFFICIENT SIGNAL. Which?
2. **HIGH and V'.** The old condition `V <= 0.6` was in the standard-deviation scale, where every possible value is at most 0.5, so it never restricted anything. Mapped literally, `V' <= 0.60` means `sigma_c <= 0.30`, which is a real restriction (stricter than before). Keep 0.60, or use another value, or drop V' from HIGH?
3. **TURBULENT's T threshold.** The original was `T < 0.5`; the approved single temporal threshold is 0.65. Proposed `T < 0.65`. Keep 0.65, or keep 0.5 for TURBULENT?
4. **Magnitude gate on TURBULENT.** v0.3.4-M gated TURBULENT on `M >= 0.75`; the current classifier has none beyond LOW. Proposed: no extra M gate (contract unchanged). Confirm.
5. **D and A.** Merged into one M (they are identical in every current caller; audit to confirm).

## 6. Callers to change (after approval)

`convergenceclassifier.js` (inputs), `conemap.jsx`, `formationadapter.js` (constants `0.7`), `analysisfield.jsx` (constant `0.5`), `structurepanel.jsx` (MAP `mapExtras`, `T: 0.7`), plus a pure helper for T and V' and the magnitude-scale config check.

## 7. Validation (reachability gate, Full Gate)

1. Fixed-scale conversion for both `magnitude_scale` values; startup rejection of missing or unsupported value.
2. Null, malformed, NaN, infinite, out-of-range values for T, V', M: each lands in INSUFFICIENT SIGNAL (T null excepted per decision 1).
3. Exact boundary values and values immediately above and below each threshold in section 4.
4. Each of the five states is reachable from measured inputs, including TURBULENT and HIGH.
5. Mathematical reference tests for T and V' (v0.3.4-M tables).
6. Real source event dates traced through T and the classifier for a live query (for example Sysco, Oracle).
7. Rendered MAP ring colors match section 6 for each state; legend lists only encodings the MAP draws.
8. Caller audit: no fixed T remains; magnitude scale consistent; D and A equivalence confirmed.

## 8. Rollback

Revert the helper and the caller edits to the commit before the change (git); constants restored.

Acceptance: DEF-1373 is validated only when the behavior above is verified through the real path and the rendered MAP, not by synthetic tests alone.
