# Enhanced SPEC — Formation Story Type Classification

**Ticket:** KRYL-1223
**Status:** DRAFT — Founder review (enhanced)
**Type:** Feature · Formation semantics
**Related:** KRYL-1224 · KRYL-1225
**Integration point:** Shared Formation object

---

## 1. Purpose

KRYLO identifies what kind of structural story an admitted Formation represents.

- Formation answers: **What has formed?**
- Story Type answers: **What kind of structural story does the admitted evidence constitute?**

Story Type is a derived, evidence-only characterization of the Formation.
It is never a prediction, never an independently generated narrative, and never a substitute for Formation detection or relationship admission.

## 2. Story Types (Initial Taxonomy)

| ID | Name | Core Structural Claim |
|----|------|-----------------------|
| 1 | CONVERGENCE | Distinct domains are assembling around a common structural target. |
| 2 | FRACTURE | An existing structural relationship is weakening, separating, or reversing. |
| 3 | CONCENTRATION | Influence, ownership, capital, attention, or dependency is accumulating around fewer actors. |
| 4 | EARLINESS | A structurally meaningful position exists while corroboration remains limited relative to its significance. |
| 5 | ABSENCE | A domain, relationship, or corroborating signal that is structurally relevant is materially missing. |
| 6 | SEQUENCE | The temporal ordering of relationships is itself structurally significant. |
| 7 | COMMITMENT | An actor has crossed an observable durability or irreversibility threshold. |
| 8 | CONTAGION | A condition has propagated from one domain or relationship into another. |
| 9 | PERSISTENCE | The same structural condition remains present across multiple observations. |

**PROVENANCE_LIMIT** is not a Story Type. It is an evidence-boundary property attached to every Story.

## 3. Classification Principle (Non-Negotiable)

Classification is derived exclusively from:

- admitted relationships inside the Formation,
- observable temporal properties of those relationships and observations,
- measurable structural properties of the Formation (domain count, polarity, direction, concentration, etc.).

It is forbidden to base classification on:

- arbitrary visual geometry,
- generated prose,
- external assumptions about the subject,
- any predicted or forecast value,
- any relationship that was not admitted into the Formation,
- any manually assigned label unsupported by Formation evidence.

**Rule:**
If the Story Type cannot be explained from the Formation's underlying admitted evidence and temporal properties, the classification does not exist.

## 4. Shared Formation Contract

KRYL-1223 consumes the existing Formation object. It does not redefine the schema.

**Minimum required inputs**
```
formation_id
members
relationships          // admitted only
domains
temporal_span
observations
provenance
```

**Derived quantities the classifier may compute (never stored as source of truth)**
```
domain_count
relationship_count
relationship_polarity_distribution
relationship_direction_distribution
temporal_order
observation_count
persistence_span
cross_domain_propagation
actor_concentration
evidence_breadth
```

## 5. Classification Output

Every Formation receives a Story object:

```typescript
formation.story = {
  primary: StoryType | null,           // strongest evidence-backed type, or null
  secondary: StoryType[],              // additional types that also meet their rules
  basis: StoryBasis[],                 // machine-readable conditions that justified each type
  evidence: EvidenceRef[],             // concrete admitted relationships / observations used
  provenanceLimit: ProvenanceLimit,    // explicit boundary of supporting evidence
  classifierVersion: string,
  classifiedAt: Instant
}
```

**story_basis** must identify the observable conditions responsible for the classification.
Example (human-readable form of the machine basis):

```
STORY TYPE
CONVERGENCE

BASIS
Capital, Technology, and Ownership relationships
are assembling around the same structural target.

EVIDENCE
3 domains
7 admitted relationships
4 observation periods
```

## 6. Classification Rules (Precise Predicates)

Each rule is a necessary condition set. All must be satisfied for the type to be assigned.

**CONVERGENCE**
- ≥ 2 distinct domains participate
- Admitted relationships share a common structural target
- The commonality is directly supported by the admitted relationship set

**FRACTURE**
- At least one previously admitted relationship shows observable weakening, separation, or polarity reversal
- The change is measurable in the evidence (not merely a lower magnitude)
- The relationship remains inside the Formation

**CONCENTRATION**
- A measurable increase in concentration of relationships, control, ownership, capital, attention, or dependency onto fewer actors
- Concentration is computed from the admitted relationship set (e.g., actor degree distribution, ownership share, dependency fan-in)

**EARLINESS**
- A structural position of clear significance exists
- Corroborating evidence remains limited relative to that significance
- The type explicitly marks current incompleteness; it never asserts future recognition

**ABSENCE**
- A domain, relationship class, or corroborating signal is structurally relevant given the rest of the Formation
- That expected participation is absent from the admitted set
- Absence is established from the observation substrate, not from "no data arrived"

**SEQUENCE**
- Multiple observations or relationships possess a meaningful temporal order
- Reversing that order would materially change the structural interpretation of the Formation

**COMMITMENT**
- An actor has crossed a durability or irreversibility threshold
- The threshold is defined by observable data (e.g., contractual, capital, ownership, or temporal persistence criteria)

**CONTAGION**
- A condition appears in one domain
- A related condition subsequently appears in another domain
- Temporal precedence + structural linkage are both supported by admitted evidence

**PERSISTENCE**
- Substantially the same structural condition is present across multiple observations
- The span exceeds the defined observation threshold
- A single observation can never receive PERSISTENCE

## 7. Multiple Story Types

A Formation may satisfy more than one Story Type.

- The system always computes the full set of satisfied types.
- Default guest presentation shows only the **PRIMARY** type.
- Secondary types may be exposed in inspection or advanced views.

**Primary selection rule**
Primary = the type whose justifying evidence set is the strongest according to a deterministic, non-predictive ranking (cardinality of supporting relationships + temporal span + domain breadth, with explicit tie-breakers).
No type is shown merely because it is plausible.

## 8. Confidence / Evidence Discipline

KRYLO never converts classification into a predictive probability.

Forbidden:
```
87% likely to be convergence
```

Required:
```
CONVERGENCE
3 domains · 7 relationships · 4 observations
Basis: common structural target, cross-domain participation, temporal co-occurrence
```

The evidence itself makes the classification inspectable.

## 9. Provenance Boundary

Every Story carries an explicit provenance limit:

```
PROVENANCE LIMIT
Supported through: Capital, Technology, Ownership
Not corroborated by: Labor
```

This property is orthogonal to Story Type and is always present.

## 10. Relationship to Forecast (KRYL-1225)

```
Formation
   ├── Story Type          ← what the observed structure is doing
   ├── Evidence
   ├── Provenance Limit
   └── Forecast Boundary   ← where observation ends and extrapolation begins
```

Forecast / extrapolation is strictly downstream.
A projected trajectory must never cause a Formation to receive any Story Type.
Story Type is computed solely from observed evidence.

## 11. Relationship to Cone Field (KRYL-1224)

```
Formation
     ↓
KRYL-1223  Story Type
     ↓
KRYL-1224  Visual encoding (optional)
```

KRYL-1224 may visually encode the primary Story Type.
The cone field must never independently invent or infer a Story Type.

## 12. Three-Second Requirement

In the default guest view the primary Story Type must be recognizable within three seconds.

The guest must be able to answer:
"What kind of structural story am I looking at?"
without opening a legend, reading methodology, inspecting individual relationships, or interpreting raw metrics.

Inspection remains available for the "why."

## 13. Failure Conditions

The classifier returns no Story Type when any of the following hold:

- Formation lacks sufficient admitted evidence
- Classification would require an unadmitted relationship
- Distinction between candidate types cannot be established
- Evidence is contradictory
- Classification would require prediction or forecast values
- Available data cannot establish the claimed structural condition

Preferred output:
```
STORY TYPE
Not established

REASON
Insufficient structural evidence.
```

Unknown is always preferable to fabricated meaning.

## 14. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Every assigned Story Type is traceable to admitted Formation relationships or observable temporal properties. |
| AC-2 | Story Type never depends on projected or forecast values. |
| AC-3 | Every classification exposes a machine-readable basis. |
| AC-4 | Every Story retains an explicit evidence boundary (provenanceLimit). |
| AC-5 | Secondary Story Types are supported without requiring default display. |
| AC-6 | System can return "Not established" when evidence is insufficient. |
| AC-7 | KRYL-1223 never creates, alters, or admits Formation relationships. |
| AC-8 | KRYL-1224 can consume the Story Type directly from the Formation object. |
| AC-9 | Primary Story Type is recognizable in the default guest experience within three seconds without a legend. |
| AC-10 | Classifier is deterministic: identical Formation input yields identical Story output. |

## 15. Non-Goals

KRYL-1223 does **not**:

- generate narrative copy
- predict future outcomes
- rank investment opportunities
- determine Formation membership
- admit relationships
- replace RelationCore
- calculate the Forecast
- redesign the Inspection surface

## 16. Governing Principle

KRYLO does not tell a story because a story sounds plausible.
KRYLO identifies the type of story that the evidence-supported Formation actually constitutes.

---

**Enhancement summary (for Founder review)**
- Rules rewritten as explicit necessary-condition predicates.
- Output schema made fully machine-readable.
- Primary/secondary selection given a deterministic, non-predictive rule.
- Cross-ticket boundaries with KRYL-1224 and KRYL-1225 tightened.
- Failure and "Not established" behavior elevated to first-class.
- Determinism added as an explicit acceptance criterion.
- Derived quantities and provenance handling clarified without expanding scope.

---

## 17. Mathematical Hardening — the validation contract

### 17.0 Governing calibration rule

> **Defined → measurable → calibrated → eligible for guest semantics.**
>
> An undefined predicate cannot masquerade as a mathematically grounded Story Type.
> An uncalibrated threshold may participate in development and testing but MUST NOT
> produce a guest-facing **primary** Story Type. Uncalibrated types may still be
> computed and exposed in inspection / advanced views.

Four rules the formalism must obey:
1. Predicates match their prose exactly.
2. Every function a predicate uses is defined here, or the predicate is `UNCALIBRATED`.
3. Every threshold has a provenance entry (§17.4).
4. `UNCALIBRATED` predicates cannot become a guest primary.

### 17.1 Structural quantities

```
domain_count(F)     = |D_F|
rel_count(F)        = |R_F|
persistence_span(F) = t_max(O_F) − t_min(O_F)
temporal_order_strength(F) = Kendall τ of relationship onset times;  0 if any onset time missing
concentration(F)   = 1 − H(p) / log|A_F|   for |A_F| ≥ 2 ;  undefined (type not assignable) for |A_F| ≤ 1
```

`p` = the **actor dependency-fan-in distribution** — the single authoritative concentration
distribution. Actor degree and ownership share are recorded on the Formation but are
**not** used for classification (otherwise the same Formation could receive different
Story Types depending on which distribution was supplied).

### 17.2 Corrected predicates

```
CONVERGENCE
  ∃ t :  |{ r ∈ R_F : target(r) = t }| ≥ 2
      ∧  |{ domain(r) : r ∈ R_F, target(r) = t }| ≥ 2        ← distinct domains, per prose

FRACTURE
  ∃ r ∈ R_F :  polarityReversal(r)
            ∨ ( Δmagnitude(r) < −θ_fracture  ∧  polarityComponent(r) )
  polarityComponent(r) := fracture-polarity share of r's evidence ≥ FRACTURE_POLARITY_THRESHOLD
  Magnitude decline alone NEVER fires FRACTURE.

CONCENTRATION
  concentration(F) > θ_conc  ∧  Δconcentration(F) > 0 across O_F
  (undefined, hence not assignable, when |A_F| ≤ 1)

SEQUENCE
  |temporal_order_strength(F)| > θ_seq

CONTAGION
  ∃ d1, d2 ∈ D_F, t1 < t2 :  condition onset in d1 at t1,
                             related condition onset in d2 at t2,
                             ∧ ∃ admitted r ∈ R_F linking a member of d1 to a member of d2

PERSISTENCE
  |O_F| ≥ 2  ∧  persistence_span(F) ≥ θ_pers
           ∧  min over consecutive pairs  structural_similarity(O_i, O_{i+1}) > θ_sim
  structural_similarity(a,b) := Jaccard(rel_set(a), rel_set(b))  ∧  domain-set overlap ≥ θ_dom
  (both terms required)
```

### 17.3 Uncalibrated types (guest-primary-ineligible until defined)

| type | blocking undefined function |
|---|---|
| EARLINESS | `significance(F)`, `corroboration_ratio(F)` |
| ABSENCE | `structurally_expected(F)`, `relevance(d*, F)` |
| COMMITMENT | `durability(a)` and its threshold basis |

These remain in the taxonomy, are still computed, still shown in inspection — never a
guest primary until their functions are formally defined and their thresholds calibrated.

### 17.4 Threshold register

| θ | meaning | derivation | status |
|---|---|---|---|
| `θ_fracture` | min Δmagnitude for the decline arm of FRACTURE | — | **UNCALIBRATED** |
| `θ_conc` | concentration threshold | — | **UNCALIBRATED** |
| `θ_pers` | minimum persistence span | observation policy (TBD) | **UNCALIBRATED** |
| `θ_sim` | structural-similarity floor | needs `structural_similarity` calibration set | **UNCALIBRATED** |
| `θ_dom` | domain-set overlap floor | — | **UNCALIBRATED** |
| `θ_seq` | Kendall τ magnitude floor | — | **UNCALIBRATED** |
| `w1, w2, w3` | primary-selection weights | config-only, documented at set time | N/A (not a predictor) |
| `FRACTURE_POLARITY_THRESHOLD` | reused from `domaingravity.js` | existing, in production | **CALIBRATED** (inherited) |

**Starting state:** every new θ is `UNCALIBRATED` → **no guest-facing primary Story Type
is produced** until at least one type's full θ set is calibrated with a documented basis.
That is the honest initial condition, not a defect.

### 17.5 Primary selection (deterministic)

```
primary(F) = argmax over  T ∈ satisfied(F) ∩ CALIBRATED   of   S(T, F)
S(T, F)    = w1·|supporting_relationships(T,F)| + w2·|domains(T,F)| + w3·persistence_span(F)
tie-breakers, in order: (1) more supporting relationships, (2) more domains, (3) lower type ID
```

`secondary(F)` = `satisfied(F) \ {primary}` — includes UNCALIBRATED types, inspection-only.
Identical Formation input → identical Story output (AC-10).


---

## Cross-cutting principles

This ticket is part of the Formation Guest Model — see `specs/SPEC-CROSSCUTTING-formation-guest-model.md`.

- **Provenance Boundary** — KRYLO shows where the evidence supports the read and where it stops.
- **Trusted Read → Early Action** — the read must be groundable enough that the guest decides whether to act; KRYLO never tells them to.
- **Layered, not dumbed down** — the guest view provides the read; inspection provides the reasoning. Three seconds means compressed evidence, not less intelligence.
