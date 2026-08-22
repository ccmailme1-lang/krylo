# SPEC — KRYL-1196: Validation Harness Contract (v3)

Status: DRAFT — Bottle Test does not pass yet (see VALIDATION). Not build-ready. No build
authorization has been given.

Supersedes v2 (which assumed company-seed selection). Dependencies now resolved: KRYL-1194
(substrate audit), KRYL-1198 (pipeline reconciliation), KRYL-1195 (structural adapter),
KRYL-1200 (seed-selection adequacy — negative finding, superseded in method not in its
underlying fact), KRYL-1201 (two-tier entity identity, committed `91c8104`).

**What changed from v2:** v2's model was Case → Company Seed → `buildStructure(seedId)` →
Formation. That model is retired. The company-seed collapse KRYL-1200 found (0/13 cases
discriminable, 13/13 tied) is not fixed by this rewrite — it's avoided, because this
contract never selects a company at all. The new model is Case → Frozen Evidence
Snapshot → Evidence-Discovered Entities (Tier 2, KRYL-1201) → Typed Relationships →
Whole-Σ Provenance Gate → Structural Recognition.

## PROBLEM

Real relational evidence exists (986 filings / 724 subjects / 98 pairs, verified live
against EDGAR for 2024-07-23 to 2024-08-22) and can now reach identity resolution
(KRYL-1201's Tier 2 admission). Nothing yet runs this end-to-end per case, or honestly
reports what a case's evidence scope actually is when multiple cases have no
non-outcome-conditioned way to be told apart.

## SOLUTION

**1. Frozen evidence snapshot, declared explicitly, not computed from `Date.now()`.**
`secownershipconnector.js`'s `runSecOwnershipSync({ from, to })` already accepts explicit
overrides (confirmed by direct read of its signature — no code change needed for this).
KRYL-1196 declares:

> **Validation Evidence Snapshot: `from = 2024-07-23`, `to = 2024-08-22`.**

Reproducible, real, non-empty (verified directly against the live EDGAR API this
session). Production connector behavior (`Date.now() - 30d`) is untouched — the frozen
window is a harness-level parameter, not a connector change.

**2. No company is ever selected.** The harness runs the connector once against the
frozen window. Whatever CIKs the real filings contain get admitted via KRYL-1201's Tier
2 path automatically, as a byproduct of the connector's normal operation — not chosen,
not filtered by domain, not filtered by registry membership.

**3. Case eligibility, unchanged from the connector-shape audit already done this
session:** only cases whose `canonical_domains` include `OWNERSHIP` can possibly connect
to this evidence — 14, 15, 17, 18, 53, 70, 82. The other 6 (20, 27, 49, 68, 71, 98) are
`RELATION_BLOCKED` regardless of window or identity tier, because this connector only
ever produces `OWNERSHIP`-typed edges. Unchanged fact, restated because it survives this
rewrite.

**4. The unresolved gap, named explicitly rather than smoothed over: none of the 7
eligible cases' metadata maps to any real attribute of the evidence (no SIC code, no
industry field, nothing) that would let U₀ split into 7 differentiated per-case scopes
without inventing a criterion after seeing the data — the same trap KRYL-1200 ruled out
for company selection applies equally to any other post-hoc scope rule.**

**Governing invariant:** a case does not require a unique evidence scope. Scope
differentiation is permitted only when justified by pre-registered evidence attributes.
In the absence of such attributes, cases may share an evidence substrate and must be
evaluated independently against that shared substrate. `SHARED_SCOPE` is an *observed
condition of the evidence*, not a resolution to the lack of a case-specific scope — it
describes what the data is, it is not a design choice standing in for differentiation
that should have existed.

**Same evidence ≠ same hypothesis ≠ same experiment.** `structuralrecognition.js` takes
only a graph — no case identifier, no hypothesis, nothing case-specific ever enters that
function (verified directly: `recognizeStructure`/`recognizeFormation` take a
`RelationshipSet` plus generic z-threshold/seed opts, full stop). So when 7 cases share
a `RelationshipSet`, the `DETERMINATION` computation is necessarily identical across all
7 — that's a mechanical fact, not a shortcut being taken. Independence lives entirely in
**hypothesis evaluation** (`CASE_EVALUATED`, below), not in computation: each case's own
`falsifiable_test`/`verification`/`baseline` must be checked against the (possibly
shared) `DETERMINATION` separately, case by case. The harness must never copy one case's
`CASE_EVALUATED` result to another merely because they share a `SHARED_SCOPE` group —
same evidence and same machine output do not imply the same hypothesis verdict.

## COMPONENTS

- **Snapshot runner** — calls `runSecOwnershipSync({ from: '2024-07-23', to: '2024-08-22' })`
  once. No TBD.
- **Pipeline chain** — unchanged from KRYL-1195/1198: `TYPED_EDGES` →
  `gwrealiser.realiseSnapshot` → `sigmaengine.buildStructure` →
  `structuralinputadapter.toRelationshipSet` → `structuralrecognition.recognizeStructure`.
  No TBD.
- **Result classifier** — per-case verdict from the taxonomy: `SUBSTRATE_BLOCKED` /
  `RELATION_BLOCKED` / `PROVENANCE_BLOCKED` / `IDENTITY_BLOCKED` / `EXECUTED` /
  `DETERMINATION` (the machine output — computed once per distinct `RelationshipSet`,
  never per case) / `SHARED_SCOPE` (annotation, not a terminal state — marks which
  case_ids share an identical `RelationshipSet`) / `CASE_EVALUATED` (terminal per-case
  state — this case's own `falsifiable_test` was checked against its `DETERMINATION`,
  independently of any other case in its `SHARED_SCOPE` group) /
  `HUMAN_ADJUDICATION_REQUIRED`. No TBD.
- **Result schema/storage** — per-case record includes `shared_scope_group` (co-resolved
  case_ids, empty if none) and its own independent `case_evaluated: {checked_against:
  falsifiable_test text, result}` — never inherited or copied from another case_id's
  record, even within the same `shared_scope_group`. No TBD.
- **Human adjudication interface** — unchanged from v2 (delivery-mechanism TBD only, not
  the data it records).

## VALIDATION — Bottle Test

**Can another engineer implement this without making a product/design decision? Yes.**

The frozen window is a fixed, stated constant (no discretion). No company/entity
selection exists anywhere in this contract to be a hidden design decision. The
`SHARED_SCOPE` behavior is a reporting requirement, not a judgment call — it fires
whenever two cases' `RelationshipSet`s are byte-identical, which is mechanically
checkable. No remaining TBDs in file map or formula.

**What this contract does not claim, stated plainly:** it does not claim the 7 eligible
cases will produce 7 differentiated `DETERMINATION` computations — the honest
prediction, given everything traced this session, is that most or all of them share one.
That is a finding about KRYLO's current observable substrate breadth, not a defect in
this contract. What it does claim: each case still gets its own independent
`CASE_EVALUATED` step, checked against its own `falsifiable_test` — shared evidence, not
shared verdicts.

## ROLLBACK

New files only (snapshot runner, classifier, result store). No changes to any connector,
`sigmaengine.js`, `structuralrecognition.js`, `structuralinputadapter.js`, or
`entityresolution.js`.

## GUIDELINES

- Never select a company, filter by domain-tag overlap, or otherwise choose which
  real evidence a case gets — the frozen snapshot is run once, unfiltered.
- `SHARED_SCOPE` is reported, never hidden — a human reading case 15's result must be
  able to see it's the same execution as case 14's.
- **Never copy a `CASE_EVALUATED` result across a `SHARED_SCOPE` group.** Each case_id's
  hypothesis check runs independently against its own `falsifiable_test`, even when the
  `DETERMINATION` it's checked against is identical to another case's. Same evidence,
  same machine output, and same verdict are three separate facts — only the first two
  may legitimately coincide by construction.
- `RELATION_BLOCKED` for the 6 non-OWNERSHIP cases is not a bug to route around.
- No implementation without explicit authorization, per standing instruction.
