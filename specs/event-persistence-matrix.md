# Event Persistence Matrix — SSOT
# Version: 1.0.0 | Locked: 2026-05-29

This document is the single source of truth for all event persistence decisions.
Every surface that records, replays, or audits events MUST reference this contract.

---

## PERSISTENCE RULES

| Event Type     | Rule                                                                 | Rationale |
|----------------|----------------------------------------------------------------------|-----------|
| SEARCH         | Always                                                               | Every query is a causal origin point |
| ORACLE         | Always                                                               | Session open = inference commitment |
| MODEL          | stateId >= BUILDING_CONVERGENCE OR convergenceScore >= 0.55 OR noveltyDelta > 0.08 | Tri-gate: structural maturity + field pressure + discovery |
| PROFILE UPDATE | Always                                                               | Observer-frame mutation — always auditable |
| LENS CHANGE    | Always                                                               | Changes interpretation frame of all subsequent events |
| SYSTEM         | integrityViolation OR driftLockActivated OR substrate_desync_detected | Integrity-only — ephemeral telemetry is dropped |
| EMERGENCE      | Always + immutable                                                   | Highest epistemic significance — never pruned |
| TRANSACTION    | Always                                                               | Causal record of session closure |

---

## MODEL TRI-GATE (detailed)

```
persist_MODEL =
  (stateId >= BUILDING_CONVERGENCE)   // structural maturity
  OR (convergenceScore >= 0.55)       // field pressure override (classifier lag)
  OR (noveltyDelta > 0.08)            // active discovery — system is finding something
```

BUILDING_CONVERGENCE = stateId 2 (from convergenceclassifier.js)

Failure modes prevented:
- Over-filtering early exploration → noveltyDelta gate
- False-positive noise → stateId floor
- Classifier lag blindness → convergenceScore override

---

## SYSTEM EVENT GATE (detailed)

```
persist_SYSTEM =
  integrityViolation === true
  OR driftLockActivated === true
  OR substrate_desync_detected === true
```

All other SYSTEM events are ephemeral telemetry and are dropped.

---

## FALLBACK BEHAVIOR

If signal fields (stateId, convergenceScore, noveltyDelta) are unavailable:
- MODEL events → persist (fail open, not fail closed)
- SYSTEM events → do not persist (fail closed, avoid noise)

Reason: missing signal data means we cannot confirm filter conditions.
For MODEL: preserve by default (avoid epistemic loss).
For SYSTEM: suppress by default (avoid integrity spam).

---

## IMMUTABILITY CONTRACT

EMERGENCE events, once persisted, may never be:
- deleted
- overwritten
- filtered retroactively

All other event types may be pruned by retention policy (not yet defined).
