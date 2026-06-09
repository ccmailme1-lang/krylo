# WO-1301 — KRYLO TRUTH ENGINE
## System Contract Layer + Math Engine Initialization Spec

**STATUS:** READY FOR COMPILATION
**SCOPE:** Core Kernel → Math Engine → FSM → Event Bus → Adapters
**CRITICAL PATH:** `engine/math` (PRIMARY IMPLEMENTATION TARGET)

---

# 0. SYSTEM SUMMARY

KRYLO is a **streaming causal inference kernel** composed of:

* A deterministic inference plane (Σ, ξ, R)
* A control plane (FSM)
* A canonical invariant transport layer (`KernelStateDelta`)
* A strict projection-only interface layer (UI / telemetry / external sinks)

All system behavior is expressed through a single invariant:

> **KernelStateDelta is the only cross-plane truth carrier**

Everything else is derivation or projection.

---

# 1. CORE INVARIANT — SYSTEM CONTRACT LAYER (SCL)

## File: `core/scl/src/lib.rs`

### 1.1 KernelStateDelta (Canonical State Object)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelStateDelta {
    pub sequence_id: u64,
    pub entity_anchor: u64,
    pub entity_view: Vec<String>,
    pub timestamp_ms: u64,
    pub mutation: StateMutation,
    pub fsm_regime: FsmState,
}
```

---

### 1.2 State Mutation Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateMutation {
    StructureEvolved {
        sigma_fast_trace: f64,
        sigma_slow_trace: f64,
    },
    CouplingShifted {
        xi_matrix: Vec<f64>,
    },
    IdentityPartitioned {
        action: PartitionAction,
        density: f64,
    },
    PhaseTransition {
        r_oper: f64,
    },
    RegimeAuthorized {
        new_state: FsmState,
    },
}
```

---

### 1.3 FSM State Space

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FsmState {
    S0_PassiveObservation,
    S1_StructureFormation,
    S2_CoherenceConfirmation,
    S3_ResonanceActive,
    S4_ExecutionDispatch,
}
```

---

### 1.4 Entity Partition Actions

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PartitionAction {
    Emerged,
    Merged,
    Cleaved,
}
```

---

# 2. SYSTEM ARCHITECTURE TOPOLOGY

## Execution Flow (STRICTLY UNIDIRECTIONAL)

```
Raw Inputs
   ↓
engine/math  (Φ → Σ → ξ → R)
   ↓
KernelStateDelta (SCL emission)
   ↓
core/bus (transport layer)
   ↓
├── engine/fsm
├── adapters/telemetry
├── adapters/webgl_tx
└── persistence/logging
```

---

# 3. WORKSPACE STRUCTURE (COMPILATION READY)

## Directory Layout

```
krylo-kernel/
├── Cargo.toml
├── core/
│   ├── scl/
│   └── bus/
├── engine/
│   ├── math/        ← PRIMARY BUILD TARGET
│   └── fsm/
└── adapters/
    ├── ingest/
    ├── telemetry/
    └── webgl_tx/
```

---

## Cargo Workspace

```toml
[workspace]
resolver = "2"
members = [
    "core/scl",
    "core/bus",
    "engine/math",
    "engine/fsm",
    "adapters/ingest",
    "adapters/telemetry",
    "adapters/webgl_tx"
]

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
```

---

# 4. EVENT TRANSPORT LAYER

## File: `core/bus/src/lib.rs`

```rust
use crossbeam_channel::{unbounded, Sender, Receiver};
use scl::KernelStateDelta;

pub struct StateBus {
    pub tx: Sender<KernelStateDelta>,
    pub rx: Receiver<KernelStateDelta>,
}

impl StateBus {
    pub fn new() -> Self {
        let (tx, rx) = unbounded();
        Self { tx, rx }
    }
}

pub trait DeltaEmitter {
    fn emit(&self, delta: KernelStateDelta);
}

pub trait DeltaConsumer {
    fn process_delta(&mut self, delta: &KernelStateDelta);
}
```

---

# 5. ENGINE/MATH — PRIMARY IMPLEMENTATION TARGET

## CRITICAL ROLE

This module defines all system physics:

* Φ normalization (Welford O(1))
* Dual EMA covariance (Σ_fast, Σ_slow)
* ξ extraction (RV coefficient delta)
* R(t) log-det divergence
* Entity-aware emission of KernelStateDelta

---

## File: `engine/math/src/lib.rs`

### 5.1 Core Engine Struct

```rust
pub struct MathEngine {
    pub entity_anchor: u64,
    pub sigma_fast: CovMatrix,
    pub sigma_slow: CovMatrix,
    pub phi_state: PhiState,
    pub sequence_id: u64,
}
```

---

### 5.2 Required Input Contract

```rust
pub struct PhiInput {
    pub entity_anchor: u64,
    pub features: [f64; 5],
    pub timestamp_ms: u64,
}
```

---

### 5.3 Main Execution Function (ONLY PUBLIC ENTRYPOINT)

```rust
pub fn ingest(&mut self, input: PhiInput) -> KernelStateDelta
```

This function MUST:

1. Update Φ via Welford normalization (O(1))
2. Update Σ_fast and Σ_slow (dual EMA)
3. Compute ξ (RV delta)
4. Compute R(t) (log-det divergence)
5. Evaluate entity partition signals
6. Emit KernelStateDelta

---

### 5.4 Φ PIPELINE (WELFORD)

* O(1) update per feature stream
* no historical scan
* no allocation per tick

---

### 5.5 DUAL EMA COVARIANCE SYSTEM

```
Σ_fast = short memory structure
Σ_slow = long memory structure
```

Constraints:

* no matrix inversion inside loop
* no recomputation of full covariance per tick
* preallocated matrix buffers only

---

### 5.6 ξ EXTRACTION (RV COEFFICIENT DELTA)

```
ξ = RV(Σ_fast) - RV(Σ_slow)
```

Rules:

* scale-invariant
* bounded [0,1]
* cannot feed back into Φ
* derived ONLY

---

### 5.7 R(t) — LOG-DET DIVERGENCE

```
R(t) = tr(Σ_slow^-1 Σ_fast)
       - ln det(Σ_fast Σ_slow^-1)
       - d
```

Constraints:

* Σ_slow inverse must be cached or incrementally updated
* no full recomputation per tick
* used only for phase transition detection

---

### 5.8 ENTITY MODEL

* engine/math does NOT own identity
* it only references `entity_anchor`
* SCA logic is derived, not authoritative

---

### 5.9 OUTPUT: KernelStateDelta

Must emit exactly one per ingest:

* StructureEvolved OR
* CouplingShifted OR
* IdentityPartitioned OR
* PhaseTransition OR
* RegimeAuthorized

---

# 6. FSM LAYER (engine/fsm)

Consumes only:

```
KernelStateDelta
```

Responsibilities:

* transition evaluation
* authorization gating
* NO math recomputation
* NO covariance access

---

# 7. ADAPTER LAYER (PROJECTIONS ONLY)

## webgl_tx

* consumes KernelStateDelta stream
* maps FSM state → visual kinematics
* no logic
* no inference

## ingest

* converts external APIs → PhiInput
* ensures monotonic timestamping per entity_anchor

## telemetry

* logs deltas
* no modification
* no decision making

---

# 8. CRITICAL ARCHITECTURAL INVARIANTS

## HARD RULES

1. Only engine/math can compute Σ, ξ, R
2. Only SCL defines system truth structure
3. FSM cannot access raw math state
4. UI is projection-only
5. entity_anchor is immutable identity

---

## CAUSAL SAFETY RULE

```
sequence_id must strictly increase per entity_anchor
any violation = discard event
```

---

## NO CROSS-PLANE READS

No module may:

* inspect Σ directly (outside engine/math)
* recompute ξ independently
* derive identity outside SCA contract

---

# 9. BUILD ORDER (CRITICAL PATH)

### Phase 1 (DO FIRST)

* engine/math
* SCL enforcement
* Phi → Σ pipeline

### Phase 2

* FSM integration
* event bus wiring

### Phase 3

* webgl_tx projection layer

### Phase 4

* ingest adapters

---

# 10. FINAL DECLARATION

> A streaming causal inference kernel with strict invariant-bound state projection and deterministic event emission.

Not a dashboard. Not a simulation. Not a model.

A **state transition engine over continuous structural fields**.

---

# EXECUTION AUTHORIZATION STATUS

✔ SCL LOCKED
✔ ENTITY ANCHOR STABLE
✔ FSM SPECIFIED
✔ EVENT BUS DEFINED
✔ WORKSPACE COMPILABLE
✔ ARCHITECTURE ACYCLIC
