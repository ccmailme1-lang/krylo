**SPEC — Structural Evidence Substrate (Entity Relationships)**

**Status:** RATIFIED
**Priority:** Immediate
**Baseline:** KRYL-1335 current implementation
**Diagnostic:** `specs/rsi-46-question-diagnostic.md`
**Purpose:** Increase real entity-level evidence density so KRYLO can establish connected structural relationships and produce a substantive RSI briefing.
**Ticket:** KRYL-1336

---

### 1. PROBLEM

KRYL-1335 established a working structural-query path:

```
RAW QUERY
→ STRUCTURAL INTERPRETATION
→ ENTITY RECOGNITION
→ RELATIONSHIP PAIRS
→ EVIDENCE CHECK
→ BRIEF
```

The 46-question diagnostic demonstrates:

- 41/46 questions reach structural recognition.
- 21/46 have at least one evidence-backed relationship.
- 48/149 candidate relationships are supported.
- All 48 supported relationships currently trace to the same Sysco / Restaurant Depot event.
- #46 establishes the primary acquisition relationship but cannot establish independently evidenced adjacent relationships.

The bottleneck is therefore **evidence density and entity-level relationship coverage**, not query parsing.

---

### 2. ARCHITECTURAL FINDING

The minimum relationship primitive already exists.

`relationontology.js` contains `makeRelationCore()` and it is already used by 11 consumers.
`secownershipconnector.js` demonstrates an existing production pattern for constructing real `RelationCore` records from genuine SEC evidence, with `provenanceHash` required.

**Therefore:**

- Do **not** create a new relationship / evidence record type.
- Reuse the existing `RelationCore` representation and its provenance requirements.

---

### 3. OBJECTIVE

Enable KRYLO to establish multiple real, independently evidenced relationships between named entities within the structural roles requested by the guest.

Target capability:

```
Guest asks:
Supplier ↔ Distributor
        ↓
Structural role interpretation
        ↓
Real entity resolution
        ↓
Named entities
        ↓
RelationCore
        ↓
Specific evidence + provenance
        ↓
Connected structural relationships
        ↓
Brief
```

The guest does not need to provide the entity names.
KRYLO should resolve real entities from available evidence when that evidence supports them.

---

### 4. TWO DISTINCT LAYERS

**Guest structural role** (query interpretation layer)
Examples: SUPPLIER, DISTRIBUTOR, FACILITY, COMPANY, LOCATION, MARKET, TECHNOLOGY, OWNERSHIP, LOGISTICS.

**Actual entity** (evidence / relationship layer)
Examples: Sysco, Restaurant Depot, a named distribution facility, a named technology provider, a named market / location.

**Canonical relationship**
The actual relationship between named entities must be represented by the existing `RelationCore`.

```
SUPPLIER
   ↓ resolves to
Sysco
   │
   │ RelationCore: acquired
   ↓
Restaurant Depot
   ↑
   │ resolves to
DISTRIBUTOR
```

---

### 5. RELATIONCORE REQUIREMENT

Every supported structural relationship must use the existing `RelationCore` representation where applicable.

The implementation must reuse:

- existing relation construction
- existing validation
- existing provenance requirements
- existing consumers

`provenanceHash` remains mandatory.
No unsourced relationship may enter the supported structural result.

---

### 6. EVIDENCE REQUIREMENT

A relationship is **SUPPORTED** only when real evidence establishes that specific relationship.

Example:

```
Sysco ── acquired ── Restaurant Depot
```

is supported when the source establishes the acquisition.

The following are **not** automatically supported:

```
Sysco ── Facility
Sysco ── Supplier
Restaurant Depot ── Market
```

They require their own evidence.

- Co-occurrence does not establish a relationship.
- Graph proximity does not establish a relationship.
- Shared source does not automatically establish a relationship.

---

### 7. CONNECTED STRUCTURE

The substrate must support multiple independently evidenced edges sharing entities.

Example:

```
Supplier A
    │
    │ evidenced relationship
    ▼
Company B
    │
    │ evidenced relationship
    ▼
Facility C
    │
    │ evidenced relationship
    ▼
Market D
```

Each edge must be independently grounded.
KRYLO may expose the connected structure, but must **not** manufacture missing edges.

---

### 8. NO SYNTHETIC PROPAGATION

Given:

```
A → B
B → C
```

KRYLO must **not** assert:

```
A → C
```

unless evidence independently establishes A → C.

Traversal may reveal connected entities.
Traversal is not evidence.

---

### 9. EVIDENCE REPRESENTATION

Reuse the existing evidence and `RelationCore` infrastructure wherever the current implementation supports it.
Do not duplicate existing canonical representations merely to satisfy this ticket.

The implementation must document the actual fields used to preserve, at minimum:

```
source
source date
evidence reference / content
entity A
entity A identity / type
relationship
entity B
entity B identity / type
provenance
```

If an existing field provides equivalent information under a different name, reuse it.

---

### 10. SYSCO / RESTAURANT DEPOT

The existing Sysco / Restaurant Depot fact is known-good validation evidence and must remain available as a regression case.

It must **not** become the model for artificial evidence expansion.

The implementation should establish whether the current Sysco seed can be represented as a proper `RelationCore` without degrading the current guest-facing result.

If migration is required:

```
Current known-good result
        ↓
RelationCore representation
        ↓
Same or better structural result
```

No regression is acceptable.
Do not remove the current working path until equivalent or superior behavior is verified.

---

### 11. INITIAL EVIDENCE COVERAGE

The initial evidence set should deliberately cover multiple RSI structural relationship types:

1. Supplier ↔ Distributor
2. Supplier ↔ Company
3. Distributor ↔ Facility
4. Facility ↔ Location
5. Company ↔ Market
6. Technology ↔ Facility
7. Ownership ↔ Supplier
8. Logistics ↔ Facility

This is diagnostic coverage, not a claim that these are the only relationships KRYLO should ultimately support.

Evidence must be:

- real
- attributable
- dated
- independently sourced
- relationship-specific
- provenance-backed

---

### 12. ENTITY IDENTITY

The evidence substrate must preserve actual entity identity.

Preferred:

```
Sysco → Restaurant Depot
```

Not sufficient as the underlying structural fact:

```
Supplier → Distributor
```

Generic roles remain useful for matching the guest's request, but the structural result should expose the real entities when evidence permits.

---

### 13. BRIEFING BEHAVIOR

When multiple supported relationships exist, the briefing should communicate the actual structure rather than merely report evidence volume.

Conceptually:

```
ESTABLISHED RELATIONSHIPS

Sysco ── acquired ── Restaurant Depot

[Named entity] ── [relationship] ── [Named entity]

[Named entity] ── [relationship] ── [Named entity]


EVIDENCE

Specific source / date supporting each relationship.


UNRESOLVED

Requested relationships for which no supporting evidence exists.
```

Avoid:

- repeated identical evidence blocks
- raw evidence dumps
- synthetic relationship counts
- unsupported graph connections

---

### 14. REQUIRED DIAGNOSTIC

Re-run all 46 RSI questions unchanged.

Record:

- structural participants
- candidate relationship count
- supported relationship count
- named entities involved
- RelationCore relationships
- evidence attached to each relationship
- provenance
- unresolved relationships

Do not optimize the implementation to the questions.
The questions are diagnostic fixtures.

---

### 15. CRITICAL ACCEPTANCE TEST — #46

> A distributor acquires another foodservice distributor. What other companies, facilities, suppliers, customers, and markets are connected to that change?

Expected behavior is **not** to infer a chain.
Expected behavior is to establish whatever additional relationships are independently evidenced:

```
                 ┌── Facility
                 │
Distributor A ───┼── Company
       │         │
       │         ├── Supplier
       │         │
       │         └── Market
       │
       └── acquired ── Distributor B
```

Every displayed edge must have its own evidentiary basis.
If an adjacent relationship cannot be established, KRYLO must say so rather than manufacture depth.

---

### 16. SUCCESS CRITERIA

This ticket succeeds when KRYLO demonstrates:

- More than one independent real structural event.
- More than one real named-entity relationship.
- Multiple independently evidenced edges.
- Connected entities across more than one structural layer.
- Relationship-specific evidence.
- Required provenance.
- Existing Sysco / Restaurant Depot result preserved.
- KRYL-1335 46-question structural interpretation preserved.
- Existing intelligence-brief regression suite passes.
- No fabricated relationships.
- No synthetic propagation.
- No weakened evidence gate.

Success is **not** defined by increasing the percentage of supported pairs.
Success is defined by **real structural depth**.

---

### 17. VOCABULARY GAPS

Round-2 failures (#6, #14, #24, #31, #42) identified gaps:

- supply chain
- transportation
- warehouse
- network
- expanding

These are separate from the evidence-substrate problem.
They may receive a small additive vocabulary correction if necessary.
Do **not** modify the canonical-domain architecture to address them.

---

### 18. EXPLICITLY OUT OF SCOPE

- KRYL-1334
- temporal persistence
- Relational Change
- MAP
- MAP subject binding
- MAP axis redesign
- `DOMAIN_LEXICON` redesign
- canonical-domain redesign
- EDGAR / SCI → EVIDENCE_FACET integration
- broad ontology redesign
- automated web-research architecture
- recommendations
- predictions
- synthetic graph completion
- replacement of RelationCore

---

### 19. IMPLEMENTATION REPORT REQUIRED

Claude must report:

1. What the existing evidence substrate already supports.
2. How RelationCore is currently constructed and consumed.
3. How `secownershipconnector.js` establishes the existing precedent.
4. How Sysco / Restaurant Depot currently enters the system.
5. Whether / how that fact can use RelationCore.
6. Minimum implementation delta.
7. Evidence records added.
8. Entity relationships established.
9. Evidence / provenance attached to each.
10. 46-question results.
11. #46 result.
12. Remaining evidence-substrate limitations.
13. Any proposed follow-on work.

No deployment until the acceptance results demonstrate actual structural depth.
