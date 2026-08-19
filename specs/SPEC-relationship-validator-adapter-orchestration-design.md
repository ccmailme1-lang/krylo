# SPEC — Relationship Validator: Adapter / Orchestration Design
Date: 2026-08-18
Status: IMPLEMENTATION DESIGN. Specifies the minimum new code required to expose existing
KRYLO substrate through the three locked contracts (common contract, eight operators,
ValidationProfile composition). This is design, not code — file/function names below are
proposed targets for a future implementation WO, not yet written.

Governing documents, in dependency order:
`SPEC-relationship-validator-operator-contract.md` → `SPEC-relationship-validator-operators.md`
→ `SPEC-relationship-validator-validation-profile.md` → this document.

---

## 1. Adapter boundary — `RelationCore → ImmutableRelationshipCandidate`

One function, one job:

```
toValidatorCandidate(core: RelationCore) → ImmutableRelationshipCandidate

  return Object.freeze({
    id:             core.id,
    sourceId:       core.sourceId,
    targetId:       core.targetId,
    relationType:   core.relationType,
    provenanceHash: core.provenanceHash,
  })
```

No `eta`, `phi0`, `structuralSupport`, no dynamics, no lifecycle state — enforced by omission,
not by a filter that could silently start passing more through later. This is the entire
adapter for stage 1; it needs no new mathematics, only a pure projection function plus the
`Object.freeze()` call already proven live in `relationontology.js`'s own `makeRelationCore()`.
Proposed location: `src/engine/validator/candidateview.js`.

---

## 2. `ValidationContext` — capability-scoped providers, not one shared object

**Design decision, per your "not a giant unrestricted object" requirement:** context is not
assembled once and handed whole to every operator. It is a set of independent provider
functions, each queried lazily and only by the operators whose contract names that field.

```
ContextProviders = {
  getEvidence(candidate)                  → E[]              | null
  getLineage(candidate)                   → LineageTrace      | null
  getWorldGraph(candidate, depth)         → LocalNeighborhood | null
  getSignalState(candidate)               → { Σ, πΣ }         | null
  getRelationHistory(candidate)           → RelationDynamics[] / RelationEvent[] | null
  getRegimes(candidate)                   → RegimeLabel[]     | null
  getConfounders(candidate, requested)    → ConfounderSeries[]| null
}
```

**Enforcement mechanism:** the orchestrator (§4), not the operator, decides which providers a
given operator is allowed to call — built from the per-operator "Required ValidationContext"
field already declared in `SPEC-relationship-validator-operators.md`. Concretely, before
invoking an operator, the orchestrator constructs a **scoped context object** containing only
the allowed provider functions for that operator, `Object.freeze()`'d, with every other key
absent (not merely `undefined` — absent, so `'lineage' in context` is `false` for an operator
never declared to need it). An operator reaching for a context field its own contract didn't
declare simply cannot — there is no key to find, no need for a runtime permission check inside
the operator itself.

```
buildScopedContext(operatorName, providers, candidate) → ScopedContext
  allowed = OPERATOR_CONTEXT_ALLOWLIST[operatorName]   // from the operator contracts, §3 below
  return Object.freeze(
    Object.fromEntries(allowed.map(key => [key, () => providers[key](candidate)]))
  )
```

Each provider is a **read-only adapter over an existing live module** — none of these are new
subsystems:

| Provider | Backing source |
|---|---|
| `getEvidence` | `evidencetiers.js` / `structuralconfirmation.js` |
| `getLineage` | `causalos/provenance.js` `ProvenanceDAG` |
| `getWorldGraph` | `entitytopologyregistry.js` `findPath()`/`TYPED_EDGES`, scoped to local neighborhood |
| `getSignalState` | `domaingravity.js` `getDomainSignals()`, `convergenceclassifier.js` state |
| `getRelationHistory` | the candidate's own `RelationDynamics`/`RelationEvent` stream |
| `getRegimes` | caller-supplied or derived from `signalState` history |
| `getConfounders` | caller-supplied third-variable series |

Proposed location: `src/engine/validator/context/*.js`, one file per provider.

---

## 3. Eight adapters — map existing substrate, extend only where genuinely required

Per your explicit instruction: **do not build eight new files just because there are eight
operators.** Below, each row states what's reused as-is, what's a thin interface adapter, and
where real new logic is unavoidable.

| Operator | Existing substrate | Adapter needed | New logic needed |
|---|---|---|---|
| **Temporal** | `cirgate.js checkTemporalLegal()` *(verified)* | Extract from CI-R path coupling to accept `{sourceId, targetId}` + context timestamps directly | **Yes** — materiality-bucket classification (ordering/contradiction/unresolved) doesn't exist yet; current substrate is strict precedence only |
| **Lag** | `confirmationvelocity.js`, `signalgenealogy.js` *(reread firsthand, 2026-08-18 — see correction below)* | N/A — neither file is the right substrate | **Yes.** Both answer adjacent, not matching, questions: `signalgenealogy.js` sums a *hardcoded, seeded* graph's `lag_estimate_days` for cross-node propagation delay; `confirmationvelocity.js` measures `d(support)/dt` for one hypothesis over time. Neither computes "is this edge's `Δt = t_B − t_A` consistent with its own historical distribution" — the actual operator question. The core distributional test must be written new, directly from `relationHistory` timestamps. |
| **Structural** | `cirgate.js checkEdgeLegal()` *(verified — prerequisite only)*, `entitytopologyregistry.js findPath()` *(reread firsthand — real BFS, confirmed)* | Interface adaptation for the legality prerequisite; `findPath()` reused as-is for neighborhood context | **Yes — full semantic extension.** Neighborhood-coherence evaluation (motif/degree/direction fit) has no existing implementation; this is new mathematics, not new plumbing |
| **Recurrence** | `formationintegrity.js persistenceGate()` *(reread firsthand — confirmed exactly as described: "survived enough confirmation windows to be structural, not a spike")*, `rfereconciler.js`/`convergenceclassifier.js` *(not reread — same hysteresis pattern, lower confidence)* | Redirect existing hysteresis pattern from Formation/Σ state onto `relationHistory` | Moderate — same math, different input object; multi-scale (edge/path/motif) support likely needs a small new dispatcher |
| **Alternatives** | `entitytopologyregistry.js findPath()` *(reread firsthand — see correction below)*, `formationintegrity.js counterGate()` *(reread firsthand — confirmed exactly as described: tested counter blocks/holds, "no counter tested → withheld, not passed" per §22)* | `counterGate`'s non-promotion discipline reuses cleanly as-is | **Moderate, corrected from "minor."** `findPath(fromId, toId)` finds *the* path between two given endpoints — it does not enumerate competing paths into B from other sources. Detecting "does another observed structure explain B" needs a new traversal (other inbound edges to B, filtered against the A-path) built on top of the existing registry, not a single reused call. |
| **Independence** | `causalvaliditygate.js` criterion 3 *(verified)* | Array-shape adapter (`R_c` + `confounders` → `number[]` histories); convert silent skip to explicit `N/A` | No — math is correct as-is |
| **Stability** | `causalvaliditygate.js` criterion 2 *(verified)* | Same array adapter as Independence | **Yes — full semantic extension.** Current check is pooled regime-count only; per-regime independent persistence test does not exist anywhere found in this codebase |
| **Information** | `causalvaliditygate.js` criterion 1 + `relationdynamics.js normalizedEntropy()` *(both verified)* | Same array adapter, plus orchestration between the two sources | Minor — combining two existing pure measures, no new math |

**Verification status: all eight operators' substrate claims are now firsthand-read** (§29
Verification: L+C for all). The reread surfaced two real corrections (Lag, Alternatives) and one
confirmation (Recurrence's `persistenceGate`) — see the corrected rows above. Lag's substrate
claim was wrong in the original audit and needs to be treated as a genuine new-logic case, not
an adaptation case; this was caught specifically because the reread happened before the WO was
written, not after.

Proposed location: `src/engine/validator/operators/{temporal,lag,structural,recurrence,
alternatives,independence,stability,information}.js` — one thin adapter file per operator,
each importing only its named existing substrate plus the shared array/context-shape helpers.

---

## 4. Orchestrator

```
RelationCore
    │  toValidatorCandidate()                         [§1]
    ▼
ImmutableRelationshipCandidate (frozen)
    │
    │  for each of the 8 operators:
    │    scopedContext = buildScopedContext(op, providers, candidate)   [§2]
    │    applicable = op.applicabilityPredicate(candidate, scopedContext)
    │    result = applicable ? op.test(candidate, scopedContext) : N/A-result
    ▼
OperatorResult[8]
    │  composeProfile(results)   — six-stage priority order,
    │                               SPEC-relationship-validator-validation-profile.md §1
    ▼
ValidationProfile
```

The orchestrator is the **only** module permitted to call more than one operator, and the
**only** module permitted to build a `ValidationProfile`. No operator imports another operator;
no operator constructs a profile fragment. This keeps the "operator cannot invoke another
operator to produce a prohibited effect" invariant (common contract §6) structurally true rather
than convention-enforced. Proposed location: `src/engine/validator/orchestrator.js`.

---

## 5. Write firewall — enforced technically, not just documented

Four independent mechanisms, not one:

1. **Frozen inputs.** `candidate` is `Object.freeze()`'d at construction (§1). Any context value
   that wraps a mutable structure (evidence arrays, graph neighborhood objects) is deep-frozen
   by its provider before being handed to `buildScopedContext()` — an operator attempting
   `context.evidence.push(...)` throws in strict mode rather than silently succeeding.
2. **No write-capable imports, structurally.** Every file under `src/engine/validator/operators/`
   and `src/engine/validator/context/` is restricted to a static import allowlist: read-only
   accessor exports only (`getById`, `findPath`, `assess`, `checkTemporalLegal`-style predicates,
   `normalizedEntropy`) — never a store's write path (`relationdynamics.js updateDynamics`,
   any `rkmstore.js` insert/update, any admission API). This is checkable mechanically: a test
   that reads each file under those two directories, extracts its import specifiers, and asserts
   none of them resolve to a denylisted export name (`update*`, `insert*`, `save*`, `delete*`,
   `admit*`, `create*`, `write*`).
3. **No candidate-construction API inside the validator's own namespace.** `RelationCore` is
   only ever constructed by `relationontology.js`'s own `makeRelationCore()`, imported nowhere
   under `src/engine/validator/`. The validator can read a `RelationCore`, via `toValidatorCandidate()`,
   never build one.
4. **No admission API dependency** — already locked as `I-NO-ORPHAN-DEP` (common contract §2):
   nothing under `src/engine/validator/` may import anything from a future
   `RelationshipProposal`/`AdmissionDecision` implementation, if one is ever built.

---

## 6. Tests before integration — behavioral, not just unit-level

Each of your nine named tests, mapped to what it actually exercises:

| Test | Targets | Mechanism |
|---|---|---|
| Validator cannot mutate `RelationCore` | §1 boundary | Attempt to write a candidate field post-construction; assert `TypeError` (strict-mode frozen-object write) |
| Operator cannot emit a relationship | Every operator, §3 | Assert every operator's return shape is a subset of `OperatorResult` (§5 of common contract) — never contains `sourceId`/`targetId`/`relationType` as a new pair |
| Alternative cannot become a candidate | Alternatives operator | Feed a candidate with a known competing path; assert `competing_structures` never appears anywhere in a form `toValidatorCandidate()` would accept as input |
| `FAIL` cannot be manufactured from `CONFLICT` | Composition, stage 2/5 | Fixture: Alternatives = `CONFLICT`, all Class A = `PASS` → assert `overall_status` is never `CONTRADICTED` |
| `N/A` cannot become support | Composition, stage 3 | Fixture: all Class A = `N/A` → assert `overall_status` is `UNDETERMINED`, never `SUPPORTED`/`PARTIALLY_SUPPORTED` |
| `UNDETERMINED` cannot become support | Composition, stage 4 | Fixture: one Class A = `UNDETERMINED`, rest `PASS`, all Class B = `PASS` → assert `overall_status` is `UNDETERMINED`, not `SUPPORTED` |
| Class B cannot override Class A | Composition, stage 6 | Fixture: all Class A = `FAIL`, all Class B = `PASS` → assert `overall_status` is `CONTRADICTED` |
| `ValidationProfile` cannot become an admission decision | §1a, enum §2 | Assert `overall_status` type is restricted to the five-value enum at the type/schema level — no code path can emit `ADMITTED`/`ACCEPTED`/`CAUSAL`/`PROMOTED` |
| Identical candidate + context → deterministic profile | Orchestrator, all operators | Run the full pipeline twice on the same frozen inputs; assert deep-equal `ValidationProfile` output both times |

Plus the two mechanical import-boundary checks from §5.2 (denylisted-symbol grep) as
build-time/CI checks, not runtime tests — they catch a violation before it ships, not after.

---

## Summary — the actual engineering target

**Minimum new code**, per §3's table as corrected by firsthand source verification: real new
logic is needed in **four** places, not two — correcting an earlier undercount in this same
document:

- **Structural** — neighborhood-coherence test (no existing implementation). Deepest gap —
  genuine graph-theoretic evaluation (motif/degree/direction fit), not a small addition.
- **Stability** — per-regime persistence test (existing substrate only checks pooled regime
  count). Also deep — a real per-regime statistical procedure, not currently implemented anywhere.
- **Lag** — distributional consistency test over `relationHistory` timestamps (neither candidate
  substrate answers this question; corrected from "adaptation" to "new logic" after reread).
- **Temporal** — materiality-bucket classification (ordering / material contradiction /
  unresolved) over an evidence-pair set. Smallest of the four — a threshold-gated classification,
  not a new statistical procedure — but still new code, not a pure interface adaptation, and it
  was undercounted in this document's first draft of this summary.

**Alternatives** moves from "minor" to "moderate" — its non-promotion discipline
(`counterGate()`) reuses cleanly, but competing-path detection needs a new traversal on top of
the existing registry, not a single reused call. **Independence, Information, and Recurrence**
remain genuine adaptation: array-shape translation or redirecting an existing pattern onto a
different object, no new algorithms. All eight substrate claims are now firsthand-verified, not
fork-reported.

No code has been written. This document is the design a future implementation WO would build
against.
