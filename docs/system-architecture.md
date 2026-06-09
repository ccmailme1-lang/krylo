# SYSTEM ARCHITECTURE (SSOT)

## 0. PURPOSE

This document is the authoritative system-level specification for the application.

It defines:
- UI surface inventory
- Data flow architecture
- State ownership boundaries
- Event contracts
- Entry point rules
- UX flow coherence
- System health signals

This document overrides assumptions derived from isolated code inspection.

---

# 1. SYSTEM OVERVIEW

The system is a **session-driven analytical runtime** composed of:

UI Input → SessionBootstrapEvent → Session Factory → Ingestion Layer → Tensor State → Oracle Mapper → OracleView

```txt
UI Input
  → SessionBootstrapEvent
  → handleSessionBootstrap
  → createSession
  → ingestionBuilder
  → tensor/inference/projection
  → useOracleMapper
  → OracleView
```

Core principle:

> UI never owns truth. It only emits events.

---

# 2. PAGE INVENTORY (UI SURFACE MAP)

## ConeSearch (Search Domain Input)

* Purpose: Entry point for analytical sessions
* Role: ENTRY
* State owned: searchQuery (ephemeral only)
* Emits: SessionBootstrapEvent
* Writes: NONE
* Reads: NONE

---

## Krylo Submit View

* Purpose: Alternate session entry trigger
* Role: ENTRY
* State owned: local input state
* Emits: SessionBootstrapEvent
* Writes: NONE

---

## Arc Interaction Layer

* Purpose: Graph/node-based session triggering
* Role: ENTRY
* Emits: SessionBootstrapEvent
* Writes: NONE

---

## OracleView

* Purpose: Primary analytical visualization layer
* Role: OUTPUT
* State owned: NONE
* Reads:

  * session
  * tensor
  * inference
  * projection
* Writes: NONE

---

## Feed / Dashboard Views

* Purpose: Aggregated session summaries
* Role: INTERMEDIATE
* Reads: session metadata
* Writes: NONE

---

# 3. DATA FLOW GRAPH

## Primary Flow

```txt
UI Input
  → SessionBootstrapEvent
  → handleSessionBootstrap
  → createSession
  → ingestionBuilder
  → tensor update
  → oracle projection generation
  → useOracleMapper
  → OracleView render
```

---

## Signal Flow (secondary)

```txt
ingestionBuilder
  → signal generation
  → tensor enrichment
  → projection refinement
```

---

## UI Flow (non-authoritative)

```txt
UI renders state only
UI does NOT mutate session or tensor
```

---

# 4. STATE OWNERSHIP MATRIX

| State       | Owner                  | Writers        | Readers         | Source of Truth         |
| ----------- | ---------------------- | -------------- | --------------- | ----------------------- |
| session     | handleSessionBootstrap | bootstrap only | Oracle + UI     | canonical               |
| tensor      | ingestionBuilder       | ingestion only | mapper + oracle | merged canonical/signal |
| inference   | oracle engine          | oracle engine  | UI              | derived                 |
| projection  | oracle engine          | oracle engine  | UI              | deterministic           |
| searchQuery | UI components          | UI only        | UI only         | ephemeral               |

RULE:

> Only one writer per state domain is allowed.

---

# 5. EVENT CONTRACT REGISTRY

## SessionBootstrapEvent

* Fired by: UI entry points
* Consumed by: handleSessionBootstrap
* Mutates state: YES (session creation)

---

## session_open (telemetry)

* Fired by: handleSessionBootstrap
* Consumed by: telemetry system
* Mutates state: NO

---

## action_dispatched

* Fired by: oracle execution layer
* Consumed by: telemetry system + resolver
* Mutates state: NO

---

## action_resolved

* Fired by: resolver layer (external truth system)
* Consumed by: telemetry system
* Mutates state: YES (telemetry only)

---

# 6. ENTRY POINT CONSOLIDATION RULE

All session creation MUST route through:

```txt
handleSessionBootstrap()
```

Forbidden:

* direct createSession calls in UI
* inline session construction
* bypass ingestion layer
* direct tensor mutation from UI

---

# 7. UX FLOW ANALYSIS

## Current friction points

### 1. Dual interpretation of search input (RESOLVED)

* Fixed by enforcing SessionBootstrapEvent only

### 2. UI state leakage risk

* searchQuery is ephemeral but previously used inconsistently

### 3. Navigation coupling risk

* must remain separate from session creation logic

---

## Recommended UX simplification

* Search input = ONLY session trigger
* No filtering behavior at global entry level
* All analysis happens in OracleView post-session

---

# 8. SYSTEM HEALTH ASSESSMENT

## Coupling Score: MEDIUM → improving

* Previously: UI ↔ session ↔ ingestion entangled
* Now: event-driven separation emerging

---

## State Fragmentation: LOW (target state)

* single canonical session pipeline

---

## Event Consistency: HIGH

* unified bootstrap event exists

---

## Architectural Drift Risk: MEDIUM

* risk exists if UI bypasses event system

---

# 9. RECOMMENDED REFACTOR ROADMAP

## Phase 1 — Critical Stabilization

* enforce SessionBootstrapEvent everywhere
* remove any direct session creation calls outside handler
* validate tensor initialization consistency

---

## Phase 2 — Structural Hardening

* formalize telemetry resolver layer
* enforce actionId stability
* introduce schema validation for session + tensor

---

## Phase 3 — Optimization Layer

* consider Rust/WASM acceleration (WO-1327)
* only after telemetry confirms correctness
* optimize ingestion + projection compute paths

---

# 10. SYSTEM PRINCIPLES

1. UI is an event emitter, not a state owner
2. Session is the only canonical entry point
3. Tensor is ingestion-owned, never UI-owned
4. OracleView is read-only projection surface
5. Telemetry defines truth validation, not UI behavior

---

# END OF SPEC
