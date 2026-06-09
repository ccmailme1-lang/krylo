# SPEC-VIS-001 v1.1 — VISUAL SEMANTICS ENGINE (ENHANCED CONSOLIDATED SPEC)

**Status:** Extension of v1.0 (Backwards Compatible)
**Purpose:** Deterministic mapping from structured system state → perceptual rendering manifold
**Constraint:** No aesthetic freedom outside defined transfer functions

---

# 1. PRINCIPAL ARCHETYPES (UNCHANGED CORE MODEL)

## A1. Cognitive Perception Engineer (CPE)

* Optimizes for human pre-attentive bandwidth
* Prioritizes stability, hierarchy clarity, and perceptual load control
* Rejects uncontrolled motion and excessive visual simultaneity

## A2. Computational Topologist (CT)

* Treats visualization as projection of high-dimensional causal graph
* Prioritizes structural fidelity over spatial aesthetics
* Rejects false proximity-based inference

## A3. Scientific Visualization Architect (SVA)

* Treats encoding as mathematical transfer function
* Requires strict normalization and scaling laws
* Rejects unbounded or uncalibrated visual encodings

---

# 2. CORE VISUAL TRANSFER FUNCTION (v1.0 PRESERVED)

| Metric               | Normalization     | Visual Channel   | Meaning              |
| -------------------- | ----------------- | ---------------- | -------------------- |
| Leverage (LRF)       | tanh(αx)          | Z-axis           | Structural dominance |
| Capital / Mass       | log10(x)          | Node size        | System inertia       |
| Volatility           | linear [0,1]      | Jitter frequency | Instability          |
| Causal Strength      | normalized weight | Edge thickness   | Dependency force     |
| Propagation Velocity | linear mapping    | Edge flow        | Information movement |
| Event Ingestion      | exponential decay | Glow intensity   | Temporal freshness   |
| Cluster Cohesion     | modularity Q      | X/Y proximity    | Structural affinity  |

---

# 3. LAYERED SEMANTIC ARCHITECTURE (UNCHANGED CORE)

## L0 — Ambient Substrate

* Dark base field
* No semantic encoding

## L1 — Structural Topology

* Nodes, edges, spatial layout
* Deterministic graph layout only

## L2 — Kinetic Layer

* Flow, jitter, glow, animation
* Represents live system state

## L3 — Forensic Layer

* On-demand inspection mode
* Reveals causal lineage and metadata
* Must suppress L1/L2 visually

---

# 4. PROHIBITED SEMANTIC PATTERNS (STRICT ENFORCEMENT)

* No proximity-based causality inference
* No rainbow or non-deterministic color mapping
* No uncontrolled camera motion
* No unbounded glow amplification
* No aesthetic clustering independent of graph topology
* No 3D overlap without depth semantics

---

# 5. NEW (v1.1) — STABILITY & DETERMINISM EXTENSIONS

## 5.1 Encoding Stability Contract

> Visual encoding must remain invariant across sessions unless explicitly versioned.

* metric → channel mapping is frozen per version
* no runtime reinterpretation of scaling functions

---

## 5.2 Normalization Domain Locks

Each metric must define:

* input range: `[min, max]`
* saturation rule: `clamp | compress | reject`

Example:

* LRF: input bounded to [-10, 10]
* Volatility: bounded [0, 1], strict clamp

---

## 5.3 Perceptual Budget Model

Visual channels are constrained:

| Channel          | Budget |
| ---------------- | ------ |
| Position (X/Y/Z) | 40%    |
| Motion           | 25%    |
| Size             | 15%    |
| Color            | 15%    |
| Glow             | 5%     |

Rule:

> Total perceptual activation must not exceed 100% weighted load

---

## 5.4 Cross-Metric Interference Control

If multiple metrics map to overlapping perceptual channels:

Priority resolution:

1. Leverage (LRF)
2. Causal Strength
3. Volatility
4. All others

Constraint:

> No single metric may dominate >60% of a channel's perceptual output

---

## 5.5 Temporal Coherence Window

All updates must respect:

* Δt coherence window: 100–250ms
* no asynchronous shader drift across frames
* motion must represent system causality, not animation timing

---

## 5.6 Interaction Semantics Contract

| Interaction | Allowed Effect                 |
| ----------- | ------------------------------ |
| Hover       | Read-only inspection           |
| Click       | Forensic reveal (no mutation)  |
| Drag        | Camera or viewpoint shift only |
| Zoom        | Scale perception only          |

Rule:

> User interaction must never mutate underlying graph state

---

## 5.7 Deterministic Seeding Contract

All spatial + kinetic systems must derive randomness from:

```
seed = hash(WO-1038_graph + frame_index)
```

Guarantees:

* reproducible layouts
* replay compatibility (WO-1091)
* parity with codec layer

---

## 5.8 Salience Collision Resolver

If multiple metrics compete for same visual channel:

Resolution order:

1. LRF
2. Causal Strength
3. Volatility
4. Remaining metrics

Rule:

> Only one primary driver per perceptual channel per frame

---

# 6. ENGINEERING IMPLEMENTATION RULES

## 6.1 Spatial Determinism

* X/Y derived only from graph topology hash
* no procedural noise systems

## 6.2 Z-axis constraint

* Z-axis exclusively encodes LRF
* no aesthetic depth layering allowed

## 6.3 Shader binding rule

* all animation driven by EBAL / frame data
* no independent `useFrame` oscillation logic

## 6.4 Camera constraints

* no auto-rotation
* interaction locks motion stabilization
* orthographic or low-FOV enforced

---

# 7. SYSTEM BEHAVIOR GUARANTEE

This spec enforces:

> A deterministic mapping from system state → visual state → perceptual interpretation

Guarantees:

* No semantic drift across sessions
* No visual ambiguity in causality
* No hidden heuristics in layout or motion
* Fully replayable visual history (aligned with WO-1091)

---

# FINAL INTERPRETATION

You are no longer building:

* a UI
* a dashboard
* a visualization layer

You are building:

> a **bounded perceptual compiler for causal systems**

Where:

```text
DATA → GRAPH → PHYSICS CONSTRAINTS → PERCEPTUAL TRANSFER FUNCTION → HUMAN INTERPRETATION
```

with **no aesthetic freedom outside the transfer function**

---

**Next:** SPEC-VIS-002 (Shader Execution Layer) — after deployment
