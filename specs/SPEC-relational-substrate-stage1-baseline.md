# KRYLO — Stage 1 Architectural Baseline

## Relational Substrate — Final Founder-Ratification Candidate

### Purpose

This document establishes the Stage 1 architectural baseline for KRYLO's Relational Substrate.

The Relational Substrate answers one question:

> **What relationship, if any, is actually evidenced between these participants?**

It is the upstream foundation for Structural Intelligence / CFX.

The architectural progression is:

**Evidence → Relationship → Connectivity → Formation → Emergent Structure**

The Relational Substrate owns the transition from **Evidence → Relationship**.

CFX owns the downstream transition from **Relationships → Connectivity → Formation → Emergent Structure**.

The substrate must never manufacture relationships in order to make downstream structure appear.

---

# 1. Canonical Relationship Primitive

The canonical relationship is:

```text
ρ = (id, part, type, φ_class, ν)
```

Where:

* `id` — system-assigned canonical relationship identity
* `part` — relationship participants; ordered pair or explicitly permitted participant set
* `type` — ratified relationship type
* `φ_class` — relationship class
* `ν` — type-defined relationship invariants/state

Each ratified relationship type explicitly partitions:

```text
ν = { ν_id , ν_state }
```

Where:

* `ν_id` — identity-defining invariants, immutable for the life of the relationship
* `ν_state` — permitted mutable properties of the relationship

### RelationCore

RelationCore is the internal representation that stores and indexes `ρ` exactly as defined.

It does not introduce additional constitutive relationship fields.

Auxiliary indexes, provenance structures, lookup structures, and persistence mechanisms are derived infrastructure rather than additional ontology.

Existing RelationCore fields such as `eta`, `phi0`, and `structuralSupport` are therefore not automatically canonical merely because they exist in the current implementation.

---

# 2. Relationship Classes

The admissible relationship classes are:

```text
𝒞 = { Semantic, Statistical }
```

There are no additional relationship classes at this stage.

### Semantic

Represents an evidenced real-world relationship or constraint between participants.

Examples may include ownership, supply, hierarchy, dependency, control, etc., provided each is explicitly ratified as a relationship type with its own admission rule.

### Statistical

Represents an admissible mathematically established relationship between measurable variables or observations.

Statistical relationships have their own evidence/admission rules.

A statistical relationship is not automatically a semantic claim about the entities producing the measurements.

### Structural Formation

Structural Formation is **not** a relationship class.

Formation is downstream CFX output emerging from relationships and their connectivity.

---

# 3. Same-ness / Canonical Identity

Two observations constitute the same relationship if and only if they share:

1. identical participants (`part`)
2. identical relationship type (`type`)
3. identical relationship class (`φ_class`)
4. identical identity-defining invariants (`ν_id`)

Formally:

```text
same(ρ₁, ρ₂)
iff
part₁ = part₂
∧ type₁ = type₂
∧ φ_class₁ = φ_class₂
∧ ν_id₁ = ν_id₂
```

When same-ness holds, the system retains or assigns one canonical `id`.

`ν_state` is deliberately excluded from same-ness.

Therefore:

> A permitted change in relationship state does not create a new relationship identity.

Identity is a consequence of same-ness, not an independently meaningful relational property.

---

# 4. ν — Strict Partition

`ν_id` may contain only properties explicitly declared identity-defining by the ratified relationship type.

`ν_state` may contain only properties explicitly permitted to vary by that relationship type.

Neither may:

* introduce new relational meaning
* encode participant identity
* encode evidence provenance
* encode observational metadata
* introduce a universal notion of strength
* introduce a universal notion of confidence
* introduce force/intensity as generic relationship quantities
* function as unrestricted engineering metadata

If a property changes the semantics of the relationship itself, that semantic difference requires a new or refined relationship type.

`ν` cannot become a hidden ontology.

---

# 5. Evidence and Admission

Evidence precedes relationship.

No evidence means no admitted relationship.

Every relationship must pass a deterministic, auditable admission rule appropriate to its type and class.

Admission must establish, as applicable:

* participants
* relationship type
* relationship class
* admissible evidence
* provenance
* observation time
* identity-defining invariants
* admission status
* canonical identity

The system must be able to answer:

> **Why does KRYLO believe this relationship exists?**

with reconstructible evidence and provenance.

Evidence remains distinct from the relational assertion it supports.

Raw evidence is immutable.

Derived relationship assertions may change as new evidence is admitted.

Historical evidence is never rewritten to reflect a later interpretation.

---

# 6. Observable Relationship Change

Relationship change is evaluated against the canonical relationship and its **prior admitted state/evidence history**.

The recognized change predicates are:

### NEW

No existing relationship satisfies same-ness.

### PERSISTENT

Same-ness holds and the admitted evidence/state history shows no material change in permitted relationship state.

### STRENGTHENING

Same-ness holds and the evidence satisfies the relationship type's explicit rule for an increased state of the relationship.

### WEAKENING

Same-ness holds and the evidence satisfies the relationship type's explicit rule for a decreased state of the relationship.

### RECONFIGURED

Same-ness holds (`ν_id` unchanged), but one or more permitted `ν_state` properties change in a manner allowed by the relationship type.

RECONFIGURED applies only when the state transition does not qualify as STRENGTHENING or WEAKENING under the type's rule.

### DISSOLVED

Same-ness previously held and positive evidence establishes termination or cessation recognized by the relationship type's admission/change rule.

### UNSUPPORTED

Same-ness previously held, but current evidence is insufficient to continue supporting the relationship and there is no positive evidence of termination.

UNSUPPORTED is therefore distinct from DISSOLVED.

Absence of evidence does not become evidence of absence.

---

# 7. Type-Specific Change Rules

The change taxonomy is global.

Its interpretation is not.

Each ratified relationship type must explicitly define:

* which `ν` properties are identity-defining
* which `ν_state` properties may change
* what evidence establishes strengthening
* what evidence establishes weakening
* what state changes constitute reconfiguration
* what evidence establishes dissolution
* what constitutes insufficient evidence / unsupported status
* precedence where a state transition could otherwise satisfy more than one predicate

Every observed transition must resolve to exactly one change predicate.

There is no universal relationship-strength scale.

There is no universal confidence scale.

There is no generic force/intensity variable.

All such meanings, where legitimate, must be explicitly defined by the relevant relationship type and its admission rule.

---

# 8. Uncertainty Doctrine

The substrate preserves the distinction between:

* evidence
* relationship assertion
* unsupported state
* termination evidence
* structural interpretation

The system must never infer:

```text
NO CURRENT EVIDENCE → DISSOLVED
```

Instead:

```text
NO CURRENT EVIDENCE + NO TERMINATION EVIDENCE → UNSUPPORTED
```

A relationship may become unsupported without being declared dissolved.

---

# 9. Prohibitions

The Relational Substrate may not create relationships from:

* co-presence alone
* proximity
* graph distance
* endpoint magnitude
* frequency
* correlated timestamps
* endpoint similarity
* model intuition
* arbitrary thresholds
* graph topology alone
* downstream structural significance

A domain observation is not automatically a relationship between entities.

A relationship must be admitted because its own evidentiary rule is satisfied.

CFX cannot feed structural interpretation backward into relationship admission.

There is no circular strengthening:

```text
Evidence → Relationship → Structure
```

not:

```text
Evidence → Relationship → Structure → stronger Relationship
```

---

# 10. Provenance

Provenance is mandatory infrastructure for relational truth.

It must remain sufficiently structured and retrievable to establish:

* what source produced the evidence
* what observation was made
* when it was observed
* how it was transformed
* why the relationship was admitted
* which relationship assertion the evidence supports

A provenance hash may provide integrity, but a hash itself is not the evidence.

Evidence lineage must survive transformations.

---

# 11. Relational Graph

The relational graph is a representation of canonical admitted relationships.

It is not an independent source of truth.

It may provide:

* traversal
* connectivity
* indexing
* graph representation
* downstream CFX input

It may not create relationships independently of the Relational Substrate.

Existing typed-edge structures should therefore be evaluated as projection/index infrastructure over canonical relationships rather than retained as an independent relational truth source.

Migration must preserve behavior and evidence lineage rather than opportunistically rewriting representations.

---

# 12. CFX Boundary

CFX begins **after** relationships have been established.

Its input is the canonical relational graph.

Its responsibility is:

```text
Relationships
    ↓
Connectivity
    ↓
Formation
    ↓
Emergent Structure
```

CFX does not:

* manufacture relationships
* reinterpret evidence as relationships
* redefine relationship identity
* alter historical evidence
* feed formation results backward into admission

The substrate establishes what relationships are evidenced.

CFX determines what structural formations emerge from those relationships.

---

# 13. Existing Repository Architecture — How to Treat It

The repository currently contains multiple useful relational/evidentiary capabilities.

Stage 1 should treat them as raw material to adapt into the canonical substrate, not as competing ontologies.

### RelationCore

Useful prior engineering and candidate internal representation.

Its existing numerical fields are not automatically canonical.

### Typed Entity Edges

Useful traversal/index representation.

They should ultimately derive from canonical relationships rather than remain an independent sibling truth system.

### KRYL-1334 Formation State

Contains genuinely relational entity-pair evidence and temporal state.

It should be treated as an existing implementation/data path to migrate or adapt into the canonical substrate rather than as the final ontology.

### Domain Signals / MAP

Valid observations of distributed conditions.

They are not automatically semantic relationships merely because multiple domains co-occur.

The existing domain co-presence mechanism may remain useful as an observation capability, but it must not silently become a semantic relationship.

### RelationDynamics

Existing research/engineering work concerning relational dynamics.

It is currently non-operational and should be evaluated against this architecture rather than wired into the canonical path merely because it exists.

---

# 14. Migration Principle

Migration follows:

```text
Inventory
→ Map
→ Validate
→ Adapt
→ Verify
→ Deprecate
```

Not:

```text
Replace
→ Hope
```

Existing evidence and working capabilities should be preserved where they conform to the new architecture.

Where representations differ, adapters should translate source-specific evidence into the canonical admission path.

Source-specific producers should not each create their own relational truth.

The target architecture is:

```text
Source Evidence
      ↓
Source Adapter
      ↓
Canonical Admission
      ↓
Canonical Relationship ρ
      ↓
Canonical Persistence
      ↓
Derived Index / Graph Representations
      ↓
CFX
```

---

# 15. Architectural Acceptance Tests

The Stage 1 baseline must ultimately satisfy:

### A — Traceability

Every admitted relationship can be traced back to its supporting evidence.

### B — Identity Stability

Permitted state changes do not create new relationship identities.

### C — No Fabrication

No relationship can be created without satisfying its type-specific admission rule.

### D — Temporal Integrity

Observation time and historical evidence are preserved exactly.

### E — Provenance Preservation

Evidence lineage survives transformation and migration.

### F — Formation Independence

Downstream formation cannot manufacture or strengthen upstream relationships.

### G — Unsupported State

Insufficient current evidence does not automatically become dissolution.

### H — Reproducibility

Given the same evidence, admission rules, identity definitions, and prior state, the same canonical relationship result is reproducible.

---

# 16. Architectural Chain

The complete architecture is:

```text
Evidence
   ↓
Admission
   ↓
Relationship Identity
   ↓
Canonical ρ
   ↓
State History
   ↓
Observable Relationship Change
   ↓
Relational Graph
   ↓
CFX
   ↓
Emergent Structure
```

This preserves the fundamental KRYLO premise:

> **KRYLO observes distributed conditions, establishes the relationships actually evidenced among them, and detects when those relationships begin to form an emergent structure.**

The Relational Substrate makes the first half of that statement structurally true.

CFX makes the second half possible.

Neither is permitted to impersonate the other.

---

# 17. Stage 1 Implementation Rule

This baseline is the governing architectural boundary for Stage 1 implementation work.

The required order is:

```text
Ontology
→ Formalization
→ Implementation
→ Verification
```

Mathematical formalization may be used during Stage 1 to clarify, test, or expose consequences of the architecture.

It may not introduce unstated ontology.

No implementation should silently resolve an unresolved Founder decision.

No existing repository field, numerical quantity, data structure, or algorithm becomes canonical merely because it already exists.

---

# North Star

> **KRYLO must never gain apparent intelligence by weakening the evidentiary boundary.**

The purpose of the Relational Substrate is to give CFX a stronger foundation for detecting emergent structure without sacrificing epistemic integrity.
