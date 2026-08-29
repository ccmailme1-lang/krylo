# SPEC — Closed-Loop Observation Architecture (KRYL-1202 / 1203 / 1204, integrated)

**Status:** BUILT — FINAL GATE: GO (2026-08-27, Founder decision, recorded on KRYL-1202/1203/1204).
Reached after two NO-GOs and six independent Bottle Test passes, each catching and closing a real
gap (see gate-remediation sections below and Jira comment history for the full record). 91/91 QA
assertions pass across four suites; clean build; v1 KRYLCF Compatibility Rule respected throughout.

**Explicit holds alongside this GO — not blockers to it, not resolved by it:**
1. **DHS → Homepage query-synthesis gap** — a separate Track 2 investigation
   (`src/components/analysis/analysisidlefield.jsx` → `src/engine/querysynthesis.js`) found that
   financially-detailed free-text queries fall through domain routing to a generic `GENERAL`
   template that never inspects the query for financial constructs. Real, but a Homepage defect —
   not evidence against this architecture. Tracked separately, not by this spec.
2. **Surface `AnalysisField` → Inspection Panel → Observation Affordance guest experience** — HOLD
   for its own end-to-end validation. `observationaffordanceengine.js` still has zero production
   callers anywhere in `src/` (confirmed across all six Bottle Test passes) — this GO closes the
   engine gate; it does not declare the guest-facing affordance experience built or validated.
3. **Six-domain semantic architecture** (universal primitives vs. domain constructs vs.
   KRYLO-level Formation) — sandbox research question, explicitly not architecturally decided by
   this spec or this gate.

**Second-gate remediation (2026-08-26):**
1. **Semantic target validation — CLOSED.** `CAPABILITY_REGISTRY` entries now carry
   `value_validators` per targetable field; `OWNERSHIP_FILING`'s `target_entities` validator
   requires every value to match `/^\d{1,10}$/` (grounded in `edgar8kconnector.js`/
   `edgarnarrativeconnector.js`'s existing `String(cik).padStart(10,'0')` CIK convention — not
   invented here). `isAvailable()` checks both key-membership and value-validity. The exact
   adversarial regression from the second Bottle Test is now a permanent QA assertion
   (`qa_observationorchestrator.mjs` #8c).
2. **Lifecycle naming — CLOSED.** `UNSUPPORTED` renamed to `UNAVAILABLE` throughout
   `observationorchestrator.js`, matching spec §8 (spec governs on divergence, CLAUDE.md §1).
3. **`WITHHELD` reachability — CLOSED as honest absence, not forced.** Traced directly:
   `secownershipconnector.js` always attaches a non-empty per-filing `evidence` array, so EAC3
   passes vacuously for every real candidate it builds, and EAC1/EAC2 are unconditionally
   satisfied by the connector's own field construction — `runTargetedOwnershipObservation` can
   never itself produce an EAG rejection. Per Founder ruling: EAC3's admission behavior is
   unchanged (new evidence legitimately overriding a dispute is defensible epistemics, not a
   loophole), and no change was made to force `WITHHELD` through this connector. Instead, the
   ADMITTED/INSUFFICIENT/WITHHELD decision was extracted into its own pure function
   (`deriveTerminalState()`), so the real lifecycle-transition machinery — not a re-implementation
   of it, not a fake final-state object — can be exercised directly with a real EAG rejection
   record. `qa_observationorchestrator.mjs` #8d proves `WITHHELD` is a reachable terminal state in
   the orchestrator contract and separately proves the live connector path never itself produces
   one. **Architecturally supported ≠ naturally exercised by the currently-selected connector** —
   documented as that distinction, not papered over as a defect.
4. **All 6 mandated adversarial scenarios — CLOSED.** New file `qa_adversarial_scenarios.mjs`,
   one named, numbered test per item in the "Adversarial validation required" list below, using
   real engine/connector/formation-pipeline code throughout (12/12 pass). Scenario 5 in particular
   exercises the genuine negative case — real admission against an entity the condition's own
   conflict does *not* name, proving `residual_unresolved` is still correctly populated rather
   than a real admission being conflated with condition resolution.

Full suite after second-gate remediation: 9 + 18 + 13 + 12 = 52/52 QA assertions pass; clean
`vite build --mode development`.

**Third-gate remediation (2026-08-26)** — the third independent Bottle Test found the 52/52 suite
real but incomplete in two places, both now closed:

A. **Provenance regression coverage — CLOSED.** Fix #1's `observationProvenance` mechanism was
   correct but zero committed QA calls actually passed it — every `completePathRecord()` call sent
   `condition.provenance: null`, so the distinctness guarantee was never exercised or asserted by
   any passing test, only by a standalone probe run separately for verification. Fixed:
   `qa_closedloop_endtoend.mjs` and `qa_adversarial_scenarios.mjs` scenario 1 now give the
   condition a real, distinct `ProvenanceDAG`, pass the admitted artifact's own DAG as
   `observationProvenance`, and assert the completed record's `provenance` **is** the observation's
   DAG and **is not** the condition's — test-strengthening only, no mechanism change.
B. **Numeric CIK coercion — CLOSED, real implementation defect fixed.** The validator coerced its
   input via `String(id)` before pattern-testing it, so a JS number (e.g.
   `target_entities: [1234567]`) was admitted as `available: true`; `planFor()` then passed the raw
   number through uncoerced, and the connector's strict-equality match against EDGAR's string CIKs
   could never succeed — a silent false-negative (`INSUFFICIENT`) at the wrong layer instead of a
   rejection at the actual defect. Fixed: `isValidCik()` in `observationorchestrator.js` now
   requires `typeof id === 'string'` with no coercion — the capability contract validates the value
   the caller actually supplied, not a coerced shape. `qa_observationorchestrator.mjs` #8e adds 10
   permanent regression cases (numeric, whitespace, empty, float, negative, oversized, mixed
   valid/invalid batches).

Full suite after third-gate remediation: 9 + 28 + 14 + 13 = 64/64 QA assertions pass; clean
`vite build --mode development`.

**Fourth-gate remediation (2026-08-26)** — the fourth independent Bottle Test found the 64/64
suite real, both third-gate fixes independently re-verified, but surfaced three concrete
contract questions, all now closed:

C. **`observationProvenance` — CLOSED, fail-closed.** The mechanism was correct but
   convention-only: `completePathRecord(pathId, { ...observationProvenance }) ` used
   `observationProvenance ?? record.provenance`, so an omitted argument was indistinguishable from
   a caller correctly passing it, and nothing stopped a future caller from silently reproducing the
   exact third-gate defect. Fixed: `observationProvenance` is now a required key — omitting it from
   the options object throws (`qa_adversarial_scenarios.mjs` #7a/#7b prove this directly, including
   that the path stays incomplete after the rejected call). An explicit `observationProvenance:
   null` is still accepted and recorded as `null` (an honest "nothing was admitted this round"),
   never silently substituted with the condition's provenance (`qa_adversarial_scenarios.mjs` #7c).
D. **`deriveTerminalState()` mixed-case precedence — TESTED AND LOCKED, not redesigned.** Per
   Founder ruling, the branch order itself was not changed. The untested case (`admitted.length >
   0 AND rejected.length > 0` simultaneously) now has a permanent test
   (`qa_observationorchestrator.mjs` #8f) using a real admitted artifact plus a real EAG rejection
   record together, confirming `ADMITTED` wins and that the rejection is never silently dropped —
   it stays inspectable on `result.rejected` regardless of which terminal state is reported. The
   precedence rationale is now documented directly on `deriveTerminalState()`.
E. **`target_time_window` — CLOSED, real capability-level validator added.** Previously had no
   `value_validator` at all — a malformed window was only ever caught (or not) by `fetch()`/
   connector error handling several layers downstream, not by the capability contract itself.
   Added `isValidTimeWindow()` to `observationorchestrator.js`'s `CAPABILITY_REGISTRY`: both `from`
   and `to` must be real ISO `YYYY-MM-DD` calendar dates with `from <= to`. `null`/omitted stays
   legitimately "not specified" (the field is genuinely optional — `planFor()` already defaults a
   missing window to the connector's own 30-day default); a non-null malformed value (reversed
   range, non-ISO format, out-of-calendar date, wrong type) is now rejected at `isAvailable()` —
   the actual contract boundary — not downstream. 10 permanent regression cases plus a full
   orchestrator-path test added (`qa_observationorchestrator.mjs` #8e2).

Full suite after fourth-gate remediation: 9 + 41 + 14 + 17 = 81/81 QA assertions pass; clean
`vite build --mode development`.

**Fifth-gate remediation (2026-08-27)** — the fifth independent Bottle Test found two real,
demonstrable contract violations (not hypotheticals) against claims from the fourth-gate
remediation and against the ratified §9 reproposal rule. Both closed:

F. **Calendar-date validator — CLOSED, real implementation defect fixed.** `isValidDateString()`
   used `Date.parse()`, which silently rolls invalid calendar dates over instead of rejecting them
   (`Date.parse('2026-02-29')` succeeds as `2026-03-01` even though 2026 is not a leap year) —
   `2026-02-29`, `2026-02-30`, `2026-04-31` all previously passed `isValidTimeWindow()` as valid,
   directly contradicting the fourth-gate remediation's own claim. Fixed: real Gregorian
   calendar validation — exact `YYYY-MM-DD` shape, month 1-12, day within that month's real length
   for that year, leap year computed directly (not delegated to `Date.parse`). 7 new regression
   cases distinguish rollover dates from out-of-range-component dates, including the leap-year
   boundary itself (2024 valid, 2026/1900 invalid, 2000 valid — the 4/100/400 rule).
G. **Reproposal rule's target/scope condition — CLOSED, real contract/interface defect fixed.**
   The ratified §9 rule requires all 5 conditions unchanged for suppression, including "same
   observation target and scope (`TargetSpec`)" — but `isEligibleForDerivation(condition,
   availableNow)` had no parameter capable of ever evaluating that condition; it was structurally
   absent, not merely untested. Fixed: `isEligibleForDerivation(condition, availableNow,
   targetSpec)` now compares `targetSpec` against the prior completed path's own
   `observation_request.target` via `sameTargetSpec()` (entity-set + time-window structural
   equality) as a required fifth check. Proven both directions in
   `qa_adversarial_scenarios.mjs` #8: the same target/scope as a prior zero-discrimination
   attempt is suppressed; a genuinely different target/scope is NOT suppressed even with the
   other 4 conditions identical — the exact case the prior interface could not evaluate.

Full suite after fifth-gate remediation: 9 + 48 + 14 + 20 = 91/91 QA assertions pass; clean
`vite build --mode development`.

**Sixth independent Bottle Test (2026-08-27) — CLEAN.** Full re-run of all 91 assertions,
independent re-derivation of the calendar/leap-year logic, adversarial defeat-attempts on
`sameTargetSpec()` (entity order, extra fields, `null`/`undefined` prior targets), a full call-site
audit (`isEligibleForDerivation()` has exactly one definition and four call sites, all passing all
three arguments), the complete regression sweep from all five prior gates re-run live (not trusted
from report), and a full-architecture hunt across EAG/connector/orchestrator/affordance-engine for
any further required-but-optional parameter or masking `??`/truthy pattern. Result: **no further
exceptions found.** Per the Founder's sequencing, Bottle Testing stops here — next gate is Founder
visual validation (a genuinely separate gate, not proof of implementation), then final GO/NO-GO.
Written 2026-08-25 to integrate the Observation Affordance formalization into the already-ratified
KRYL-1202/1203/1204 chain. Does not create new tickets. Does not supersede any ratified decision —
in particular, the **RATIFIED v1 KRYLCF Compatibility Rule** (KRYL-1202, 2026-08-23) governs
everything below and is restated, not amended, in this spec.

**Build result:** all three tickets implemented (`src/engine/evidenceadmissiongate.js`,
`src/engine/observationorchestrator.js`, `src/engine/observationaffordanceengine.js`, extension to
`src/engine/connectors/secownershipconnector.js`), 33/33 QA assertions pass, independently
re-verified. Final Bottle Test: 13/15 CONFIRMED clean. **NO-GO on two items**: observation-specific
provenance is validated by EAG then dropped before dispatch, not preserved into Path Memory; and
evidence magnitude (`signal: 100`) is a hardcoded placeholder, not a computed observed value. This
is a surgical NO-GO — the architecture is not reopened. Three narrow remediation items were
authorized:

1. Preserve per-observation provenance through dispatch — **CLOSED, real.**
   `evidenceadmissiongate.js`'s `admitCandidate()` now retains `provenance` on the returned
   artifact instead of stripping it; `admitAndDispatch()` strips it only from the projection that
   actually reaches `dispatchBatch()`/domaingravity's pool. `observationaffordanceengine.js`'s
   `completePathRecord()` now accepts `observationProvenance` and overwrites Path Memory's
   provenance with the specific admitted observation's own DAG at completion time.
2. Replace the `signal: 100` placeholder with an honest representation — **CLOSED, real.**
   `secownershipconnector.js`'s `runTargetedOwnershipObservation()` now attaches
   `evidence_class: 'CATEGORICAL_PRESENCE'` alongside the unchanged `signal: 100`, documenting that
   no real per-filing magnitude is extractable from EDGAR FTS metadata and that `signal` is
   confirmed unused downstream — the observation type is categorical, not a disguised magnitude.
3. Resolve the live RESOLVE boundary — **extraction CLOSED, real; bridge NOT built; exception
   stays explicitly OPEN.** See "Live RESOLVE boundary — finding" below. `observestoryview.jsx`'s
   `adjudicate()`/`buildCandidates()` are now a standalone module
   (`src/formationlayer/resolveadjudication.js`), but building the bridge into KRYL-1202's Pattern
   1 surfaced a real semantic mismatch, not a plumbing gap — no bridge was built, and none should
   be until the missing capability below exists for real.

Owning tickets: **KRYL-1202** (Percept → Affordance → closed-loop intent + Path Memory),
**KRYL-1204** (Request → Plan → Targeted Invocation), **KRYL-1203** (Observation → EAG/SIL
admission). Reference specs: `specs/SPEC-evidence-admission-gate.md` (RATIFIED), the plan for
KRYL-1204's own draft `specs/SPEC-targeted-connector-adapter.md` (NEEDS-SPEC — this document
formalizes 1204's role in the loop but does not replace that spec's own open items: connector set
and target-field-to-parameter mapping, still Founder calls).

## v1 KRYLCF Compatibility (governs this entire spec — restated verbatim, not re-derived)

> For Formation-Driven Closed-Loop Perception v1, EAG-admitted evidence enters the existing
> canonical evidence/provenance substrate and the existing Formation inference machinery directly.
> The full KRYLCF Structural Integrity → Cognitive Fabric pathway (KRYLCF-2 through 6, all Jira
> status To Do, nothing live anywhere in KRYLO today) remains a future architectural convergence
> requirement — this route is an explicitly bounded transitional architecture and does not
> constitute implementation of the canonical Evidence → Structural Integrity → Cognitive Fabric →
> Action pathway. The v1 implementation MUST NOT introduce replacement components named Structural
> Integrity, Cognitive Fabric, or equivalent abstractions to simulate the absent KRYLCF layers.

Every diagram, name, and invariant in this spec conforms to this rule. Nowhere below does the loop
route through anything named Structural Integrity or Cognitive Fabric.

## Live RESOLVE boundary — finding (2026-08-26, remediation item 3, exception left OPEN)

Extraction is real and closed: `observestoryview.jsx`'s `buildCandidates()`, `classifyPair()`,
`adjudicate()`, and the opposition table moved verbatim to `src/formationlayer/resolveadjudication.js`
— a plain module with no React dependency, standalone-importable. `observestoryview.jsx` now
imports these back and re-exports `getLastAdjudication()` unchanged; full app build validated clean.

Building the bridge into KRYL-1202's Pattern 1 (`deriveAffordancesFromResolve()`) surfaced a real
architectural mismatch, not a wiring gap — **not built, and the exception is not being closed by
narrative substitution.** Three facts, checked directly against the code:

1. **RESOLVE exists** — `resolveadjudication.js`'s `adjudicate()` is the only *live* adjudicate()
   anywhere in KRYLO. Its `CONFLICT` outcome discriminates between OBSERVE-banner narrative
   candidate *types* (`RELATIONSHIP_STATE` vs `OPPOSITE_DIRECTION`, etc.) — i.e. which headline to
   present. `pairwise[].a`/`.b` are candidate-type strings, never entity identifiers.
2. **Entity-level conflict exists as a data-model capability** — `rkmstore.js`'s
   `flagContradiction()`/`EPISTEMIC_STATE.DISPUTED` is real machinery matching the shape
   `deriveAffordancesFromResolve()` actually expects (two entity IDs in conflict — the exact shape
   the synthetic condition in `qa_closedloop_endtoend.mjs` used).
3. **Entity-level conflict is not actually produced by the running system** — grepped `src/` for
   callers of `flagContradiction()` outside `rkmstore.js` itself: zero. Nothing in KRYLO today ever
   sets an object to `DISPUTED`.

Point 3 is decisive. Piping (1)'s real output into Pattern 1 anyway was checked and rejected:
`observationorchestrator.js`'s `isAvailable()` only verifies the target field *key* (`target_entities`)
is present — never that its *value* is a real entity — so a bridge would report `available: true` and
`planFor()` would issue a real EDGAR search against a nonsense CIK (a candidate-type string). That
is a fabricated-availability bug, not a working bridge, and was not built.

Wiring `flagContradiction()`/`DISPUTED` in now to manufacture the missing producer was also
rejected — that turns "the required producer doesn't exist" into "let's build the producer so the
originally proposed bridge can work," which is scope expansion beyond this fix and would obscure
the actual finding.

**Conclusion:** no real production source of an entity-shaped `RESOLVE_CONFLICT` condition exists
anywhere in KRYLO today. The live-RESOLVE exception from the final Bottle Test stays **explicitly
OPEN**, not closed. The missing capability for future work is precise: an entity-conflict producer
→ entity-level RESOLVE condition → anticipatory affordance → targeted observation. The chain stops
today at the first missing production capability, and that boundary is now documented rather than
papered over.

This also bears directly on the separate Anticipation discussion (not resolved here): narrative
RESOLVE (KRYL-1207) answers "which candidate should OBSERVE present" — a display-salience question.
An anticipated-observation path needs to answer "what present structural condition warrants
preparing to observe something before it manifests" — a different adjudication problem. KRYL-1202
does not treat these as the same question merely because both are named "RESOLVE."

## PROBLEM

KRYLO's `analysisfield.jsx` formation pipeline (`buildPerceptionField()` → `inferFormation()` →
`buildFormationProspectus()` → `buildLiveProspectus()`) produces a percept and stops — the percept
is displayed, not acted on. Formation output terminates at render. Nothing closes the loop: no
mechanism turns "here is what remains unresolved in this percept" into a targeted new observation
that could resolve it. RESOLVE's own real adjudication data (`observestoryview.jsx`'s
`UNRESOLVED_NO_RANKING`/`CONFLICT` outcomes) already names *why* something is unresolved but
nothing consumes that as an actionable next step.

## SOLUTION

### 1. The corrected v1 loop

```
CURRENT PERCEPT  (analysisfield.jsx, via buildLiveProspectus())
      ↓
OBSERVATION AFFORDANCE   (1202 — derived from unresolved conditions in the percept)
      ↓
OBSERVATION REQUEST      (1204)
      ↓
TARGETED INVOCATION      (1204 — real connector call, per specs/SPEC-targeted-connector-adapter.md)
      ↓
NEW EVIDENCE
      ↓
EAG / SIL ADMISSION      (1203 — per specs/SPEC-evidence-admission-gate.md, EAC1-EAC5)
      ↓
existing evidence/provenance substrate (dispatchBatch() → subsignalbuffer.js → domaingravity pool)
      ↓
inferFormation()         (existing, unchanged, pure/stateless — re-run, not patched)
      ↓
UPDATED FORMATION / PERCEPT
      ↺ (back to 1202)
```

KRYLCF Structural Integrity / Cognitive Fabric sit outside this loop entirely, as a documented
future convergence target — not built, not simulated, not routed through.

### 2. Observation Affordance primitive (owned by 1202)

```typescript
type TargetSpec = {
  target_entities?: string[];                    // e.g. CIK or other canonical identifiers
  target_domains?: string[];                     // canonical domain names
  target_relationships?: [string, string][];      // entity pairs
  target_sources?: string[];                      // connector/tap identifiers
  target_time_window?: { from: string; to: string };
};

type ObservationType = string;   // one of the capability registry's declared types, e.g. 'OWNERSHIP_FILING'

type UnresolvedConditionKind =
  'RESOLVE_CONFLICT' | 'EVIDENCE_GAP' | 'RELATIONSHIP_AMBIGUITY' |
  'TEMPORAL_INSUFFICIENCY' | 'FORMATION_BOUNDARY_UNCERTAINTY';

interface ObservationAffordance {
  id: string;
  source_percept_id: string;
  reason: string;                        // human+machine readable
  unresolved_condition: UnresolvedCondition;
  target: TargetSpec;                    // entity/domain/relationship/source/time-window
  observation_type: ObservationType;
  available: boolean;                    // see target-capability requirement below
  execution_path: string | null;         // which 1204 adapter would serve this, or null
  discrimination_capability: {           // NOT "expected_discriminating_value" — capability,
    conflict_pairs?: [CandidateId, CandidateId][];  // never a predicted result
    evidence_classes?: ObservationType[];
    unresolved_types?: UnresolvedConditionKind[];
  };
  provenance: ProvenanceDAG;
}

interface ObservationRequest {
  id: string;
  affordance_id: string;                 // the affordance this request fulfills
  target: TargetSpec;
  observation_type: ObservationType;
  requested_at: string;                  // ISO instant
  provenance: ProvenanceDAG;
}

interface ObservationPlan {
  request_id: string;
  data_tap_id: string;                   // concrete tap chosen from the capability registry
  invocation_params: Record<string, unknown>;   // concrete, connector-specific parameters only
  estimated_cost: number;                // latency/scope cost from the registry — non-predictive,
                                          // the same cost(o) term the utility metric already uses
}
```

No prediction field anywhere in these four types. No probability-of-future-state field.
`discrimination_capability` describes what the observation *can* address, never what it *will*
find — the corrected framing from tonight's discussion (the original "expected_discriminating_value"
wording risked smuggling a predicted result into a supposedly non-predictive primitive).
`estimated_cost` is the same non-predictive latency/scope cost already defined for the utility
metric's `cost(o)` term (§5) — not a forecast of what the observation will return.

**Target-capability requirement for `available` (closes the "connector targeting failure" gap
found in the 2026-08-25 adversarial review):** `available: true` requires the capability registry to
verify **both** (a) a Data Tap exists for the declared `observation_type`, **and** (b) that specific
tap can actually address the `target` named in this affordance (the entities/relationships/domains
in `TargetSpec`) — not merely that a type-matching tap is registered somewhere. A tap that accepts
parameters but only date-scopes, with no entity/relationship targeting (the exact
`secownershipconnector.js` finding, §6), must report `available: false` for any affordance whose
`target` requires entity-level discrimination until that tap's real targeting capability is
extended. Type-capable is not target-capable; the registry must check both.

**Mechanism (closes the "no described mechanism" gap found on re-check):** each capability
registry entry declares which `TargetSpec` fields it can actually filter on, not just which
`observation_type` it serves:

```typescript
interface DataTapCapability {
  tap_id: string;
  observation_type: ObservationType;
  targetable_fields: (keyof TargetSpec)[];   // e.g. ['target_entities', 'target_time_window']
                                              // for secownershipconnector.js post-extension;
                                              // ['target_time_window'] only, pre-extension
}
```

`available` computes as: a `DataTapCapability` exists for the affordance's `observation_type`, AND
every non-empty field present in the affordance's `TargetSpec` is included in that capability's
`targetable_fields`. An affordance whose `target` sets `target_entities` against a tap whose
`targetable_fields` is only `['target_time_window']` evaluates `available: false` — the mechanism
the registry actually runs, not just the required outcome.

### 3. Unresolved-condition hierarchy (owned by 1202)

```typescript
interface UnresolvedCondition {
  id: string;                 // stable identity for this condition across recomputations
  version: string;            // changes whenever the condition's underlying evidence/state changes
  kind: UnresolvedConditionKind;
  evidence_ref_ids: string[]; // the specific evidence/provenance nodes this condition rests on —
                               // the basis for the reproposal rule's evidence-set comparison (§9)
  source_percept_id: string;
}
```

```
UnresolvedCondition                    (base — consumed by the Affordance Engine)
  ├── ResolveUnresolved                (produced by observestoryview.jsx's adjudicate())
  ├── EvidenceGap
  ├── RelationshipAmbiguity
  ├── TemporalInsufficiency
  └── FormationBoundaryUncertainty
```

`id` is stable across recomputations of the same real-world condition; `version` changes whenever
the condition's `evidence_ref_ids` set or resolution status changes — this is what the reproposal
rule (§9) actually compares. RESOLVE is one producer among several — the Affordance Engine consumes
`UnresolvedCondition[]`, never a RESOLVE-only type. This prevents RESOLVE from becoming the de facto
ontology for the whole loop.

**`buildLiveProspectus()`'s output must expose two separate, linked fields:**
```
{
  percept: Formation,
  unresolvedConditions: UnresolvedCondition[]   // each carries provenance → originating percept
}
```
Not a single blob — affordance derivation and Path Memory both need to trace a condition back to
the exact percept that produced it.

### 4. RESOLVE integration (Pattern 1, primary producer — owned by 1202)

Real shape confirmed against `observestoryview.jsx`'s `adjudicate()`/`getLastAdjudication()`
(2026-08-25):

| Proposal field | Real KRYLO field | Status |
|---|---|---|
| `residual_reason` | `basis` | real, direct map |
| `conflict_pairs` | `pairwise` | real, richer — every candidate pair, not just one |
| `supporting_evidence` | `candidateTaps` | real, direct map |
| `conflicting_evidence` | `conflict.a`/`conflict.b` | partial — only first detected conflict |
| `missing_evidence_types` | — | absent, needs new computation |
| `provenance_gaps` | — | absent, needs new computation |
| `temporal_constraints` | — | absent, needs new computation |
| `formation_context` (structured) | — | absent, needs new computation |

`topologyPrimitives`/`normalizationEvidence` are already explicit null-with-reason — reuse that
pattern for the three new absent fields rather than inventing a different absence convention.

**Pattern 1 — Direct Conflict Discrimination** (primary): trigger on `CONFLICT` or
`UNRESOLVED_NO_RANKING` with non-empty `pairwise` conflicts. Target = the conflicting
relationship/candidate pair. `discrimination_capability.conflict_pairs` = the pairs an available
observation type could bear on. One affordance per maximal conflict clique, not one per pair, to
avoid combinatorial explosion.

Patterns 2–6 (Missing Evidence Completion, Provenance Gap, No-Ranking, Boundary Uncertainty,
Temporal Insufficiency) follow the same shape — trigger, target, `discrimination_capability` — and
are lower priority for v1 than Pattern 1. Build Pattern 1 first; the others compose the same way
once the `UnresolvedCondition` subtypes that feed them (`EvidenceGap` etc.) exist.

### 5. Observational utility metric (owned by 1202)

Ranks affordances by **capability to discriminate**, never by predicted result.

```
U(a) =   w1·Δconflict_norm(a)
       + w2·Δevidence_norm(a)
       + w3·Δboundary_norm(a)
       + w4·Δtemporal_norm(a)
       + w5·availability(a)
       - w6·cost(a)
```

Each `Δ*_norm` term is normalized to [0,1] before weighting (a fix over the first draft, which used
raw cardinalities — an affordance resolving 10 conflicts would otherwise always dominate one
closing a single provenance gap regardless of the weights). `Δconflict(a)` is computed from
**declared observation capability**, not anticipated result:

```
D_cap(o, u) = { conflicts in C_u for which o's declared observation_type
                is capable of providing discriminating evidence }
Δconflict(o, u) = |C_u| − |C_u \ D_cap(o, u)|
```

`availability(a)` comes from KRYL-1204's capability registry — binary or graded. `cost(a)` is
derived from known Data Tap latency/scope, never a predictive model. Weights `w1..w6` are
configuration constants, not learned. Salience modulates `U(a)` only as a multiplier applied after
these terms are computed — it never generates an affordance itself and never injects a forward
prediction (preserves the existing salience engine's role without letting it become a forecasting
input).

Ties broken by provenance recency, then deterministic id order.

### 6. Targeted invocation (owned by 1204)

Per `specs/SPEC-targeted-connector-adapter.md` (unchanged by this spec — still NEEDS-SPEC on its
own open item: exact per-connector target-field mapping, a Founder call before build-ready). This
spec adds: 1204 owns the lifecycle from `REQUESTED` through `NORMALIZED` only (see §8). Confirmed
2026-08-25: no generic on-demand dispatch mechanism exists anywhere in the codebase today — every
connector is an independent scheduled polling job. The only two real on-demand, target-scoped
precedents anywhere in KRYLO are `useEntitySignal.js` (`/api/signals/entity`) and `conemap.jsx`'s
`/api/resonance` fetch, both bespoke. The capability registry is genuinely new infrastructure.

**Grounded v1 connector candidate: `secownershipconnector.js`.** Confirmed 2026-08-25 — its
`runSecOwnershipSync({from, to})` already accepts real targeting parameters, passed directly into
`searchOwnershipFilings(startdt, enddt)`. No wrapper change needed to invoke it targeted; this is
the strongest already-live parameterizable connector found in the inventory. Subject to its exact
target-field/parameter mapping still being captured (open item above).

**`edgar8kconnector.js` is explicitly not v1-ready.** `fetch8KFilings()` hardcodes the 8-K form
filter and date window with zero entity/CIK parameter anywhere in the query, even though SEC's
underlying search API is entity-filterable. Locking EDGAR as v1's connector would require building
that targeting parameter first — real implementation work, not a selection. Confirms the known
EDGAR/XBRL gap precisely: no XBRL-specific connector exists in this codebase at all; `edgar8kconnector.js`
only reaches SEC's 8-K full-text search (event/materiality), not structured financial data.

**Deep grounding on `secownershipconnector.js`, 2026-08-25 — corrects the "no wrapper change
needed" claim above.** `from`/`to` are date-only (a filing-date window on the underlying EDGAR
search), not entity-scoped — zero CIK/name/identifier parameter exists anywhere in
`runSecOwnershipSync`/`searchOwnershipFilings`. It fetches up to 100 SC 13D/13G filings *across all
entities* in the window, with no way to request "filings involving entity A/B." **Parameter-
accepting ≠ target-capable**: this connector cannot serve a RESOLVE-targeted affordance today.
Worse — even its own aggregate output loses all entity specificity: the rich per-hit data it
extracts (`extractOwnershipPair()` — subject/filer CIK, name, filing date, accession) is written
into a separate subsystem (`entitytopologyregistry.js`/RelationCore admission), never returned to
the caller, never reaching `dispatchBatch()`. The one event that reaches the formation pipeline is
a single coarse aggregate — `{source, domain:'OWNERSHIP', signal:<filing count 0-100>, ...}` — no
entity identity at all.

**RULED 2026-08-25, Founder: `secownershipconnector.js` is the v1 targeted-observation connector**,
preserving its existing EDGAR-fallback role, with the following implementation boundary:

1. **Extend targeting** — add entity/CIK-scoped parameters to the existing invocation; preserve
   existing date-window behavior (additive, not a replacement).
2. **Preserve rich evidence** — do not collapse a targeted result to the current aggregate
   filing-count signal. The entity-specific filing evidence already extracted by
   `extractOwnershipPair()` must carry into the canonical observation/evidence path, not only into
   `entitytopologyregistry.js`.
3. **Preserve fallback** — existing EDGAR-fallback/untargeted sync behavior remains intact, no
   regression to current ownership synchronization.
4. **Route through the ratified v1 path** — Observation Affordance → `ObservationRequest` →
   KRYL-1204 targeted invocation → `secownershipconnector.js` → EAG/SIL admission (adapter-local,
   narrow scope, §7) → `dispatchBatch()` → existing evidence/provenance substrate →
   `inferFormation()` → updated percept → Observation Path Memory.
5. **Hard loss-boundary requirement** — entity/CIK, filing identity, accession/reference, source,
   temporal scope, and provenance needed to explain the observation must survive into the canonical
   evidence path. No silent reduction to `{filing_count}`.
6. **No KRYLCF/Structural Integrity simulation** — the ratified v1 compatibility rule (restated
   above) remains untouched; this connector work does not create or route through anything named
   Structural Integrity or Cognitive Fabric.
7. **Pre-build-ready verification set** (before this item can close): targeted entity A, targeted
   entity B, date scope alone, no-match result, multi-hit result, existing untargeted fallback,
   provenance preservation, canonical pipeline admission, before/after percept recomposition.

### 7. EAG / SIL admission (owned by 1203)

Per `specs/SPEC-evidence-admission-gate.md` (RATIFIED, EAC1-EAC5 — unchanged by this spec). This is
the **sole legitimate re-entry point** for any observation produced by this loop.

**Insertion point, precisely grounded 2026-08-25 (corrects the prior assumed path):**

```
KRYL-1204 targeted adapter
      │
      ├── construct targeted observation result
      ├── EAG admission (EAC1-EAC5)
      │      ├── admitted  → dispatchBatch()
      │      └── rejected  → terminal admission failure (first-class record, never silent drop)
      ↓
dispatchBatch()  (surfacerouter.js — UNCHANGED)
      ↓
domaingravity.js's __gravity__ subscription handler  (UNCHANGED, the only subscriber touching _pool)
      ↓
_pool → getAllSignals() → buildPerceptionField() → inferFormation() → updated percept
```

**EAG is adapter-local to KRYL-1204 — not a global interceptor.** The naive insertion point
(`domaingravity.js`'s handler, the one place all connector traffic funnels through) is confirmed
real but wrong: EAG is ratified NARROW (gates only the new KRYL-1204 path, not the ~30 existing
connectors already flowing through `dispatchBatch()`). Inserting EAG there would silently
broaden the ratified scope into a global gate. `subsignalbuffer.js` is not part of this chain at
all (a separate, unrelated audit substrate — corrects the prior ticket comment that assumed it
sat between `dispatchBatch()` and the `domaingravity` pool). `surfaceRouter` is not the admission
layer; `dispatchBatch()` itself is unchanged.

**The enforceable invariant:** every observation originating from the KRYL-1204 targeted-observation
path MUST pass through KRYL-1203's EAG admission step before that observation is submitted to
`dispatchBatch()`. Existing connector traffic (the ~30 already-live scheduled connectors) remains
outside EAG's ratified v1 scope — narrow by design, not an oversight.

**Structural enforcement, not documentation-only (closes the "EAG bypass" gap found in the
2026-08-25 adversarial review):** KRYL-1204's targeted-invocation module must not import
`dispatchBatch` directly. The only exported dispatch path available to 1204's code is an
EAG-wrapped function (e.g. `admitAndDispatch(observation)`) that internally runs EAC1-EAC5 and
calls the real `dispatchBatch()` only on admission. `dispatchBatch()` itself stays a private import
inside that one wrapper module — no other module in the KRYL-1204 targeted-observation path may
hold a reference to it. This is a build-time/module-boundary requirement, verifiable by grep (zero
`import.*dispatchBatch` outside that one wrapper and the existing ~30 connector call sites), not
merely a documented convention.

Once admitted, evidence enters the existing evidence/provenance substrate directly via
`dispatchBatch()`, per the v1 KRYLCF Compatibility Rule restated above — not through any
KRYLCF/Structural Integrity step.

### 8. Lifecycle state machine (owned jointly, boundaries below)

```
REQUESTED → PLANNED → DISPATCHED → OBSERVING → RECEIVED → NORMALIZED → ADMITTED → PERCEIVED → INCORPORATED
```

Terminal failure states, reachable from any non-terminal state: `UNAVAILABLE`, `WITHHELD`,
`FAILED`, `EXPIRED`, `INSUFFICIENT`.

**Naming correction (second Bottle Test remediation, 2026-08-26):** the implementation had drifted
to `UNSUPPORTED` for the no-capability case while this spec named it `UNAVAILABLE` — a real
divergence caught by the second Bottle Test. `observationorchestrator.js` is now renamed to
`UNAVAILABLE`, matching this spec; `UNSUPPORTED` no longer appears anywhere in the closed-loop
implementation.

**Ownership boundary:** `REQUESTED`→`NORMALIZED` = KRYL-1204. `ADMITTED` = KRYL-1203. `PERCEIVED`→
`INCORPORATED` = KRYL-1202 (via existing `inferFormation()`, no KRYLCF step).

**Transition guards:**

| From | To | Required predicate |
|---|---|---|
| REQUESTED | PLANNED | Affordance still exists in current percept; capability registry returns ≥1 capable tap |
| PLANNED | DISPATCHED | Plan fully instantiated (concrete tap, scope, params); `availability=true` |
| DISPATCHED | OBSERVING | Executor acknowledgement received |
| OBSERVING | RECEIVED | Payload (or explicit empty result) arrived |
| RECEIVED | NORMALIZED | Payload mapped into canonical Observation schema; provenance attached |
| NORMALIZED | ADMITTED | Passes EAC1-EAC5 (KRYL-1203) |
| ADMITTED | PERCEIVED | Entered evidence/provenance substrate, produced a `PerceptionField` update |
| PERCEIVED | INCORPORATED | `inferFormation()` re-run, produced a `FormationDelta` (real change **or** explicit zero-delta with residual unresolved recorded) |
| any | UNAVAILABLE / WITHHELD / FAILED / EXPIRED | per capability registry / policy / executor / timeout |

**`INSUFFICIENT` — corrected semantics (this was a real ambiguity in the first draft):**
`INSUFFICIENT` means the observation itself failed minimum evidentiary requirements for admission —
**not** that it failed to resolve the originating unresolved condition. An observation that is
validly `ADMITTED` → `PERCEIVED` → `INCORPORATED` but leaves the originating condition unresolved
is a **legitimate, valuable `INCORPORATED` result** with `residual_unresolved` recorded — "we
observed it, the evidence was valid, it entered perception, it did not resolve the question" is
real information, not a failure.

**Invariants:** one non-terminal state at a time; no transitions after a terminal state; every
transition writes a `LifecycleTransition{from,to,timestamp,guard_evidence}` into Path Memory (§9);
`consequence.percept_id_after` is written iff `INCORPORATED`.

### 9. Observation Path Memory (owned by 1202, cross-cutting — not a fourth ticket)

```typescript
interface ObservationPathRecord {
  id: string;
  percept_id_before: string;
  affordance_id: string;
  unresolved_condition: UnresolvedCondition;   // snapshot, including id/version at execution time
  observation_request: ObservationRequest;      // 1204
  observation_plan: ObservationPlan | null;      // 1204
  data_tap_id: string | null;                    // 1204
  observation_id: string | null;                 // the re-entered Observation
  availability_snapshot: boolean;                // the affordance's `available` value at request
                                                  // time — the baseline the reproposal rule (§9)
                                                  // compares against on a later derivation attempt
  lifecycle_states: LifecycleTransition[];
  consequence: {
    percept_id_after: string | null;
    relationships_changed: string[];
    formation_delta: FormationDelta | null;
    residual_unresolved: UnresolvedCondition[];
  };
  provenance: ProvenanceDAG;
  created_at: Instant;
  completed_at: Instant | null;
}
```

The reproposal rule's "same evidence/provenance set" check (§9, condition 2) compares
`unresolved_condition.evidence_ref_ids` (§3) between the stored record and the condition's current
state — not a separate hash field. "Same condition identity/version" (condition 1) compares
`unresolved_condition.id`/`.version` directly. "Same capability availability" (condition 4)
compares the newly-derived affordance's `available` value against `availability_snapshot`. All
four now resolve to concrete, storable fields — no field was invented that isn't already part of
`UnresolvedCondition` or this record.

Append-only, indexed by `percept_id_before`, `affordance_id`, `observation_id`. Record created at
`ObservationRequest` acceptance; `consequence` written only after the observation completes the
full chain or hits a terminal failure. Never mutated after `completed_at`. Queried by the Affordance
Engine and by the surface for audit display.

**Reproposal suppression rule (RATIFIED 2026-08-25 — closes the "reproposal loop" gap found in the
adversarial review):**

> Zero-discrimination does not permanently suppress an affordance. It suppresses re-proposal
> against the same percept/condition state until the system detects a material evidence or
> condition change that invalidates the prior zero-discrimination result.

The Affordance Engine may suppress deriving a previously-executed affordance again only when **all
five** of the following remain unchanged versus the prior `ObservationPathRecord`:
1. Same unresolved-condition identity/version.
2. Same relevant evidence/provenance set.
3. Same observation target and scope (`TargetSpec`).
4. Same capability availability (per the target-capability check, §2).
5. Prior path terminated with this condition's own `id` still present in
   `consequence.residual_unresolved`.

**Correction found during KRYL-1202's build (2026-08-26):** condition 5 is determined solely by
whether *this specific condition* still appears in `residual_unresolved` — never by
`formation_delta`'s null-ness. `formation_delta` reflects an unrelated fact (whether some broader
cross-domain Formation exists at all, which depends on unrelated domains too); a targeted
observation can genuinely address this exact condition while `formation_delta` stays null for
unrelated reasons. An earlier version of this rule used `formation_delta === null` as an
alternate zero-discrimination signal — confirmed to produce a false zero-discrimination result in
testing despite real, on-target evidence having been admitted. Removed.

Any material change to the condition or its relevant evidence reopens derivation eligibility —
this is a real queryable check against Path Memory (condition version + evidence-set hash + target
+ availability), not an assertion in prose.

**Explicit invariant — `INSUFFICIENT` does not mean permanently unusable:** `INSUFFICIENT` (or a
zero-delta `INCORPORATED` with `residual_unresolved` recorded, §8) means *this observation did not
resolve this condition under the evidence state in which it was executed* — never *this observation
can never be useful again*. The five-condition suppression check above is the only mechanism that
may withhold re-derivation, and only until any one of the five conditions changes.

### 10. The hard boundary invariant

> **An Observation Affordance can request an observation. It cannot admit an observation.**
> `Affordance ≠ Evidence ≠ Admission ≠ Formation`. The only re-entry path is: Observation → EAG/SIL
> admission (1203) → existing evidence/provenance substrate → `inferFormation()` (existing,
> unchanged). No Observation Affordance, request, or plan may directly mutate Evidence, RelationCore,
> or Formation. This must be a tested invariant in the implementation, not prose.

## COMPONENTS

**In scope for build (across the three tickets, while the perception engine is on the lift):**
1202 — `ObservationAffordance` type, `UnresolvedCondition` hierarchy, `deriveObservationAffordances()`,
utility metric, RESOLVE Pattern 1 adapter, Path Memory store + query interface, deduplication,
deterministic ranking. 1204 — `ObservationRequest`/`ObservationPlan` types, capability registry,
targeted connector adapter(s) per `SPEC-targeted-connector-adapter.md`, orchestrator through
`NORMALIZED`, explicit failure states. 1203 — EAG/SIL admission per its ratified spec, no changes
needed beyond what's already ratified. `analysisfield.jsx` — a compact Observation Field surfacing
ranked affordances, built **after** the machinery is proven end-to-end, not before.

**Explicitly out of scope / non-goals:**
- Any KRYLCF/Structural Integrity/Cognitive Fabric component, named or equivalent — future,
  per the ratified v1 rule.
- Patterns 2–6 of RESOLVE integration beyond what's needed to prove the loop (Pattern 1 first).
- The full ~25+ connector fleet — start narrow (KRYL-1204's own open item, 1-2 connectors).
- Any change to `inferFormation()`, `buildPerceptionField()`, `buildFormationProspectus()`,
  `buildLiveProspectus()` — reused exactly as they exist.
- The ConeMap formation pipeline (`formationschema.js`/`formationadapter.js`/`domaingravity.js`) —
  separate, untouched system.

## DEPENDENCIES

KRYL-1202 (percept/affordance/orchestration doctrine, v1 Compatibility Rule — ratified). KRYL-1203
/ `SPEC-evidence-admission-gate.md` (ratified EAC1-EAC5). KRYL-1204 / `SPEC-targeted-connector-
adapter.md` (draft, own open items unresolved). KRYL-1170 (KRYLCF doctrine authority, naming
history). `observestoryview.jsx` (RESOLVE's real adjudication shape). `perceptionread.js` /
`formationinference.js` / `formationprospectus.js` / `formationprospectusproducer.js` /
`analysisfield.jsx` (the real, live attachment chain).

## VALIDATION

Before BUILD-READY:
- [x] **RATIFIED 2026-08-25, Founder** — the four corrections: (1) capability-based utility, no
  predictive quantity; (2) normalized utility dimensions, weights interpretable; (3) corrected
  `INSUFFICIENT` semantics — an observation can complete the canonical admission/recomposition path
  while failing to resolve its originating condition, a legitimate terminal outcome with residual
  unresolved state recorded; (4) `discrimination_capability` is the canonical field name, not
  language implying a predicted outcome.
- [x] **RULED 2026-08-25, Founder** — KRYL-1204 v1 connector: `secownershipconnector.js`. Deep
  grounding corrected the earlier "no wrapper change needed" claim — `from`/`to` are date-only, no
  entity scoping exists, and even the aggregate output loses all entity specificity before
  `dispatchBatch()`. Ruling accepts this as real implementation work (not a zero-cost selection),
  with a 7-point implementation boundary and a 9-item pre-build-ready verification set — see §6.
  `edgar8kconnector.js` confirmed not v1-ready (hardcoded query, no entity/CIK parameter).
- [x] **GROUNDED 2026-08-25** — real EAG/SIL insertion boundary: adapter-local to KRYL-1204,
  called before `dispatchBatch()`, not inside `domaingravity.js`/`surfaceRouter` (which would
  over-broaden the ratified NARROW scope to all ~30 existing connectors). `subsignalbuffer.js`
  confirmed not part of this chain — see §7 for the corrected path and invariant.
- [x] **RATIFIED 2026-08-25, Founder** — reproposal suppression rule: zero-discrimination
  suppresses re-derivation only until a material change to condition/evidence/target/availability
  is detected (five-condition check, §9), never permanently. `INSUFFICIENT` means "did not resolve
  under this evidence state," never "can never be useful again."
- [x] **All five gaps from the 2026-08-25 adversarial review closed by spec edit:**
  1. EAG bypass → structural module-boundary enforcement added (§7): `dispatchBatch` import
     restricted to one EAG-wrapped function, verifiable by grep.
  2. UI reasoning → structural enforcement added (GUIDELINES): `analysisfield.jsx` may only
     consume finished `ObservationAffordance[]` output, not derivation internals, verifiable by grep.
  3. Reproposal loop → ratified rule above, now a defined queryable check, not an assertion.
  4. Connector targeting failure → target-capability requirement added to `available` (§2): must
     verify the tap can address the specific target, not just that a type-matching tap exists.
  5. Prediction-leakage / undefined types → `TargetSpec`, `ObservationType`,
     `UnresolvedConditionKind`, `ObservationRequest`, `ObservationPlan` now fully typed (§2),
     checked for predictive fields — none found.
- [x] **Bottle Test re-run 2026-08-25 — 3/5 gaps genuinely closed (EAG bypass, UI reasoning,
  prediction leakage/undefined types), 2/5 found only partially closed (reproposal rule referenced
  schema fields that didn't exist; connector targeting required an outcome with no mechanism).**
  Both now closed by spec edit: `UnresolvedCondition` gained `id`/`version`/`evidence_ref_ids`;
  `ObservationPathRecord` gained `availability_snapshot`; the capability registry gained a
  `DataTapCapability.targetable_fields` mechanism (§2). **Not yet re-verified a third time** — the
  prior two passes each found real gaps in what looked complete; one more check is warranted before
  calling this BUILD-READY rather than asserting it here.

**Adversarial validation required before the final gate (not just the happy path):**
1. RESOLVE conflict → affordance → observation → admission → conflict reduced.
2. Missing evidence → affordance → observation → evidence supplied.
3. Unavailable tap → affordance → no capability → `UNAVAILABLE`.
4. Withheld → request → tap/policy refuses → `WITHHELD`.
5. Insufficient observation → received, admitted, `INCORPORATED`, originating condition still
   unresolved → `residual_unresolved` recorded, not fabricated as success.
6. No-change observation → admitted, `inferFormation()` re-run, zero `FormationDelta`,
   `INCORPORATED` with residual recorded — not treated as failure.

**Final Go/No-Go gate** (per KRYL-1202's own acceptance criteria — restated, not redefined here):
run against a clean build and fresh runtime on real data, across multiple affordance classes.
Deliverable is exactly three artifacts — Evidence, Exceptions, Decision (GO or NO-GO). NO-GO is a
valid, meaningful result, not a failure of process — it returns the work to the build/fix cycle,
not to redesign.

## ROLLBACK

Spec-only artifact at filing time — nothing to roll back. Implementation rollback, if needed later,
is standard git history against whatever commits build this.

## GUIDELINES

- Sense → Perceive → Orient → Observe. Present, not Dominant. No prediction, no autonomous external
  action, no demand creation, no judgment-as-observation.
- The surface (`analysisfield.jsx`'s Observation Field) is a consumer of the engine, never where the
  loop is implemented. Build the machinery first, prove it end-to-end, expose it last.
- Every affordance must be derivable from a typed `UnresolvedCondition` or explicitly declared
  perceptual opportunity present in the current percept. Affordance generation may not originate
  from presentation-layer content — this closes the door on the UI becoming the intelligence layer.
  **Structural enforcement (closes the "UI reasoning" gap found in the 2026-08-25 adversarial
  review — confirmed `analysisfield.jsx` has no existing affordance-like logic today, this
  prevents one being added there later):** `analysisfield.jsx`'s Observation Field may only import
  and render pre-computed `ObservationAffordance[]` data handed to it as props from KRYL-1202's
  engine. It must not import `deriveObservationAffordances()`, the utility metric functions, raw
  `UnresolvedCondition` data, or the raw percept — only the engine's finished affordance output.
  Verifiable by grep (no import of 1202's derivation internals from `analysisfield.jsx` or any file
  under its directory), not documentation alone.
