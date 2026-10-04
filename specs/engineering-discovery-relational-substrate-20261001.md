# Engineering Discovery — Relational Substrate Mapping (2026-10-01)

No implementation. This is a factual map of what exists today, built from direct source
tracing (file/line citations below), not description or inference from memory.

---

## 1. What evidence KRYLO actually has

Two structurally different evidence worlds exist, with no shared identity between them:

**A. Domain-signal evidence** (feeds the MAP today)
- Origin: `surfaceRouter` dispatch → `domaingravity.js:86-103`'s `__gravity__` subscriber.
- Each unit is scoped to exactly **one** domain: `{ confidence, polarity, ts, source, signal }`,
  optionally `meta.canonicalId` (KRYL-1220).
- Nothing in this shape ever names a second domain/entity. It cannot express "A relates to B" —
  only "domain A had this much signal, this direction, at this time."
- Retention: in-memory `_pool` Map, 5-minute window (`DEFAULT_WINDOW_MS = 300_000`), never persisted.

**B. Entity-relational evidence** (exists, does not feed the MAP)
- Origin: individual connectors that parse real sources whose own schema structurally names two
  parties — e.g. `secownershipconnector.js`'s `extractOwnershipPair(hit)` from SEC Schedule
  13D/13G filings (subject company + filer are both required filing fields, not inferred from
  prose), `patentsviewconnector.js`'s inventor-migration edges, RSI's seeded real citations
  (`rsievidencemigration.js`, `specs/rsi-production-test-raw.json`).
- Each unit names two real entities plus a real citation (accession number, filing date, source
  text).

These two evidence worlds have never been reconciled. The MAP's Formation layer
(`formationinference.js`) only ever consumes (A), and (A) cannot represent a relationship
between two things — only independent co-occurrence of two single-domain thresholds.

## 2. Where relationships are already being created

Three independent creation points, all downstream of (B) above, none of them downstream of
each other:

1. **`entitytopologyregistry.js`'s typed-edge registry** — `registerOwnershipEdge()` /
   `registerTypedEdge()`, called directly from connectors (`secownershipconnector.js:114`,
   `chokepointedges.js`). Simple shape: `{from, to, type, source}`. This is the one that's
   actually **wired into live structure-traversal**: `worldgraph.js`'s `getWorldGraph()` calls
   its `findPath()` directly; `chokepointedges.js`'s `buildChokepointStructure()` builds off it
   via `sigmaengine.buildStructure()`; `structuralentitysynthesis.js`'s `typedEdgeAsFacetShape()`
   reads from its `TYPED_EDGES` list and is the actual source of KRYL-1334's persisted
   `formation_state` history (`formationsnapshot.js`).

2. **`relationontology.js`'s `RelationCore`** — `makeRelationCore()`, called from 3 real
   producers: `secownershipconnector.js:127` (live connector), `patentsviewmigrationproducer.js`
   (migration script), `rsievidencemigration.js` (one-off migration encoding the real RSI/Sysco
   evidence). Richer shape: `{id, sourceId, targetId, relationType, eta, phi0, structuralSupport,
   provenanceHash, validity, createdAt}`, validated through `admitCandidate()`. **Not** consumed
   by `worldgraph.js`, `chokepointedges.js`, or `structuralentitysynthesis.js` — confirmed by
   direct check: `entitytopologyregistry.js` has zero references to `relationontology.js`.

3. **`formationinference.js`'s co-presence edges** — not actually a relationship creation point;
   it independently threshold-tests two domains and looks up a static 15-entry category table
   (`domainintelligence.CROSS_DOMAIN_RELATIONSHIPS`) by domain-pair name. Never consults the
   particles that produced the threshold crossing. This is the one the MAP renders.

In the one place all three evidence paths originate from the *same* real event
(`secownershipconnector.js`'s single real filing hit), the typed edge and the `RelationCore` are
built in two separate, non-communicating code blocks (lines 106-120 and 121-148) — siblings, not
parent/child, both reading independently from the same raw `pair`.

`relationdynamics.js` — a fully-specified relational-dynamics/event-detection model (v1.2,
equations 3-16: entropy over evidence support, EMA volatility, φ-grounding, explicit
detection-not-forecast boundary) — exists and consumes `relationontology.js`'s primitives, but
**has zero importers anywhere in `src/`.** Built, not wired. Same class of finding as the
backpressure incident already documented in this repo's own CLAUDE.md §12.

## 3. What RelationCore can reuse

- Real producers already exist for 3 evidence classes (SEC ownership, patent-inventor migration,
  RSI-seeded real evidence) — the construction pattern (`makeRelationCore` + `admitCandidate`) is
  proven, not hypothetical.
- A real validation/admission step (`admitCandidate`) with a rationale trail already exists.
- A real, unwired dynamics layer (`relationdynamics.js`) already models relational state change,
  evidence support, and temporal behavior more rigorously than KRYL-1334's informal
  `NEW/STRENGTHENING/WEAKENING` labels — reusable logic, not a competing concept, if wired.
- `provenanceHash` is a hard constructor requirement (`makeRelationCore` throws without it) — the
  "no unsourced relation" invariant is already enforced at the type level, for free.

What it **cannot** currently supply: a canonical identity shared with the typed-edge registry or
the MAP's domain graph (its `sourceId`/`targetId` use a different key scheme — `nodeId(cik,
name)` — than either); a real, non-placeholder `phi0`/`structuralSupport` value (see §7); any
persistence (see §5).

## 4. How identities are currently handled

At least three distinct identity schemes, confirmed non-unified:

- **Domain-signal world**: identity is the domain name itself (`CAPITAL`, `OWNERSHIP`, ... — the
  6 canonical domains), plus an optional `meta.canonicalId` (KRYL-1220) pointing to
  `entityresolution.js`'s registry (`RUNTIME_REGISTRY`, keyed by canonicalId, a stable slug from
  normalized name).
- **Typed-edge registry**: `nodeId(cik, name)` — confirmed in `secownershipconnector.js` — a
  different derivation than `canonicalId`, though sourced from the same real CIK/name pair.
- **RelationCore**: `sourceId`/`targetId` — in the one real-world trace available, these are the
  *same* `nodeId(cik, name)` values as the typed-edge registry (both built from the same `pair`
  in the same function), but nothing enforces that convergence structurally — it's incidental to
  this one producer, not a contract.

`entityresolution.js`'s `canonicalId` registry is the one identity store that's explicitly
designed to be the stable cross-system entity key (per its own comments), but it is not
confirmed to be what either the typed-edge registry or `RelationCore` actually key off of in
every producer — only verified for this one connector.

## 5. How provenance is stored

- **Domain-signal particles**: `evidenceRef` field (`formationinference.js:69`), optional,
  per-particle, never required.
- **Typed-edge registry**: a `source` string field — present, but not a hard constructor
  requirement (not verified to throw if absent).
- **RelationCore**: `provenanceHash` — a hard constructor requirement, real values seen are SEC
  accession numbers (a genuine, independently-verifiable external identifier).
- **KRYL-1334 persisted history** (`formation_state` table, via `formationsnapshot.js`): stores
  the *entire* upstream facet object verbatim as an opaque `provenance` JSON blob, plus a lossy
  concatenated `evidence_ref` string (`sourceId:source`) that cannot be decomposed back into its
  parts without re-parsing.

**Persistence reality check** (confirmed by direct search for `pool.query`/`INSERT INTO` in every
file touching `RelationCore` or the typed-edge registry): **neither `RelationCore` nor the
typed-edge registry is written to a database.** Both are in-memory only (`entitytopologyregistry.js`'s
`const _registry = {}`; `RelationCore` objects are constructed, validated, and — based on every
consumer traced — not stored anywhere retrievable after that). The *only* durably persisted
relational representation in the entire system is KRYL-1334's `formation_state` table, and it's
built from the weakest of the three evidence paths in terms of structured field retention (see
§2, point 1 — `typedEdgeAsFacetShape()` drops `eta`/`phi0`/`structuralSupport` one hop before
`formationsnapshot.js` ever runs).

## 6. What needs to change to create one canonical substrate

Not prescribed here (design/spec decision, out of scope for this discovery pass) — but the
concrete gaps a canonical contract would need to close, each verified above:

- A shared entity-identity key used by all three representations (today: 3 different schemes,
  convergent only by accident in the one connector where all three originate together).
- A persistence layer for whichever representation is declared canonical (today: 0 of 3 live
  representations persist; only the derivative KRYL-1334 facet does, and it's the most lossy).
- A decision on whether `relationdynamics.js`'s dormant dynamics model is wired in, replaced, or
  retired — it duplicates intent with KRYL-1334's informal state labels but is unwired.
- A decision on `eta`/`phi0`/`structuralSupport`: whether they become real (computed per evidence
  class, not copied placeholders) or are explicitly demoted to "implementation quantity, not
  epistemic fact" (the distinction the relayed proposal itself already called for).
- A decision on whether the MAP's domain-signal world and the entity-relational world are ever
  meant to be the same graph, or are permanently two different lenses on different evidence.

## 7. What technical constraints exist

- `RelationCore`'s constructor enforces real invariants today: `eta` ∈ (0,1], `phi0` ∈ [0,1],
  `structuralSupport` ∈ (0,1], `provenanceHash` required — any canonical object inheriting this
  shape inherits these constraints for free, but inherits the placeholder-value problem too if
  the same producers are reused unchanged.
- `domaingravity.js`'s `_pool` has a hard 5-minute retention window with no persistence — any
  canonical substrate wanting domain-signal evidence as an input must either read it within that
  window or introduce a new retention path.
- The static `CROSS_DOMAIN_RELATIONSHIPS` table (`domainintelligence.js`) is a closed, 15-entry,
  Founder-ratified (WO-3) admission set for the 6 canonical domains — any canonical model that
  wants to keep the MAP's existing domain-level admission logic must either preserve or formally
  retire this closed-set contract, not route around it silently.
- `relationdynamics.js`'s `assertNoForecast` boundary is an explicit, already-built guardrail
  consistent with this repo's "we detect, we don't predict" positioning (CLAUDE.md §10) — a
  reusable constraint, not a blocker, if that layer is ever wired in.
