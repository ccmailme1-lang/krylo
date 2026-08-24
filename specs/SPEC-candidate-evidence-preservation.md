# SPEC — Candidate Evidence Preservation (Legibility Candidate Contract)

**Status:** IMPLEMENTED (2026-08-23), explicit go given by Founder. Validated — see §Validation
Results below. This is WO-A of two — WO-B (Salience Adjudication) is a separate, later ticket,
not authorized by this spec.

## PROBLEM

Per KRYL-1205 (§5.4/§5.5 of `specs/SPEC-perceptual-realism-persistence-legibility-salience.md`):
`observeStoryView.jsx`'s `buildCandidates()` computes a real quantitative eligibility margin for
each candidate it generates — a volatility delta, a velocity spread, a magnitude gap — uses that
number once to decide whether the candidate qualifies, then discards it. Every surviving candidate
object collapses to `{headlinePre, emphasis, headlinePost, paragraph}` — four plain strings, no
trace of the number that determined eligibility. Confirmed by controlled computation (KRYL-1205
§5.5): the current selector (`stateHash(domains) % candidates.length`) has no numeric significance
to consume even if it wanted to, and a salience-irrelevant perturbation was shown to flip the
selected output via hash parity alone.

## SOLUTION

Extend the candidate object at each of the 6 existing generation sites in `buildCandidates()` with
an additive `evidence` field carrying the number that already determined eligibility — nothing
computed that doesn't already exist in the current code, nothing invented. No change to selection
logic. No composite/aggregate score.

**Uniform `evidence` shape**, added to every candidate:
```
evidence: {
  type,            // e.g. 'VOLATILITY_STANDOUT', 'OPPOSITE_DIRECTION', 'STABLE_GROUP', etc.
  sourceInputs,     // which domain(s)/field(s) the metric was computed from
  derivedMetric,    // name of the computed quantity, e.g. 'volatilityMarginOverAverage'
  measuredValue,    // the actual computed number
  threshold,        // the hardcoded gate value already in the code (0.15, 6, 8, or categorical)
  margin,           // measuredValue - threshold (numeric candidates only; null for categorical gates)
}
```

**Per-site mapping (from KRYL-1205 §5.4's inventory, reused verbatim):**
- Stable-group / stable-solo: `sourceInputs` = stable domain labels; `derivedMetric` =
  `leaderDeviationFrom50`; `threshold` = categorical (`stable.length >= 2` / `=== 1`), `margin: null`.
- Relationship state: `sourceInputs` = `topRel.sourceFormationId/targetFormationId`; `derivedMetric`
  = `relationshipState` (categorical, from `deriveState()`); `threshold`/`margin`: null (positional
  eligibility, not numeric — flagged as-is, not silently converted into a fake number).
- Volatility standout: `derivedMetric` = `volatilityMarginOverAverage`; `measuredValue` =
  `mostVolatile.volatility - avgVol`; `threshold` = `0.15`; `margin` = `measuredValue - 0.15`.
- Opposite-direction pair: `derivedMetric` = `oppositeVelocitySpread`; `measuredValue` =
  `bestSpread`; `threshold` = `6`; `margin` = `bestSpread - 6`.
- Emerging closing gap: `derivedMetric` = `magnitudeGapToConfirmed`; `measuredValue` =
  `closestGap`; `threshold` = `8`; `margin` = `8 - closestGap` (inverted — smaller gap is the
  qualifying direction, so margin should stay positive-when-qualifying like the others; exact sign
  convention is a Founder call at implementation time, not decided here).

## Known Limitation / Boundary

**Provenance boundary:** Candidate evidence preservation is limited to `sourceInputs` actually
available at the `buildCandidates()` boundary. The current Observe candidate path does not carry
deeper evidence provenance (e.g. `evidenceRef`) from the Path B Formation pipeline. Adding such
provenance would require bridging the existing Observe legibility path to upstream evidence
structures outside this contract and is explicitly out of scope for KRYL-1206. No provenance field
is introduced without an authoritative source.

KRYL-1206 preserves what the current candidate generator actually knows. It does not retrofit the
generator with provenance it doesn't currently receive.

## COMPONENTS

- Edit `buildCandidates()` in `src/components/surface/observestoryview.jsx` only — add the
  `evidence` field to each of the 6 `candidates.push(...)` call sites.
- No change to `stateHash()`, `buildNarrative()`'s selection (`idx = stateHash(...) %
  candidates.length`), or any rendering code.
- No new file, no new module, no new state.

## VALIDATION

- Grep-confirmed: all 6 candidate push sites carry the new `evidence` field.
- Re-run KRYL-1205 §5.5's exact Node harness (already written, in the session scratchpad) against
  the changed code: confirm the *selected* candidate's `type`/text output is byte-identical to
  pre-change behavior for the same inputs — this WO changes representation only, not what's shown.
- Confirm no `evidence` field anywhere is a synthetic/invented value — every field must trace to a
  variable already computed in the existing eligibility check in the current code.
- Confirm no composite/aggregate score exists in the diff (§18 Orthogonal Axis Integrity — margin,
  measuredValue, and threshold stay as separate fields, never combined into one number here).

## Validation Results (2026-08-23)

- [x] `evidence: {` literal count = 6, matching the 6 code-level candidate-generation sites
  (grep-confirmed).
- [x] Syntax valid — `esbuild` transform of the changed file succeeds clean.
- [x] Functional test — `buildCandidates()` extracted and run against real sample data
  (`{Capital: mag80/vol0.9, Labor: mag20/vol0.2}`, the same inputs as KRYL-1205 §5.5's Case 1):
  `headlinePre`/`emphasis` output is byte-identical to pre-change behavior; evidence values match
  KRYL-1205's own computed numbers exactly (volatility margin 0.35, opposite-direction spread 18).
- [x] No synthetic values — every `evidence` field traces to a variable already computed in the
  existing eligibility check (verified by direct diff review).
- [x] No composite score — `measuredValue`/`threshold`/`margin` remain separate fields everywhere.
- [x] Selection logic (`stateHash`, `buildNarrative`'s `idx`/`picked`/`next`) untouched — confirmed
  by diff; the change is additive to candidate objects only.

## ROLLBACK

Single-file, additive change. Revert commit if needed — no state, no migration, no data at rest.

## GUIDELINES

- This is representation enrichment only — the "B" half of KRYL-1205's "C" classification. It does
  **not** implement salience adjudication; that's WO-B, a separate ticket, out of scope here.
- Does not touch persistence — KRYL-1205's P1 finding (persistence unused by Observe) is explicitly
  not in scope for this WO, per direct Founder instruction against scope creep.
- Positioning: purely representational, no forecasting, no scoring — stays inside "We don't
  predict, we detect."
