# Active Runtime Inventory — Knowledge-Creating/Reading Paths

Status: Bin-1 discovery only. No wiring performed in this pass. Evidence Standard identical
to 001-004/012 (NOT FOUND / UNVERIFIED / INFERRED, everything cited).

Gate status: **IN PROGRESS — Bin-1 active-runtime inventory.**

## Method

`app.jsx` imports 21 connector entry points from `src/engine/connectors/`. Confirmed each
as imported-only vs. actually-invoked via grep for `functionName(` (real call sites, not
the import line). Cross-referenced all 32 connector files against the four O/E/R-relevant
stores (`entityresolution.js`, `entitytopologyregistry.js`, `identitykernel.js`,
`rkmstore.js`) to separate "touches knowledge/ontology" from "signal-only."

## Bucket 1 — Signal-only connectors (confirmed out of O/E/R scope)

24 of 32 connector files import none of the four O/E/R-relevant stores:
`arxiv, bls, census, companieshouse, economicflow, eia, eiatofadapter, fda, fec, fhfa,
financialmarket, fred, gdelt, github, maersk, networktopology, npm, openalex, pubmed,
reddit, treasury, usajobs, usaspending, usgs, wayback, worldbank`.

These dispatch normalized 0-100 signals via `surfaceRouter` per §16's shared pool contract
— a real, separate, already-established pipeline that never claimed to create/relate/
structure knowledge. **Correctly out of scope for O/E/R adoption — not a gap.** Most are
live (2 call-sites each, mount+interval, same pattern confirmed below for the in-scope
ones); liveness not individually re-verified per file since it doesn't change their
scope status.

## Bucket 2 — O/E/R-relevant connectors (the actual adoption surface)

| Connector | Imported | Invoked | Frequency | Produces | Authoritative store | πΣ/evidence linkage | Touches Lean substrate |
|---|---|---|---|---|---|---|---|
| `edgar8kconnector.js` | Y | Y | mount + 5min interval (`app.jsx:807,812`), then chains `runEdgar8KSignalSync()`→`runEdgar8KEvidenceSync()`→`runCIPipelineOnRKM()` | O read (`resolveEntity`) + `RealityObject(EVENT)` write | `rkmstore.js` | `evidence[]` (real, per-item) | **Y — this session** (`gwrealiser`/`sigmaengine`/`ProvenanceDAG`, commits `52f022f`/`bfcde06`) |
| `edgar8ksignal.js` | Y | Y | chained after `edgar8kconnector.js`, same cadence | reads `rkmstore.js` (`getById`) | `rkmstore.js` (read-only) | UNVERIFIED — not read in this pass | N |
| `edgar8kevidence.js` | Y | Y | chained after `edgar8kconnector.js`, same cadence | writes via `identitykernel.js` (`createEvidenceNode`/`createCanonicalEvent` — confirmed live consumer, audit 001) AND `rkmstore.js` (`getById`) | **Both WO-2004 and rkmstore — candidate bridge file, see flag below** | UNVERIFIED — not read in this pass | N |
| `cipipelinerun.js` (`runCIPipelineOnRKM`) | Y | Y | chained after `edgar8kconnector.js`, same cadence | reads all live `rkmstore.js` objects (`listAll()`), runs `cifengine.expandCI()` → `cirgate.validateGraph()` → `rbcsengine.scoreAdmitted()` per object | own isolated ring buffer (`_runs`, `window.__KRYLO_CI_PIPELINE_RUNS__`) | Its own — `expandCI` builds a "graph" (`graph.branchCount`), independent of `ProvenanceDAG`/πΣ | **N — see flag below, this is a parallel structure-building system** |
| `patentsviewconnector.js` | Y | Y | mount + interval (`app.jsx:787,820`), `.catch(()=>{})` | R write via `entitytopologyregistry.js` | `entitytopologyregistry.js` | Edge `source`/`ts` fields (pre-this-session shape) | N — not yet run through `gwrealiser`/`sigmaengine` |
| `supplychainconnector.js` | Y | Y | mount + interval (`app.jsx:786,819`), `.catch(()=>{})` | R write via `entitytopologyregistry.js` | `entitytopologyregistry.js` | Edge `source`/`ts` fields | N |
| `secownershipconnector.js` | **N — zero import in app.jsx** | **N — zero callers anywhere in `src/`** | — | R write via `entitytopologyregistry.js` | `entitytopologyregistry.js` | Edge fields + this session's Σ wiring | Y (tested only, commit `52f022f`) — **but dead code, per audit 004/011** |
| `capitalrealizationconnector.js` | via `topicconnectors.js`, not app.jsx directly | Y — `topicconnectors.js` is imported by both `app.jsx` and `analysisidlefield.jsx` | **Query-driven, not scheduled** — `runCapitalRealizationSync(query)` takes a query param; fires on user query, not mount/interval | O read (`entityresolution.js`) | `entityresolution.js` (read-only) | N/A | N |
| `edgarnarrativeconnector.js` | **N — zero import in app.jsx** | **N — zero callers anywhere in `src/`** (`runEdgarNarrativeCapture`/`runEdgarPressReleaseCapture` both unreferenced) | — | Would read O (`entityresolution.js`) if called | `entityresolution.js` | N/A | N — **fully dormant** |

## Flags — parallel-authority candidates surfaced by this inventory

**1. `edgar8kevidence.js` — touches BOTH `identitykernel.js` (WO-2004) and `rkmstore.js`.**
This is the one live file where WO-2004's `createCanonicalEvent`/`createEvidenceNode`
(audit 001's confirmed consumer) and RKM's `RealityObject` machinery coexist in the same
call path. Not yet read in this pass — this is the specific file to open next if WO-2004's
real live role (beyond `steeengine.js`'s narrow `computeVersionHash`-only usage, per audit
001) needs establishing. Flagged, not resolved.

**2. `cipipelinerun.js`/`cifengine.js`/`cirgate.js`/`rbcsengine.js` (WO-2053/2054/2055) is a
third parallel "expand evidence into a structure, validate it, score it" system —
independent of both `structuralconfirmation.js` (WO-2005B, audit 002) and this session's
`gwrealiser.js`/`sigmaengine.js`.** It is genuinely live, runs every single EDGAR sync cycle
(every 5 minutes per its own comment), directly on the same `rkmstore.js` RealityObjects
this session's Σ wiring also processes — chained in the exact same `.then()` block as
`runEdgar8KEvidenceSync()`. `expandCI()` builds something with a `branchCount` (graph-
shaped). This is the single most significant "competing authoritative representation" this
inventory found — three independently-built systems all answering some version of "take
evidence, build structure, score/confirm it," two of them (`cipipelinerun` and this
session's work) running on the identical live data, in the identical call chain, right now.
**Not reconciled in this pass — this is the next 012-style reconciliation document, not a
wiring task.**

## Summary against the requested columns

| Question | Answer |
|---|---|
| What actually runs | 20 of 21 app.jsx-imported connectors are live (mount+interval); 1 (`capitalrealizationconnector.js`) is query-driven via `topicconnectors.js`; `secownershipconnector.js` and `edgarnarrativeconnector.js` are dead code despite touching O/R stores |
| Invocation frequency | mount + 5-minute interval for the EDGAR 8-K chain (4 functions fire together); mount + interval independently for patentsview/supplychain; query-driven for capitalrealization |
| Dead/dormant code | `secownershipconnector.js`, `edgarnarrativeconnector.js` — both touch real O/R stores but have zero live callers |
| Where output goes | `rkmstore.js` (edgar8k chain), `entitytopologyregistry.js` (patentsview/supplychain/secownership), `entityresolution.js` read-only (capitalrealization/edgarnarrative) |
| Whether the path already touches the Lean substrate | Only `edgar8kconnector.js`, as of this session's commits. `patentsviewconnector.js`/`supplychainconnector.js` write real live R edges but have never been run through `gwrealiser`/`sigmaengine` |

## Status

Gate: **IN PROGRESS.** This is the inventory, not the reconciliation or the wiring. Two
concrete next steps identified, neither started: (a) read `edgar8kevidence.js` to establish
WO-2004's real live role, (b) reconcile the CI-F/CI-R/RBCS pipeline against
`gwrealiser`/`sigmaengine` the same way 012 reconciled `rkmstore.js` — that is the largest
remaining "parallel authority" question this inventory surfaced.
