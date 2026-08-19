# SPEC — Relationship Validator: Implementation Work Order
Date: 2026-08-18
Status: WO SCOPE LOCKED. Per CLAUDE.md §11 ("No code is written without a WO and explicit
'Go'"), this document defines what will be built and its hard boundaries. It is the WO. It does
not itself constitute the "Go" — code implementation begins on a separate, explicit
authorization.

## 0. Governing chain — this WO adds no new architecture

1. `SPEC-relationship-validator-operator-contract.md` — common contract (candidate, context,
   applicability, `OperatorResult`, five prohibitions, Independent Evidence Rule)
2. `SPEC-relationship-validator-operators.md` — eight operator contracts + Class A/B/C
3. `SPEC-relationship-validator-validation-profile.md` — six-stage composition rule
4. `SPEC-relationship-validator-adapter-orchestration-design.md` — this WO's direct blueprint,
   including the firsthand-verified substrate table

Any conflict between this WO and documents 1–4 is resolved in their favor — this document
implements them, it does not amend them.

## 1. Single Responsibility

Build the adapter/orchestration layer that exposes existing KRYLO substrate through the four
locked contracts above. Nothing else.

## 2. In scope — file map

From the design doc §§1–4:
- `src/engine/validator/candidateview.js` — `toValidatorCandidate()`
- `src/engine/validator/context/*.js` — 7 provider files (evidence, lineage, worldGraph,
  signalState, relationHistory, regimes, confounders)
- `src/engine/validator/operators/{temporal,lag,structural,recurrence,alternatives,
  independence,stability,information}.js` — 8 operator adapters
- `src/engine/validator/orchestrator.js` — applicability evaluation, invocation, composition
- Tests per design doc §6 (9 behavioral tests + 2 static import-boundary checks)

## 3. Explicitly out of scope — hard boundary, not a suggestion

- No changes to `RelationCore` / `relationontology.js` / `relationdynamics.js`.
- No `RelationshipProposal` / `AdmissionDecision` implementation or reconciliation — remains a
  separate, unstarted problem, flagged since the common contract and untouched since.
- No ontology changes of any kind — no new `RelationType` values, no new primitives.
- No redesign of any of the eight operator semantics locked in document 2.
- No redesign of the composition rule locked in document 3.
- No wiring into any live KRYLO surface (`querysynthesis.js`, any UI component, any consumer).
  This WO produces a standalone, independently testable subsystem. Wiring it into anything live
  is a separate future decision, not implied by this WO's completion.
- No ninth operator, no compound status values beyond the locked five, no scalar confidence
  score anywhere in the output.
- No admission/promotion/causal-claim capability of any kind, per every prohibition already
  locked in documents 1–3.

If implementation surfaces a genuine need to touch anything on this list, that is a new decision
point requiring its own authorization — not something this WO's completion pressure should talk
anyone into bundling in.

## 4. Build sequencing — risk-ordered

Corrected scope, from the design doc's verified substrate table: **4 operators need real new
logic** (Temporal, Lag, Structural, Stability), **1 needs moderate new traversal** (Alternatives),
**3 are adaptation-only** (Independence, Information, Recurrence).

**Phase 1 — foundation, no operator logic yet:**
1. `candidateview.js`
2. All 7 context providers
3. Orchestrator skeleton, with `composeProfile()` wired to the locked six-stage rule
4. Write-firewall static check (design doc §5.2) — built **first**, so every operator added
   after this point is checked automatically rather than retrofitted

**Phase 2 — adaptation-only operators** (lowest risk; validates the full pipeline end-to-end
before any novel math is added):
5. Independence
6. Information
7. Recurrence

**Phase 3 — new-logic operators** (higher risk; budget real per-operator design time, not just
coding time):
8. Temporal (smallest of the four — threshold-gated classification)
9. Alternatives (moderate — new traversal + reuse of `counterGate`)
10. Lag (distributional test, no existing substrate to lean on)
11. Stability (per-regime persistence, no existing substrate to lean on)
12. Structural (largest — genuine graph-theoretic evaluation)

**Phase 4 — integration:** the full design doc §6 test suite (all 9 behavioral tests + 2 static
checks) run against the complete assembled system, not per-operator in isolation.

## 5. Definition of Done

- All 8 operators + orchestrator + `candidateview.js` + all 7 context providers exist and pass
  the design doc §6 test list in full.
- The write-firewall static check passes with zero denylisted imports found under
  `src/engine/validator/`.
- `grep` confirms zero references anywhere under `src/engine/validator/` to
  `relationdynamics.js`'s `updateDynamics`, any `rkmstore.js` write function, or any
  `RelationshipProposal`/`AdmissionDecision` symbol.
- `npm run build` clean.
- No file outside `src/engine/validator/` is modified. This WO is additive only. If a shared
  file genuinely needs a change (e.g. exporting a currently-unexported lookup), that is a §26
  Shared Data/Function Change Gate event requiring its own pre-edit report — not something
  silently bundled into this WO.
- **Not required for this WO's DoD:** wiring into any live surface, guest/institutional consumer
  changes, `RelationshipProposal` reconciliation. Explicitly deferred, not implied as done.

## 6. Re-verification note (§27.8)

Every substrate claim in the governing chain must be reconfirmed against the live file state at
whatever point implementation actually begins, not carried forward from this planning
conversation as settled fact — particularly Lag's "no existing substrate answers this" finding
and Alternatives' "`findPath` doesn't enumerate competing paths" finding, both found only this
session and both load-bearing for Phase 3's sequencing above.

---

**Awaiting explicit "Go" before any code is written**, per CLAUDE.md §11 and §13 §1.3 ("State
exactly what you will change and what you will leave untouched. Wait for explicit 'go.'").
