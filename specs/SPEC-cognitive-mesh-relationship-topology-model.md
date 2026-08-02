# SPEC — Cognitive Mesh: Relationship Topology Model (v0.1)
Jira: KRYL-1137 — Cognitive Mesh: Relationship Topology Model (v0.1)
Date: 2026-08-02
Author: drafted by agent, from a mining/review session, at Founder's request.

Status: DRAFT ARCHITECTURE SPECIFICATION. Analysis/normative-model level only — no API,
transport, queue, or implementation decisions. Depends on
`SPEC-cognitive-mesh-primitive-doctrine.md` (KRYL-CF-005) and the genealogy chain
(`SPEC-rkm-genealogy-admission-policy.md` / KRYL-1133, `SPEC-relationship-admission-contract.md`).

**Terminology note:** this document predates the "Cell" → "Cognitive Primitive (CP)" rename
made in KRYL-CF-005 v0.4 (collision with `cifengine.js`'s existing `Cell` vocabulary). Read
"Cell" below as "Cognitive Primitive" — not yet reconciled in this file's prose, flagged here
so it isn't missed at the next revision.

Non-scope: Cell/CP runtime implementation, network protocols, storage implementation, compute
allocation, model selection.

---

## 0. Irreducible Principle

A Cognitive Mesh is not defined by how many Cells (Primitives) it contains — it's defined by
the quality and evolution of the relationships between them. The fundamental unit of
intelligence in this model is not the Primitive; it's the **validated relationship pathway**.

```
Cell → produces evidence
Relationship → creates capability
Topology → creates cognition
```

## 1. Core Definitions

**Mesh** — a dynamic collection of Cells and admitted relationships operating under the
Coherence Fabric. Adaptive, partially decentralized, evidence-governed, continuously
restructuring. Not a static graph, not a fixed workflow, not an agent hierarchy.

**Relationship** — a governed connection permitting information exchange, specialization, or
coordinated processing. Exists only when admitted:

```
Discovery ≠ Relationship
Proposal ≠ Relationship
Admission = Relationship
```

**Relationship Topology** — the structure created by all active admitted relationships.
Determines information flow, specialization, resilience, and emergent cognitive pathways.
Topology is itself a form of memory.

**Necklace** — an emergent sequence or cluster of validated relationships that repeatedly
contributes to coherent processing. **Not created by design — it emerges** through repeated
successful admitted relationships. If someone builds a `createNecklace()` function that
attaches cells on demand, the concept has been misimplemented; the entire point is emergence,
not a workflow.

## 2. Relationship Classes

Not every relationship carries the same semantic weight — the Mesh must distinguish purpose:

| Class | Purpose | Example | Characteristics |
|---|---|---|---|
| Perceptual | Transfer observations/features | SignalCell → PatternCell | High frequency, low semantic commitment, frequently changing |
| Interpretive | One Cell provides contextual interpretation | PatternCell → ContextCell | Requires stronger evidence, more carefully governed |
| Memory | Connects current observation to persistent structure | Formation → RKM Object | Highest persistence requirements |
| Contradiction | Represents disagreement/competing explanations | Hypothesis A ↔ Hypothesis B | Must not be treated as failure — disagreement is a valid cognitive state |
| Causal | Potential cause/effect structure | Condition → Outcome | Highest admission burden, strongest evidence governance |

## 3. Relationship Lifecycle

```
OBSERVATION → PROPOSAL → ADMISSION REVIEW → VALIDATED RELATIONSHIP →
ACTIVE TOPOLOGY → MAINTENANCE → { CHALLENGE | STRENGTHEN | DECAY } →
SUPERSEDED OR REMOVED
```

No direct topology mutation is permitted at any stage — every transition is an event, per
KRYL-CF-005 §2's admission semantics.

## 4. Relationship Strength

Strength is never emitted by a Cell — it's derived from continued validity, usage,
contribution, contradiction history, and evidence quality.

- Strengthens: repeated utility + consistent evidence + absence of contradiction
- Weakens: low contribution + new contradictory evidence + resource inefficiency

## 5. Topology Formation

Cognitive structures emerge through repeated relationship patterns — e.g. `A→B` observed
repeatedly, later `B→C` and `A→C` form, and the Mesh recognizes a Formation. The Formation is
discovered, not manually created.

## 6. Topology Behaviors

- **Growth** — evidence-driven (unresolved evidence persists, existing pathways can't explain
  observations), never demand-driven.
- **Contraction** — relationships lose utility, evidence becomes invalid, pathways are
  superseded. The Mesh must be capable of forgetting.
- **Branching** — multiple interpretations remain valid simultaneously (e.g. Signal →
  Hypothesis A / Hypothesis B). Branching represents unresolved reality, not failure.
- **Convergence** — independent relationships support a common formation, increasing
  structural coherence.

## 7. Topology Governance Rules

- **T1 — No Ungoverned Edges.** No Cell may create an active relationship without Admission.
- **T2 — No Relationship Implies Truth.** A validated relationship means "currently admitted,"
  not "universally true."
- **T3 — Relationships Have Memory.** Removed relationships are not erased — they remain
  historically traceable.
- **T4 — Complexity Must Earn Existence.** The Mesh must not grow topology unless increased
  complexity produces increased coherence.
- **T5 — Absence Is Valid.** The absence of a relationship is an allowed state; the Mesh must
  not force connectivity. (Direct application of §22 Absence-Is-Signal to this domain.)

## 8. Topology ↔ RKM Relationship

```
LIVE MESH  — temporary adaptive cognition
     ↓
RKM        — persistent admitted reality
```

**A relationship inside the Mesh does not automatically become RKM genealogy.** Only
relationships passing genealogy admission (KRYL-1133) may enter durable memory. This is the
single load-bearing boundary in this document — it's what keeps the Mesh from becoming a
second, competing truth store.

## 9. Relationship Failure Modes

| Failure | Cause | Mitigation |
|---|---|---|
| Relationship Explosion | Too many weak connections | Admission thresholds, topology budgets |
| Cognitive Isolation | Cells can't discover useful relationships | Controlled exploration mechanisms |
| Echo Formation | Self-reinforcing pathways | Contradiction relationships, independent evidence requirements |
| Frozen Topology | Relationships never decay | Lifecycle management, supersession |

## 10. Open Questions

1. Should relationship topology have explicit domains, or remain emergent?
2. How does the Mesh discover potential neighbors without creating uncontrolled connectivity?
3. What constitutes sufficient utility for maintaining a Necklace?
4. Should some relationships require human admission?
5. Can topology itself become an object in RKM?

## 11. Closing Statement

The Cognitive Mesh is not a collection of independent agents. It's a governed ecosystem of
specialized Cells (Cognitive Primitives) whose relationships continuously reorganize to
produce coherent intelligence:

```
Cells perceive.
Admission governs.
Topology learns.
RKM remembers.
```

The differentiator from an ordinary multi-agent system isn't "distributed nodes" — it's that
**the topology itself becomes adaptive memory**: connections aren't just communication paths,
they're learned structures the system earns through evidence, not something granted by
configuration.
