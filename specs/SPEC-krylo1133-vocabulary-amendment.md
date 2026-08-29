# SPEC — KRYL-1133 Vocabulary Amendment: SRE / RelationCore Relational Vocabulary

Status: **DRAFT FOR RATIFICATION — content finalized, formal ratification NOT yet occurred.**
Type: Architectural / governance vocabulary amendment
Depends on: DECISION-VOCAB-001 — PATH A (EXPAND), recorded in
`specs/SPEC-h1-h2-findings.md` Addendum A.
Explicitly excludes: Implementation, producer, WO-2049, Gate-0 dispositions, Formation-B changes,
Structure Map work.

**Ratification status note (binding):** this amendment extends KRYL-1133. KRYL-1133 itself is,
per direct Jira verification this session, status `Ready`, Resolution `None` — **not ratified**.
An amendment to an unratified base document cannot itself be independently ratified; it inherits
the same pending status. The conditions in §11 below describe when this document's *content* is
complete and ready — they are not a self-executing ratification. Formal ratification is a Jira
governance action, not something this document or this session can perform.

---

## 1. Purpose

Extend KRYL-1133's governed vocabulary so the SRE / RelationCore relational ontology is recognized
as a legitimate governed vocabulary alongside the existing RKM genealogy vocabulary.

This amendment creates no new relational semantics. The 14 SRE `RelationType` values already exist
in the ontology (SRE Appendix A v1.2, frozen contract). This amendment establishes only that they
are recognized as eligible to participate in the KRYL-1133 governance framework, subject to
subsequent admission policy.

```
Ontology recognition  ≠  Admission eligibility  ≠  Admission
```

## 2. Existing ontologies remain intact

**RKM Genealogy** — the existing five genealogy kinds (`causedBy`, `causes`, `dependsOn`,
`enables`, `derivedFrom`) remain authoritative for the RKM genealogy domain. Not renamed, replaced,
generalized, collapsed, or deprecated.

**SRE / RelationCore** — the 14 `RelationType` values become a recognized governed relational
vocabulary, retaining their existing semantics. Not collapsed into the five RKM genealogy kinds.

This separation is required by the H2 finding (`SPEC-h1-h2-findings.md`): 10 of 14 SRE types have
no legitimate equivalent in the five-kind vocabulary without semantic loss.

## 3. Governance model

```
                    KRYL-1133
                   GOVERNANCE
                        |
           +------------+------------+
           |                         |
    RKM GENEALOGY                SRE RELATIONS
     5 kinds                     14 RelationTypes
           |                         |
           +------------+------------+
                        |
                 GOVERNANCE GATE
                        |
                    ADMISSION
                        |
               ADMITTED POPULATION
```

One governance authority, two ontological vocabularies. The authority governs objects according to
their respective ontological contracts — it does not create a shared semantic vocabulary between
them, and this document does not specify whether admitted objects from the two vocabularies share
one store or remain in separate stores (`rkmstore.js` genealogy field vs. `RelationCore` objects).
That is explicitly deferred, per §10.

## 4. SRE vocabulary recognition

| RelationType | Governance status |
|---|---|
| CAUSES | Recognized |
| DEPENDS_ON | Recognized |
| ENABLES | Recognized |
| COMPOSITION | Recognized |
| CONSTRAINS | Recognized |
| INHIBITS | Recognized |
| MEDIATES | Recognized |
| COMPETES_WITH | Recognized |
| SUBSTITUTES_FOR | Recognized |
| COUPLED_WITH | Recognized |
| RESONATES_WITH | Recognized |
| DIVERGES_FROM | Recognized |
| PRECEDES | Recognized |
| REVEALS | Recognized |

**Recognized does not mean admitted.** No row establishes Gate-0 eligibility or any admission
decision.

## 5. Semantic integrity (binding constraint)

KRYL-1133 governance must preserve the semantic distinctions the SRE vocabulary encodes:

- **Polarity** — INHIBITS must not be flattened into a positive causal relationship.
- **Mediation** — MEDIATES must remain distinguishable from direct causation.
- **Competition** — COMPETES_WITH is not causation or dependency.
- **Substitution** — SUBSTITUTES_FOR retains its alternative/substitutive meaning.
- **Coupling** — COUPLED_WITH is not reduced to a directed dependency.
- **Resonance / Divergence** — RESONATES_WITH and DIVERGES_FROM retain their meanings.
- **Temporal precedence** — PRECEDES is not interpreted as CAUSES. Temporal ordering alone does not
  establish causation.
- **Epistemic revelation** — REVEALS remains distinct from causal or dependency semantics.

This amendment prohibits semantic normalization performed solely to force SRE vocabulary into
conformity with RKM genealogy vocabulary.

## 6. Admission remains separate

```
RelationType recognized
        |
     Gate-0 policy
        |
Eligible / deferred / rejected / experimental
        |
   Admission process
        |
  Admitted Relationship
```

A `RelationCore` object carrying a recognized `RelationType` remains merely schema-valid until it
passes the actual admission mechanism (still to be specified — see §10).

## 7. No automatic mapping to RKM

Rejected shape: `SRE RelationType → RKM genealogy kind → governance`.
Adopted shape: both vocabularies meet at the governance layer, not the semantic layer.

## 8. No vocabulary expansion beyond existing SRE

This amendment recognizes only the existing 14 SRE RelationTypes. It does not authorize creating
additional RelationTypes, modifying RelationType semantics, renaming existing types, or automatic
promotion of experimental relations. Any future vocabulary addition requires a separate amendment.

## 9. Relationship to KRYL-1133 doctrine

Preserved, unmodified: discovery is not admission; storage is not admission; schema validity is
not admission; self-validation is not admission; admission requires an independent governance
decision; governance does not alter the underlying semantics of the object being governed. This
amendment changes scope and vocabulary recognition only — not governance doctrine.

## 10. Explicit non-goals

Does not: assign Gate-0 dispositions; specify WO-2049; define the admission event schema; define a
RelationCore producer; populate RelationCore; admit any existing RelationCore objects; promote
`TYPED_EDGES` or `signalgenealogy` to canonical status; modify Formation-B; establish recursive
Formation validity/provenance; establish any Structure Map implementation; resolve whether admitted
RKM-genealogy and SRE relations share one store or remain separate (§3).

## 11. Content-completeness conditions (NOT a ratification mechanism — see status note above)

This document's content is complete when: DECISION-VOCAB-001/Path A is recorded as governing
decision (done); the 14 SRE RelationTypes are explicitly recognized (done, §4); the five RKM kinds
remain intact (done, §2); no SRE type is collapsed into an RKM kind (done, §5); recognition is
separated from admission eligibility (done, §6); Gate-0 and WO-2049 remain subsequent
specifications (done); no implementation is bundled (done).

**All content-completeness conditions above are met by this document as drafted. This is not the
same as formal ratification, which remains pending on KRYL-1133's own Jira status.**

## Standing state

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Formation-B boundary: provisional,
B3 ∧ B4 ∧ B5. "Admitted": RULED — R2. H1: extendable with amendments. H2: inadequate.
**DECISION-VOCAB-001: RULED — Path A (expand).** This vocabulary amendment: **content complete,
ratification pending** (inherits KRYL-1133's unratified status). Gate-0: not yet assigned. WO-2049:
not opened. Producer: blocked. Formation-B: blocked.
