# SPEC — Relationship Validator: Common Operator Contract
Jira: none filed (no emergency; per session direction, no new Jira work unless required)
Date: 2026-08-18
Status: CONTRACT DRAFT. Defines the interface every validation operator must satisfy and the
sole legal output shape. Produces no code. Implementation (the eight operator specializations,
the adapters, the orchestration layer) is explicitly out of scope — see §7.

---

## 0. What this document is, and isn't

`specs/The_Validator` established the architecture: a read-only evaluation layer that tests a
relationship candidate against eight mathematical dimensions and reports a validation profile,
without ever creating, mutating, strengthening, weakening, redirecting, or promoting a
relationship.

An architectural equivalence audit (2026-08-18, full evidence in conversation record, not yet
a filed artifact — see §8 for the disposition of that audit) then asked the harder question:
does KRYLO already have this machinery? The answer, verified firsthand against
`causalvaliditygate.js`, `cirgate.js`, `relationontology.js`, and `relationdynamics.js`, plus
reported (not independently reverified) findings on `formationintegrity.js`,
`rfereconciler.js`, `convergenceclassifier.js`, `entitytopologyregistry.js`,
`confirmationvelocity.js`, and `signalgenealogy.js`:

**All eight operators land as ADAPT.** The mathematics exists, scattered across roughly ten
files, each coupled to its own local object shape — a CI-R path, a Formation, a classifier's Σ
state, raw number arrays. No operator today accepts a generic relationship candidate and
returns a structured verdict. **The gap is not missing mathematics. The gap is the missing
common, ontology-grounded, read-only contract that composes the existing specialized machinery
around an immutable candidate.** This document is that contract.

---

## 1. First principle (governs every section below)

**The validator has observational authority, evaluative authority, and reporting
authority — but no ontological authority.**

It can inspect KRYLO's modeled reality. It can mathematically test a relationship. It can
report what survived and what conflicted. It cannot change what KRYLO believes exists.

Corollary, stated precisely because "SUPPORTED" is exactly the kind of word that quietly
becomes an ontological claim if left unguarded:

**An operator's result is evidence about a candidate. It is never a state transition of the
candidate.**

```
R_c (immutable)  ──operator evaluation──▶  OperatorResult  ──composition──▶  ValidationProfile
```

No path exists from `ValidationProfile` back to a new or altered `R_c`. No path exists from any
single `OperatorResult` to a new relationship. This is the firewall; every section below is an
enforcement mechanism for it, not a separate idea.

---

## 2. Candidate contract — `ImmutableRelationshipCandidate`

**Grounding decision (confirmed with the Founder, 2026-08-18):** this is a read-only
projection of `relationontology.js`'s `RelationCore` — the live, immutability-enforced object
already shipped in the SRE subsystem (WO-20XX, commit `fa836b5`) — not a new invented shape,
not a competing vocabulary, not a path through `RelationshipProposal`.

```
RKM / SRE Ontology
        │
        ▼
    RelationCore                 ← single source of truth (live)
        │
        │ read-only projection
        ▼
ImmutableRelationshipCandidate   ← capability-restricted view only
        │
        ▼
Relationship Validator (8 operators)
        │
        ▼
ValidationProfile
```

**Field-by-field verification against the live source** (`src/engine/relationontology.js`,
read directly, not assumed from name):

| Proposed field | Verification result |
|---|---|
| `relation_id` | Exists as `id` (string uuid) — use exact field name |
| `endpoints` | Exists as two separate fields, `sourceId` + `targetId` — not a paired object |
| `directionality` | **Does not exist as a stored field.** Implied by `relationType`, classified post-hoc via `InfluenceClass.NON_DIRECTIONAL = [RESONATES_WITH, COUPLED_WITH]`. Including it would manufacture a field. Dropped — derivable from `relationType` by a consumer if ever needed. |
| `relation_type` | Exists exactly as `relationType`, closed-world enum (14 values). Confirmed, no rename. |
| `evidence_refs` | **Does not exist directly.** RelationCore carries only `provenanceHash` — a single BLAKE3 hash of the evidence bundle, not live references. Dereferencing requires `ProvenanceDAG` lookup — that lives in `ValidationContext` (§3), not the candidate. |
| `temporal_anchors` | Partially exists under different names/meaning: `validity:[t0,t1]` and `createdAt` describe *R's own lifecycle window*, not evidence timestamps. The verified Temporal operator (`cirgate.js checkTemporalLegal`) uses `RealityObject.observedAt` from E/ℒ, not these fields. Not needed by any verified operator — excluded. |
| `historical_observations` | Confirmed not on RelationCore — lives on the separate mutable `RelationDynamics`/`RelationEvent` stream. `ValidationContext` only. |
| `core_state_snapshot` | RelationCore's only "state" is `phi0` (initial strength, frozen at creation). Current ϕ(t)/momentum/persistence/volatility/entropy/elasticity/saturation live in the separate mutable `RelationDynamics` object, never on the core. No snapshot field needed. |
| `immutability_token` | **Not needed.** `makeRelationCore()` returns `Object.freeze({...})` — real runtime enforcement already exists. The read-only projection function itself is the enforcement mechanism. |

**Three classes of RelationCore fields (locked distinction):**

1. **Identity / semantic grounding — allowed in the candidate.** Identifies *what* is being
   evaluated and *where its grounding comes from*: `id`, `sourceId`, `targetId`, `relationType`,
   `provenanceHash`.
2. **Pre-existing upstream judgment/state — excluded by default.** `eta` (η, existence
   confidence), `phi0` (φ₀, initial strength), `structuralSupport` (σ) remain legitimate,
   immutable `RelationCore` fields — but they are upstream *outputs*, not independent validation
   *evidence*. Exposing them to operators by default risks circularity: `V(R) → "PASS because η
   is already high"` would mean the validator is confirming the relationship is credible because
   the relationship already claims to be credible. Existence in the ontology does not imply
   eligibility as validator evidence. **Excluded from the candidate.**
3. **External validation context — provided separately, never on the candidate.**
   Dereferenced evidence via `ProvenanceDAG`, `observedAt`, historical relationship
   observations, event sequences, local graph neighborhood, competing paths, regime partitions,
   confounders, information baselines. This is `ValidationContext` (§3) — the actual independent
   testing substrate.

**Locked minimal candidate surface:**
```
ImmutableRelationshipCandidate {
  id
  sourceId
  targetId
  relationType
  provenanceHash
}
```
Deliberately narrow — "almost aggressively boring." No confidence, no temporal conclusion, no
historical interpretation, no structural score, no causal implication, no dynamics, no
validation state. `provenanceHash` is included as an **address/integrity anchor**, not as
evidence itself — the validator resolves `provenanceHash → ProvenanceDAG → E, ℒ` through
`ValidationContext`; the hash identifies the grounding, it does not validate anything.

**Immutability enforcement:** the projection function returns a `Object.freeze()`-sealed object
containing only the five fields above. No setters, no write path exists on the type itself —
mutation is unavailable at the interface level, not merely discouraged by convention. This
reuses the same freezing mechanism `makeRelationCore()` already applies; the validator's read
path does not reimplement immutability checking, it inherits it.

**Known open item, explicitly not resolved here:** `SPEC-relationship-admission-contract.md`
(2026-08-02) independently defined a `RelationshipProposal` object with a different vocabulary
(`relationshipId`/`subjectId`/`objectId`) and never referenced `RelationCore`, which predates it
by three weeks. That contract has zero live implementation (one comment reference in
`signalfacet.js`, nothing else) — Maturity C, not A. This document does not reconcile that
drift; it is flagged so a future pass doesn't discover it cold. The Validator's candidate shape
is `RelationCore`-grounded regardless of how that reconciliation eventually resolves.

**Locked invariants on this section:**

- **I-CANDIDATE.** `ImmutableRelationshipCandidate` SHALL be a read-only validator-facing view
  of the canonical `RelationCore` representation. It SHALL NOT constitute a new ontology
  primitive, relationship identity, relationship lifecycle state, or alternate relationship
  schema.
- **I-NO-ORPHAN-DEP.** No validator operator may require `RelationshipProposal`,
  `AdmissionDecision`, or any other unimplemented relationship representation as an input
  dependency. This keeps the orphaned spec out of the validator's dependency graph and prevents
  the new subsystem from accidentally legitimizing it.
- **I-EPISTEMIC-DIRECTION.** The validator SHALL NOT require the candidate to contain sufficient
  information to independently perform validation. The candidate identifies and grounds `R`; the
  validator determines what additional evidence/context (§3) is required to test it. Formally:
  `R_c → request/read applicable context → test → VP(R_c)`, never `R_c + precomputed validation
  information → VP`. The former is an actual validator; the latter is a confidence wrapper
  wearing a validator's shape. This also blocks upstream systems from being incentivized to
  preload conclusions into future candidate proposals.

---

## 3. `ValidationContext` contract — the permitted read surface

An operator receives only what it is entitled to inspect. This is not an optimization; it is
the mechanism that prevents an operator from "quietly reaching into arbitrary platform state" —
if a future operator implementation needs a new context field, that is a contract change to
this document, not a silent import.

```
ValidationContext:
  evidence:            E  — evidence bundle referenced by candidate.provenanceHash
                             (source: evidencetiers.js / structuralconfirmation.js shapes)
  lineage:              ℒ  — provenance DAG trace for this candidate's evidence
                             (source: causalos/provenance.js ProvenanceDAG, binary traceable/not)
  worldGraph:           G_local — local neighborhood only, not the full graph
                             (source: entitytopologyregistry.js findPath()/TYPED_EDGES,
                             scoped to candidate.sourceId/targetId's immediate neighborhood)
  signalState:          Σ, πΣ — domain pressure + classifier state, read-only subscriber view
                             (source: domaingravity.js getDomainSignals(),
                             convergenceclassifier.js state)
  relationHistory:      R_t — this candidate's own RelationDynamics/RelationEvent history,
                             supplied for Recurrence/Stability/Lag, never for redefining identity
  regimes:              regime labels aligned to relationHistory, for Stability
  confounders:          named third-variable series, for Independence — empty unless supplied
```

Each field is optional. Absence is a first-class state (§22), not a zero: an operator missing a
required context field returns `N/A` with a reason (§4), never treats the gap as `FAIL`.

**Deliberately absent from this list:** `eta`, `phi0`, `structuralSupport`. Per §2's field
taxonomy, these remain valid `RelationCore` fields but are excluded from validator evidence by
default — see the Independent Evidence Rule (§6). They are not silently available through
context as a backdoor around the candidate's minimal surface.

---

## 4. Applicability contract

Every operator declares whether it can legitimately speak **before** running any test:

```
applicability(candidate, context) → APPLICABLE | { N/A, reason }
```

Examples grounded in real gaps already found in the audit:
- No `regimes` in context → Stability = `N/A, reason: "no regime segmentation supplied"`
- Single observation in `relationHistory` → Recurrence/Lag = `N/A, reason: "n=1, minimum unmet"`
- No `confounders` supplied → Independence = `N/A, reason: "no third-variable context"` (distinct
  from `causalvaliditygate.js`'s current behavior, which silently skips criterion 3 if
  `confounders` is empty — under this contract that silent skip must become an explicit `N/A`)

This makes missing evidence explicit rather than letting absence masquerade as a failed test —
the same principle already governing `causalvaliditygate.js`'s `UNRESOLVED` state for `n <
MIN_HISTORY_N`, generalized to all eight operators.

---

## 5. `OperatorResult` contract

```
OperatorResult:
  operator:              one of the eight operator names
  state:                 PASS | FAIL | CONFLICT | UNDETERMINED | N/A
  evidence_refs:         [ pointers into E / ℒ / Gᵂ / Σ — never new objects ]
  rationale:             machine-readable explanation of why this state was emitted
  competing_structures?: [ references only, e.g. an alternate path found by
                           entitytopologyregistry.findPath() — never promoted to a candidate ]
  contract_version:      semver of this document
  operator_version:      semver of the specific operator specialization
```

**Terminology — `FAIL` vs. `CONFLICT`, locked distinct meanings:**

- **`FAIL`** — the candidate does not satisfy this validation constraint. A clean negative.
- **`CONFLICT`** — the available evidence/structure contains materially competing signals
  relevant to the candidate. Not a negative verdict on the candidate itself — a statement that
  the picture is contested and must stay visible.

Example, directly relevant to Alternatives:
```
Temporal      PASS
Structural    PASS
Alternatives  CONFLICT   ← a competing path exists; candidate is not thereby rejected
Stability     UNDETERMINED
```
This is consideration without inference — the validator surfaces the competing structure and
stops. It does not resolve the conflict, does not pick a winner, does not rewrite the candidate
toward or away from the competing explanation.

**`UNDETERMINED`** vs. **`N/A`**, also kept distinct: `N/A` means the operator declared itself
inapplicable before running (§4 — a structural absence). `UNDETERMINED` means the operator ran,
context was present, but the result did not clear the bar for `PASS`, `FAIL`, or `CONFLICT` —
e.g. `causalvaliditygate.js`'s own `n < MIN_HISTORY_N` case, which today returns
`UNRESOLVED` and should map to `UNDETERMINED` under this contract, not `N/A` (context existed,
it was just insufficient in volume — a temporal-absence-adjacent case per §22, not a structural
one).

---

## 6. Authority boundary — the five prohibitions as enforceable invariants

Restated from `specs/The_Validator`, made binding on every operator implementation:

1. **No relationship creation.** An operator cannot assert that a relationship exists. It can
   only speak about the supplied candidate.
2. **No relationship modification.** No operator output may change `sourceId`, `targetId`,
   `relationType`, or any field `assertCoreImmutable()` already protects.
3. **No relationship strengthening.** `PASS` across all eight operators does not increase
   `phi0`, `eta`, or `structuralSupport`. Validation establishes survival of constraints, not
   ontological promotion — those fields only move through `relationdynamics.js`'s
   `updateDynamics()`, gated by `assertPhiGrounded()`, which is a *different* contract (the
   relationship's own lifecycle engine, §2) that this document does not touch or invoke.
4. **No weakening by invention.** A `FAIL` or `CONFLICT` result cannot cause an operator to
   propose a "repaired" version of the candidate (e.g., inferring bidirectionality after a
   temporal failure). The candidate is returned untouched; only the verdict is new.
5. **No implicit relationships.** An operator must never infer `A→C` from `A→B` and `B→C`
   both validating. A discovered path is `competing_structures` evidence (§5), never a new
   candidate.

**Explicit addition, locked per this session's direction:** an operator cannot invoke another
operator in a manner that produces any of the five prohibited effects above. Composition
(§7 orchestration, out of scope here) may call multiple operators and assemble their results,
but no operator may call another operator and use its result to mutate, strengthen, or
promote anything — the boundary applies to the whole call graph, not just the outermost call.

**Validation status must never be transitive.** `V(A→B) = PASS` and `V(B→C) = PASS` does not
make `V(A→C)` available "for free," computed or assumed. Every candidate is independently
validated. This is the same rule as #5, restated for the case where someone might try to
shortcut computation rather than infer a new relationship outright — the failure mode is
identical either way.

**6. Independent Evidence Rule (locked 2026-08-18).** A validator operator SHALL NOT use an
upstream derived judgment, confidence value, strength value, structural-support value, or prior
validation result as independent evidence for the same relationship — unless the operator's own
contract explicitly defines that field as the *object* of validation rather than *evidence for*
validation. This is the general form of §2's exclusion of `eta`/`phi0`/`structuralSupport` from
the candidate: it also blocks a future composition layer from quietly reintroducing them (e.g.
`validationScore = temporal + structural + relationCore.structuralSupport`), which would destroy
the layer's independence just as surely as exposing them on the candidate directly would.

The narrow exception clause exists for cases like `relationontology.js`'s own
`assertPhiGrounded()` — an operator whose literal, declared job is to audit whether `phi0`
changed with a grounded evidence delta is validating *that field itself*, not using it as
background support for an unrelated test. That is a legitimate, contract-declared exception, not
a general availability.

---

## 7. Determinism / provenance requirements

Every `OperatorResult` must be traceable to:
- the exact candidate it was computed against (`candidate.id` + `candidate.provenanceHash`)
- the exact context it inspected (which `evidence_refs`, which lineage trace, which graph
  neighborhood — not "some evidence existed" but the specific set)
- the operator contract version and the specific operator's version
- the applicable test that ran (or the reason it did not, per §4)

This is what makes a `ValidationProfile` auditable rather than merely descriptive — required for
institutional consumption later (per `specs/The_Validator`'s own framing), and consistent with
CLAUDE.md §27.8's rule that validation claims must be traceable, not asserted from memory.

---

## 8. `ValidationProfile` — the sole legal output of the composed validator

```
ValidationProfile:
  candidate_id:            reference to R_c (never the candidate itself, copied or altered)
  operators:                map[OperatorName → OperatorResult]
  overall_status:           SUPPORTED | PARTIALLY_SUPPORTED | SUPPORTED_WITH_COMPETING_EXPLANATION
                             | CONTRADICTED | UNDETERMINED
  competing_notes:          list of non-promoted alternative structures, deduplicated across
                             operators that may have independently surfaced the same one
  applicability_summary:    which operators ran, which were N/A and why
  contract_version:
  generated_at:
```

`overall_status` is a composition of the eight `OperatorResult.state` values, not a mutation of
anything upstream — per §21 (Route-Don't-Aggregate) and §23 (Orthogonal Axis Integrity). The
composition function is defined in `SPEC-relationship-validator-validation-profile.md` (six-stage
Class A/B/C priority order) — not defined in this document, deliberately, to keep this contract a
pure interface spec.

**No field in this profile may contain a new or modified relationship.** Downstream consumers
(guest surface, institutional API, a future causal-candidate layer) may read the profile. None
of them may treat it as authority to write back into `R_c` — that would be a second, hidden
write path, exactly what §6's five prohibitions exist to prevent regardless of which layer
attempts it.

---

## 9. Explicitly out of scope (post-contract, not contract semantics)

- **The eight operator specializations.** Per the audit, all eight are ADAPT-classified —
  concrete file/function mapping and the interface-vs-semantic-gap distinction (Structural and
  Stability need semantic extension, not just plumbing; the other six need interface adapters
  only) is recorded in the audit but not restated as implementation here.
- **The orchestration/composition layer** that calls applicable operators and assembles a
  `ValidationProfile`, including the `overall_status` composition function.
- **Adapters** translating `ValidationContext` fields into the shapes individual existing
  functions currently expect (e.g. `causalvaliditygate.js`'s raw `number[]` histories).
- **`RelationCore` / `RelationshipProposal` reconciliation** (§2's open item) — separate,
  pre-existing problem, not created or resolved by this document.
- **Compliance test suite** proving the five prohibitions actually hold under composition —
  belongs to the implementation WO, same pattern as
  `SPEC-relationship-admission-contract.md` §7's precedent for this project.

---

## Summary — what this contract locks

1. `ImmutableRelationshipCandidate` = read-only `RelationCore` projection, locked to exactly
   `{id, sourceId, targetId, relationType, provenanceHash}` — verified field-by-field against
   the live schema, nothing manufactured, no new relationship shape invented.
2. `eta`/`phi0`/`structuralSupport` remain legitimate `RelationCore` fields but are excluded
   from both the candidate and default `ValidationContext` — upstream judgment is not validator
   evidence (Independent Evidence Rule, §6).
3. Every operator: `Operator(R_c, Context) → OperatorResult`, applicability declared before
   testing, five-state result vocabulary with `FAIL` and `CONFLICT` kept semantically distinct.
4. Zero write path from any operator, or any composition of operators, back to `R_c` — enforced
   at the call-graph level, not just per-operator.
5. `ValidationProfile` is the only legal output; `overall_status` composition is deliberately
   left to a future document so this one stays a pure interface contract.
6. Validation is never transitive and never confers causality — `PASS` on all eight operators
   still yields "candidate survived applicable constraints," never "A causes B."

```
SPEC-relationship-validator-operator-contract.md (this document)
        |
        v
Eight operator-specific contracts (each specializing §4/§5 above)
        |
        v
Orchestration + adapter design (§9, not yet written)
```
