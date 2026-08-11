# Active Runtime Inventory — Knowledge-Creating/Reading Paths

Status: Bin-1 discovery only. No wiring performed in this pass. Evidence Standard identical
to 001-004/012 (NOT FOUND / UNVERIFIED / INFERRED, everything cited).

Gate status: **IN PROGRESS — Bin-1 active-runtime inventory.**

### CORRECTION (post-018/019) — evidence-level discipline added

This document's original pass classified connectors from **lexical evidence only** (does
the file import a given store, is its entry function called 2x in `app.jsx`) and presented
that at the same confidence as the fully-read reconciliation docs (001-004, 012, 016, 017).
That was a real process gap: import-presence + call-count proves a file is *wired in*, not
that its ontology-relevant code path *executes*. Two rows were wrong as a result — corrected
below, with the audit that corrected them cited, per this rule:

> **Lexical presence establishes possibility. Full-path execution establishes participation.**

Evidence-level scale used from here forward, in this document and future ones:

| Level | Meaning |
|---|---|
| **VERIFIED** | Full relevant execution path read, behavior demonstrated |
| **PARTIALLY VERIFIED** | Relevant implementation read, but runtime execution/activation not demonstrated |
| **UNVERIFIED** | Import/call-site evidence only |
| **DISABLED/INACTIVE** | Invocation exists, but execution is explicitly prevented |
| **N/A** | Does not participate in O/E/R |

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

| Connector | Imported | Invoked | Frequency | Produces | Authoritative store | πΣ/evidence linkage | Touches Lean substrate | Evidence level |
|---|---|---|---|---|---|---|---|---|
| `edgar8kconnector.js` | Y | Y | mount + 5min interval (`app.jsx:807,812`), then chains `runEdgar8KSignalSync()`→`runEdgar8KEvidenceSync()`→`runCIPipelineOnRKM()` | O read (`resolveEntity`) + `RealityObject(EVENT)` write | `rkmstore.js` | `evidence[]` (real, per-item) | **Y — this session** (`gwrealiser`/`sigmaengine`/`ProvenanceDAG`, commits `52f022f`/`bfcde06`) | **VERIFIED** |
| `edgar8ksignal.js` | Y | Y | chained after `edgar8kconnector.js`, same cadence | reads `rkmstore.js` (`getById`) | `rkmstore.js` (read-only) | N/A — signal dispatch, not O/E/R | N | PARTIALLY VERIFIED (shape read for audit 016 cross-check, not full-file) |
| `edgar8kevidence.js` | Y | Y | chained after `edgar8kconnector.js`, same cadence | writes via `identitykernel.js` (`createEvidenceNode`/`createCanonicalEvent`) AND reads `rkmstore.js` (`getById`) | **WO-2004, with real deterministic identityId — see audit 017** | Real — `evidence[]`-equivalent via `EvidenceNode`s | N (not yet run through `gwrealiser`/`sigmaengine`; feeds WhyTrace/SCI-CONFIRMATION instead — real, just a different live path) | **VERIFIED — full read, audit 017** |
| `cipipelinerun.js` (`runCIPipelineOnRKM`) | Y | Y | chained after `edgar8kconnector.js`, same cadence | reads all live `rkmstore.js` objects (`listAll()`), runs `cifengine.expandCI()` → `cirgate.validateGraph()` → `rbcsengine.scoreAdmitted()` per object | own isolated ring buffer (`_runs`, `window.__KRYLO_CI_PIPELINE_RUNS__`) | Its own — M4 projection layer, not Σ-shaped, confirmed non-competing | N (correctly so — different role, see audit 016) | **VERIFIED — full read, audit 016** |
| `patentsviewconnector.js` | Y | Y | mount + interval (`app.jsx:787,820`), `.catch(()=>{})` | **CORRECTED (audit 018): `PATENTSVIEW_ENABLED = false` — the R-write path (`registerInventorMigrationEdge`) never executes** | N/A — disabled | N/A | N | **DISABLED/INACTIVE — was previously miscategorized as a live R producer** |
| `supplychainconnector.js` | Y | Y | mount + interval (`app.jsx:786,819`), `.catch(()=>{})` | **CORRECTED (audit 019): R read-only, never writes an edge.** Reads `entityTopologyRegistry` for topology-aware signal dispatch. Its actual R source is `chokepointedges.js`'s `registerChokepointEdges()` (`app.jsx:901`, mount-only) — a third file entirely | `entitytopologyregistry.js` (read) | N/A — signal dispatch | N | **VERIFIED — full read + live-dependency confirmed, audit 019** |
| `secownershipconnector.js` | **N — zero import in app.jsx** | **N — zero callers anywhere in `src/`** | — | R write via `entitytopologyregistry.js` | `entitytopologyregistry.js` | Edge fields + this session's Σ wiring | Y (tested only, commit `52f022f`) — **but dead code, per audit 004/011** | VERIFIED (dead-code status) |
| `chokepointedges.js` (`registerChokepointEdges`) | Y | Y | **mount-only** (`app.jsx:901`, no interval) | R write — real, sourced, curated dependency facts (Visa, Mastercard, Cloudflare, etc.) | `entitytopologyregistry.js` | Edge `source: 'DOMAIN_DEP_FACT'` | N — not yet run through `gwrealiser`/`sigmaengine` | **VERIFIED — confirmed live, audit 019** |
| `capitalrealizationconnector.js` | via `topicconnectors.js`, not app.jsx directly | Y — `topicconnectors.js` is imported by both `app.jsx` and `analysisidlefield.jsx` | **Query-driven, not scheduled** — `runCapitalRealizationSync(query)` takes a query param; fires on user query, not mount/interval | O read (`entityresolution.js`) | `entityresolution.js` (read-only) | N/A | N |
| `edgarnarrativeconnector.js` | **N — zero import in app.jsx** | **N — zero callers anywhere in `src/`** (`runEdgarNarrativeCapture`/`runEdgarPressReleaseCapture` both unreferenced) | — | Would read O (`entityresolution.js`) if called | `entityresolution.js` | N/A | N — **fully dormant** |

## Flags — RESOLVED (originally raised here, closed by later audits)

**1. `edgar8kevidence.js` — RESOLVED by audit 017.** Real, deterministic `identityId`;
confirmed live consumer feeding WhyTrace (shipped UI) and WO-2005B's SCI-CONFIRMATION.
Atomic-grain duplication with RKM's `RealityObject` exists but is currently non-harmful
functional separation (different downstream consumers). See 017 for full detail.

**2. `cipipelinerun.js`/`cifengine.js`/`cirgate.js`/`rbcsengine.js` — RESOLVED by audit 016.**
Confirmed live, confirmed to read the same RKM data, confirmed to build its own structure —
but that structure is an M4 speculative-projection tree (confidence explicitly decays per
hop), not an M3 Σ. Not a competing authority. See 016 for full detail, including the finding
that its genealogy-based deep expansion is currently dead weight (same root cause as
`genealogy` being `{}` in production, audit 012).

## Summary against the requested columns

| Question | Answer |
|---|---|
| What actually runs | 20 of 21 app.jsx-imported connectors are live (mount+interval); `capitalrealizationconnector.js` is query-driven via `topicconnectors.js`; `secownershipconnector.js`/`edgarnarrativeconnector.js` are dead code despite touching O/R stores; `patentsviewconnector.js` is invoked but disabled at the entry point |
| Invocation frequency | mount + 5-minute interval for the EDGAR 8-K chain (4 functions fire together); mount + interval for supplychain (read-only); **mount-only** (no interval) for `chokepointedges.js`'s real R write; query-driven for capitalrealization |
| Dead/dormant/disabled code | `secownershipconnector.js`, `edgarnarrativeconnector.js` — zero live callers. `patentsviewconnector.js` — invoked but disabled (`PATENTSVIEW_ENABLED = false`) |
| Where output goes | `rkmstore.js` (edgar8k chain), WO-2004 (`edgar8kevidence.js` → WhyTrace/SCI-CONFIRMATION), `entitytopologyregistry.js` (write: `chokepointedges.js` only; read: `supplychainconnector.js`), `entityresolution.js` read-only (capitalrealization/edgarnarrative) |
| Whether the path already touches the Lean substrate | Only `edgar8kconnector.js`, as of this session's commits. `chokepointedges.js` writes real live R edges but has never been run through `gwrealiser`/`sigmaengine` |

## Status

Gate: **GREEN — inventory corrected and closed (audits 018/019 applied).** All flagged
parallel-authority questions from the original pass are resolved (017, 016). Remaining
open item for a future adoption pass, not started: `chokepointedges.js` is the one
confirmed-live R producer never yet run through the Lean substrate — same shape of gap
`edgar8kconnector.js` closed for the O/E side.
