# KRYLO — External Supplier Structural Intelligence

**Status:** Locked 2026-10-03 (Founder-reviewed)
**Date:** 2026-10-03

---

### 1. Purpose

Enable KRYLO to detect externally evidenced structural changes across a real procurement
organization's supplier population.

The system answers one question only:

> What has structurally changed around our suppliers?

It does **not** execute procurement, optimize spend, score suppliers, manage contracts, or
determine procurement risk.

---

### 2. Governing Chains

**Procurement surface chain**

```
Supplier Record → Entity Resolution → Observation → Relationship → Structural Change → Portfolio View
```

**Core KRYLO chain (unchanged)**

```
Conditions → Relationships → Connectivity → Formation → Emergent Structure
```

No relationship may be created from Formation or any downstream CFX stage.

---

### 3. Required Input

A procurement organization supplies a vendor population containing, at minimum:

- Vendor legal name
- Contract / award identifier
- Government / customer identifier
- Vendor role
- Contract status
- Effective dates

Preferred additional identity fields (when available):

- CAGE / UEI
- EIN
- DUNS (historical)
- Address
- Parent organization
- Ticker / CIK

The contract / award record remains immutable source evidence.

---

### 4. Entity-Resolution Layer

**Objective**
Resolve: Procurement Vendor → Canonical Entity

Disposition must be one of:

- RESOLVED
- MULTIPLE_MATCHES
- NO_MATCH
- UNRESOLVED

A vendor must not enter canonical relationship evaluation merely because its name resembles a
public company.

**Required provenance (retained on every resolution)**

- source
- source record
- observed name
- resolved canonical ID (when resolved)
- resolution method
- observation timestamp
- resolution disposition

No silent substitution is permitted.

---

### 5. External Observation Layer

For each resolved canonical entity, ingest independently observable external conditions.

**Initial sources and supported relationship types**

| Source | Relationship Type | Notes |
|---|---|---|
| EDGAR | `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE` | Schedule 13D / 13G. Production path currently broken (confirmed 2026-10-03: `secownershipconnector.js` sends EDGAR the wrong root-form code — `'SC 13D,SC 13G'` instead of `'SCHEDULE 13D,SCHEDULE 13G'` — zero real hits in production regardless of query). Must be fixed and verified before use. |
| **M&A source — not yet implemented** | `ACQUIRED` | **No live connector currently exists.** The sole demonstrated production `ACQUIRED` relationship is a manually seeded, dated, sourced fact in `rsievidencemigration.js` (confirmed by its own header: "Real, hand-entered, dated, sourced — not a live connector"). A live M&A observation source/connector must be selected, implemented, and verified before `ACQUIRED` can participate in this supplier pipeline. |
| PatentsView | `SHARED_PATENT_ASSIGNMENT` | Existing source/type. Procurement coverage not established. |

Any additional source requires explicit source qualification **and** relationship-type ratification
before admission.

---

### 6. Canonical Relationship Admission

Existing relational-substrate rules (Stage 1 Formalization) apply unchanged.

**Required primitive**

```
ρ = (id, part, type, φ_class, ν)
```

**Admission requirements**
A relationship is admitted only when all of the following are present:

- identified participants
- ratified relationship type
- qualifying evidence
- source provenance
- exact observation time
- satisfaction of the type-specific admission predicate

**Explicitly prohibited in the procurement context**

- generic relationship strength or confidence scores
- inferred ownership
- co-presence or endpoint-similarity relationships
- risk proxies
- zero-filled or placeholder relationships

No evidence → no relationship.

---

### 7. Initial Relationship Types

| Type | Status | Notes |
|---|---|---|
| `ACQUIRED` | Existing type; no live source | Directed acquisition relationship. One manually seeded production fact only — see §5. |
| `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE` | Ratified; production path currently broken | Subject → filer. Historical disclosure fact only. |
| `SHARED_PATENT_ASSIGNMENT` | Ratified; procurement coverage not established | Symmetric; part = {orgA, orgB}. Existence does not by itself imply procurement relevance. |

No new relationship types are introduced by this surface.

---

### 8. Supplier-to-Relationship Join

The system must support the traversal:

```
Contract / Award → Vendor → Canonical Entity → ρ
```

Example:

```
VA Contract 123
    ↓
Vendor A
    ↓
Canonical Entity A
    ↓
ACQUIRED
    ↓
Canonical Entity B
```

This join is the critical missing bridge.

A relationship that cannot be joined to a supplier record remains an external structural fact. It
must never be represented as affecting a government contract merely because entity names are
similar.

---

### 9. Portfolio Query

The primary procurement workflow is portfolio-level.

Example query:
> Show structural changes across our awarded vendors.

For each vendor in the supplied population the system returns:

- resolution disposition (RESOLVED / NO_MATCH / UNRESOLVED / MULTIPLE_MATCHES)
- NO_EVIDENCE when resolved but no qualifying relationship exists
- zero or more admitted canonical relationships
- relationship state / change (only states actually supported by the type)
- supporting evidence with full provenance

The query must not manufacture relationships for vendors that lack qualifying evidence.

**Initial portfolio-scale constraint:** §17's first production proof must operate against an
explicitly bounded vendor population and document the source-call count, batching behavior,
rate-limit handling, and failure/retry behavior for every external source used. The proof
population must be large enough to exercise the portfolio path but small enough to remain within
the applicable source limits. No assumption of one external request per vendor is permitted
without verifying the source's supported batching and rate limits.

---

### 10. Structural Change

The portfolio view may expose only those change states that are:

- defined by the Stage 1 Formalization, **and**
- actually implemented and supported by the specific relationship type.

Permitted states (when supported by the type):

- NEW
- PERSISTENT
- RECONFIGURED
- DISSOLVED
- UNSUPPORTED

STRENGTHENING and WEAKENING must not be emitted merely because the enum concepts exist. They
appear only when the relationship type has defined the corresponding rules and the evidence
satisfies them.

---

### 11. Procurement Questions Supported

Once the pipeline is complete, KRYLO can answer evidence-retrieval questions such as:

- Which awarded vendors have an evidenced acquisition relationship?
- Which awarded vendors have newly observed beneficial-ownership disclosures?
- Which vendor pairs share an evidenced patent-assignment relationship?
- Which suppliers in this population participate in the same externally evidenced structural
  relationships?
- What structural relationships involving our suppliers have changed since the previous
  observation period?

These are retrieval questions, not recommendations.

---

### 12. Explicitly Out of Scope

KRYLO does **not** determine:

- lowest-cost or "best" supplier
- supplier performance or quality scores
- contract value or savings opportunity
- delivery performance or inventory requirements
- demand forecasts or sourcing strategy
- negotiation position or contract compliance
- sustainability or procurement risk scores

Those remain functions of procurement / planning systems.

---

### 13. Private-Company Boundary

A correctly resolved private company may legitimately produce:

```
NO_EVIDENCE
```

when the relevant public structural sources contain no qualifying evidence.

This result means only:
> No qualifying relationship was evidenced by the available sources.

It does **not** mean:
> No relationship exists.

The distinction must be preserved in both data and UI.

---

### 14. Required Production Architecture

```
Government award / contract source
              ↓
        Vendor record
              ↓
       Entity resolution
              ↓
       Canonical entity
              ↓
    External observations
              ↓
     Evidence qualification
              ↓
       Canonical ρ admission
              ↓
          Persistence
              ↓
    Supplier ↔ relationship join
              ↓
      Portfolio structural view
              ↓
          User query
```

CFX remains strictly downstream:

```
ρ relationships
      ↓
Connectivity
      ↓
Formation
      ↓
Emergent Structure
```

CFX does not create or influence supplier relationships.

**Engineering reachability gate:** This architecture constitutes a Full Gate change under
CLAUDE.md §10 because it introduces a new admission path, entity-resolution layer, and persistence
join. Every implementation ticket must complete the applicable 9-question reachability gate before
closure, in addition to the acceptance criteria in §15.

---

### 15. Acceptance Criteria

**Entity resolution**
- A real procurement vendor can be linked to a canonical entity.
- Full resolution provenance is retained.
- Ambiguous and unresolved vendors remain explicitly unresolved.
- No name-only relationship admission occurs.

**Observation**
- External observations retain exact provenance and observation time.
- Source-specific predicates are applied before any admission decision.

**Relationship**
- Only ratified relationship types may enter canonical ρ.
- No evidence produces no relationship.
- Existing canonical identity rules remain unchanged.

**Portfolio**
- A real vendor list can be evaluated in batch.
- Each vendor receives an evidence-backed disposition.
- Every admitted relationship can be traced to both the canonical entities and the original
  source evidence.

**UI**
A user can traverse:
`Vendor → canonical entity → evidenced relationship → source evidence → structural state`
with no identity leakage and no unsupported inference.

---

### 16. Current Implementation Status

| Component | Status |
|---|---|
| Canonical ρ | Existing |
| `ACQUIRED` | Existing type; no live source — one manually seeded production fact |
| `SHARED_PATENT_ASSIGNMENT` | Ratified; procurement coverage not established |
| `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE` | Ratified; production path currently broken (EDGAR form-code bug, confirmed 2026-10-03) |
| Government vendor → canonical entity bridge | Missing |
| SAM.gov entity / award integration | Missing / KRYL-1352 |
| Supplier → ρ portfolio join | Missing |
| Batch vendor evaluation | Missing |
| Procurement-specific relationship types beyond existing ρ | Not ratified |
| Portfolio structural UI | Missing |

---

### 17. Scope Boundary — First Implementation Target

Build and prove **one complete real path**:

```
real vendor → entity resolution → external observation → canonical ρ → supplier join → portfolio view
```

The proof must use a **live external observation source**. The manually seeded `ACQUIRED` fact
does not satisfy the external-observation portion of the proof.

The implementation must therefore establish, before the proof can execute:

1. a real vendor/award source;
2. vendor → canonical-entity resolution;
3. at least one live external observation connector;
4. an admitted ratified ρ relationship;
5. the supplier → ρ persistence join;
6. bounded portfolio evaluation; and
7. the portfolio UI path.

`ACQUIRED` may be used for the proof only after a live M&A source/connector has been implemented
and independently verified. The existing manually seeded `ACQUIRED` fact does not count as
connector coverage.

**Connector choice for point 3 (implementation-ticket decision, not a spec mandate):**
- Default first proof: repair and verify the existing EDGAR connector (`HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE`)
  — lower cost, code already exists end-to-end, only the form-code bug blocks it.
- Alternative: build a new M&A connector (`ACQUIRED`) only if `ACQUIRED` is specifically required
  for the proof.
- This spec remains source-neutral: no forced relationship type or connector choice.

Do **not** expand into spend analytics, supplier scoring, procurement optimization, contract
management, inventory, or planning.

---

**End of Spec**
