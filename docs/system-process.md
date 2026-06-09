# SYSTEM PROCESS (SSOT EXECUTION FLOW)

## 0. PURPOSE

This document defines the **complete runtime execution lifecycle** of the system.

It merges:
- UI behavior
- session creation
- ingestion pipeline
- oracle inference
- telemetry emission
- resolution arbitration

This is the authoritative **step-by-step process model** of system execution.

---

# 1. SYSTEM EXECUTION OVERVIEW

```txt
User Input
  → SessionBootstrapEvent
  → Canonical Session Creation
  → Ingestion Pipeline
  → Tensor State Construction
  → Oracle Projection Generation
  → Action Dispatch
  → Resolution Event Collection
  → Arbitration Engine
  → Final Outcome Derivation
  → OracleView Rendering
```

---

# 2. STEP-BY-STEP EXECUTION MODEL

## STEP 1 — USER INPUT (UI LAYER)

### Source:
- ConeSearch
- Krylo Submit
- Arc Interaction

### Behavior:
- Captures raw user intent (query, action, or selection)
- Does NOT mutate system state

### Output:
- SessionBootstrapEvent

---

## STEP 2 — SESSION BOOTSTRAP (MEDIATOR LAYER)

### Function:
`handleSessionBootstrap`

### Responsibilities:
- Creates canonical session
- Assigns sessionId
- Records source provenance
- Emits telemetry: `session_open`

### Output state:
- Canonical Session Object

---

## STEP 3 — INGESTION PIPELINE

### Function:
`ingestionBuilder`

### Responsibilities:
- Converts query into structured signal
- Builds tensor state
- Enriches session context
- Emits telemetry: `ingestion_start`, `ingestion_complete`

### Output state:
- tensor

---

## STEP 4 — ORACLE PROJECTION GENERATION

### Layer:
Oracle Engine / `useOracleMapper`

### Responsibilities:
- Interprets tensor + canonical session
- Produces structured actions

### Output:
- `projection.actions[]`

### Emits telemetry:
- `projection_generated`

---

## STEP 5 — ACTION DISPATCH (INTENT LAYER)

### Layer:
Oracle execution layer

### Responsibilities:
- Iterates `projection.actions[]`
- Assigns actionId (pre-generated at session creation)
- Emits intent to execute

### Emits telemetry:
- `action_dispatched`

---

## STEP 6 — RESOLUTION SIGNAL COLLECTION (TRUTH LAYER)

### Layer:
Resolver system

### Sources:
- User confirmation
- Ingestion confirmation
- TTL expiration

### Behavior:
- Appends resolution events per actionId
- Does NOT compute final state immediately

### Emits telemetry:
- `action_resolved`

---

## STEP 7 — ARBITRATION ENGINE

### Function:
`computeFinalOutcome(actionId)`

### Responsibilities:
- Aggregates resolution events
- Applies weighted scoring model
- Resolves conflicts
- Determines dominant truth source

### Rules:

**Source weights:**
- user: 1.0
- ingestion: 0.6
- ttl: 0.2

**Confidence model:**
```txt
confidenceScore = winningScore / totalWeight
```

**Tie-breaking:**
- user source dominates within margin threshold

### Output:
```txt
{
  actionId,
  finalOutcome,
  confidenceScore,
  dominantSource,
  resolutionCount
}
```

---

## STEP 8 — ORACLE VIEW RENDERING

### Layer:
OracleView

### Responsibilities:
- Pure rendering of computed state
- No mutation allowed
- No decision logic

### Input:
- session
- tensor
- projection
- arbitration output

### Output:
- UI visualization only

---

# 3. TELEMETRY LIFECYCLE MAP

```txt
session_open
  → ingestion_start
  → ingestion_complete
  → projection_generated
  → action_dispatched
  → action_resolved
```

---

# 4. STATE OWNERSHIP MODEL

| State          | Owner                  | Writable By      |
| -------------- | ---------------------- | ---------------- |
| session        | handleSessionBootstrap | mediator only    |
| tensor         | ingestionBuilder       | ingestion only   |
| projection     | oracle engine          | oracle engine    |
| resolution log | resolver               | resolver only    |
| UI state       | components             | UI only          |

---

# 5. SYSTEM INVARIANTS

## 5.1 No UI mutation of canonical state

UI is strictly event emitter.

## 5.2 All actions must have stable identity

actionId is assigned at session construction time.

## 5.3 Resolution is append-only

No overwrites allowed in resolution log.

## 5.4 Arbitration is deterministic

Same inputs → same outputs always.

---

# 6. FAILURE MODES

## 6.1 Missing ingestion

→ projection incomplete or empty

## 6.2 Missing resolution

→ TTL triggers fallback fail state

## 6.3 Conflicting resolution signals

→ resolved via weighted arbitration

---

# 7. SYSTEM CLASSIFICATION

This system is:

> A deterministic, event-sourced inference runtime with probabilistic resolution arbitration.

Not:
- UI dashboard
- analytics pipeline
- logging system

---

# 8. FINAL DECLARATION

This document defines the complete operational behavior of the system.

Any deviation in implementation must resolve back to this process model.

---

# END OF SYSTEM PROCESS SPEC
