# SPEC — D1 Inquiry: what does "admitted Relationship" mean for Formation-B?

Date: 2026-08-19
Status: INQUIRY — tested against doctrine only. No code written. No producer specified. No ontology
changed. No scope extended. Implementation cost is recorded as consequence, never as argument.
Question, and the only question: **what does "admitted Relationship" mean for Formation-B?**
Everything else remains frozen pending this ruling.

---

## 1. The finding that reframes D1

**KRYL-1133's authority does not currently reach `RelationCore`.**

Verified this session by direct search of both governing documents
(`SPEC-rkm-genealogy-admission-policy.md`, `SPEC-relationship-admission-contract.md`):

> Mentions of `RelationCore`, `relationontology`, `SRE`, or "Structural Relation": **zero.**

KRYL-1133 states its own scope explicitly, in its opening line:

> *"Defines authority, contracts, and invariants for how a relationship claim may become part of
> KRYLO's trusted memory **(RKM genealogy)**."*

And its load-bearing invariant I3 is scoped the same way:

> *"All mutations to **RKM `genealogy` fields** originate solely from `VALIDATED`
> `AdmissionDecision`s."*

These are two different relationship representations, in two different subsystems, with two
different vocabularies:

| | **RKM genealogy** (KRYL-1133's subject) | **RelationCore** (Formation-B's substrate) |
|---|---|---|
| Store | `rkmstore.js`, a field on every RealityObject | `relationontology.js`, standalone objects |
| Relationship kinds | **5**: `causedBy`, `causes`, `dependsOn`, `enables`, `derivedFrom` | **14**: CAUSES, CONSTRAINS, DEPENDS_ON, ENABLES, INHIBITS, MEDIATES, COMPETES_WITH, SUBSTITUTES_FOR, COUPLED_WITH, RESONATES_WITH, DIVERGES_FROM, PRECEDES, COMPOSITION, REVEALS |
| Governed by | KRYL-1133 (unratified) | SRE Appendix A v1.2 (frozen contract) |
| KRYL-1133's Gate-0 table keys against | this vocabulary | — never mentions it |

KRYL-1133's Gate-0 relationship-type policy table (`derivedFrom: allowedOrigins: [OBSERVED]`,
`dependsOn: [OBSERVED, INFERRED]`, `causes: enabled: false`, …) is written against the 5-kind RKM
genealogy vocabulary. It has no entries for CONSTRAINS, MEDIATES, COMPETES_WITH, RESONATES_WITH, or
any other RelationType. **It cannot be applied to RelationCore as written.**

---

## 2. Consequence: neither D1 option is available as stated

### Option 1 — "admitted = KRYL-1133 governance admission"

**Doctrinal status: not currently available.** KRYL-1133 does not govern `RelationCore`. Applying
it to Formation-B's substrate would require **extending KRYL-1133's scope** to a store and a
14-type vocabulary it was never written for — including deciding Gate-0 `allowedOrigins` for nine
relation types that have no policy entry.

That extension is itself a ruling, and it is not authorized by anything currently on record. So
this option does not resolve D1; it defers into a larger unratified decision.

### Option 2 — "admitted = SRE schema validity via `makeRelationCore()`"

**Doctrinal status: available, but "admitted" is the wrong word for it.**

`makeRelationCore()` enforces real constraints: `relationType` ∈ closed enum; η, σ ∈ (0,1];
φ₀ ∈ [0,1]; **`provenanceHash` required** — *"no unsourced relation"*. That is genuine, and the
provenance requirement is doctrinally substantial.

But measured against KRYL-1133's own irreducible principle:

> `Discovery ≠ Admission ≠ Storage`
> *"No component may collapse two of these roles. Nothing may create a relationship and then reason
> over its own claim as if it were independently confirmed."*

`makeRelationCore()` **collapses all three**. Whoever calls it creates the relation, validates it,
and receives it back as a usable object — producer and admitter are the same caller. That is
precisely the pattern I1 bans:

> *"I1. A component may EITHER originate `RelationshipProposal`s OR issue `AdmissionDecision`s on
> them — never both."*

The only reason this is not an I1 violation today is that **I1's scope does not reach
`RelationCore`** — the same scope gap identified in §1. The conduct I1 prohibits is permitted here
solely because the rule was written about a different store.

So Option 2 is available, but adopting it as *"admitted"* imports a word KRYLO has already defined
to mean something this mechanism does not do.

---

## 3. What the doctrine actually establishes

| Claim | Established? |
|---|---|
| KRYL-1133 governs RKM genealogy | Yes — stated scope, I3 |
| KRYL-1133 governs RelationCore | **No** — zero mentions, incompatible vocabulary |
| SRE `makeRelationCore()` enforces schema validity + mandatory provenance | Yes — implemented, frozen contract |
| SRE has an *admission authority* separate from the producer | **No** — no such component exists in `relationontology.js` |
| KRYLO has one definition of "admitted" spanning both stores | **No** — this is the gap |

The honest reading: KRYLO has **validation** for `RelationCore` and **admission governance** for
RKM genealogy, and no bridge between them. D1 asks which applies to Formation-B, and the answer
from doctrine is *neither, as written*.

---

## 4. The three rulings actually available

Stated without recommendation.

### R1 — Formation-B operates on schema-valid `RelationCore`, and the word "admitted" is dropped

Formation-B's boundary rule (B3 ∧ B4 ∧ B5) applies to schema-valid RelationCores. The specification
language changes from "admitted Relationships" to "valid Relationships" so it does not claim a
governance property it does not have.

- *Doctrinal cost*: Formation-B is built on relations that were self-validated by their producer.
  Every Formation-B inherits that. §19's *"withhold beats fabricate"* and the anti-self-validation
  principle are not satisfied at the relation layer — only at the schema layer.
- *Requires*: honest labeling wherever Formation-B output is surfaced.

### R2 — Extend KRYL-1133's scope to cover `RelationCore`

KRYL-1133 becomes the admission authority for both stores. Requires: ratifying KRYL-1133; defining
Gate-0 `allowedOrigins` for all 14 RelationTypes; reconciling the 5-kind and 14-kind vocabularies;
and the WO-2049 ledger dependency KRYL-1133 already names as blocking.

- *Doctrinal cost*: none identified — this is the interpretation most consistent with existing
  doctrine.
- *Requires*: an unratified policy to be ratified **and** materially extended, both currently
  unauthorized.

### R3 — Define a separate admission standard for `RelationCore`

A distinct authority for the SRE layer, satisfying the same `Discovery ≠ Admission ≠ Storage`
principle but written for the 14-type vocabulary rather than extending KRYL-1133.

- *Doctrinal cost*: creates a second admission system. KRYL-1133 §2.4 warns against exactly this
  shape for ledgers — *"this policy does not authorize building a second, parallel ledger"* — and
  the reasoning plausibly extends to admission authorities.
- *Requires*: its own specification and ratification.

---

## 5. Consequence, recorded as consequence only

Per the framing instruction, implementation cost is recorded and explicitly excluded from the
argument above:

| Ruling | Consequence |
|---|---|
| R1 | Producer specification can proceed immediately; `makeRelationCore()` works today |
| R2 | Formation-B inherits KRYL-1133 ratification + scope extension + WO-2049 ledger — an unbuilt subsystem |
| R3 | Formation-B inherits a new, unwritten admission subsystem |

**This table did not inform §2–§4 and must not be used to select among R1–R3.** It is here so the
consequence is visible rather than discovered later.

---

## 6. Ruling required

> **For Formation-B, "admitted Relationship" means ______ (R1 / R2 / R3).**

If R1: the specification language must change from "admitted" to "valid," and the self-validation
property must be stated wherever Formation-B output is surfaced.

If R2 or R3: Formation-B remains blocked until that admission layer exists, and the producer
specification cannot be written against an undefined admission contract.

No recommendation is made. The doctrine does not select among these — it establishes only that the
two options D1 originally posed were not, as stated, available.

---

## 7. Standing state

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Signal genealogy: DEFER. Subcategory tier: not justified. Ontology: no expansion required.
RelationCore production: absent at runtime. Formation-B boundary: provisionally ruled
(B3 ∧ B4 ∧ B5, connectivity descriptive). **Meaning of "admitted": this inquiry, awaiting ruling
among R1 / R2 / R3.**

---

# ADDENDUM A — FOUNDER RULING: R2 (2026-08-20)

## A.1 — The ruling

> **Formation-B shall operate on governed/admitted Relationships, and KRYL-1133's admission
> doctrine must be explicitly extended to the RelationCore/SRE layer before Formation-B can consume
> those Relationships as admitted.**

**R2 selected. R1 and R3 rejected.**

## A.2 — Rationale (Founder)

Not selected for cost or for abstract rigor. Selected because:

- `makeRelationCore()` establishes **schema validity**. That does not establish **governance
  admission**.
- Calling schema-valid relations "admitted" would redefine the term to accommodate the existing
  implementation — collapsing validation into admission, which is the specific conflation this
  entire inquiry chain exists to prevent.
- **R1 rejected**: it would silently collapse validation into admission.
- **R3 rejected**: it creates the parallel authority/ledger structure KRYL-1133 §2.4 explicitly
  warns against.
- KRYL-1133 does not currently cover RelationCore. R2 therefore requires an **explicit scope
  extension and ratification** — not a claim that the existing policy already applies.

The additional cost (KRYL-1133 scope extension, ratification, associated admission machinery) is
real and is accepted as **visible cost**, rather than avoided by weakening the meaning of
"admitted."

## A.3 — Scope of this ruling — READ BEFORE ACTING

**R2 is a ruling DIRECTION, not authorization to build the extension.**

Specifically not authorized by this ruling:
- Writing or modifying the KRYL-1133 extension.
- Modifying KRYL-1133 or the Relationship Admission Contract in any way.
- Specifying the RelationCore producer.
- Any implementation.

**KRYL-1133 must not be modified implicitly through the Formation-B specification.** The extension
is its own specification and ratification exercise, to be opened separately.

## A.4 — Updated dependency chain

```
RelationCore production                          — absent at runtime
        ↓
Schema validation (makeRelationCore)             — exists, insufficient alone
        ↓
KRYL-1133 governance admission                   — SCOPE EXTENSION REQUIRED (separate spec)
   ├── ratify KRYL-1133                          — Jira: Ready, unresolved
   ├── extend scope to RelationCore/SRE          — not written
   ├── Gate-0 allowedOrigins for all 14 types    — not written
   ├── reconcile 5-kind ↔ 14-kind vocabularies   — not written
   └── WO-2049 Truth Event Ledger                — NEEDS SPEC, does not exist
        ↓
Formation-B boundary: B3 ∧ B4 ∧ B5               — provisionally ruled 2026-08-19
        ↓
Topology / connectivity                          — descriptive, not constitutive
        ↓
Formation recognition
```

## A.5 — Immediate consequence

**The producer specification must not proceed as though schema-valid = admitted.** Formation-B's
producer is blocked pending the KRYL-1133 extension.

## A.6 — Standing state

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Signal genealogy: DEFER. Subcategory tier: not justified. Ontology: no expansion required.
RelationCore production: absent at runtime. Formation-B boundary: provisionally ruled
(B3 ∧ B4 ∧ B5, connectivity descriptive). Meaning of "admitted": **RULED — R2.**
KRYL-1133 extension specification: **required, not yet opened, not authorized by this ruling.**
Formation-B producer: **blocked.**
