# WO-1328 EXTENSION — VERIFICATION BINDING CONTRACT (FINAL)
## `TAS.VerificationBinding` (Additive Module)
**Status:** LOCKED  
**Date:** 2026-05-29  
**Extends:** WO-1328 (KERNEL-STABLE — additive only)  
**Depends on:** WO-1301 (L1 Causal Substrate — L1_INDEX must be exposed)

---

## 0. NON-MUTATION GUARANTEE

This module is strictly additive over WO-1328.  
No modifications to: `TemporalAuthority`, `TemporalMode`, `resolve_time()`, `Scrubber`, L1 ingestion logic.

---

## 1. TEMPORAL MODEL — SURJECTIVE BINDING

This system defines a **substrate-anchored surjection**.

Let:
- S = substrate_time (L1, immutable)
- E = emergence_time (L2, derived)
- V = verification_time (external observation)

Mapping: `F: (E, V) → S`

Multiple (E, V) pairs MAY map to the same S. This is expected and valid.

### Collision Resolution Rule

When multiple verification events map to the same `substrate_anchor_id`:

```
resolution_policy = "DETERMINISTIC_COLLAPSE"
```

1. Sort by `verification_time` ascending
2. Tie-break by `hash(event_payload)`

### Hash Collision Safety

If `hash(event_payload)` collision occurs:

```
status = "COLLISION_UNRESOLVED"
```

- Excluded from calibration
- Excluded from Resonance Ratio
- Retained in audit ledger (forensic only)
- Does NOT participate in deterministic collapse

---

## 2. VERIFICATION WINDOW CONTRACT

```ts
verification_window: {
  value: number | null
  unit: "ms" | "s" | "m" | "h" | "d" | "domain_relative"
  status: "UNRESOLVED" | "ACTIVE" | "LOCKED"
  mode: "FIXED" | "ADAPTIVE" | "DOMAIN_CALIBRATED"
}
```

### Hard Rule (Truth-First)

If `value == null AND status == "UNRESOLVED"`:

> REJECT ALL verification events at ingestion boundary.  
> No queueing permitted.  
> All rejections audit-ledgered.

### Staleness Rule

If `verification_time - emergence_time > verification_window.value`:

- Marked `status: "STALE_VERIFICATION"`
- Excluded from calibration and performance scoring
- Retained for drift analysis only

---

## 3. SUBSTRATE ANCHOR RESOLUTION

### Mechanism

```
substrate_anchor_id = hash_lookup(L1.ingestion_log)
```

### WO-1301 Dependency

Requires WO-1301 to expose:

```ts
L1_INDEX: Map<substrate_anchor_id, IngestionRecord>
```

If `L1_INDEX` is not exposed: verification system cannot function — all events fall into REJECT or ORPHANED states.

### Invalid States → REJECT

| Condition        | Reason Code         |
|------------------|---------------------|
| No match         | `L1_LOOKUP_FAILURE` |
| Multiple matches | `ANCHOR_AMBIGUOUS`  |
| Partial match    | `ANCHOR_CORRUPT`    |

---

## 4. REALIZED SHIFT — FORMAL DEFINITION

Let:
- P = predicted state vector at `emergence_time`
- R = observed state vector at `verification_time`

```
realizedShift = Δ(R, P)
```

Where `Δ` = domain-specific distance function.

### Domain Requirement

Each domain MUST define:

```ts
distanceFunction(domain: Domain): (a: StateVector, b: StateVector) => number
```

### Invalid Cases → REJECT

| Condition                 | Reason Code                 |
|---------------------------|-----------------------------|
| P missing                 | `PREDICTED_STATE_MISSING`   |
| R missing                 | `OBSERVED_STATE_MISSING`    |
| distanceFunction missing  | `DISTANCE_FUNCTION_MISSING` |

If distance function missing: `realizedShift = NULL` (NOT zero — undefined, excluded from calibration).

---

## 5. REJECTION + ORPHAN AUDIT DISPOSITION

### All Rejected Events MUST Be Logged

```ts
AuditLedger.append({
  event_id: string
  rejection_reason: string   // reason codes below
  substrate_anchor_id?: string
  timestamp: number
})
```

### Rejection Reason Codes

- `WINDOW_UNRESOLVED`
- `WINDOW_EXCEEDED`
- `L1_LOOKUP_FAILURE`
- `ANCHOR_AMBIGUOUS`
- `ANCHOR_CORRUPT`
- `PREDICTED_STATE_MISSING`
- `OBSERVED_STATE_MISSING`
- `DISTANCE_FUNCTION_MISSING`
- `SCHEMA_INCOMPLETE`

Silent rejection is forbidden. Every invalid state produces an audit record.

### Orphaned Events

- Retained in audit ledger only
- Excluded from calibration and scoring
- Reason code: `ORPHAN`

---

## 6. CALIBRATION ELIGIBILITY GATE

An event enters `VALID_VERIFICATION_SET` only if ALL conditions are met:

1. `substrate_anchor_id` resolves uniquely in L1_INDEX
2. `verification_window.status` is ACTIVE or LOCKED
3. `emergence_time` exists
4. `verification_time` exists and is within window
5. Domain `distanceFunction` exists and is registered
6. Status is NOT: ORPHANED / REJECTED / COLLISION_UNRESOLVED / STALE_VERIFICATION

WO-1344 (Calibration Engine) MAY ONLY consume `VALID_VERIFICATION_SET`.

---

## 7. RESONANCE RATIO COMPUTABILITY RULE

Computable only if:
- ≥ 1 `VALID_VERIFICATION_EVENT` exists
- Time alignment integrity holds across all three clocks
- No orphaned events included in aggregation set

Otherwise: `Resonance Ratio = NULL` (not zero, not degraded — undefined).

---

## 8. SYSTEM SEMANTICS

### Allowed
- Deterministic replay reconstruction
- Delayed verification ingestion (within window)
- Multi-event mapping to single substrate anchor
- Adaptive windowing (future WO-1344 input)

### Forbidden
- Silent rejection
- Unlogged failure states
- Calibration on unresolved collisions
- Orphan accumulation without audit trace
- Cross-clock inference without substrate anchoring

---

## 9. DOWNSTREAM DEPENDENCY CHAIN

```
TAS.VerificationBinding (this spec)
    ↓
WO-1342 — OutcomeVerification Framework
    ↓
WO-1343 — Verification Bay
          (UI scaffolding may proceed in parallel;
           data binding requires WO-1342 schema stable)
    ↓
WO-1344 — Confidence Calibration Engine
          (requires VALID_VERIFICATION_SET producing records)
```

---

## FINAL STATE

This spec is:
- Deterministic under collision conditions
- Fully auditable under rejection conditions
- Replay-safe under multi-event anchoring
- Dependency-explicit (WO-1301 boundary clarified)
- Implementation-ready without interpretation branching

Next: TypeScript runtime guards for substrate resolution, collision detection, and verification window enforcement.
