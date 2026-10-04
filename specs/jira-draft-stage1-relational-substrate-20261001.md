# Jira Draft — Relational Substrate Stage 1 Implementation

Draft text only. Not yet created in Jira. Each ticket below carries all six required fields per
CLAUDE.md §10 (original intent, acceptance criteria, current implementation state, dependencies,
supersession, product-model mapping). Review before anything is actually filed.

---

## EPIC: Relational Substrate — Stage 1 Implementation

**Original intent**: Replace KRYLO's three divergent, non-cross-wired relationship
representations (MAP co-presence, RelationCore, KRYL-1334's text-match facet path) with one
canonical relational substrate per the ratified Stage 1 baseline and formalization, so CFX
consumes a single evidence-admitted relational graph instead of inferring structure from
co-occurrence or a naive text match.

**Acceptance criteria**: all 8 child tickets closed; no generic strength/confidence/force field
remains anywhere in canonical `ρ`; the MAP no longer presents co-presence as "RELATIONSHIPS"; KRYL-1334
admits only via canonical `ρ`, never text-substring matching; the typed-edge registry is a
projection, not an independent writer.

**Current implementation state**: Stage 1 ontology/formalization complete as of this session
(2026-10-01) — 8 spec documents in `specs/`:
`SPEC-relational-substrate-stage1-baseline.md`, `engineering-discovery-relational-substrate-20261001.md`,
`stage1-inventory-relational-substrate-20261001.md`, `stage1-map-relational-substrate-20261001.md`,
`stage1-validate-relational-substrate-20261001.md`, `stage1-adapt-relational-substrate-20261001.md`,
`stage1-founder-rulings-ontology-resolution-20261001.md`, `SPEC-relational-substrate-stage1-formalization.md`.
Zero implementation started.

**Dependencies**: none external. Internal ordering per child tickets (1 blocks 2 and 3; 6 blocks 2).

**Supersedes**: none — net-new epic; no prior ticket covers this ontology.

**Maps to current KRYLO product model**: yes — directly serves the CFX/Structural Intelligence
premise (CLAUDE.md §15/§20/§21), the "we detect, we don't predict" positioning, and the MAP
(`navMode='structure'`).

---

## 1. Canonical `ρ` construction + `φ_class`

**Original intent**: Adapt RelationCore's existing structural fields (`id`/`sourceId`/`targetId`/
`relationType`/`provenanceHash`/`validity`/`createdAt`) into canonical `ρ = (id, part, type,
φ_class, ν)` per the formalization. Add an explicit `φ_class`, declared by the ratified type
(Founder Ruling 1). Retire `eta`/`phi0`/`structuralSupport` as canonical fields (Ruling 2),
preserving their existing values only as non-canonical migration material.

**Acceptance criteria**: a construction path produces `ρ` from each of the 3 real producers'
existing raw evidence (`secownershipconnector.js`, `patentsviewmigrationproducer.js`,
`rsievidencemigration.js`) with no new per-source data collection; `id` is assigned only after a
same-ness check, never carried over from a legacy RelationCore `id`; `φ_class` is read from the
type's ratified declaration, never inferred at runtime; `eta`/`phi0`/`structuralSupport` do not
appear anywhere in `ρ`'s canonical shape.

**Current implementation state**: not started. RelationCore exists (`relationontology.js`) but is
structurally pre-canonical per Adapt §B; confirmed zero consumers past `admitCandidate()`'s
validation step.

**Dependencies**: none upstream. Blocks tickets 2 and 3.

**Supersedes**: none.

**Maps to current product model**: yes — the foundational primitive CFX requires, per baseline §12.

---

## 2. Typed-edge projection layer

**Original intent**: Make `entitytopologyregistry.js`'s typed-edge store a derived projection of
canonical `ρ` rather than an independently-written sibling (baseline §11, Adapt §C), while
preserving every confirmed consumer's contract exactly — `findPath()` (`worldgraph.js`),
`getTypedEdgesFor()` (`crediff.js`), raw `TYPED_EDGES` reads (`gwrealiser.js`,
`causalimpactmap.js`, `structuralentitysynthesis.js`) — and preserving `surfacerouter.js`'s
synchronous `resolveTopology()` dispatch-time resolution.

**Acceptance criteria**: `findPath()` and `getTypedEdgesFor()` return identical results before and
after the swap, against a fixed snapshot of canonical relations (regression-equivalence test, per
Adapt §C.7); connectors stop calling `registerOwnershipEdge`/`registerTypedEdge`/
`registerInventorMigrationEdge` directly; `resolveTopology()`'s synchronous dispatch-time
behavior is confirmed unregressed.

**Current implementation state**: not started. `supplychainconnector.js`'s `entityTopologyRegistry`
usage remains unconfirmed (flagged in Validate) — needs a direct code read before this ticket's
writer list is final.

**Dependencies**: depends on ticket 1 (canonical `ρ` must exist to project from); depends on
ticket 6 (event.topology/`resolveTopology()` factual validation) — Adapt §C.6 notes a slower
projection mechanism would be a regression, not an adaptation.

**Supersedes**: none.

**Maps to current product model**: yes — keeps the live traversal consumers (validator, crediff,
chokepoint/causal-impact surfaces) working through the transition.

---

## 3. KRYL-1334 admission replacement

**Original intent**: Retire the text-substring `SUPPORTED` admission mechanism
(`allFieldEvidenceFacets()` + `facetText()` matching in `structuralentitysynthesis.js`), confirmed
incompatible with baseline §5/§9. Feed `formation_state` writes from canonical `ρ` admission
instead. Map `relationship_type` to `ρ.type` per Founder Ruling 3. Add an explicit `UNSUPPORTED`
predicate so a `NO_EVIDENCE` pair produces a recorded absence state instead of silently writing no
row.

**Acceptance criteria**: no `formation_state` row can be written whose sole admission basis is a
text-substring match; `UNSUPPORTED` is representable and distinct from `DISSOLVED` per
formalization §5; the existing real Postgres persistence infrastructure (`as-diff/engine.js`'s
`/v1/formation-state` route, `formationstatestore.js`) is reused, not rebuilt; `evidence_ref`'s
lossy `sourceId:source` string concatenation is replaced with structured, retrievable provenance
per baseline §10.

**Current implementation state**: not started. Live, real persistence confirmed end-to-end
(Validate pass); admission mechanism confirmed incompatible, not yet replaced.

**Dependencies**: depends on ticket 1 (canonical `ρ` admission must exist to feed this).

**Supersedes**: none — amends KRYL-1334's existing implementation; KRYL-1334 itself remains the
historical reference for the original scrubber/persistence work.

**Maps to current product model**: yes — KRYLO's only durably persisted relational history; must
become evidence-honest under the ratified formalization.

---

## 4. Entity identity unification

**Original intent**: Make `entityresolution.js`'s `canonicalId` registry the single mandatory
identity reference for `part` in canonical `ρ`. Connector-local identity schemes (CIK-derived
`nodeId(cik, name)`, etc.) become inputs resolved through `canonicalId`, not parallel identity
systems.

**Acceptance criteria**: every canonical `ρ`'s `part` resolves through `canonicalId`; no two
representations of the same real-world entity produce two different `part` values; the one
connector confirmed to build both a typed edge and a RelationCore from the same raw pair
(`secownershipconnector.js`) is the first proof case.

**Current implementation state**: not started. `canonicalId` already exists and is already used by
at least one producer (KRYL-1220); identity-scheme convergence confirmed only incidentally in one
connector, not guaranteed elsewhere.

**Dependencies**: feeds ticket 1 (`part` construction) and ticket 3 (`entity_a`/`entity_b`).

**Supersedes**: none.

**Maps to current product model**: yes — required for baseline §3's same-ness test to be
computable at all.

---

## 5. MAP/domain-signal relabeling

**Original intent**: Stop presenting `formationinference.js`'s co-presence graph as
"RELATIONSHIPS" in the MAP UI or any API surface. Per Adapt §A and baseline §9, co-presence is
explicitly prohibited from being read as a relationship.

**Acceptance criteria**: `structure-field.html`'s "RELATIONSHIPS" stat label (and any equivalent
API field) is relabeled to describe co-occurrence/co-presence, not relationship; no guest-facing
surface implies `admittedType` is evidence of a specific instance's relation.

**Current implementation state**: not started. The underlying co-occurrence detection
(`formationinference.js`) is unchanged and not deprecated — only the label/framing changes.

**Dependencies**: none — independent, can run in parallel with everything else.

**Supersedes**: none. Note for whoever picks this up: `structure-field.html` already received
unrelated edits this session (commit `fb468b8` — hint removal, scrubber width-match, lime scrubber
controls) — rebase against current `main`, don't assume a stale copy.

**Maps to current product model**: yes — serves CLAUDE.md §16 (Direction Honesty) and §1
(Grounding — no claim without precedent).

---

## 6. `event.topology` validation

**Original intent**: Inspect `resolveTopology()`'s actual implementation
(`entitytopologyregistry.js`) — not yet done in Discovery/Map/Validate — to determine its real
output shape, whether it's ever non-empty for real dispatched events, and its performance cost if
read by an additional subscriber (`domaingravity.js`).

**Acceptance criteria**: a factual report (not a design) on `resolveTopology()`'s confirmed
behavior against real data; an explicit answer on whether `domaingravity.js`'s `__gravity__`
subscriber reading `event.topology` is safe, cheap, and meaningful.

**Current implementation state**: not started. Confirmed only that `surfacerouter.js` calls it
synchronously at dispatch and that `domaingravity.js` currently ignores the result.

**Dependencies**: blocks ticket 2 (typed-edge projection's synchronous-resolution requirement).

**Supersedes**: none.

**Maps to current product model**: yes — a factual prerequisite for the projection layer's
correctness, not new scope.

---

## 7. RelationDynamics real-data validation

**Original intent**: Construct one real `PolicyProfile` (`relationontology.js`'s
`makePolicyProfile()`, confirmed zero existing instantiations) with real per-type `typeWeights`,
and run `relationdynamics.js`'s v1.2 update function against one real relationship's real evidence
history, to determine whether its hybrid shared-formula/per-type-weight design produces defensible
STRENGTHENING/WEAKENING predicates under formalization §5/§7.

**Acceptance criteria**: a factual pass/fail report against at least one real relationship type's
real evidence history (KRYL-1334's existing rows, or the 3 real RelationCore instances, are the
available real inputs); no wiring decision is made until this report exists.

**Current implementation state**: not started. `relationdynamics.js` confirmed zero importers
anywhere in `src/`; `makePolicyProfile()` confirmed zero call sites.

**Dependencies**: none strictly required, but informs whether ticket 3's STRENGTHENING/WEAKENING
rules reuse this machinery or are built fresh.

**Supersedes**: none.

**Maps to current product model**: yes — determines whether existing real engineering work
(WO-20XX SRE Phase 1) is reusable or should be formally retired.

---

## 8. KRYL-1334 legacy-row retention policy

**Original intent**: Decide — a data-retention policy, not an ontology question — whether existing
`formation_state` rows admitted solely via the now-confirmed-incompatible text-substring mechanism
are preserved as a labeled noncanonical/historical tier, or excluded from what migrates into the
canonical substrate.

**Acceptance criteria**: an explicit, recorded policy decision (not a default); if "preserve," a
concrete labeling/flagging mechanism so these rows are never mistaken for canonically-admitted
relationships.

**Current implementation state**: not started. Confirmed real rows exist in the live
`formation_state` table; exact count not audited this session.

**Dependencies**: should resolve before or alongside ticket 3's migration cutover.

**Supersedes**: none.

**Maps to current product model**: yes — protects the integrity of the one durably-persisted
relational history KRYLO has.

---

## Addendum (post-creation) — KRYL-1347 and amended Epic acceptance

All 9 tickets above were created in Jira (Epic KRYL-1338, children KRYL-1339–1346) and
transitioned to Ready, then KRYL-1339 (Canonical ρ construction + φ_class) was executed: all
three real producers traced, ratified (`HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE`,
`SHARED_PATENT_ASSIGNMENT`, `ACQUIRED`), implemented (`src/engine/canonicalrelationship.js`,
`src/engine/ratifiedrelationshiptypes.js`), and proven (23/23 checks, `qa_canonicalrelationship.mjs`).
KRYL-1339 moved to Review.

A gap was then found: the original plan traced Evidence → Admission → canonical `ρ` →
Persistence, but no ticket traced Persistence → Consumer → Visible product behavior. KRYL-1343
(MAP relabeling) was confirmed **not** a canonical-relationship consumer by design — the MAP
stays domain co-presence, relabeled. The actual missed consumer, found by tracing
`targetpacket.jsx`'s NARRATIVE section: `src/engine/reconnpayload.js`'s `relationshipCoverage()`
(RECONN Factor v1.1 §10) — a hardcoded `{state: 'BLOCKED', relationships: []}` stub, per an
existing 2026-09-20 Founder ruling, pending exactly the persistence layer KRYL-1341 now provides.

## 9. Target Packet canonical Relationship Coverage (KRYL-1347)

**Original intent**: connect the persisted canonical relationship authority (KRYL-1339/1341) to
the existing Target Packet Relationship Coverage surface, unblocking the 2026-09-20 ruling.

**Acceptance criteria**: reads the canonical relationship authority (1339/1341); resolves
participants via 1342's identity unification; returns actual admitted relationships (type +
participants); preserves evidence/provenance linkage to the UI; removes the hardcoded
`BLOCKED`/`[]` behavior when canonical data exists; retains an honest empty state when no
relationship is admitted; feeds the existing Target Packet UI — no new surface, no new ontology,
no new relationship store, no change to MAP's co-presence semantics.

**Current implementation state**: not started. `relationshipCoverage()` is a static stub today.

**Dependencies**: KRYL-1339, KRYL-1341, KRYL-1342.

**Supersedes**: none — closes the specific blocker on record since 2026-09-20.

**Maps to current product model**: yes — the one identified point where Stage 1's work becomes
visible to a guest at all.

**Epic acceptance criteria, amended to add**: *"Every canonical relationship produced by Stage 1
has an identified downstream consumer, and every intended existing consumer has been traced
through to its user-visible behavior."* — the planning control against this exact class of miss.

## Not yet done

Per CLAUDE.md §10/§23, only the Founder moves a ticket's status, and tickets are created on
explicit go for that specific action. KRYL-1340–1347 (beyond 1339) have not been started.
