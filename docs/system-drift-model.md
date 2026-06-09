# SYSTEM DRIFT & HEALTH MODEL (SSOT)

## 0. PURPOSE

This document defines how the system detects, classifies, and quantifies **deviation from its own architectural and behavioral specification**.

It transforms the system from:
> a defined execution runtime  
into  
> a self-auditing inference system

It operates across:
- structural integrity (architecture compliance)
- temporal integrity (process compliance)
- epistemic integrity (resolution correctness)

---

# 1. DRIFT DEFINITION

## 1.1 What is drift?

Drift is any divergence between:

- documented SSOT behavior (system-process + system-architecture)
- actual runtime execution behavior

---

## 1.2 Drift is NOT:

- bugs
- performance degradation
- UI inconsistency alone

Drift is specifically:
> **system behavior deviating from its declared execution model**

---

# 2. DRIFT CATEGORIES

The system defines four primary drift types:

---

## 2.1 STRUCTURAL DRIFT

### Definition
Mismatch between:
- system architecture spec
- actual code structure

### Examples
- UI bypasses SessionBootstrapEvent
- direct session creation outside mediator
- state owned by multiple writers

### Detection signals
- multiple writers per state key
- missing mediator invocation
- unauthorized mutation paths

---

## 2.2 TEMPORAL DRIFT

### Definition
Mismatch in execution order of lifecycle events.

### Canonical order:
```txt
session_open
→ ingestion_start
→ ingestion_complete
→ projection_generated
→ action_dispatched
→ action_resolved
```

### Violations:

* ingestion_complete before ingestion_start
* resolution before dispatch
* missing lifecycle steps

---

## 2.3 STATE DRIFT

### Definition

Mismatch between:

* expected state ownership rules
* observed mutation behavior

### Examples

* UI modifying canonical session
* ingestion modifying projection directly
* oracle mapper mutating tensor state

### Detection:

* write-path violations
* multiple mutation sources
* missing single-owner enforcement

---

## 2.4 EPISTEMIC DRIFT (CRITICAL)

### Definition

Mismatch between:

* arbitration model expectation
* actual resolution outcomes

### Examples

* ingestion consistently overrides user truth
* TTL dominating user-confirmed outcomes
* confidence scores unstable under identical inputs

### This is the highest severity drift type.

---

# 3. DRIFT SCORING MODEL

Each drift type contributes to a system health score.

---

## 3.1 Structural Integrity Score (SIS)

```txt
SIS = 1 - (structural violations / total structural rules)
```

---

## 3.2 Temporal Integrity Score (TIS)

```txt
TIS = valid event sequences / total event sequences
```

---

## 3.3 State Integrity Score (StIS)

```txt
StIS = compliant state writes / total state writes
```

---

## 3.4 Epistemic Integrity Score (EIS)

```txt
EIS = correct arbitration outcomes / total resolved actions
```

---

# 4. GLOBAL HEALTH SCORE

```txt
System Health Score (SHS) =
  0.25 * SIS +
  0.25 * TIS +
  0.25 * StIS +
  0.25 * EIS
```

---

# 5. DRIFT SEVERITY LEVELS

| Score Range | Level          | Meaning                        |
| ----------- | -------------- | ------------------------------ |
| 0.90 – 1.00 | Healthy        | Fully aligned system           |
| 0.75 – 0.89 | Minor Drift    | Local inconsistencies          |
| 0.50 – 0.74 | Moderate Drift | Architectural degradation      |
| 0.25 – 0.49 | Severe Drift   | System reliability compromised |
| < 0.25      | Critical Drift | System no longer trustworthy   |

---

# 6. DRIFT DETECTION RULES

## 6.1 Structural detection

Flag when:

* more than one writer modifies same state domain
* UI bypasses mediator layer
* ingestion or oracle writes directly to UI state

---

## 6.2 Temporal detection

Flag when:

* telemetry event ordering deviates from canonical sequence
* missing lifecycle events
* out-of-order ingestion or resolution

---

## 6.3 State detection

Flag when:

* state mutation originates outside assigned owner
* cross-layer writes detected
* immutable structures are modified post-creation

---

## 6.4 Epistemic detection

Flag when:

* ingestion resolution consistently overrides user truth (> threshold)
* TTL dominates > X% of resolved actions
* confidenceScore variance exceeds baseline drift threshold

---

# 7. DRIFT SOURCE MAPPING

Each drift event must be attributed to a source:

| Source    | Meaning                     |
| --------- | --------------------------- |
| UI        | frontend behavior violation |
| ingestion | pipeline logic violation    |
| oracle    | inference violation         |
| resolver  | arbitration violation       |
| telemetry | observability mismatch      |

---

# 8. DRIFT EVENT MODEL

```ts
type DriftEvent = {
  type: "structural" | "temporal" | "state" | "epistemic";
  severity: "low" | "medium" | "high" | "critical";
  source: "ui" | "ingestion" | "oracle" | "resolver" | "telemetry";
  description: string;
  affectedComponent: string;
  timestamp: number;
};
```

---

# 9. DRIFT RESPONSE STRATEGY

## Low drift

* log only
* no system intervention

## Medium drift

* flag subsystem
* highlight in diagnostics

## High drift

* block deployment (future enforcement layer)
* require correction in SSOT

## Critical drift

* system marked unreliable
* requires architecture reconciliation

---

# 10. DRIFT FEEDBACK LOOP (FUTURE EXTENSION)

Planned evolution:

* drift events feed back into:

  * ingestion weighting
  * oracle confidence calibration
  * UI validation constraints

This enables:

> self-correcting system behavior over time

---

# 11. SYSTEM ROLE SHIFT

With this model:

The system is no longer only:

> event-sourced and observable

It is also:

> self-auditing and self-validating

---

# END OF SYSTEM DRIFT MODEL
