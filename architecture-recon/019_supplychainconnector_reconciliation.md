# supplychainconnector.js — Reconciliation

Status: Bin-1. Full file read (130 lines, complete) plus a live-dependency check
(`registerChokepointEdges()`). No code changed.

## Finding 1 — this connector is R read-only, not an R producer

Audit 015 classified it as "R write via `entitytopologyregistry.js`." **Incorrect** — grep
for `registerTypedEdge`/`registerOwnershipEdge`/`registerInventorMigrationEdge` inside this
file returns nothing. Its only interaction with `entitytopologyregistry.js` is:
```
import { entityTopologyRegistry } from '../entitytopologyregistry.js';
function getTrackedEntities() { return Object.keys(entityTopologyRegistry); }
```
It reads the v1 flat adjacency map to decide which entities to check for supply-chain
disruption, and reads each entity's peer list (`entityTopologyRegistry[entityId]`) to attach
as `topology` on the dispatched signal. **It never registers an edge.** Its role is R
*consumer* (topology-aware signal dispatch), not R producer — the same general shape as how
a σ/signal consumes G_W, not how R itself gets written.

## Finding 2 — its input (`entityTopologyRegistry`) IS populated live, by a different file

`getTrackedEntities()` would return `[]` if nothing populates `entityTopologyRegistry`. Both
candidate writers found in audits 004/015/018 are inert (`secownershipconnector.js` — zero
callers; `patentsviewconnector.js` — disabled). But **`chokepointedges.js`'s
`registerChokepointEdges()` is called live**: `app.jsx:901`, `useEffect(() =>
{ registerChokepointEdges(); }, [])` — mount-only, not on the interval cycle. That function
registers the file's own hand-curated, source-cited dependency facts (Visa, Mastercard,
Cloudflare, etc. — real SEC CIKs, `source: 'DOMAIN_DEP_FACT'`) into `TYPED_EDGES` *and* the
v1 flat registry (`registerTypedEdge`'s existing backward-compat write, confirmed in audit
004). **So `entityTopologyRegistry` is genuinely non-empty in production — just not from
either of the two connectors that look like its obvious source.**

## Corrected classification

| Question | Answer |
|---|---|
| Imported by `app.jsx`? | Yes |
| Invoked (mount + interval)? | Yes — 2 real call-sites |
| Writes R edges itself? | **No — read-only consumer** |
| Its R input populated live? | **Yes — via `chokepointedges.js`, mount-only, a third file entirely** |
| Evidence level | **VERIFIED** (full file read + confirmed live dependency) |
| Status | **Active R consumer, correctly wired to a live (if indirect) R source** |

## What this means for the adoption map

This is the first confirmed **live O/E/R substrate → σ-shaped signal consumer** path found
in any audit this session — `chokepointedges.js` (R producer, real sourced facts) →
`entityTopologyRegistry` (the substrate) → `supplychainconnector.js` (reads it, dispatches
signals). It doesn't touch `gwrealiser.js`/`sigmaengine.js` (no G_W/Σ involved — it reads
the v1 flat registry directly, not through this session's virtual-snapshot layer), but it
demonstrates the *shape* of consumption the Lean σ role is meant to formalize already
exists informally in production.

## Status

Gate: **VERIFIED — active R consumer, not a producer; its actual R source (`chokepointedges.js`) identified and confirmed live.** No wiring performed.
