# SPEC — Conflict Detection in Observe Candidate Selection

**Status:** ABANDONED (2026-08-23). Built without a spec/ticket first — code was written directly
into `observestoryview.jsx`, then explicitly reversed and fully removed same session. Correct
sequence per Founder: complete the Candidate Vocabulary Compatibility discovery first (test the
remaining reachable candidate/value pairs, not just the two found so far), then have the Founder
author the complete opposition relation 𝒪 for what discovery finds actually reachable, then define
the Salience Adjudication Contract, then build the full capability — not a two-entry placeholder
promoted into production behavior. This document is kept as the record of the abandoned attempt,
not as a spec to build from. `git diff` confirms the code is back to KRYL-1206-only state.

## PROBLEM

KRYL-1205 proved the Observe candidate selector (`stateHash(domains) % candidates.length`) is
decoupled from candidate significance and can silently pick one of two candidates whose claims
actively contradict each other. The adjudication-eligibility and candidate-vocabulary-compatibility
inquiries (both discovery-complete) established a real, tested three-valued compatibility function
`κ(cᵢ,cⱼ) ∈ {Comparable, Conflict, Insufficient}` and verified exactly two authored opposition
rules from controlled computation (not invented):
- `(RELATIONSHIP_STATE, CONVERGING) ⊗ OPPOSITE_DIRECTION` → Conflict
- `(RELATIONSHIP_STATE, DIVERGING) ⊗ EMERGING_CLOSING_GAP` → Conflict

No ranking/salience mechanism has been authorized anywhere in this chain — that remains a separate,
future, unauthorized question (normalization across incommensurable units, per the salience
adjudication inquiry, is explicitly unresolved).

## SOLUTION

Wire `κ` into `buildNarrative()` (`observestoryview.jsx`) using only the two verified opposition
rules. Before falling back to the existing `stateHash` selector, check every pair of currently
eligible candidates for `overlap(sourceInputs)` + membership in the authored `OPPOSITION_TABLE`.
If any pair classifies as Conflict, surface that explicitly — a new narrative state naming both
readings as real and unreconciled — instead of silently picking one. If no conflict is found among
current candidates, selection behavior is **completely unchanged**: same `stateHash` selector, same
candidates, same output as before this change for every non-conflicting case.

**Explicitly not built:** any ranking among Comparable candidates, any normalization scheme, any
extension of `OPPOSITION_TABLE` beyond the two verified entries, any reconciliation mechanism that
resolves a conflict rather than naming it.

## COMPONENTS

- `OPPOSITION_TABLE` — frozen array, exactly the 2 verified `{typeA, valueA, typeB}` rules. Adding
  entries requires the same controlled-computation verification used for these two (documented in
  the code comment directly above the table).
- `overlaps(a, b)` — pure function, `sourceInputs` intersection.
- `opposes(a, b)` — pure function, table lookup, symmetric.
- `classifyPair(a, b)` — returns `'Conflict'` or `'Insufficient'`. Never returns `'Comparable'` in
  this implementation — no ranking exists yet, so there's nothing a `Comparable` verdict would be
  used for; the function only needs to gate the conflict check, not implement the full κ contract.
- `buildNarrative()` — before the existing selection line, iterates all candidate pairs; on the
  first Conflict found, returns a new narrative shape naming both readings; otherwise falls through
  to the original, unmodified selection logic.
- New narrative state: `headlinePre: 'The signal is', emphasis: 'conflicting', ...` — quotes both
  conflicting candidates' actual headline text, `next: null` (no secondary candidate shown when the
  primary read is itself unresolved).

## VALIDATION

- [x] Syntax valid (`esbuild` transform succeeds clean).
- [x] Functional test, `CONVERGING` + `OPPOSITE_DIRECTION` case (same inputs as the original
  discovery reproduction): conflict narrative returned, not a silently hash-picked single reading.
- [x] Functional test, `DIVERGING` + `EMERGING_CLOSING_GAP` case: conflict narrative returned.
- [x] Functional test, `DIVERGING`/`WEAKENING` + `OPPOSITE_DIRECTION` (verified non-conflicting
  pairs from the discovery record): **no** conflict narrative — falls through to unchanged
  `stateHash` selection, confirming no false positives on the already-tested non-conflict cases.
- [x] Functional test, no-overlap case (disjoint `sourceInputs`, e.g. the 4-domain H1 case):
  no conflict narrative — confirms `overlap` gate is enforced, not just table membership.
- [x] Functional test, ordinary single-candidate and no-conflict-among-multiple-candidates cases:
  output byte-identical to pre-change behavior — confirms zero regression on the non-conflict path.

## ROLLBACK

Single-file, additive-before-existing-logic change to `observestoryview.jsx`. Revert commit if
needed. No state, no migration.

## GUIDELINES

Detection only — names a real disagreement between two grounded readings, asserts nothing about
which is true, predicts nothing. Stays inside "we don't predict, we detect." Does not resolve the
underlying source-level disagreement between `formationrelationship.js`'s `deriveState()` and raw
velocity-sign comparison — that reconciliation, if ever pursued, is separate, future, unauthorized
work.
