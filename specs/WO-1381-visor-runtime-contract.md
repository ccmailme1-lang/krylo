# WO-1381 — VISOR RUNTIME CONTRACT SPECIFICATION (FULL SYSTEM)

**Type:** System Interface Specification (Transport-Agnostic)
**Status:** LOCKED
**Date:** 2026-06-02

## Purpose

Define all runtime boundaries and data contracts between:

- Visor Bay (execution surface)
- Backend Control Plane (orchestration + normalization layer)
- Precursor Field Engine (WO-1327)
- Causal Inference OS (WO-1336)

This spec enforces: isolation, determinism, and bounded cross-layer communication.

---

## 1. CORE ARCHITECTURAL MODEL

### 1.1 System Partitioning

```
[ VISOR BAY ]
   ↓ COMMANDS
[ BACKEND CONTROL PLANE ]
   ↓ deterministic routing
[ WO-1327: PRECURSOR FIELD ENGINE ]
[ WO-1336: CAUSAL INFERENCE OS ]
   ↑ OBSERVATIONS ONLY
```

### 1.2 Hard Isolation Rules

- Bays NEVER communicate directly with each other
- Bays NEVER access inference outputs directly
- Engine layers NEVER mutate bay state
- All cross-layer communication MUST pass through backend

---

## 2. BAY ↔ BACKEND CONTRACT

### 2.1 COMMAND ENVELOPE (Bay → Backend)

```json
{
  "type": "COMMAND",
  "bayId": "b01",
  "coneId": "cone01",
  "mode": "DEFAULT | METRICS | ALERTS",
  "intent": "UPDATE_CONE | QUERY_STATE | ROTATE_VIEW",
  "payload": {},
  "correlationId": "uuid",
  "timestamp": 0
}
```

**Constraints:**
- `bayId` is immutable identity
- `coneId` must resolve via backend registry
- `intent` is strict enum
- `payload` is schema-validated per intent

### 2.2 RESPONSE ENVELOPE (Backend → Bay)

```json
{
  "type": "STATE_UPDATE | QUERY_RESULT | ALERT_EVENT",
  "bayId": "b01",
  "coneId": "cone01",
  "state": {},
  "metrics": {},
  "alerts": [],
  "correlationId": "uuid",
  "derivedFrom": ["WO-1327", "WO-1336"]
}
```

**Constraints:**
- Responses are always bay-scoped unless explicitly tagged otherwise
- No cross-bay payload aggregation allowed in response body
- Alerts included are already prioritized (no re-evaluation in UI)

### 2.3 EVENT TYPES

```
COMMAND        → bay initiates action
STATE_UPDATE   → backend returns cone-scoped state
ALERT_EVENT    → backend emits structured alert
OBSERVATION    → inference-only metadata (no mutation authority)
```

---

## 3. BACKEND ↔ WO-1327 (PRECURSOR FIELD ENGINE)

### 3.1 INPUT CONTRACT

```json
{
  "coneId": "cone01",
  "bayId": "b01",
  "stateSnapshot": {},
  "metrics": {},
  "controlContext": {
    "mode": "DEFAULT | METRICS | ALERTS"
  }
}
```

**Constraints:**
- Input is always cone-scoped
- No multi-cone batch processing allowed
- Backend enforces isolation before dispatch

### 3.2 OUTPUT CONTRACT

```json
{
  "coneId": "cone01",
  "fieldState": {},
  "computedMetrics": {},
  "signals": [],
  "timestamp": 0
}
```

**Constraints:**
- Deterministic output per cone input
- No dependency on other cones or bays
- No inference-layer awareness

---

## 4. BACKEND ↔ WO-1336 (CAUSAL INFERENCE OS)

### 4.1 INPUT CONTRACT (OBSERVATIONAL ONLY)

```json
{
  "coneId": "cone01",
  "fieldState": {},
  "metrics": {},
  "signals": [],
  "historicalWindow": []
}
```

**Critical Rule:** Input is read-only snapshot. No control or mutation signals included.

### 4.2 OUTPUT CONTRACT

```json
{
  "coneId": "cone01",
  "causalGraph": {},
  "inferenceSignals": [],
  "explanations": [],
  "confidence": 0.0
}
```

**Constraints:**
- Inference MUST NOT influence state mutation directly
- Outputs are advisory/observational only
- No feedback loop into WO-1327 state generation

---

## 5. SYSTEM-WIDE INVARIANTS

### 5.1 Isolation Invariant
Each cone is a fully independent computation unit: no cross-cone runtime dependency is permitted.

### 5.2 Determinism Invariant
Given identical inputs: WO-1327 and WO-1336 must produce identical outputs.

### 5.3 Directionality Invariant
```
Bay → Backend → Engines → Backend → Bay
```
No reverse bypass paths exist.

### 5.4 Observability Invariant
- COMPARE / RESONANCE are derived from backend snapshots only
- They are not inputs to any engine
- They cannot influence state evolution

---

## 6. FAILURE DOMAIN RULES

**Forbidden behaviors:**
- Cross-bay state mutation
- Inference-driven control updates
- Shared execution memory between cones
- Backend bypass from UI → engine

**Required failure handling:**
- Backend rejects non-scoped cone operations
- Engine rejects cross-cone inputs
- Inference outputs are quarantined if misrouted

---

## 7. FINAL ARCHITECTURAL CLASSIFICATION

> A partitioned deterministic execution system with strict cone-scoped computation, mediated by a centralized control plane and supported by read-only inference and visualization layers.
