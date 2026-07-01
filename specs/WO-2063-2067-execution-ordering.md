# Execution Ordering Guarantees
## Control-Flow Governance — WO-2063 through WO-2067

**Status:** LOCKED
**Filed:** 2026-07-01
**Scope:** Runtime constraint model across Domain Package → Metric Adapter → Cone Surface

---

## Canonical Execution Sequence

```
PHASE 1 — MOUNT
PHASE 2 — DOMAIN EXECUTION
PHASE 3 — ADAPTATION
PHASE 4 — COMPOSITION (conditional)
PHASE 5 — RENDERING
```

Phases are strictly sequential within a single subject evaluation.
No phase may begin before the prior phase has emitted a complete output.

---

## Phase Definitions

### PHASE 1 — MOUNT

Domain Registry selects and instantiates the correct Domain Package for the subject.

Permitted:
- Domain Registry lookup (declarative, no computation)
- Domain Package instantiation with subject context

Forbidden:
- Any Metric Adapter operation
- Any Cone Surface operation
- Any cross-domain resolution

---

### PHASE 2 — DOMAIN EXECUTION

Domain Package executes in full, in order:

```
DOMAIN_STATE → COMPONENT_GRAPH → SIGNAL_EVALUATION → CAUSAL_MAP
```

All four components must be complete before Phase 2 is considered done.
Partial output is not a valid Phase 2 exit condition.

Permitted:
- Multiple Domain Packages executing in parallel (each is fully isolated)
- Signal pre-fetch within domain scope (speculative, domain-internal only)

Forbidden:
- Metric Adapter reading any partial domain output
- Cone Surface accessing any domain state
- Cross-domain comparison or composition
- Any reference to Decision Invariants inside the domain execution path

---

### PHASE 3 — ADAPTATION

Metric Adapter reads Domain Package output. Read-only. Maps domain-native outputs to Decision Invariants per WO-2063 schema.

Permitted:
- Reading finalized Domain Package output (DOMAIN_STATE, COMPONENT_GRAPH, SIGNAL_EVALUATION, CAUSAL_MAP)
- Mapping to Decision Invariant schema (Cost, Value, Time, Risk, Leverage, Flexibility, Confidence, Momentum)

Forbidden:
- Any mutation of Domain Package output
- Back-propagation of any kind into Phase 2
- Cone Surface executing in parallel with this phase
- Adapter executing before Phase 2 completion is confirmed

Domain Package is SEALED at Phase 3 entry. No further mutation permitted.

---

### PHASE 4 — COMPOSITION (conditional)

Applies only when cross-domain comparison is requested.

Entry condition: ALL relevant Domain Packages must have completed Phase 2 AND Phase 3 independently before Phase 4 begins.

Permitted:
- Composing Decision Invariant outputs from multiple completed adapters
- Comparing invariants across domains

Forbidden:
- Accessing raw Domain Package outputs directly (only adapted invariant outputs cross this boundary)
- Initiating Phase 4 while any Domain Package is still in Phase 2 or Phase 3
- Speculative cross-domain composition

---

### PHASE 5 — RENDERING

Cone Surface renders finalized state from Phase 3 (or Phase 4 if cross-domain).

Permitted:
- Reading finalized adapted outputs
- Reading finalized composed invariant outputs (Phase 4, if applicable)
- Cone template pre-preparation (speculative, no domain data required)

Forbidden:
- Triggering re-evaluation of any upstream phase
- Accessing raw Domain Package semantics directly
- Executing in parallel with Phase 3 or Phase 4

---

## Parallelism Rules (exhaustive)

| Operation | Permitted |
|---|---|
| Multiple Domain Packages (Phase 2) in parallel | YES — fully isolated |
| Phase 2 + Phase 3 for the same domain | NO — strictly sequential |
| Phase 3 + Phase 5 | NO — strictly sequential |
| Phase 4 while any Phase 2 is incomplete | NO — forbidden |
| Phase 4 while any Phase 3 is incomplete | NO — forbidden |
| Phase 5 while Phase 3 is incomplete | NO — forbidden |

---

## Speculative Compute (what is and is not permitted)

| Operation | Speculative Permitted |
|---|---|
| Domain Registry lookup | YES |
| Signal pre-fetch within domain scope | YES |
| Cone template preparation (no domain data) | YES |
| Metric Adapter warm-up | NO — depends on domain output |
| Cross-domain composition | NO — requires all Phase 2 + Phase 3 complete |
| Decision Invariant schema load | YES — schema is static |

---

## Hard Rules (non-negotiable)

1. No downstream phase may read partial output from an upstream phase.
2. Domain Package is sealed at Phase 3 entry — no mutation after.
3. Cross-domain composition never touches raw Domain Package output — invariant-adapted output only.
4. Cone Surface has no access path to Domain Package semantics at any phase.
5. Speculative compute is permitted only where it has zero dependency on domain execution state.

---

## One-line canonical constraint

> Each layer executes in full before the next layer is permitted to begin, except where explicitly isolated instances of the same layer may run concurrently.
