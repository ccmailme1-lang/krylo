# Stage 1 Validate — Relational Substrate

Validates `specs/stage1-map-relational-substrate-20261001.md` against the actual repository.
Closes the two gaps the Map pass left open, then validates each mapped path against
`specs/SPEC-relational-substrate-stage1-baseline.md` using five categories: **confirmed fact /
confirmed incompatibility / information loss / unresolved question / unsupported assumption**.
No implementation, no adapters, no persistence choice, no `ν_id`/`ν_state` definitions, no
Founder ontology resolution.

---

## Gap 1 closed — `allFieldEvidenceFacets()` traced

`structuralentitysynthesis.js:53-62`: pulls `getDomainEvidenceFacets(domain, {subject: null})`
across all 6 canonical domains, merged with typed-edge facets (`TYPED_EDGES.map(typedEdgeAsFacetShape)`)
into one `candidates` array (`:113`).

**Admission mechanism, confirmed by direct read (`:42-51`, `:115-124`):** a pair `(a, b)` is
marked `SUPPORTED` if **any single candidate's free text** — `facetText(f) = [semantics, source,
facet_id].join(' ').toLowerCase()` — contains **both** entity terms as plain substrings
(`termFor()` just lowercases and despaces the label). This is a naive text co-occurrence match
across a candidate list, not a structural check that the matched facet is actually *about* a
relationship between those two specific entities.

**This is a confirmed incompatibility with baseline §9**, and arguably a more severe one than
the MAP's co-presence mechanism: §9 prohibits admission from "endpoint similarity" and similar
proxies; a shared substring across an unrelated domain-level evidence blob is the same class of
proxy, applied to text instead of numbers. **Concretely:** `allFieldEvidenceFacets()` pulls
domain-scoped evidence (not entity-pair evidence) — if a CAPITAL-domain facet's semantics
sentence happens to mention two unrelated entity names together, this mechanism marks that pair
`SUPPORTED` with that facet as its "relationship evidence." Not fabricated in the sense of
invented text, but mis-attributed: the evidence exists, it just isn't evidence of a relationship
between those two entities.

## Gap 2 closed — complete `entitytopologyregistry.js` consumer inventory

| Consumer | Imports | Use |
|---|---|---|
| `secownershipconnector.js` | `registerOwnershipEdge, nodeId` | writes, identity |
| `supplychainconnector.js` | `entityTopologyRegistry` | imported; **no confirmed call site found** via direct grep — flagged, not confirmed used or dead |
| `patentsviewconnector.js` | `registerInventorMigrationEdge` | writes (dedicated function, not the generic `registerTypedEdge`) |
| `rsievidencemigration.js` | `registerTypedEdge, nodeId, RELATION_TYPES` | writes, identity, type enum |
| `entityresolution.js` | `nodeId` | **dependency direction confirmed**: `canonicalId`'s own derivation depends on `entitytopologyregistry.js`'s `nodeId()`, not the reverse |
| `worldgraph.js` | `findPath` | reads (validator traversal) |
| `crediff.js` | `getTypedEdgesFor` | reads — `getTypedEdgesFor({name: identity.canonicalName})` (`:123`), keyed by canonical name |
| `gwrealiser.js` | `TYPED_EDGES, RELATION_TYPES` | reads raw data directly |
| `structuralinputadapter.js` | `RELATION_TYPES` | reads the enum only, not edge data |
| `structuralentitysynthesis.js` | `TYPED_EDGES, NODE_LABELS` | reads (KRYL-1334 facet path, see Gap 1) |
| `chokepointedges.js` | `registerTypedEdge, TYPED_EDGES` | writes + reads |
| `causalimpactmap.js` | `TYPED_EDGES, NODE_LABELS` | reads raw data directly |
| `surfacerouter.js` | `resolveTopology` | **new finding, not in the original Map** — see below |

**New finding, material to the MAP/domain-signal boundary validation:** `surfacerouter.js:178`,
inside `dispatchBatch()` itself: `topology: e.topology?.length ? e.topology : resolveTopology(e.source)`
— **every dispatched event is tagged with typed-edge topology data at the core dispatch layer**,
before it reaches any domain-specific subscriber. Checked directly whether `domaingravity.js`'s
`__gravity__` subscriber reads this field: **it does not** (confirmed, zero matches for
`topology` anywhere in `domaingravity.js`). This sharpens the earlier Map finding: relational
topology data isn't merely absent upstream of the MAP — it is present on the exact event object
`domaingravity.js` processes, and is dropped there by omission, not by non-existence.

`relationontology.js` itself: re-confirmed zero references to `entitytopologyregistry.js` (no
change from Inventory/Map).

---

## Validation by target

### 1. RelationCore's actual field/provenance behavior

- **Confirmed fact**: constructor enforces `eta ∈ (0,1]`, `phi0 ∈ [0,1]`, `structuralSupport ∈
  (0,1]`, and a truthy `provenanceHash` (throws otherwise) — re-verified directly against
  `relationontology.js:73-91`.
- **Confirmed fact**: `provenanceHash` is checked for truthiness only, not format or uniqueness —
  any non-empty string satisfies the constructor. The three real producers happen to supply real
  identifiers (SEC accession, migration source), but the type itself does not enforce that.
- **Information loss**: none at construction (first-generation object). Loss occurs downstream,
  at `typedEdgeAsFacetShape()`, one hop before KRYL-1334 (already established in Map/Inventory).
- **Unresolved question**: whether `admitCandidate()`'s `VALIDATED` decision has any confirmed
  effect beyond a console log in the one producer traced (`secownershipconnector.js:143-145` logs
  on non-`VALIDATED`, does not branch on the result otherwise) — not confirmed to gate anything.
- **Unsupported assumption** (from the original relayed proposal, now corrected): that RelationCore
  "already establishes a serious candidate for the fundamental relational primitive" in its
  current numeric form. Confirmed false for `eta`/`phi0`/`structuralSupport` specifically (placeholder
  values); true only for the `id`/`part`/`type`/`provenanceHash` structural shape.

### 2. KRYL-1334 identity semantics and historical persistence

- **Confirmed fact**: real, live, server-side persistence. Traced the full chain:
  `formationsnapshotclient.js`'s fire-and-forget POST → `as-diff/engine.js:319-340`'s
  `handleFormationStateWrite` → `lastFormationState()` + `decideWrite()` (the exact function
  validated in Inventory) → `writeFormationState()` → real `INSERT INTO formation_state
  (formation_id, subject_scope, entity_a, entity_b, relationship_type, state, evidence_ref,
  provenance, trigger)` (`as-diff/formationstatestore.js:12-16`). This is not a theoretical path —
  it is a real, callable HTTP route (`/v1/formation-state`, `as-diff/engine.js:1616-1617`) with a
  real Postgres table.
- **Confirmed fact**: `lastFormationState()` reads `ORDER BY captured_at DESC LIMIT 1` — history
  comparison is real, not simulated.
- **Unresolved question** (carried from Map, not resolved here): whether `relationship_type` is
  canonical `type` or `ν_state`. This Validate pass adds no new evidence either way — the DB
  schema itself treats it as a plain column, agnostic to the ontology question.
- **Confirmed incompatibility**: `decideWrite()`'s `STRENGTHENING` assignment (any `evidence_ref`
  or `relationship_type` diff) still has no type-specific rule behind it, re-confirmed directly
  against the live server path, not just the pure function in isolation — the server-side
  `decision = decideWrite(candidate, last, 'material_change')` call uses the exact same generic
  logic. Baseline §7 violation is live, not theoretical.

### 3. Typed-edge information requirements across all consumers

- **Confirmed fact**: 12 of 13 consumers' usage is now characterized (table above); the one
  unconfirmed is `supplychainconnector.js` (imports `entityTopologyRegistry` but no direct call
  site found).
- **Confirmed fact**: consumers split into two needs — raw data access (`gwrealiser.js`,
  `causalimpactmap.js`, `structuralentitysynthesis.js` read `TYPED_EDGES` directly) vs. API-mediated
  access (`worldgraph.js` via `findPath()`, `crediff.js` via `getTypedEdgesFor()`). Any projection
  boundary (baseline §11) must support both access patterns, not just the traversal API — a more
  specific requirement than the Map pass established.
- **Information loss risk, newly identified**: `surfacerouter.js`'s `resolveTopology(e.source)`
  call means the dispatch-layer tagging depends on `TYPED_EDGES` being populated *before* events
  are dispatched. If typed edges become a lazily-built projection of canonical relations (per
  baseline §11), this real-time dispatch-tagging behavior must still resolve synchronously, or
  live event topology-tagging breaks.
- **Unresolved question**: whether `supplychainconnector.js` is a dead import, a real but
  unmatched call pattern, or using `entityTopologyRegistry` as a namespace object in a way this
  grep didn't catch. Not resolved in this pass — would need a direct file read, out of scope for
  what was asked.

### 4. MAP/domain-signal boundaries

- **Confirmed fact** (strengthened from Map): typed-edge topology data is present on the
  dispatched event object at the point `domaingravity.js` processes it (`event.topology`, set by
  `surfacerouter.js:178`), and is confirmedly not read there.
- **Confirmed incompatibility**: re-confirmed, `formationinference.js`'s `buildGraph()` admits
  edges from independent per-domain threshold crossing alone — still matches baseline §9's
  prohibited list directly (co-presence alone, endpoint magnitude).
- **Unresolved question** (unchanged from Map): whether CFX's Connectivity stage may consume this
  observation feed directly, alongside canonical `ρ`, or must only consume canonical relations.

### 5. RelationDynamics compatibility with type-specific change predicates

- **Confirmed fact**: zero importers, re-confirmed by a fresh search this pass — no change from
  Map/Inventory.
- **Confirmed incompatibility, newly specific**: `relationdynamics.js`'s header states its
  coefficients/thresholds "come from the governance profile 𝒫 (`relationontology.makePolicyProfile`)"
  — a single global profile, not parameterized per relationship type. Baseline §7 requires each
  *type* to define its own strengthening/weakening/reconfiguration rules. A single global policy
  profile is, by construction, the opposite shape from what §7 requires unless `makePolicyProfile`
  itself is called once per type with type-specific parameters — not confirmed either way without
  reading `relationontology.js`'s `makePolicyProfile` implementation, which was not opened this
  pass. Flagged as **unresolved question**, not confirmed incompatibility, pending that read.

---

## Summary of classification counts

| Target | Confirmed fact | Confirmed incompatibility | Information loss | Unresolved question | Unsupported assumption (corrected) |
|---|---|---|---|---|---|
| RelationCore | 2 | 0 | 1 (known, unchanged) | 1 | 1 |
| KRYL-1334 | 2 | 1 | 0 (unchanged) | 1 | 0 |
| Typed edges | 2 | 0 | 1 (new) | 2 | 0 |
| MAP/domain boundary | 1 (strengthened) | 1 | 0 | 1 | 0 |
| RelationDynamics | 1 | 1 (new, specific) | 0 | 1 | 0 |

---

## What this Validate pass does not do

Does not select a persistence target. Does not define any `ν_id`/`ν_state`. Does not resolve the
`relationship_type` identity-vs-state question, the CFX-input-scope question, the
`supplychainconnector.js` usage question, or whether `makePolicyProfile` is in fact
type-parameterizable. Each is named above as a specific, scoped open item for Adapt-phase
decision or direct Founder ruling — not decided here.
