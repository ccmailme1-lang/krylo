# WO-2004 — CanonicalEvent Identity Kernel
Date: 2026-06-26 (updated 2026-06-26 to absorb WO-2005 epistemic tier)
Status: SPEC — do not build until Founder signals ready
Depends on: WO-1879 (complete), WO-1868 (complete), WO-1869 (complete), WO-2005 (schema)
Supersedes: next-level progression.md WO-2004 section

---

## Core Principle

A `CanonicalEvent` is a **stable equivalence class** over evolving `EvidenceGraphs`
under reorder invariance, incremental addition, bounded corrections, and structural
isomorphism — independent of domain gravity, attention, or semantic interpretation.

**Critical refinement (prevents identity churn in streaming environments):**
Not strict evidence-set closure. Equivalence class under allowed transformations.
This prevents thrash in non-stationary signal environments.

**Epistemic refinement (absorbed from WO-2005):**
Not all evidence is epistemic equals. `EvidenceNode` carries a tier and descriptor
(from WO-2005 `evidencetiers.js`) that govern how it influences identity stability,
merge/split weight, and structural confirmation scoring. Tier is intrinsic to the node —
it is set at ingestion from the source descriptor, never computed by the kernel.

---

## 1. Identity Invariants (Locked)

- **Equivalence Class Definition:**
  Two `EvidenceGraphs` G1 and G2 belong to the same `CanonicalEvent` if there exists
  a sequence of allowed transformations (reordering, incremental addition within tolerance,
  minor rewrites) that maps one to the other while preserving lineage continuity.

- **Temporal Continuity:** Unbroken causal/temporal path from `lineageRoot` to current state.

- **Conflict Exclusion:** Single-binding rule for EvidenceNodes.

- **Stability Under Perturbation:** Measured explicitly via `stabilityScore`.

- **Tier-weighted stability:** T1 structural nodes have higher perturbation resistance —
  a T1 node that contradicts an existing event demands explicit split consideration;
  a T5 node that contradicts does not trigger the same pressure.

---

## 2. Schemas

```ts
// From WO-2005 evidencetiers.js — imported, never redefined here
type EpistemicTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
type CanonicalRole =
  | 'LONG_TERM_BASELINE'   // updates expected operating envelope
  | 'STATE_TRANSITION'     // creates or strengthens an existing CanonicalEvent
  | 'CAUSAL_PRECURSOR'     // high influence on early Happy Path discovery
  | 'ENTITY_LINKED'        // strengthens attribution to company/facility/region
  | 'ANOMALY_DETECTOR';    // does not create identity alone — requests corroboration

interface EvidenceNode {
  id:             string;
  seedId:         string;
  timestamp:      Date;
  content:        string;
  metadata:       Record<string, any>;
  predecessorIds: string[];
  successorIds:   string[];

  // Epistemic properties (from WO-2005 descriptor — set at ingestion)
  epistemicTier:    EpistemicTier;
  canonicalRole:    CanonicalRole;
  anchorStrength:   number;          // 0–1, from descriptor
  decayModel:       'NONE' | 'LINEAR' | 'EXPONENTIAL';
  persistenceClass: 'INSTANT' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERY_LONG';
}

interface EvidenceGraph {
  nodes:     Map<string, EvidenceNode>;
  edges:     Array<{
    from:     string;
    to:       string;
    type:     'TEMPORAL' | 'CAUSAL' | 'ENTITY_SHARED' | 'CORRELATION';
    strength: number;
  }>;

  rootSeeds:           string[];
  versionHash:         string;        // structural hash — changes on material updates
  continuityScore:     number;        // 0–1
  branchingFactor:     number;
  fragmentationPoints: string[];      // candidate cut points
  stabilityScore:      number;        // invariance under perturbation (0–1)

  // Structural coverage — derived from T1/T2 node presence
  structuralBurdenScore: number;      // 0–1, see WO-2005 SCI formula
}

interface CanonicalEvent {
  identityId:          string;        // STABLE equivalence class identifier
  currentVersionHash:  string;
  evidenceGraph:       EvidenceGraph;
  timeWindow:          { start: Date; end: Date | null };
  structuralSignature: {
    graphHash:         string;
    temporalWaveform:  string;
  };
  status: 'ACTIVE' | 'FRAGMENTED' | 'MERGED' | 'RESOLVED' | 'ARCHIVED';
  lineageRoot: string;
  metadata: {
    // domainPressures attached POST-formation only — never influences identity
    domainPressures?: Record<string, {
      magnitude: number;
      polarity: 'constructive' | 'fracture';
    }>;
    // SCI computed post-formation by WO-2005 layer — never influences identity
    structuralConfirmationIndex?: number;   // 0–10, from WO-2005
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

**Tier weighting on merge:** T1 nodes in A or B raise τ_structural — structural evidence
demands higher similarity before merge. T5 nodes have no effect on threshold.

### Split Condition

```
Split along weakest cut-set iff:
  fragmentationFactor > δ
  OR stabilityScore drops below perturbation threshold under simulated rewrites
  OR causalGraph divergence detected (inconsistent dependency chains)
  OR a T1 node arrives that is causally incompatible with the current lineageRoot
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
- T1 nodes contribute higher perturbation resistance (their anchorStrength scales the test).
- High score = robust identity under realistic signal noise.

---

## 5. Layer Separation (Locked)

```
Signal Ingestion (§16 surfacerouter.js)
          ↓  { source, domain, signal, confidence, ts }
Epistemic Tier Assignment (WO-2005 evidencetiers.js)
          ↓  EvidenceNode + { epistemicTier, canonicalRole, anchorStrength, decayModel }
Identity Kernel (WO-2004)            ← THIS FILE
          ↓  CanonicalEvent (stable equivalence class + EvidenceGraph)
Gravity Overlay (domaingravity.js / WO-1879)
          ↓  domainPressures attached POST-formation only
Structural Confirmation (WO-2005 SCI layer)
          ↓  structuralConfirmationIndex computed post-formation
Interpretation / Attention Economics
          ↓  rendering + Happy Path qualification
```

**Boundary rules (load-bearing):**
- `domainPressures` attach AFTER identity — never influence formation.
- `structuralConfirmationIndex` is computed AFTER identity — never influences identity.
- Epistemic tier is set AT ingestion — it is a property of the source, not the event.
- §16 parity rule (no single source dominates cone pressure field) is preserved.
  Tier governs CanonicalEvent synthesis weight — a separate layer from cone pressure.
  These two do not conflict because they operate on different objects.

---

## 6. Build Paths (when ready — Founder's call)

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
| EvidenceNode | `evidenceregistry.js` emitPrediction | No graph structure, no predecessorIds, no epistemicTier |
| EvidenceGraph | None | Does not exist |
| CanonicalEvent | None | Does not exist |
| structuralSimilarity | `entitytopologyregistry.js` | Cluster similarity only, not graph isomorphism |
| stabilityScore | None | Does not exist |
| Merge/Split | None | Implicit in signal processing, never formalized |
| epistemicTier | None | Does not exist — Phase A of WO-2005 creates it |
| canonicalRole | None | Does not exist — WO-2005 defines the enum |

---

## 8. Why this is NOT built yet

Per state-of-system-2026-06-26.md:
- CanonicalEvent is a **constraint field**, not a component.
- It must be embedded as an invariant into every transformation stage — not a module that runs.
- WO-1868 (metrics) and WO-1869 (path memory) must land first. Both are now COMPLETE.
- WO-2005 Phase A (evidencetiers.js schema) should land before WO-2004 build begins,
  so the EvidenceNode schema is stable at build time.
- Sequence: WO-2005 Phase A (schema) → WO-2004 build → WO-2005 Phase B (SCI computation)
