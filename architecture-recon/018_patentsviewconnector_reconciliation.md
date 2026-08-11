# patentsviewconnector.js — Reconciliation (Correction to audit 015)

Status: Bin-1. Full file read (263 lines, complete). No code changed.

## Finding

`runPatentsViewSync()` (line 244): `if (!PATENTSVIEW_ENABLED) return [];` — **`PATENTSVIEW_ENABLED = false`** (line 241), with the reason stated directly in the source: the legacy PatentsView API was decommissioned, its replacement is key-gated and CORS-blocked from the browser, every fetch fails, and it floods the console. "Disabled until a server-side proxy exists — 2026-07-11."

`registerInventorMigrationEdge()` (the R-write into `entitytopologyregistry.js`) lives inside `buildMigrationSignals()`, which is only ever reached from `runPatentsViewSync()`'s `Promise.allSettled([...])` call — which itself is unreachable because of the early return above it.

## Corrected classification

| Question | Answer |
|---|---|
| Imported by `app.jsx`? | Yes |
| Invoked (mount + interval)? | Yes — 2 real call-sites, confirmed |
| Ontology-producing path (`registerInventorMigrationEdge`) executes? | **No** |
| Evidence level | **VERIFIED** (full file read, the disabling condition is explicit and unconditional) |
| Status | **Disabled / non-producing** |

## Correction to audit 015

Audit 015's table listed this connector as "R write via `entitytopologyregistry.js`" with "Touches Lean substrate: N — not yet run through gwrealiser/sigmaengine," implying the R-writing behavior itself was live and simply unconnected to the newer Σ machinery. **That was wrong at an earlier link in the chain: the R-writing code never runs at all under the current flag state.** The correction is recorded here rather than silently edited into 015 — 015 itself gets a formal correction note in the same pass as the supply-chain finding (audit 019), not patched piecemeal.

## Status

Gate: **VERIFIED — disabled/non-producing.** Not a wiring task, not a Bin-3 item — it's an existing, dated, explained product/infrastructure decision (needs a server-side proxy) unrelated to ontology adoption.
