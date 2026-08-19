# SPEC — Relationship Validator: ValidationProfile Composition Contract
Date: 2026-08-18
Status: CONTRACT DRAFT. Defines how eight operator results compose into `overall_status`, using
the Class A/B/C classification locked in `SPEC-relationship-validator-operators.md` §9.
Implementation, adapters, and orchestration remain out of scope.

---

## 0. Inputs

Per the common contract (`SPEC-relationship-validator-operator-contract.md` §8), the profile
already has: `candidate_id`, `operators: map[OperatorName → OperatorResult]`,
`competing_notes`, `applicability_summary`. This document defines only `overall_status`.

## 1. Class-aware composition rule

Class A (Temporal, Structural, Independence, Stability) can falsify. Class B (Lag, Recurrence,
Information) can only add or withhold support. Class C (Alternatives) can only surface
competition, never falsify.

**Six-stage precedence, evaluated in strict order — first matching stage wins:**

1. **Applicability determination.** Determine which of the eight operators are applicable;
   record every `N/A` and its reason in `applicability_summary`. Precondition for everything
   below, not itself status-producing.
2. **Class A contradiction.** Any applicable Class A operator at `FAIL` → `CONTRADICTED`.
   Dominant — fires regardless of what Alternatives or any Class B operator says. Takes
   precedence over competing-explanation reporting; the `CONFLICT` detail is not lost, it just
   doesn't drive `overall_status` once something has actually failed.
3. **No evaluable Class A evidence.** Every Class A operator is `N/A` (none of the four could
   even run — no evidence to test against, not merely inconclusive) → `UNDETERMINED`. Nothing
   was meaningfully tested; claiming `SUPPORTED` here would fabricate confidence from silence
   (§22 — absence is not support). **Not the same state as stage 4** — this is "nothing ran," not
   "ran and came back inconclusive."
4. **Class A inconclusive.** No Class A `FAIL`, and at least one applicable Class A operator
   ran and returned `UNDETERMINED` → `UNDETERMINED`. Same resulting value as stage 3, distinct
   reason (recorded per-operator, not collapsed) — `overall_status` cannot become `SUPPORTED`
   merely because Class B passed; Class B cannot overturn Class A uncertainty.
5. **Class A supported, coverage-aware.** No `FAIL`, no `UNDETERMINED` — every Class A operator
   that ran returned `PASS`, at least one Class A operator actually ran:
   - **All four Class A operators ran and `PASS`ed** (full coverage) →
     `SUPPORTED_WITH_COMPETING_EXPLANATION` if Alternatives = `CONFLICT`, else `SUPPORTED`.
   - **Some Class A operators `PASS`ed, the rest are legitimately `N/A`** (partial coverage —
     at least one ran, at least one didn't) → `PARTIALLY_SUPPORTED`, regardless of Alternatives'
     state. (Kept to five status values rather than adding a sixth
     `PARTIALLY_SUPPORTED_WITH_COMPETING_EXPLANATION` compound — the `CONFLICT` detail stays
     fully visible in `operators`/`competing_notes` either way; §2's rule that per-operator
     detail is always shown alongside the composite already covers it.)
6. **Class B.** Never appears above this line. Lag/Recurrence/Information results never change
   `overall_status` under any combination, and **cannot independently promote the candidate to
   an accepted/admitted relationship** (see §1a) — they attach to the profile as supporting
   detail only. Deliberately stronger than "lesser consequence than Class A": zero consequence
   on `overall_status` is the safest reading of §9's rule and the one least likely to let Class B
   quietly reintroduce a weighted-score pattern through the back door. The resulting asymmetry is
   the point: **evidence can accumulate support, but support cannot manufacture certainty.**

This is the doc's own originally-proposed status vocabulary, now safe to lock because it's
routed through the Class A/B/C split, an explicit six-stage priority order, and a real
distinction between "nothing evaluable" and "evaluated but inconclusive" — all three of which
the earlier draft was correctly flagged for lacking.

## 1a. Report, not admission decision

**The `ValidationProfile` is a report about which tests the candidate survived. It is not an
admission decision.** `overall_status` never determines whether a candidate enters, stays in, or
is removed from RKM/the active graph — that is a different question, governed by whatever
system eventually handles admission (see the open `RelationshipProposal`/`AdmissionDecision`
item in the common contract §2 — still unimplemented, still not reconciled, and this document
does not change that). A `CONTRADICTED` profile does not delete or reject `R_c`; it is evidence
a downstream consumer may act on, through its own separate authority, not an action the
validator takes itself. Conflating the two would smuggle admission-style authority into a
subsystem whose entire premise is that it has none (common contract §1).

## 2. `overall_status` enum

`SUPPORTED | PARTIALLY_SUPPORTED | SUPPORTED_WITH_COMPETING_EXPLANATION | CONTRADICTED |
UNDETERMINED`

No scalar score. No weighted average. Per-operator states remain visible in `operators` alongside
`overall_status` always — the composite never replaces the detail.

**Naming note:** `UNDETERMINED` is deliberately reused from the per-operator state vocabulary
(common contract §5) — it means the same thing at both scopes ("ran/considered, didn't clear the
bar to make a claim"), scope is disambiguated by context (`OperatorResult.state` vs.
`ValidationProfile.overall_status`), not by inventing a second word for one concept.

**What this enum explicitly cannot say:** `ADMITTED`, `ACCEPTED`, `CAUSAL`, `PROMOTED`, or any
other value implying a transition in the candidate's ontological status. Those require a
separate, explicitly-defined downstream contract (see §1a) — none exists yet, and this document
does not create one by implication.

## 3. Prohibitions (restated, binding here too)

Composition may not mutate, strengthen, or promote `R_c`; may not treat Class B/C signals as
Class A-equivalent; may not collapse `CONFLICT` into `CONTRADICTED`; may not collapse "nothing
evaluable" (stage 3) into "evaluated but inconclusive" (stage 4) even though both currently
resolve to the same `overall_status` value — the per-operator record must still distinguish them.
