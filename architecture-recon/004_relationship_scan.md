# R (Relationship) — Exhaustive Scan

Status: Architecture Recon / NOT a build spec. No code changed to produce this document.
Evidence Standard identical to 001/002/003.

Search performed: broad grep for graph libraries, predicate constants (`belongs_to`, `owns`,
`parentId`, `edge`, `from_id`, `to_id`), and — per the correction applied before this scan
started — not gated on the presence of a formal graph library (`graphlib`/`neo4j`/etc.), since a
relationship can be represented without one. The candidate found (`entitytopologyregistry.js`)
was surfaced via the O scan (003) and is audited here in full, since it is the file that actually
contains directed, typed, sourced edges between real-world entities.

## Candidate: `src/engine/entitytopologyregistry.js` (WO-1855, extended by WO-1856)

## Extraction table

| File | Edge builder fn | Subject type | Predicate storage | Object type | Temporal fields? | Provenance? |
|---|---|---|---|---|---|---|
| `entitytopologyregistry.js` | `registerTypedEdge({from, to, fromCik, toCik, type, source, fromLabel, toLabel})`, line 71 | Entity (company/filer), identified via `nodeId(cik, fallbackName)` — CIK-preferred | `type` field, free string (observed value: `'BENEFICIAL_OWNER_OF'`) | Entity (same node-id scheme) | Y — `ts: Date.now()` per edge (line 78) | Y — `source` field (observed value: `'SEC_13D_13G'`) |
| `entitytopologyregistry.js` | `registerOwnershipEdge({subjectCik, subjectName, filerCik, filerName})`, line 90 | Filer (`from`) | Hardcoded `type: 'BENEFICIAL_OWNER_OF'`, `source: 'SEC_13D_13G'` | Subject (`to`) | Y (via `registerTypedEdge`) | Y (via `registerTypedEdge`) — comment states this is "structurally guaranteed by the filing itself — the [subject, filer] CIK pair is a required field, not extracted from prose" |
| `entitytopologyregistry.js` | `registerInventorMigrationEdge(sourceOrg, destOrg)`, line 33 | Org (name-string keyed, not CIK) | **NOT FOUND** — no `type` field; writes into the flat v1 `entityTopologyRegistry` peer map only, untyped | Org | **NOT FOUND** — no timestamp | **NOT FOUND** — no source field; caller comment says "Called by patentsviewconnector" but that is not recorded on the edge itself |
| `entitytopologyregistry.js` | `TOPOLOGY_CLUSTERS` (module-level const, lines 5-9) | N/A | **NOT FOUND** — untyped, symmetric peer grouping only (e.g. `AI_COMPUTE: ['NVIDIA','TSMC',...]`) | N/A | **NOT FOUND** | **NOT FOUND** — hand-curated, "v1 is manually curated" per header comment |

Two distinct representations coexist in one file, explicitly documented as such by its own
comments: **v1** (`TOPOLOGY_CLUSTERS`/`entityTopologyRegistry`) is a flat, untyped, symmetric
peer-adjacency map — closer to "these are in the same cluster" than to a directed predicate. **v2**
(`TYPED_EDGES`) is the genuine directed/typed/sourced/timestamped relationship — the file's own
comment (line 44-49) states v2 is "the actual 'dynamic graph' the file's own header flagged as
not-yet-built," and that v1 is retained only for backward compatibility.

## Classification against the stated criteria

| Edge type | a) evidence-internal (ProvenanceDAG-like)? | b) in-memory correlation key only? | c) separate store with (subject, predicate, object, valid_from, source)? | Classification |
|---|---|---|---|---|
| v2 `TYPED_EDGES` (`registerTypedEdge`/`registerOwnershipEdge`) | No — connects two real-world entity nodes, not evidence items | No — has an explicit `type` predicate, not a bare foreign key | **Yes** — `{from, to, type, source, ts}` is exactly shape (c) | **Candidate R — passes** |
| v1 `TOPOLOGY_CLUSTERS`/flat peer map | No | Closer to this — symmetric, untyped, no predicate | No — no `type`, no `source`, no `ts` | **NOT R** — this is correlation/clustering data, not a directed semantic relationship |
| WO-2004 evidence-graph edges (from audit 001/002, for contrast) | **Yes** | — | — | **NOT R** (confirmed already in 001/002) |

## Query capability

`findPath(fromId, toId, maxDegrees=6)` (line 133) — real breadth-first search over the unified
`entityTopologyRegistry` adjacency map (both v1 and v2 write into it). Returns `{found, degrees,
path, hops}`, where each hop optionally carries `{type, source, directed}` via `typeForHop()` if
the hop came from a v2 typed edge, or `null` if it only exists as a v1 untyped cluster peer. This
is a genuine "is there a relationship path between these two entities, through what predicates"
query — not merely edge storage.

**Documented limitation, in the file's own comments (lines 120-128), not inferred:** v1 nodes
(plain names, e.g. `'NVIDIA'`) and v2 nodes (CIK-prefixed, e.g. `'CIK:0001893311'`) use different
identity schemes and do not currently bridge — a path crossing from a v1-only entity to a v2-only
entity will not be found even if a real relationship exists, unless some edge happens to key both
ends consistently.

## Consumption (confirmed live callers, static-import grep)

| Caller | Function used | Confirmed live? |
|---|---|---|
| `secownershipconnector.js:71` | `registerOwnershipEdge` | **Y** — a real connector, sourced from actual SEC Schedule 13D/13G filing data, writes real typed ownership edges |
| `chokepointedges.js:90` | `registerTypedEdge` (direct) | **Y** |
| `crediff.js`, `causalimpactmap.js`, `surfacerouter.js`, `supplychainconnector.js`, `patentsviewconnector.js` | Import the module; exact functions called not individually verified in this pass (scope: confirm R exists and is wired, not full-trace every consumer) | Y for import, UNVERIFIED for which specific functions each calls |
| Any consumer of `findPath` | **NOT FOUND** — zero callers of `findPath(` anywhere outside `entitytopologyregistry.js` itself | **N** — the query function is built but not confirmed consumed anywhere |

## Closure assessment

**GAP NOT CONFIRMED — R exists, live, and is being written to by a real regulatory-filing
connector today.** This directly overturns the A1/A2-only conclusion ("R — NOT FOUND anywhere
audited so far"), which was accurate *for the two files audited at the time* but did not extend
to this cluster.

What genuinely is a gap, stated precisely:

1. **v1/v2 identity-scheme bridging** — documented by the source itself as unresolved (lines
   120-128). Not every entity pair can currently be pathed even if a real relationship exists.
2. **`findPath` has no confirmed consumer** — the traversal capability exists but isn't yet
   surfaced anywhere else in the codebase by static grep.
3. **Predicate vocabulary is ad hoc** — only one `type` value (`'BENEFICIAL_OWNER_OF'`) was found
   in use; there is no enumerated/closed predicate set (`𝑃` in Lean-Ontology terms) — any string
   can be passed as `type`.
4. **No temporal-validity window on edges** — `ts` is a single creation timestamp, not a
   `valid_from`/`valid_to` pair; an edge that becomes stale or is superseded has no representation
   for that in this file.

**Verdict: PARTIAL-TO-STRONG match.** The core shape rc3 asks for — directed, typed, sourced,
timestamped relationships between real-world objects, with real evidence behind at least one edge
type — already exists and is live. The gaps are refinements (identity bridging, predicate
vocabulary, temporal validity), not "build R from nothing."
