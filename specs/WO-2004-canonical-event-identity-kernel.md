# WO-2004 — CanonicalEvent Identity Kernel (Refined Spec)
Date: 2026-06-26
Status: SPEC — do not build until Founder signals ready
Depends on: WO-1879 (complete), state-of-system-2026-06-26.md
Supersedes: next-level progression.md WO-2004 section

---

## Core Principle

A `CanonicalEvent` is a **stable equivalence class** over evolving `EvidenceGraphs`
under reorder invariance, incremental addition, bounded corrections, and structural
isomorphism — independent of domain gravity, attention, or semantic interpretation.

**Critical refinement (prevents identity churn in streaming environments):**
Not strict evidence-set closure. Equivalence class under allowed transformations.
This prevents thrash in non-stationary signal environments.

---

## 1. Identity Invariants (Locked)

- **Equivalence Class Definition:**
  Two `EvidenceGraphs` G1 and G2 belong to the same `CanonicalEvent` if there exists
  a sequence of allowed transformations (reordering, incremental addition within tolerance,
  minor rewrites) that maps one to the other while preserving lineage continuity.

- **Temporal Continuity:** Unbroken causal/temporal path from `lineageRoot` to current state.

- **Conflict Exclusion:** Single-binding rule for EvidenceNodes.

- **Stability Under Perturbation:** Measured explicitly via `stabilityScore`.

---

## 2. Schemas

```ts
interface EvidenceNode {
  id: string;
  seedId: string;
  timestamp: Date;
  content: string;
  metadata: Record<string, any>;
  predecessorIds: string[];
  successorIds: string[];
}

interface EvidenceGraph {
  nodes: Map<string, EvidenceNode>;
  edges: Array<{
    from: string;
    to: string;
    type: 'TEMPORAL' | 'CAUSAL' | 'ENTITY_SHARED' | 'CORRELATION';
    strength: number;
  }>;

  rootSeeds: string[];
  versionHash: string;           // structural hash — changes on material updates
  continuityScore: number;       // 0–1
  branchingFactor: number;
  fragmentationPoints: string[]; // candidate cut points
  stabilityScore: number;        // invariance under perturbation (0–1)
}

interface CanonicalEvent {
  identityId: string;            // STABLE equivalence class identifier
  currentVersionHash: string;
  evidenceGraph: EvidenceGraph;
  timeWindow: { start: Date; end: Date | null };
  structuralSignature: {
    graphHash: string;
    temporalWaveform: string;
    // embedding is secondary / optional
  };
  status: 'ACTIVE' | 'FRAGMENTED' | 'MERGED' | 'RESOLVED' | 'ARCHIVED';
  lineageRoot: string;
  metadata: {
    // domainPressures attached POST-formation only — never influences identity
    domainPressures?: Record<string, {
      magnitude: number;
      polarity: 'constructive' | 'fracture';
    }>;
  };
}
```

---

## 3. Merge / Split Logic (Final Form)

### Merge Condition (pure structural + causal — no domain, no attention)

```
Merge(A, B) iff:
  structuralSimilarity(G_A, G_B) > τ_structural
  AND temporalOverlap > τ_temporal
  AND causalConsistency(A ∪ B) == true       // no conflicting causal chains
  AND stabilityScore(A ∪ B) ≥ min(stabilityScore(A), stabilityScore(B))
```

### Split Condition

```
Split along weakest cut-set iff:
  fragmentationFactor > δ
  OR stabilityScore drops below perturbation threshold under simulated rewrites
  OR causalGraph divergence detected (inconsistent dependency chains)
```

---

## 4. Equivalence Relation (Formalized)

Define equivalence relation `~` for EvidenceGraph:

`G1 ~ G2` if and only if:

1. **Reorder Invariance:** Nodes/edges can be reordered without changing meaning.
2. **Incremental Addition Tolerance:** G2 can be obtained from G1 by adding evidence
   within bounded temporal/causal windows.
3. **Bounded Correction:** Minor metadata corrections or late-arriving duplicates do
   not break equivalence.
4. **Structural Isomorphism + Causal Coherence:** Graph isomorphism (with tolerance)
   + consistent causal paths.
5. **Stability Check:** `stabilityScore(G1 ∪ transformations) ≥ θ_stability`

This relation makes identity deterministic and auditable.

### stabilityScore computation

- Simulate small perturbations (delayed arrivals, edge reclassifications).
- Measure how much graphHash / continuityScore changes.
- High score = robust identity under realistic signal noise.

---

## 5. Layer Separation (Locked)

```
Identity Kernel (WO-2004)   → pure structural equivalence + lineage
          ↓
Gravity Overlay             → ranking / pressure metadata only (post-formation)
          ↓                   (domaingravity.js / WO-1879)
Interpretation / Claims     → epistemic layer (epistemictier.js)
          ↓
Attention Economics         → rendering allocation (gap — unnamed WO)
```

**Boundary rule:** domainPressures attach to `CanonicalEvent.metadata` AFTER identity
is resolved. They never influence identity formation. This boundary is load-bearing.

---

## 6. Three build paths (when ready — Founder's call)

### Option A — Full mathematical + TypeScript hybrid spec
Pseudocode for equivalence checking, stabilityScore computation, test harness phases.
Recommended first if the team needs a spec to implement against.

### Option B — Ontology Bridge + mapping table first
Finalize the query-domain → signal-domain mapping (extends WO-1879 QUERY_TO_SIGNAL_DOMAIN).
Useful if domain routing accuracy is the immediate bottleneck.

### Option C — Phase 1 / Phase 2 stress harness
Explicit test cases: signal flood, adversarial injection, identity collision storms,
attention starvation cascades. Maps to WO-2008 (stress harness — test layer only).

---

## 7. Relationship to existing KRYLO files

| Concept | Current closest analog | Gap |
|---|---|---|
| EvidenceNode | `evidenceregistry.js` emitPrediction | No graph structure, no predecessorIds |
| EvidenceGraph | None | Does not exist |
| CanonicalEvent | None | Does not exist |
| structuralSimilarity | `entitytopologyregistry.js` | Cluster similarity only, not graph isomorphism |
| stabilityScore | None | Does not exist |
| Merge/Split | None | Implicit in signal processing, never formalized |

---

## 8. Why this is NOT built yet

Per state-of-system-2026-06-26.md:
- CanonicalEvent is a **constraint field**, not a component.
- It must be embedded as an invariant into every transformation stage — not a module that runs.
- WO-1868 (metrics) and WO-1869 (path memory) must land first to give the identity
  kernel meaningful signals to stabilize over.
- Sequence: classifier hardening → six metrics (1868) → outcome capture (1869) → identity kernel
