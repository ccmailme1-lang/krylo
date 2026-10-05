# Enhanced Initial Capability Specification: Management-Identified Conditions

Status: DRAFT (v1.2, Phase-scoped), pasted by the Founder on 2026-10-05. Not filed in Jira.
Scope: Phase 1 only.
Relationship to existing architecture: strictly additive evidence layer. No modification to canonical relationship admission (ρ), Formation logic, domain taxonomy, convergence classification, field measures, or entity-resolution rules.

---

## 1. Purpose

Introduce **Management-Identified Conditions** as a distinct, first-class evidence layer that captures material trends, uncertainties, constraints, dependencies, risks, changes, or other conditions that an organization's management has explicitly identified in authoritative disclosures.

The capability enables KRYLO to maintain four independent evidentiary perspectives:

1. What KRYLO independently observes in distributed evidence (**Observed Structure**).
2. What management explicitly identifies (**Management-Identified Condition**).
3. What relationships KRYLO independently admits (**canonical ρ**).
4. Whether those relationships form an observable structure (**Formation**).

A management statement never becomes a KRYLO relationship, never creates Formation, and never substitutes for KRYLO's independent observation.

---

## 2. Core Invariant

Management identification, KRYLO observation, relationship admission, and Formation are independent evidentiary transitions. Success or failure at any one layer never implies success or failure at another.

- A management statement does not create canonical ρ.
- A management statement does not establish Formation.
- KRYLO-observed structure does not imply that management identified the same condition.
- Absence of a management statement does not invalidate KRYLO-observed structure.

---

## 3. Evidence Layer

Add one new evidence representation: **MANAGEMENT-IDENTIFIED CONDITION**.

This is an evidence layer, not a domain. It does not create: a seventh domain, a canonical relationship type, a Formation state, a new convergence classifier, or a substitute for subject attribution.

The condition remains attributable solely to the reporting organization and its disclosure provenance.

---

## 4. Authoritative Source

Initial implementation is restricted to authoritative management disclosures (primary filings, earnings releases, MD&A, risk-factor sections, and equivalent official statements issued by the organization).

Every admitted condition must retain provenance sufficient to identify: organization / issuer; source document; document type; publication or filing date; exact evidence location (page, paragraph, section, or equivalent); the condition as stated by management (`source_text`).

Inference from commentary, third-party summaries, analyst notes, press coverage, or generic market reporting is prohibited.

---

## 5. Admission Rule

A Management-Identified Condition is admitted only when the source explicitly identifies the condition as relevant to the organization.

The system must distinguish, at every stage: **MANAGEMENT IDENTIFIED** and **KRYLO INFERRED**.

KRYLO must never rewrite an inferred observation in management language. Where the source does not support explicit management identification, the condition is not admitted.

---

## 6. Representation

Minimum conceptual fields (source statement remains primary; any later normalization is stored separately):

- `condition_id`
- `entity_id`
- `condition` (normalized label, optional and secondary)
- `source`
- `source_type`
- `published_at`
- `evidence_location`
- `source_text` (verbatim or near-verbatim management language)
- `admission_state`

No canonical ρ is created by this representation. Derived categorization, taxonomy mapping, or normalization must remain clearly separated from the source statement.

---

## 7. Relationship to Existing Structural Analysis

The four layers remain independent and are never used as proxies for one another:

| Layer | Meaning |
|---|---|
| Observed Structure | What KRYLO detects across distributed evidence |
| Management-Identified Condition | What management explicitly identifies as material |
| Relationship (ρ) | What KRYLO independently admits from evidence |
| Formation | What KRYLO independently establishes about structure |

---

## 8. Phase Boundary (Critical)

**Phase 1 (this ticket):** capture, attribute, preserve, retrieve, and display what management explicitly says. Phase 1 produces the independent Management-Identified Condition layer only.

**Phase 1 explicitly does not** determine or emit: CORROBORATED; DIVERGENT; NOT YET OBSERVED; KRYLO-OBSERVED / MANAGEMENT NOT IDENTIFIED. Those comparison states require a separate semantic-matching capability and are reserved for **Phase 2**.

**Phase 2 (future, out of scope):** determine whether an admitted Management-Identified Condition corresponds to an independently observed structural condition. Phase 2 owns the comparison logic and any associated matching rules.

---

## 9. Epistemic Boundaries

The system must not: infer management intent; treat management language as an objective finding; create a canonical relationship or Formation from a management statement alone; treat absence of management discussion as evidence that a condition does not exist; assign a condition to an entity without supported provenance; fabricate a condition from generic disclosure language; convert third-party interpretation into management identification.

**NOT IDENTIFIED ≠ DOES NOT EXIST**
**NOT OBSERVED ≠ ABSENT**

---

## 10. Guest-Facing Objective (Phase 1)

A guest must be able to see, for any real named organization: what management explicitly identifies, and the full provenance of each identification, presented as a distinct evidence layer that is never blended with KRYLO-observed structure, canonical relationships, or Formation.

---

## 11. Initial Product Boundary

This capability changes nothing in the existing architecture. It only adds a separate evidence layer that later enables comparison (Phase 2).

---

## 12. Phase 1 Acceptance Criteria

- **AC-1 Distinct evidence layer:** represented independently from canonical relationships and Formation.
- **AC-2 Authoritative provenance:** every admitted condition carries source and date provenance sufficient to trace it to the originating disclosure.
- **AC-3 Explicit attribution:** admitted only when the disclosure supports attribution to management of the identified organization.
- **AC-4 No relationship side-effect:** admitting a condition never creates or modifies canonical ρ.
- **AC-5 No Formation side-effect:** admitting a condition never creates or modifies Formation state.
- **AC-6 Independent KRYLO observation:** existing structural observations remain independently computed and unchanged.
- **AC-7 Evidence separation:** guest-facing output clearly distinguishes management-identified conditions from KRYLO-observed structure.
- **AC-8 No unsupported inference:** analyst interpretation, third-party commentary, or generic disclosure text is never converted into management identification.
- **AC-9 Absence semantics:** failure to find a management-identified condition is represented as lack of identified evidence, not proof of non-existence.
- **AC-10 No comparison logic:** Phase 1 does not implement or emit any of the four comparison states listed in section 8.

---

## 13. Verification

Must be verified through the real product path:

```
authoritative disclosure → condition extraction → admission → persistence → retrieval → guest-facing presentation
```

Verification requires:

1. A real organization with an explicit management-identified condition.
2. Provenance trace to the originating disclosure.
3. Confirmation that no canonical ρ was created.
4. Confirmation that Formation was not altered.
5. Confirmation that existing KRYLO structural observations remain unchanged.
6. Guest-facing visibility of the distinct evidence layer.
7. Confirmation that no comparison states are emitted.

No seeded or fabricated management condition may serve as the sole acceptance evidence.

---

## 14. Out of Scope (Phase 1)

- All comparison / semantic-matching logic (Phase 2)
- Automated investment conclusions
- Risk scoring or recommendation generation
- Management credibility scoring
- New domains, new canonical relationship types, or new Formation states
- Automatic causal claims
- Sentiment scoring
- Generic LLM interpretation presented as management evidence
- Replacement of existing structural evidence with management disclosure

---

## 15. Success Condition (Phase 1)

The capability is complete when a guest can see, for a real named organization, **what management explicitly identifies**, with full provenance, presented as an independent evidence layer, without the system ever confusing it with a canonical relationship or with Formation.

Phase 2 will later enable comparison of that layer against KRYLO's independently observed structure.

Ready for engineering ticket with the Phase 1 / Phase 2 boundary explicitly locked.
