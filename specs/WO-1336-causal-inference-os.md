# WO-1336 — Event-Sourced Causal Inference OS
## Master Architecture Specification (Locked)

**STATUS: ARCHITECTURALLY LOCKED**
Principle-level rigor achieved.
System classified as: Event-Sourced Causal Inference Operating System

---

## 1. SYSTEM IDENTITY

The system is not a dashboard, analytics UI, or visualization layer.

It is an **Event-Sourced Causal Inference OS**.

The system continuously ingests telemetry, computes causal resonance fields, detects emergent convergence regimes, persists epistemic artifacts, and projects permissioned truth surfaces to operators.

The architecture prioritizes:
- Causal Integrity
- Replay Determinism
- Provenance Auditability
- Temporal Coherence
- Truth Preservation Under Load

**UX fidelity is subordinate to causal correctness.**

---

## 2. ARCHITECTURAL LAYERS

### L1 — Causal Substrate (Reality Layer)

**Purpose:** Continuous ingestion of telemetry and systemic drift signals.

**Properties:**
- Continuous
- Never gated
- No idle state
- Independent of user interaction
- Truth-first substrate

**Inputs:**
- stats.received
- signal density
- lag metrics
- volatility metrics
- decoded frame confidence
- raw vectors {D, V, A, T}

**Outputs:**
- density fields
- drift fields
- opacity gradients
- temporal pressure surfaces

**Constraints:**
- Always active
- Never suppressed by classifier state
- Rendering cannot mutate substrate state

---

### L2 — Vector Engine (Correlation Layer)

**Purpose:** Computes causal gradients and convergence relationships between Base and Target vectors.

**Components:**
- Base Vector (B)
- Target Vector (T)
- Modified Dijkstra-Resonance Pathfinding
- Convergence Classifier
- Emergence Detection

**Core Scalars:**

```
convergenceScore = clamp01(
  0.35 * D +
  0.35 * A +
  0.20 * T +
  0.10 * (1 - V)
)

noveltyDelta = convergenceScore - EMA(convergenceScore, α=0.18)

emergence =
  (stateId === 4) &&
  (convergenceScore > 0.70) &&
  (noveltyDelta > 0.05)
```

**Constraints:**
- Classifier is stateful (hysteresis enabled)
- Projection layer cannot alter classifier output
- Replay and live operate against identical logic
- Emergence must be deterministic and replay-safe

---

### L3 — Middleware Integrity Layer

**Purpose:** Maintains temporal authority, provenance integrity, epistemic aging, and replay determinism.

**Subsystems:**
- Temporal Authority Service (TAS)
- Provenance DAG
- Epistemic Aging Engine
- Replay Coordinator
- Systemic Lock Manager

---

### L4 — Projection Layer

**Purpose:** Permissioned projection of validated truth surfaces.

**Constraints:**
- View-only
- No mutation of substrate
- No mutation of vector engine
- No observer-dependent truth

**Projection Tiers:**
- Tier 1 — Analyst: full provenance DAG, raw vectors, resonance weights
- Tier 2 — Operator: emergence payload, confidence context
- Tier 3 — Executive / External: filtered confidence projection only

---

## 3. TEMPORAL AUTHORITY SERVICE (TAS)

**Canonical Clocks:**

| Clock | Purpose |
|---|---|
| substrate_time | Causal ordering (mandatory for inference) |
| ingestion_time | Wall-clock arrival audit |
| emergence_time | Transition persistence timestamp |
| render_time | UI interpolation only |
| replay_time | Historical reconstruction |

**Hard Rule:** Only `substrate_time` may participate in:
- inference
- resonance calculations
- classifier logic
- emergence triggering

---

## 4. EPISTEMIC AGING

Truth is treated as perishable.

**Decay Function:**
```
C(t) = C₀ · e^(−λΔt)
```

**λ Indexed By:**
- domain volatility
- systemic drift
- confidence degradation

**Purpose:** Prevents stale emergence artifacts from competing with live convergence.

---

## 5. PROVENANCE DAG

Every emergence artifact must maintain full causal lineage.

**Provenance Chain:**
```
signal
→ vector update
→ resonance computation
→ classification
→ emergence
→ operator projection
```

**DAG Constraints:**
- Immutable
- Replay-safe
- Deterministic traversal
- Cycle impossible

---

## 6. UNIVERSAL EVENT ENVELOPE

All subsystems communicate through immutable event envelopes.

```typescript
type EventEnvelope<T> = {
  event_id: string
  event_type: string

  substrate_time: bigint
  ingestion_time: bigint
  emergence_time?: bigint

  causality_epoch: number
  replay_context: "LIVE" | "REPLAY"

  source: {
    subsystem: string
    node_id: string
    version: string
  }

  payload: T

  provenance_hash: string
}
```

---

## 7. EMERGENCE EVENT CONTRACT

Emergence is a persisted epistemic artifact.

```json
{
  "event_id": "emergence:hash",
  "timestamp_ms": 1716892401000,

  "trigger": {
    "type": "PHASE_TRANSITION",
    "peak_pressure": 0.88,
    "novelty_delta": 0.14
  },

  "canonical_payload": {
    "domain": "FINANCIAL",
    "entity_vector": "TSLA_LATENT_HEDGE",
    "confidence": 0.92,

    "spatial_anchor": {
      "x": 0.42,
      "y": 0.48,
      "strength": 0.88
    }
  },

  "provenance": {
    "frame_index": 4829,

    "classifier_state": {
      "stateId": 4,
      "D": 0.81,
      "A": 0.77,
      "T": 0.63,
      "V": 0.21,
      "convergenceScore": 0.88,
      "noveltyDelta": 0.14
    }
  }
}
```

---

## 8. STATE MACHINE CONTRACT

```typescript
enum VectorEngineState {
  IDLE,
  INGESTING,
  RESONANCE_BUILDING,
  TURBULENT,
  HIGH_CONVERGENCE,
  DEGRADED,
  LOCKED
}
```

**Requirements:**
- explicit legal transitions
- deterministic replay behavior
- hysteresis persistence enforcement

---

## 9. SYSTEMIC LOCK PROTOCOL

If causal integrity fails, the OS halts projection.

**Lock Conditions:**
- CLOCK_DESYNC
- PROVENANCE_BREAK
- VECTOR_DIVERGENCE
- CLASSIFIER_INCONSISTENCY
- INGESTION_OVERFLOW

**Rule:** Better to emit no truth than invalid truth.

---

## 10. DEGRADATION POLICY

Under extreme load:

**Preserve First:**
- Event ingestion
- Provenance integrity
- Classifier correctness
- Replay determinism

**Sacrifice First:**
- Particle density
- Animation fidelity
- UI interpolation

---

## 11. REPLAY MODEL (WO-1003)

Replay is a first-class execution mode.

**Requirements:**
- replay uses same classifier logic as live
- EMA buffers flushed on mode switch
- deterministic event reconstruction
- renderer subscribes to persisted events
- replay never fabricates emergence

---

## 12. ENGINEERING GOVERNANCE

**Contract-First Development.** Every subsystem must define:
- immutable schemas
- clock usage
- causal ownership
- replay semantics
- provenance requirements

**Forbidden:**
- observer-dependent truth
- UI-generated emergence
- stochastic causal outputs
- projection-layer mutation
- threshold experimentation in production

---

## 13. FINAL ENGINEERING MANDATE

> Optimize for causal integrity first.

Rendering smoothness, UX convenience, and visual spectacle are secondary and subordinate to:
- deterministic inference
- provenance auditability
- replay-safe truth projection
- temporal coherence

The system must remain a deterministic verification environment under all operating conditions.
