**Stage 1 Formalization — Relational Substrate**
(Final — Closed)

---

### 1. Canonical Primitive

A relationship is a 5-tuple

\[
\rho = (id,\ part,\ type,\ \phi_{class},\ \nu)
\]

where

- \(id\) is the system-assigned canonical identity,
- \(part\) is an ordered pair or finite set of participants,
- \(type\) is a ratified relationship type,
- \(\phi_{class} \in \{\text{Semantic},\ \text{Statistical}\}\),
- \(\nu = \{\nu_{id},\ \nu_{state}\}\).

---

### 2. Same-ness

Two observations \(o_1\) and \(o_2\) identify the **same relationship** if and only if

\[
\begin{align*}
part(o_1) &= part(o_2), \\
type(o_1) &= type(o_2), \\
\phi_{class}(o_1) &= \phi_{class}(o_2), \\
\nu_{id}(o_1) &= \nu_{id}(o_2).
\end{align*}
\]

When same-ness holds, the system retains (or assigns once) a single canonical \(id\).
\(\nu_{state}\) is excluded from same-ness.

---

### 3. \(\nu\) Partition

\[
\nu = \{\nu_{id},\ \nu_{state}\}
\]

- \(\nu_{id}\) contains only those properties declared identity-defining by the ratified definition of \(type\).
  \(\nu_{id}\) is immutable for the life of \(\rho\).

- \(\nu_{state}\) contains only those properties explicitly permitted to vary by the ratified definition of \(type\).
  \(\nu_{state}\) may change under the type's change rules.

No component of \(\nu\) may introduce relational meaning not present in the ratified type definition.

---

### 4. Evidence → Admission

Let \(E\) be a body of evidence.

An **admissible relationship assertion** is a structure

\[
\alpha = (part,\ type,\ \phi_{class},\ \nu_{id},\ \nu_{state},\ \Pi)
\]

where \(\Pi\) is the provenance of \(E\) and \(\alpha\) satisfies the admission rule of \(type\).

**Admission** maps an admissible assertion to a canonical relationship:

- If no existing \(\rho\) satisfies same-ness with \(\alpha\), a new \(\rho\) is created and a fresh \(id\) is assigned.
- If an existing \(\rho\) satisfies same-ness, the existing \(id\) is retained and \(\nu_{state}\) may be updated according to the type's change rules; the new evidence and provenance are appended to the immutable evidence history \(H(\rho)\).

Evidence never directly writes \(\rho\); it produces assertions that are admitted or rejected by the type's rule.

---

### 5. Relationship-State Predicates

Let \(\rho\) be a canonical relationship and \(H(\rho)\) its prior admitted state/evidence history.
Given a new evidence observation, evidence insufficiency, or termination observation evaluated against \(\rho\) and \(H(\rho)\), exactly one of the following predicates holds.

| Predicate | Definition |
|-----------|------------|
| **NEW** | No existing \(\rho\) satisfies same-ness with the observation. |
| **PERSISTENT** | Same-ness holds and \(\nu_{state}\) (together with type-specific evidence) shows no material change relative to \(H(\rho)\). |
| **STRENGTHENING** | Same-ness holds and the evidence satisfies the type-specific rule for an increased state of the relationship. |
| **WEAKENING** | Same-ness holds and the evidence satisfies the type-specific rule for a decreased state of the relationship. |
| **RECONFIGURED** | Same-ness holds (\(\nu_{id}\) unchanged) and one or more properties in \(\nu_{state}\) have changed in a manner permitted by the type, **and** the change does not qualify as STRENGTHENING or WEAKENING under the type's rule. |
| **DISSOLVED** | Same-ness previously held **and** there exists positive evidence of termination or cessation that the type's dissolution rule explicitly recognizes. |
| **UNSUPPORTED** | Same-ness previously held, current evidence is insufficient to continue support, **and** no positive termination evidence exists. |

**Precedence**
For each ratified type, the admission/change rule must define a total order on permitted \(\nu_{state}\) transitions such that every observed transition resolves to exactly one predicate.
RECONFIGURED is residual: it applies only when the transition is permitted and does not satisfy the type's STRENGTHENING or WEAKENING criteria.

---

### 6. Class Semantics

\[
\phi_{class} \in \{\text{Semantic},\ \text{Statistical}\}
\]

\(\phi_{class}\) is declared by the ratified definition of \(type\).
It is not inferred from evidence at admission time and does not change for the life of \(\rho\).

---

### 7. Type Authority

Every ratified relationship type \(T\) must define, as part of its ratification:

- the admissible form of \(part\),
- the fixed \(\phi_{class}\),
- the class of evidence that may support admission,
- the admission rule (mapping evidence to an admissible assertion or rejection),
- the exact set of properties that constitute \(\nu_{id}\),
- the exact set of properties permitted in \(\nu_{state}\),
- the change rules that classify transitions of \(\nu_{state}\) into STRENGTHENING, WEAKENING, or RECONFIGURED,
- the dissolution rule (positive evidence required for DISSOLVED),
- the unsupported rule (conditions under which the relationship becomes UNSUPPORTED).

No property may appear in \(\nu\) unless it is enumerated in the definition of \(T\).

---

### 8. Graph Relationship

The Relational Graph \(\mathcal{G}\) is a representation / projection of the set of admitted canonical relationships \(\{\rho\}\).

- \(\mathcal{G}\) contains no information that is not present in some admitted \(\rho\).
- Admission of relationships is performed solely by the type admission rules; \(\mathcal{G}\) never participates in admission.
- Any derived indexes, paths, or views over \(\mathcal{G}\) are non-constitutive.

---

### 9. CFX Boundary

The only permitted causal order is

\[
\text{Relationships} \;\rightarrow\; \text{Connectivity} \;\rightarrow\; \text{Formation} \;\rightarrow\; \text{Emergent Structure}
\]

CFX consumes the Relational Graph (or projections thereof).
No output of Connectivity, Formation, or Emergent Structure may influence the admission, same-ness, or state classification of any \(\rho\).

---

### 10. Provenance and Temporal Integrity

- Every admissible assertion \(\alpha\) carries provenance \(\Pi\) of the underlying evidence.
  \(\Pi\) is retained in the history \(H(\rho)\) and is never altered.
- Derived fields of \(\rho\) (including \(\nu_{state}\)) may change only according to the type's change rules.
- The identity components \((part,\ type,\ \phi_{class},\ \nu_{id})\) are immutable once \(\rho\) is created.
- Temporal ordering of admissions is part of \(H(\rho)\) and is required for evaluation of the state predicates.

---

### Explicit Exclusions

This formalization does **not**:

- choose implementation technology or storage,
- design database schemas,
- define adapters or migration strategies,
- resurrect \(\eta\), \(\phi_0\), or \(\textit{structuralSupport}\),
- introduce any universal strength, confidence, force, or intensity measure,
- resolve non-ontology questions,
- introduce new relationship types,
- treat Formation or Emergent Structure as relationships,
- elevate any mathematical convenience to an ontological commitment.

---

**Stage 1 Formalization is closed.**

**Resulting architecture**

```
Evidence → Admission → Canonical Relationship → Relational Graph → CFX
```

**Identity / State separation**

- Identity: \(part + type + \phi_{class} + \nu_{id}\)
- State: \(\nu_{state}\)
- Evidence history: external to \(\rho\), immutable
- Formation: downstream, non-constitutive

No ontology remains unresolved.

---

## Closure note

Stage 1 now has a complete chain:

**Discovery → Inventory → Map → Validate → Adapt → Founder Rulings → Formalization**

Critical boundaries now explicit:

- Evidence history is external to `ρ` and immutable.
- Identity cannot mutate.
- Only type-authorized `ν_state` can change.
- STRENGTHENING / WEAKENING are type-specific.
- RECONFIGURED cannot alter identity.
- DISSOLVED requires positive termination evidence.
- UNSUPPORTED is distinct from DISSOLVED.
- Graph is representational, never constitutive.
- CFX cannot feed backward into relational admission.
- No generic strength/confidence construct remains.

The next phase is **Implementation**, subject to this contract — pending its own explicit go.
