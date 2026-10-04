# Stage 1 Map — Relational Substrate

Maps each existing system/data path onto `specs/SPEC-relational-substrate-stage1-baseline.md`,
starting from `specs/stage1-inventory-relational-substrate-20261001.md`. Factual mapping only —
no implementation, no chosen persistence target, no `ν_id`/`ν_state` definitions, no validation
of RelationDynamics, no adapters built, no Founder questions resolved.

---

## A. MAP / Domain Signals (`domaingravity.js` + `formationinference.js`)

- **Source evidence**: single-domain signal particles (`domaingravity.js`'s `_pool`), each naming
  exactly one domain; never a pair.
- **Current representation**: `{a, b, property:'co_presence', admittedType}` plus the six
  per-endpoint aggregates retained earlier this session (`aMeanMag/aNet/aCount/bMeanMag/bNet/bCount`).
- **Canonical `ρ` concept it could map to**: none directly. Per baseline §9 this mechanism is an
  explicit prohibition, not a candidate — it is "an existing observation mechanism explicitly
  outside the relational substrate" (per correction received), not a defective relationship.
  It could map to a non-relational observation input to CFX's Connectivity stage (§13's framing:
  "may remain useful as an observation capability"), not to `ρ` itself.
- **Information preserved**: real per-domain magnitude/polarity/count for both named endpoints;
  the static `admittedType` category label.
- **Information lost**: none in transformation — no joint/pairwise evidence ever existed upstream
  to lose (confirmed: nothing ties domain A's event to domain B's event anywhere in the pipeline).
- **Transformation/adapter boundary required**: none *as a relationship* — this path does not
  produce `ρ`. If retained as a CFX observation input, the boundary would be an explicit
  non-relational tag so it is never silently read as a relationship downstream.
- **Unresolved ontology/implementation question**: whether CFX's Connectivity stage (§12) may
  consume raw co-presence observations directly alongside canonical `ρ` objects, or whether its
  input is strictly the canonical relational graph and nothing else. Baseline §12 says CFX's input
  is "the canonical relational graph" — doesn't explicitly settle whether a parallel non-relational
  feed is also permitted. Founder question.
- **Dependencies/downstream consumers**: `structure-field.html` (MAP rendering) — sole confirmed
  consumer of `formation.graph` today.

---

## B. RelationCore (`relationontology.js`; producers: `secownershipconnector.js`,
`patentsviewmigrationproducer.js`, `rsievidencemigration.js`)

- **Source evidence**: structurally-guaranteed real pairs per source — SEC 13D/13G filing
  subject/filer CIKs; patent inventor migration source/destination org; RSI real citation
  (Sysco/Restaurant Depot).
- **Current representation**: `{id, sourceId, targetId, relationType, eta, phi0,
  structuralSupport, provenanceHash, validity, createdAt}`, validated via `admitCandidate()`.
- **Canonical `ρ` concept it could map to**: `id→id`; `sourceId+targetId→part`;
  `relationType→type`. No field for `φ_class` exists — every producer implicitly represents what
  the baseline would call Semantic, but this is never declared as data. `eta/phi0/structuralSupport`
  map to no part of `ρ` as currently defined — baseline §1/§4 already exclude them absent a
  type-specific rule.
- **Information preserved**: participant identity (connector-local `nodeId` scheme), typed
  category, real provenance (accession/migration source), real creation timestamp.
- **Information lost**: not applicable at construction (first-generation object). Downstream fate
  is unconfirmed — no persistence destination found past `admitCandidate()`'s validation decision.
- **Transformation/adapter boundary required**: (a) an explicit `φ_class` assignment at
  construction, currently absent; (b) per-relationType admission rules in place of the current
  uniform `eta/phi0/structuralSupport` assignment; (c) a confirmed persistence target, currently
  none.
- **Unresolved ontology/implementation question**: whether `sourceId`/`targetId`'s current
  identity scheme is the same value space as `entityresolution.js`'s `canonicalId` in every
  producer — confirmed consistent only in the one producer where a typed edge and a RelationCore
  are built from the same raw pair (`secownershipconnector.js`); not confirmed elsewhere.
- **Dependencies/downstream consumers**: `admitCandidate()` at validation time. No confirmed
  consumer after that. `relationdynamics.js` imports `relationontology.js`'s primitives but has
  zero importers itself (see E) — not a live consumer.

---

## C. Typed Entity Edges (`entitytopologyregistry.js`)

- **Source evidence**: same raw pairs as B where both are built together; independently in other
  connectors not individually traced this session (`supplychainconnector.js`,
  `patentsviewconnector.js` — confirmed importers, contents not traced).
- **Current representation**: `{from, to, type, source}`; registry functions
  `registerOwnershipEdge`/`registerTypedEdge`/`findPath`/`TYPED_EDGES`.
- **Canonical `ρ` concept it could map to**: `from/to→part`; `type→type`. No `id` distinct from
  pair+type (whether duplicate registration overwrites or accumulates — not traced). No `φ_class`,
  no `ν` partition. `source` is optional, not enforced (unlike RelationCore's required
  `provenanceHash`).
- **Information preserved**: pair identity, category type, a free-text source string.
- **Information lost (if migrated to a projection per baseline §11)**: question runs in reverse —
  since typed edges are built independently today, the open question is what they currently
  guarantee (e.g. enforced presence, which `ρ` would need to replicate) rather than what a
  projection would drop.
- **Transformation/adapter boundary required**: `worldgraph.js`'s `getWorldGraph()` and
  `chokepointedges.js`'s `buildChokepointStructure()` call this registry's functions directly.
  Any projection boundary must preserve their exact function signatures/return shapes, or those
  two confirmed consumers need their own adapter layer.
- **Unresolved ontology/implementation question**: whether `findPath()`'s depth-limited traversal
  can be reconstructed purely from a projection of canonical `ρ` objects without re-deriving the
  registry's current in-memory adjacency structure — a performance/architecture question, not
  resolved here.
- **Dependencies/downstream consumers**: confirmed — `worldgraph.js`, `chokepointedges.js` →
  `sigmaengine.buildStructure()`, `structuralentitysynthesis.js` (feeding D below). Also appears
  in `relationtopology.js`, `causalimpactmap.js`, `narrativeassembly.js`, `relationaudit.js`, and
  others per the broader grep list — **flagged as an incomplete consumer list**, not individually
  traced this session.

---

## D. KRYL-1334 Formation State (`formationsnapshot.js` + `structuralentitysynthesis.js`)

- **Source evidence**: `structuralQuery.evidence.relationships` — facets built by
  `typedEdgeAsFacetShape()` (reading C's `TYPED_EDGES`) **plus** `allFieldEvidenceFacets()`, a
  second candidate source feeding the same array — **not traced this session; a real gap in this
  Map pass.**
- **Current representation**: `formation_state` row — `{formation_id, subject_scope, entity_a,
  entity_b, relationship_type, evidence_ref, provenance, state, trigger}`.
- **Canonical `ρ` concept it could map to**: `entity_a/entity_b→part`; `relationship_type→type`
  (pending the identity-vs-state question below); `provenance→ρ`'s provenance; `state`
  (NEW/STRENGTHENING) → §6's predicates, nominal match only (Inventory already found this
  non-conformant to §7/§8).
- **Information preserved**: the full upstream facet object, verbatim, as `provenance`.
- **Information lost**: `eta/phi0/structuralSupport` — already dropped one hop upstream at
  `typedEdgeAsFacetShape()`, before this file runs. RelationCore's identity scheme — not carried;
  `entity_a`/`entity_b` are plain strings instead. `r.state` itself (`SUPPORTED`/`NO_EVIDENCE`) —
  used only as a filter; a `NO_EVIDENCE` pair produces no row at all, not an explicit absence
  record.
- **Transformation/adapter boundary required**: a mapping from the current composite
  `formation_id` key to whatever canonical `part`/`type`/`ν_id` is eventually defined — blocked on
  the open identity-vs-state question. Also requires a decision on representing the currently
  unbuilt `UNSUPPORTED`/`DISSOLVED` cases, since the existing filter silently drops them.
- **Unresolved ontology/implementation question**: whether `relationship_type` is canonical `type`
  (identity-defining, per baseline §3) or a `ν_state` property (excluded from identity, per the
  same section) — carried forward from the Inventory, not resolved here. Additionally: what
  `allFieldEvidenceFacets()` actually contains is unknown as of this Map pass.
- **Dependencies/downstream consumers**: the only confirmed durable persistence (`pool.query()`,
  per its own header). UI consumer: **none, currently** — `structure-field.html`'s
  formation-history scrubber was the confirmed consumer before being removed earlier this same
  session (KRYL-1334/KRYL-1337 commits).

---

## E. RelationDynamics (`relationdynamics.js`)

- **Source evidence**: not a source itself — a transformation layer. Documented input shape:
  `evidenceDelta: {supportGained, contradictionGained, dist, formed, unmetCapacity}` — evidence
  *changes* over a window, not raw evidence.
- **Current representation**: pure functions (`normalizedEntropy`, `ema`, the v1.2 update
  implementing eqs 3–16), consuming `relationontology.js`'s `assertPhiGrounded`, `reversibilityOf`,
  `makeRelationEvent`, `RelationEventType`.
- **Canonical `ρ` concept it could map to**: presupposes a `ρ`-shaped input that already carries a
  real φ-equivalent value. Does not itself determine `part`, `type`, or `φ_class` — those are
  presupposed inputs, not outputs of this layer.
- **Information preserved/lost**: not assessable — zero confirmed importers mean no real evidence
  has ever flowed through it.
- **Transformation/adapter boundary required**: a producer emitting real `evidenceDelta` time
  series per relationship. No current system (B's 3 producers, or D's facet path) emits data in
  this shape today — a construction gap, not merely a wiring gap.
- **Unresolved ontology/implementation question**: whether its generic (non-type-parameterized)
  equations are compatible with baseline §7's requirement that strengthening/weakening be defined
  per relationship type — a real tension between its existing design and the ratified baseline,
  flagged, not resolved.
- **Dependencies/downstream consumers**: none (zero importers, confirmed).

---

## What this Map does not do

Does not choose a canonical persistence implementation. Does not define any relationship type's
`ν_id`/`ν_state` partition. Does not validate or modify RelationDynamics. Does not implement any
adapter. Does not resolve the `relationship_type` identity-vs-state question, the
`allFieldEvidenceFacets()` gap, the CFX-input-scope question for non-relational observations, or
RelationDynamics' §7-compatibility tension — each is named above as an open question for
Validate/the Founder, not decided here.
