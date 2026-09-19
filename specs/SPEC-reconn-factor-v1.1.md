# KRYLO — RECONN Factor v1.1

## Canonical Reconnaissance Contract

**Status:** Engineering Specification
**Priority:** P1
**Supersedes:** RECONN Factor v1.0 / Reasoning Factor / Deduction Factor definitions
**Primary change:** RECONN is defined as a canonical integration contract and reconnaissance payload, not as a collection of independently existing components.

---

## 1. Purpose

RECONN exists to define what KRYLO must **furnish** for a user to independently establish a structural position or condition from grounded evidence and continue monitoring that structure over time.

RECONN does not measure whether KRYLO:

* answered a question,
* reasoned correctly,
* predicted an outcome,
* forecasted a future state,
* made a recommendation,
* determined meaning,
* established causality,
* or made a decision for the user.

### Governing definition

> **RECONN measures and standardizes the grounded structural reconnaissance KRYLO furnishes—not whether KRYLO answered the question.**

The fundamental product chain is:

**OBSERVE → MAP → USER DEDUCTION → DEFINE POSITION/CONDITION → DETECT RECURRENCE OR CHANGE**

KRYLO owns the reconnaissance.
The user owns the interpretation and decision.

---

# 2. Core Contract Principle

RECONN is **not complete merely because an underlying capability exists somewhere in the codebase.**

A capability satisfies the RECONN contract only when it:

1. has a defined canonical representation;
2. preserves its governing provenance and boundaries;
3. is available to the canonical reconnaissance integration layer;
4. is included in the canonical reconnaissance payload when applicable;
5. exposes an explicit state when unavailable, incomplete, unmeasured, or withheld;
6. remains traceable to its underlying evidence/substrate;
7. can be consumed consistently by all downstream surfaces.

Therefore:

> **SUBSTRATE EXISTS ≠ RECONN COMPLIANT**

and:

> **SURFACED ≠ RECONN COMPLIANT**

The required progression is:

**SUBSTRATE EXISTS → CONTRACT CONFORMANT → CANONICAL PAYLOAD → SURFACED**

---

# 3. RECONN Architecture

RECONN is a contract and integration layer over the existing KRYLO structural substrate.

```text
QUESTION
   ↓
INTENT
   ↓
EXISTING KRYLO STRUCTURAL SUBSTRATE
   ├── Observations
   ├── Relationships
   ├── Patterns
   ├── Formations
   ├── Evidence / Provenance
   ├── Temporal source data
   └── R/T/C source data
   ↓
RECONN INTEGRATION LAYER
   ├── Canonical reconnaissance objects
   ├── Coverage/state
   ├── Comparative State
   ├── Temporal State
   ├── User Position
   └── Trigger Specification
   ↓
CANONICAL RECONNAISSANCE PAYLOAD
   ↓
┌──────────────┬──────────────┬──────────────┐
│ Target       │ Brief        │ Other        │
│ Packet       │              │ Surfaces     │
└──────────────┴──────────────┴──────────────┘
```

There shall be **one canonical reconnaissance computation/payload**.

Target Packet, Brief, exports, Action Matrix, and future institutional surfaces SHALL NOT independently reconstruct RECONN.

---

# 4. RECONN Contract Layers

The contract consists of five layers.

## Layer 1 — INTENT

Defines what the user is asking KRYLO to examine.

## Layer 2 — RECONNAISSANCE OBJECTS

Defines what KRYLO furnishes:

* Observations
* Relationships
* Patterns
* Formations
* Comparisons
* Temporal State
* R/T/C
* Evidence / Provenance

## Layer 3 — RECONNAISSANCE STATE

Defines whether the requested reconnaissance is actually furnished:

* Question Coverage
* Structural Coverage
* Relationship Coverage
* Pattern Grounding

## Layer 4 — USER POSITION

Defines the user-owned condition, position, threshold, or desired state.

KRYLO records it.

KRYLO does not interpret it.

## Layer 5 — PERSISTENCE / DETECTION

Defines what structural condition can be monitored:

* stable formation identity
* trigger specification
* recurrence
* change
* relative magnitude
* temporal condition
* R/T/C condition
* cross-domain condition

---

# 5. Canonical RECONN Payload

The canonical payload SHALL have one authoritative structure.

```text
reconnaissance
│
├── intent
│
├── observations[]
├── relationships[]
├── patterns[]
├── formations[]
├── comparisons[]
├── temporalState
├── rtc
├── evidence[]
│
├── state
│   ├── question
│   ├── structure
│   ├── relationship
│   └── pattern
│
├── userPosition
│
└── triggerability
```

Compatibility objects such as `analysisIntent` MAY remain temporarily for existing consumers, but SHALL NOT constitute a competing canonical contract.

---

# 6. INTENT Contract

Canonical INTENT:

```text
INTENT = ⟨V_req, E_req, S_req, R_cmp, T_req⟩
```

Where:

* `V_req` = required variables/conditions
* `E_req` = required relationship types
* `S_req` = required structural classes/domains
* `R_cmp` = explicit comparative requests
* `T_req` = temporal stance

Temporal stance includes:

* latest
* prior
* trend
* change
* window
* recurrence

Existing `analysisIntent` and scenario-detection logic SHOULD be reused where possible.

RECONN SHALL NOT create a competing query parser if the existing parser can be extended or wrapped to produce canonical INTENT.

### Comparison request example

```text
R_cmp:
  subject_a: customer churn
  subject_b: total revenue
  condition:
    pricing_change: +5%
  requested_measure:
    projected_impact
```

This defines the requested comparison.

It does **not** authorize KRYLO to fabricate the requested projected value.

---

# 7. Reconnaissance Object Requirements

A reconnaissance object is contract-compliant only when its source, representation, provenance, and state are defined.

Each object SHALL distinguish:

1. substrate exists;
2. substrate is contract-conformant;
3. object was computed;
4. object was surfaced;
5. object was persisted where persistence is required.

---

# 8. Question Coverage

Question Coverage determines whether the requested variables in INTENT are represented in the reconnaissance payload.

```text
U_Q = |V_req ∩ V_rep| / |V_req|
```

States:

* **PRESENT** — required variables represented
* **PARTIAL** — some required variables represented
* **NOT MEASURED** — requirement could not be evaluated
* **UNAVAILABLE** — requirement exists but cannot be represented
* **WITHHELD** — policy restriction

Coverage means **represented**, not answered.

---

# 9. Structural Coverage

Structural Coverage measures representation of requested structural classes.

```text
U_S = |S_req ∩ S_rep| / |S_req|
```

Structural Coverage SHALL NOT imply interpretation or importance.

Existing structural/absence mechanisms may provide source material, but the RECONN integration layer must normalize their output into the canonical contract.

Absence SHALL remain distinguishable from zero or missing measurement.

---

# 10. Relationship Coverage

Relationship Coverage measures whether requested/admitted relationship types are represented.

```text
U_R = |E_req ∩ E_rep| / |E_req|
```

Relationships SHALL use the existing governed relationship ontology.

The RECONN layer SHALL NOT create a parallel relationship taxonomy.

Relationship admission remains owned by the existing admission authority.

RECONN may consume admitted relationships; it may not independently declare a relationship admitted.

No relationship implies causality unless the underlying relationship type explicitly and legitimately represents that relation under the existing governance model.

---

# 11. Pattern Grounding

Pattern Grounding describes the evidentiary grounding of a surfaced structural pattern.

For a pattern `p_j`:

```text
I(p_j) = C · D · T · R
```

Where:

* `C` = evidence-type convergence
* `D` = source diversity
* `T` = temporal fit
* `R` = relationship explicitness

Pattern retention requires the declared grounding threshold.

States:

* **PRESENT**
* **PARTIAL**
* **NOT MEASURED**
* **UNAVAILABLE**
* **WITHHELD**

### Reference note (2026-09-18)

External reference: Google Research's Retrieve-for-Train work provides an independent example of
why multiplicative, mutually constraining objectives can prevent one strong dimension from
compensating for a materially weak or absent dimension. This supports retaining Pattern Grounding
as a product `C·D·T·R`, rather than replacing it with an additive formulation. This is external
validation of a discipline already present in this section, not a reason to add a new RECONN
architecture -- KRYLO does not adopt that work's "Diversity" pillar or any other component from it;
its purpose there (preventing paraphrastic collapse in generative query expansion) is a different
problem from KRYLO's structural coverage concept (sections 9-10).

### Important implementation requirement

Existing `whytrace` infrastructure SHALL NOT automatically be declared equivalent to Pattern Grounding.

Its behavior must be traced against this contract before compliance is claimed.

WhyTrace currently provides explanation/lineage functionality. Whether that satisfies this Pattern Grounding definition is a **contract-to-code determination**, not an assumption based on the name or surface behavior.

---

# 12. Comparative State

Comparative State is a first-class RECONN object.

For every requested comparison `(a,b)`:

```text
C_ij =
⟨
  subject_a,
  subject_b,
  relation,
  val_a,
  val_b,
  delta_abs,
  delta_rel,
  direction,
  units,
  timestamp,
  evidence_ptr
⟩
```

Where:

```text
delta_abs = val_a - val_b
```

and, when valid:

```text
delta_rel = (val_a - val_b) / |val_b|
```

States:

* **PRESENT** — both sides grounded and comparison computed
* **PARTIAL** — one side grounded
* **NOT MEASURED** — comparison not attempted
* **UNAVAILABLE** — comparison requested but values cannot be grounded
* **WITHHELD** — policy restriction

The requested comparison remains visible even when the numerical comparison cannot be produced.

Example:

```text
PRICE ↔ CHURN
status: PARTIAL
```

This is preferable to deleting the requested relationship or fabricating a value.

### Critical boundary

Comparative State is not Relationship Ontology.

A numerical/value comparison is not automatically one of the existing relationship types.

`COMPETES_WITH`, for example, cannot be repurposed as a generic value-delta relationship.

---

# 13. Temporal State

Raw temporal data is not itself Temporal State.

Temporal State requires normalized current/prior information where available.

For object `x`:

```text
Θ(x) = ⟨value_latest, delta, Δt⟩
```

Possible anchors include:

* observation timestamp
* event date
* edge timestamp
* formation timestamp
* prior observation timestamp

States:

* **PRESENT** — current and prior anchors available
* **PARTIAL** — latest anchor only
* **NOT MEASURED** — temporal computation not attempted
* **UNAVAILABLE** — relevant timestamps exist but cannot produce usable state
* **WITHHELD** — policy restriction

Existing `ts` / `eventDate` fields SHALL be normalized into this contract rather than creating a parallel temporal subsystem.

---

# 14. R/T/C

R/T/C means:

* **R — Resource**
* **T — Time**
* **C — Cost**

R/T/C SHALL remain independently represented.

It SHALL NOT be collapsed into a friction score.

For applicable object set `X`:

```text
R_cov = Σρ(x) / |X|
T_cov = Στ(x) / |X|
C_cov = Σκ(x) / |X|
```

Missing R/T/C information is not zero.

### Integration requirement

Existing R/T/C infrastructure may satisfy the underlying computation requirement, but it is RECONN-compliant only when:

```text
R/T/C source
    ↓
canonical R/T/C object
    ↓
formation/reconnaissance payload
    ↓
surface
```

Existing R/T/C code SHALL NOT be rewritten merely to satisfy RECONN if its current computation is valid.

The integration layer should consume and expose it within its existing boundaries.

---

# 15. Evidence / Provenance

Every surfaced material structural object SHALL retain provenance sufficient to establish:

* source
* timestamp
* document/source ID
* confidence
* scope
* provenance pointers

Evidence completeness:

```text
P_c = P_sup / P_req
```

Existing evidence governance remains authoritative.

Evidence descriptors SHALL NOT be repurposed as:

* routing inputs
* scoring inputs
* cone-pressure inputs
* hidden inference controls

RECONN consumes evidence metadata; it does not reinterpret its governance.

---

# 16. Formation

A Formation is the structural unit that binds observations and relationships into a persistent structural object.

Formation:

```text
F ⊆ (V,E)
```

Each Formation intended for persistence SHALL have:

* stable formation ID
* structural fingerprint
* participating objects
* relationships
* provenance
* timestamps
* applicable comparisons
* applicable temporal state
* applicable R/T/C
* applicable patterns

Existing fingerprint systems are not automatically equivalent to Formation persistence.

A fingerprint is RECONN-compliant for persistence only when it provides the identity stability required for re-hydration and future matching.

---

# 17. User Position

User Position is a first-class contract object.

It is intentionally separate from KRYLO's structural interpretation.

Example:

```text
userPosition:
  subject: Finance ↔ Ownership
  desired_condition:
    finance_relative_position: >= 15%
  interpretation: user_defined
```

KRYLO may store:

* desired position
* condition
* threshold
* scope
* timestamp
* user ownership
* applicable formation ID

KRYLO SHALL NOT automatically convert the position into:

* favorable/unfavorable
* good/bad
* risk/no-risk
* buy/sell
* approve/reject
* likely/unlikely

The user determines whether an observed structure validates or invalidates their position.

---

# 18. Triggerability

Triggerability is a persistence capability, not a generic RECONN score.

A trigger requires a persistent structural identity and a declared condition.

Possible trigger classes:

* same formation
* related formation
* recurrence
* relative magnitude
* change threshold
* temporal condition
* R/T/C condition
* cross-domain convergence

Triggerability:

```text
T_g = ⟨T_struct, T_value, T_time⟩
```

A trigger is valid only against an explicit trigger specification.

"Similar" or "related" SHALL use admitted structural relationships and declared structural vocabulary.

Generic semantic similarity SHALL NOT silently become structural relatedness.

No prediction is implied by a trigger.

The trigger means:

> **surface this structure when the declared condition is observed again.**

---

# 19. RECONN State Vector

The user-facing RECONN state is categorical.

```text
RECONN(Q) =
⟨
  Question,
  Structure,
  Relationship,
  Pattern,
  Comparative,
  Temporal,
  R/T/C,
  Evidence,
  UserPosition,
  Triggerability
⟩
```

Each applicable component uses:

* PRESENT
* PARTIAL
* NOT MEASURED
* UNAVAILABLE
* WITHHELD

There shall be **no composite RECONN score in P1**.

Underlying numerical measurements may be retained for engineering instrumentation.

The categorical state communicates whether the required reconnaissance is actually furnished.

---

# 20. Contract Compliance Model

Every RECONN requirement SHALL be auditable across four dimensions:

| Dimension   | Question                                                |
| ----------- | -------------------------------------------------------- |
| Substrate   | Does the underlying capability/data exist?              |
| Contract    | Does it conform to the canonical RECONN representation? |
| Integration | Does it enter the canonical reconnaissance payload?     |
| Surface     | Can an authorized consumer actually use it?             |

A component SHALL NOT be described as "implemented" solely because substrate exists.

### Required terminology

Engineering status should distinguish:

* **SUBSTRATE EXISTS**
* **CONTRACT CONFORMANT**
* **INTEGRATED**
* **SURFACED**
* **PERSISTED**, where applicable
* **MISSING**
* **UNAVAILABLE**
* **WITHHELD**

---

# 21. Ownership and Boundary Contract

RECONN SHALL be an **integration layer, not a second analytical engine**.

Every contributing subsystem retains its existing authority.

### WhyTrace

RECONN may consume permitted explanation/lineage output.

RECONN SHALL NOT:

* cause WhyTrace to perform inference outside its authority;
* import it into prohibited modules;
* convert explanation output into scoring/routing;
* treat WhyTrace as Pattern Grounding without explicit contract verification.

Existing WhyTrace read-only restrictions remain authoritative.

### Evidence

RECONN may consume evidence/provenance descriptors.

Evidence descriptors SHALL NOT become hidden routing, scoring, or cone-pressure controls.

### Relationships

RECONN consumes admitted relationships.

Relationship admission remains externally governed.

`relationshipcondition.js` SHALL continue to require its externally injected admission authority.

RECONN SHALL NOT independently determine admission.

### Domain Ontology

The six-domain ontology remains authoritative.

RECONN SHALL NOT:

* redefine domains;
* add domains;
* reinterpret domain classification;
* create a competing domain taxonomy.

### R/T/C

RECONN consumes governed R/T/C outputs.

It SHALL NOT create an independent friction model.

### Query / Intent

RECONN may extend or wrap existing intent parsing.

It SHALL NOT create a competing query interpretation engine.

### General boundary rule

> **RECONN may compose, normalize, expose, persist, and monitor governed structural outputs. It may not silently reinterpret their meaning or create a competing authority.**

---

# 22. Surface Contract

All downstream surfaces SHALL consume the same canonical reconnaissance payload.

```text
canonical reconnaissance payload
          │
     ┌────┼────┬────┐
     ↓    ↓    ↓    ↓
 Target  Brief Export Other
 Packet        /API  surfaces
```

No surface may independently:

* reconstruct comparisons;
* infer relationships;
* calculate separate temporal state;
* invent missing values;
* independently classify triggerability;
* reinterpret evidence;
* generate a competing RECONN state.

Surface-specific presentation is permitted.

Surface-specific analytical reconstruction is not.

---

# 23. Missing Data Contract

KRYLO SHALL preserve useful structural context when a required value is unavailable.

Allowed states:

* NOT MEASURED
* UNAVAILABLE
* WITHHELD
* PARTIAL

Never substitute:

* zero
* fabricated values
* arbitrary defaults
* proxy values presented as measurements
* empty datasets when structural context exists

The contract SHALL distinguish:

> **No measurement exists**

from:

> **The measured value is zero.**

"Not found in scope" SHALL NOT be represented as "does not exist."

---

# 24. User Deduction Boundary

KRYLO furnishes:

* observations
* relationships
* structural patterns
* formations
* comparisons
* relative position
* temporal state
* R/T/C
* evidence
* recurrence/change conditions

The user may then independently determine:

* whether the structure matters;
* whether it validates a desired position;
* whether it invalidates a desired position;
* what action to investigate;
* what condition should be monitored.

KRYLO SHALL NOT make those determinations for the user.

Example:

```text
Finance: 120
Ownership: 100
Relative position: +20%
Prior state: +8%
Change: +12 percentage points
Latest event: 2026-09-17
Evidence: [traceable sources]
```

User-defined condition:

```text
Finance relative to Ownership >= +15%
```

KRYLO can report:

```text
TRIGGER CONDITION OBSERVED
```

It does not report:

```text
GOOD
BAD
FAVORABLE
UNFAVORABLE
INVEST
AVOID
```

---

# 25. Canonical Example

Question:

> "If we increase pricing by 5%, what is the projected impact on customer churn versus total revenue?"

KRYLO SHALL NOT fabricate a projected impact.

The canonical payload may instead contain:

```text
intent
  condition:
    pricing_change: +5%

  comparison_request:
    customer_churn ↔ total_revenue

observations[]
relationships[]
formations[]

comparisons[]
  status: PARTIAL / UNAVAILABLE

temporalState
rtc
evidence[]

reconnaissance.state
  question: PRESENT
  structure: PRESENT
  relationship: PRESENT
  pattern: PARTIAL
  comparative: PARTIAL
  temporal: PRESENT
  rtc: PARTIAL
  evidence: PRESENT
```

The missing projection remains explicit.

The reconnaissance is still useful if the available structure allows the user to investigate the relationship independently.

---

# 26. Acceptance Test

A RECONN implementation passes the primary product test when a new user receives a real Target Packet without an explanation of the system and can identify:

1. what structural elements are present;
2. how those elements relate;
3. what comparisons are observable;
4. what has changed over time;
5. what R/T/C friction is represented;
6. where the evidence came from;
7. what remains unresolved or unavailable;
8. what position/condition they could establish;
9. what structural condition they could monitor.

The test is not:

> "Did KRYLO answer the question?"

The test is:

> **"Did KRYLO furnish enough grounded reconnaissance for the user to independently derive something they could not readily see from the underlying information?"**

---

# 27. Engineering Audit Requirement

Before implementation, every contract requirement SHALL be classified.

For each requirement, determine:

1. **Does not exist**
2. **Exists as substrate but is not contract-conformant**
3. **Contract-conformant but not integrated**
4. **Integrated but not surfaced**
5. **Surfaced but not persisted**
6. **Exists but lacks grounding**
7. **Fully RECONN compliant**

No implementation work should begin solely because a component was found in the repository.

The audit must establish the actual gap.

---

# 28. Current Known Audit Findings

The existing audit establishes the following preliminary conditions.

### Existing substrate

* Evidence/provenance infrastructure exists.
* Raw temporal fields exist.
* Structural absence handling exists.
* Existing intent parsing exists.
* Relationship ontology exists.
* R/T/C infrastructure exists.
* WhyTrace infrastructure exists.

### Existing but not yet established as RECONN-compliant

* R/T/C
* Relationship Coverage
* formation fingerprint/persistence infrastructure
* Pattern Grounding
* Structural Coverage
* temporal computation

### Canonical contract decisions required

* canonical INTENT shape
* integration boundaries
* canonical reconnaissance payload

### Confirmed missing primitives

* Comparative State
* User Position
* Triggerability
* dedicated Question Coverage representation

These findings do **not** establish RECONN completion for any component merely because the underlying capability exists.

They establish reusable substrate that must be traced against this contract.

---

# 29. Implementation Sequence

The implementation sequence SHALL be:

### Phase 1 — Contract Audit

Map every existing subsystem to the contract.

Do not rebuild.

### Phase 2 — Canonical INTENT

Resolve the existing `analysisIntent` relationship to:

```text
INTENT = ⟨V_req,E_req,S_req,R_cmp,T_req⟩
```

Maintain compatibility where required.

### Phase 3 — Canonical Reconnaissance Object Layer

Normalize existing governed outputs into:

```text
observations
relationships
patterns
formations
comparisons
temporalState
rtc
evidence
```

### Phase 4 — Missing Primitives

Implement only the genuinely missing contract primitives:

* Comparative State
* User Position
* Trigger Specification / Triggerability
* required coverage state objects

### Phase 5 — Formation Integration

Ensure structural reconnaissance is attached to persistent Formation identity where monitoring requires it.

### Phase 6 — Canonical Payload

Produce one authoritative RECONN payload.

### Phase 7 — Surface Integration

Make Target Packet, Brief, and other consumers read the canonical payload.

### Phase 8 — Deterministic CI

Gold fixtures SHALL verify:

* INTENT
* graph inputs
* relationships
* patterns
* formations
* comparisons
* temporal state
* R/T/C
* provenance
* user position
* triggerability
* categorical RECONN state

Tests verify deterministic contract behavior, not subjective "intelligence."

---

# 30. Non-Goals

RECONN P1 SHALL NOT introduce:

* prediction
* forecasting
* recommendation
* investment decisions
* causal inference
* automated interpretation
* generic semantic similarity as structural relatedness
* composite intelligence scores
* composite friction scores
* fabricated impact estimates
* hidden scoring
* hidden routing
* replacement of existing ontology authorities
* replacement of existing evidence governance
* a second query reasoning engine
* a generalized enterprise ontology project

---

# 31. P1 Completion Criterion

RECONN P1 is complete only when KRYLO can produce a canonical reconnaissance payload in which the applicable structural components are:

**contract-defined → grounded → integrated → surfaced**

and, where required:

**persisted → triggerable**

The user must be able to move from:

**QUESTION → RECONNAISSANCE → USER DEDUCTION → POSITION/CONDITION → MONITORED STRUCTURE**

without KRYLO supplying the user's conclusion.

### Final product definition

> **KRYLO doesn't give you the answer. It furnishes the reconnaissance from which you can derive it—and preserves the structure so you can watch for it again.**

The major correction is that **RECONN is now the contract that integrates the substrate**, rather than a claim that the substrate itself constitutes RECONN.
