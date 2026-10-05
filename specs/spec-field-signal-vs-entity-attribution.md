# Field Signal vs. Entity Attribution

## Transferable Requirements Specification

Status: DRAFT, pasted by the Founder on 2026-10-05. A product requirement, not an implementation ticket. The lesson applies across domains, subjects, and future producers.

### 1. Purpose

KRYLO must distinguish between:

1. **Structure detected in the observed field**, and
2. **Structure demonstrated to involve the queried entity**.

A field may contain meaningful cross-domain concentration even when the queried subject cannot be resolved or identifier-bound.

Failure to establish entity attribution MUST NOT cause valid field-level observations to be discarded. Conversely, field-level concentration MUST NOT be represented as an entity-specific relationship or formation.

---

## 2. Core Principle

> **Detect the field independently; attribute the field only when evidence supports attribution.**

The system MUST preserve these as separate evidentiary states.

### Field detection

The system MAY report:

* observation volume
* domain composition
* domain magnitude
* cross-domain co-presence
* concentration
* other explicitly measured field characteristics

when supported by observations.

### Entity attribution

The system MAY assert an entity-specific:

* relationship
* relationship state
* formation
* structural change
* participant role

ONLY when the underlying evidence is identifier-bound to the entity and satisfies the applicable admission rules.

---

## 3. Required Evidentiary Layers

KRYLO outputs MUST maintain separation among these layers:

| Layer        | Question                                          | Permitted conclusion                       |
| ------------ | ------------------------------------------------- | ------------------------------------------ |
| Field        | What is observable in the scanned field?          | Field-level signal                         |
| Composition  | Which domains contribute to that field?           | Domain composition                         |
| Co-presence  | Which domains occur together?                     | Cross-domain co-presence                   |
| Attribution  | Is the queried entity identified in the evidence? | Entity attribution / unresolved            |
| Relationship | Is a canonical relationship evidenced?            | Admitted ρ / no evidence / unresolved      |
| Formation    | Do admitted relationships demonstrate formation?  | Formation state / no formation established |

No layer may silently substitute for another.

---

## 4. Subject Resolution Requirement

If the queried entity cannot be resolved to an unambiguous identifier:

* The system MUST NOT attribute field observations to that entity.
* The system MUST NOT manufacture entity-specific relationships.
* The system MUST NOT infer participation from domain co-presence.
* The system MUST preserve valid field-level observations.
* The output MUST explicitly state that entity attribution was not established.

Required semantic state:

> **FIELD DETECTED — ENTITY ATTRIBUTION NOT ESTABLISHED**

Equivalent wording MAY be used in the UI, provided the distinction remains explicit.

---

## 5. Field Signal Requirement

When observations are available but entity attribution is unavailable, KRYLO SHOULD still expose measurable field characteristics.

At minimum, where data exists:

* observation count by domain
* aggregate domain magnitude
* relative domain concentration
* observed cross-domain co-presence

Example:

> CAPITAL: 115 observations / magnitude 75
> LABOR: 33 observations / magnitude 60
> OWNERSHIP: 30 observations / magnitude 44
> TECHNOLOGY: 17 observations / magnitude 58

This describes the observed field. It does **not** establish Berkshire participation.

---

## 6. Co-Presence Boundary

Cross-domain co-presence MUST remain explicitly distinct from canonical ρ.

A statement such as:

> CAPITAL ↔ LABOR

means only that both domains are represented within the observed field unless additional evidence establishes a relationship.

It MUST NOT be rendered as:

* a canonical relationship
* a directed relationship
* a formation
* a participant connection

without relationship-level evidence.

The existing distinction:

> **CROSS-DOMAIN CO-PRESENCE (not admitted ρ)**

should remain the governing semantic boundary.

---

## 7. Relationship Admission Boundary

A field signal MUST NOT satisfy relationship admission merely because:

* two domains have high magnitude
* two domains have high observation counts
* domains repeatedly co-occur
* the queried entity is named in the question
* the output appears structurally coherent
* an aggregate pattern appears significant

Canonical ρ requires its own evidence and admission path.

---

## 8. Formation Boundary

Formation MUST remain downstream of admitted relationships.

The system MUST permit the following state:

> Strong field signal
>
> * unresolved subject
> * no entity-bound relationships
> * no formation established

This is a valid output state.

A strong field signal MUST NOT force formation.

---

## 9. Measurement vs. Attribution

KRYLO MUST distinguish:

**What was measured**

from

**What was attributed.**

For example:

> The observed field contains substantial CAPITAL, LABOR, OWNERSHIP, and TECHNOLOGY signal.

is permissible if supported by the observations.

But:

> Berkshire is structurally connected across CAPITAL, LABOR, OWNERSHIP, and TECHNOLOGY.

is NOT permissible unless the observations are identifier-bound to Berkshire and pass the relevant relationship/formation admission rules.

---

## 10. Negative-Control Behavior

A successfully resolved subject SHOULD produce a materially different evidentiary result from an unresolved subject when the underlying data permits entity attribution.

### Unresolved subject

Expected:

* field signal may be present
* field composition may be present
* co-presence may be present
* entity attribution = unresolved
* canonical relationship = withheld unless independently evidenced
* formation = withheld unless independently established

### Resolved subject

Expected:

* field signal may be present
* field composition may be present
* entity attribution can be established
* qualifying evidence can produce canonical relationships
* formation can be evaluated from those relationships

This comparison SHOULD be used as a validation test for the structural pipeline.

---

## 11. No-Discard Requirement

Failure of entity resolution MUST NOT automatically discard otherwise valid observations.

The pipeline MUST preserve the distinction between:

**Observation exists**

and

**Observation is attributable to the queried entity.**

An observation may therefore remain usable for field analysis while being unusable for entity-specific relationship admission.

---

## 12. No-Inference Requirement

The system MUST NOT use field-level statistics as hidden proxies for entity participation.

Specifically prohibited:

* assigning field magnitude to the subject
* converting domain concentration into relationship strength
* converting co-presence into relationship admission
* converting repeated observations into formation
* converting an unresolved named subject into a resolved participant
* treating absence of attribution as evidence of absence from the field

---

## 13. Required Output Semantics

The output model SHOULD make the following states independently inspectable:

```text
FIELD
  observations
  domain composition
  domain magnitude
  cross-domain co-presence

SUBJECT
  resolution state
  canonical identity, if resolved

RELATIONSHIPS
  admitted ρ
  no evidence
  unresolved

FORMATION
  formation state
  or "No formation established"
```

No downstream section may imply a stronger evidentiary state than the upstream evidence supports.

---

## 14. Acceptance Criteria

### AC-1 — Field preservation

Given valid observations and an unresolved subject, KRYLO preserves and displays supported field-level measurements.

### AC-2 — Attribution withholding

Given an unresolved subject, KRYLO does not attribute those observations, relationships, or formations to the subject.

### AC-3 — Co-presence separation

Domain co-presence is displayed separately from canonical ρ.

### AC-4 — Relationship separation

Field magnitude, observation count, or domain co-presence cannot independently create canonical ρ.

### AC-5 — Formation separation

Field-level signal cannot independently create formation.

### AC-6 — Explicit attribution state

The output explicitly identifies when entity attribution has not been established.

### AC-7 — Observation preservation

Entity-resolution failure does not erase valid field observations.

### AC-8 — No proxy attribution

No aggregate field metric is silently reused as an entity-specific metric.

### AC-9 — Resolved-subject contrast

A resolved named entity can proceed through the entity-bound evidence path and produce relationships only where the evidence/admission path supports them.

### AC-10 — Negative control

An unresolved-subject query and an equivalent resolved-subject query demonstrate that entity attribution changes the evidentiary output rather than merely changing the wording.

---

## 15. Product Invariant

The following invariant applies across all structural domains and producers:

> **Field signal may exist without entity attribution. Entity attribution may exist without relationship admission. Relationship admission may exist without formation. Each evidentiary transition must be earned independently.**

This requirement is transferable across:

* CAPITAL
* LABOR
* KNOWLEDGE
* TECHNOLOGY
* MEDIA
* OWNERSHIP
* current and future evidence producers
* current and future structural relationship types

---

## 16. Exit Condition

This requirement is complete only when a real query can demonstrate all applicable states independently:

**field observed → subject resolution state → attribution state → relationship admission state → formation state**

with no layer deriving a stronger claim solely from the existence or magnitude of an upstream signal.

The important addition is **"field signal may exist without entity attribution" as a formal product invariant**. That prevents this lesson from getting lost as a one-off UI adjustment.

---

## 17. Terminology Boundary (added 2026-10-05, from the UnitedHealth readout)

> **Field-level structural intensity MUST NOT be represented using terminology that implies entity-level convergence, relationship, or formation when entity attribution has not been established.**

### Observed case (UnitedHealth, 2026-10-05)
- Field: CAPITAL 102 observations / magnitude 76; LABOR 32 / 61; OWNERSHIP 18 / 49; TECHNOLOGY 11 / 73 (three readings of 85); KNOWLEDGE 3 / 27; MEDIA 2 / 59. 165 of 168 observations sit in four domains.
- The same readout states: "No dated subject-bound evidence facet resolved for this subject yet", "no CAPITAL evidence identifier-bound to unitedhealth-group", and "fewer than two domains are connected".
- Yet the top-level status can read HIGH CONVERGENCE next to the company name. A guest can reasonably read that as convergence around UnitedHealth, which the evidence section says is not established.
- Same pattern seen on Berkshire Hathaway (208 observations, HIGH CONVERGENCE, "No subject resolved"), and in the 11-query run on localhost (2026-10-04) where the label tracked the field's observation count, not the company (`specs/query-run-trends-20261004.md`).

### Required status split
The top-level status MUST distinguish three separate states and MUST NOT let a single label stand for all three:
- **FIELD CONCENTRATION:** e.g. high
- **ENTITY ATTRIBUTION:** e.g. unresolved
- **RELATIONSHIP FORMATION:** e.g. none established

### AC-11 — Terminology boundary
With entity attribution unresolved, no top-level label, headline, or status uses convergence, relationship, or formation wording for the subject. Field intensity may be shown, labeled as field-level.

### AC-11 test cases
- **Unresolved case (UnitedHealth):** strong field -> attribution unresolved -> no relationship -> no formation. The status shows the three separate states above.
- **Resolved case:** field -> attributed evidence -> admitted relationships -> formation only if earned.
