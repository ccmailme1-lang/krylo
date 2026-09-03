# CF WS6 Gate 3 — Real-I/O Telemetry — RESULT

**Ticket:** KRYL-1259 · **Branch:** `cf-canonical-substrate-experiment` @ `c488d5d` (+ held IS-4 diff)
**Window:** 2026-09-03 16:43:34Z → 16:55:50Z (12 min, 36 samples @ 20 s)
**Method:** the running branch on `localhost:5173`, both dev gates bypassed, page held open in a
headless browser. Every 20 s: `import('/src/engine/cf/read.js')` + `pathwaystore.js` in page
context → `getCFFormation()`, `producerState()`, `pathwayCount()`, `ioCounters()`,
`serialize()`. All `/api/*` traffic + console captured. No fixture data, no synthetic replay.
Raw: `specs/cf-gate3-live-window-raw-20260903.json`.

---

## Result: **PASS** on the CF proposition — 3 of 4 acceptance criteria met; criterion #3 (guest-path latency under live load) not instrumented this window.

---

## Acceptance contract (SPEC-cf-prodval-06 §Gate 3)

| # | Criterion | Result |
|---|---|---|
| 1 | `objects examined/written` track real `dispatchBatch` volume | **MET** — `io.examined` 0 → 391 over the window, tracking live `/api/signals` + WO-1874 connector dispatch; `io.written` = 34 (17 pathways, deduped by lineage) |
| 2 | `processingTime` reflects real `inferFormation(admissibleParticles())` cost at real pool sizes | **MET** — CF `tick()` ran on the 30 s daemon beat (`cfProducerTick()` in `daemon.js` `runCycle` finally); the `_pending` queue reached ~12 843 real records/cycle and drained each tick; no `[CF] producer tick fault` in 12 min |
| 3 | guest p95 latency measured against the real render tree stays flat while real connector volume varies | **NOT MEASURED** this window — the harness did not capture guest-path latency. Structural non-interference is established (Gate 1: `cffield.jsx` imports only `cf/read.js`, O(1); analytical `tick()` only from `daemon.js`). A live before/after latency profile is still owed. |
| 4 | provenance: each CF pathway's `source` traces to a real connector id, not `'fixture'` | **MET** — all 17 pathways carry real connector source ids: `treasury`, `bls`, `worldbank`, `fred`, `fhfa`, `usgs`, `maersk`, `usaspending`, `fec`, `census` (×2), `economic_flow` (×6). Zero `fixture`. |

---

## The 10 objectives

1. **Live ingestion → CF pathway admission** — YES. 17 pathways admitted from live connector observations (via `/api/signals` + WO-1874 connectors self-dispatching to `surfaceRouter.dispatchBatch` → `subsignalbuffer` → CF tap).
2. **Multiple cycles → persistent pathway state** — YES. 17 pathways admitted by t+80 s and held **stable through t+700 s (11 min)** — `pathwayCount` never dropped.
3. **Referentially connected** — PARTIAL. The 6 `economic_flow:*` pathways were co-supported at ingestion; the other 11 (single external sources) were not referentially connected to each other.
4. **`getCFFormation()` produces a legitimate CF formation** — YES. At t+40 s: `CF_FORMATION_CANDIDATE` = **KNOWLEDGE + MEDIA + TECHNOLOGY** (3 domains), `reconstructable: true`. Present in 3 of 36 samples (t+40 s region).
5. **Grounded in live evidence, provenance reconstructable** — YES. `reconstructable: true`; the participating domains map to `p12_economic_flow:technology` (νₜ 0.56), `p14_economic_flow:knowledge` (νₜ 0.36), `p16_economic_flow:media` (νₜ 0.52) — the `economic_flow` connector pathways that still held support.
6. **Synchronous `02 FORMATION` untouched** — YES. `inferFormation` (module `formationinference.js`) remained importable/callable throughout (`syncFormationAvailable: true`); CF lives in `engine/cf/producer.js`, a separate module never imported by a render path.
7. **CF is a parallel read, not a replacement** — YES. Distinct `kind: "CF_FORMATION_CANDIDATE"`; produced by the async producer; never overwrites the synchronous result.
8. **No render-loop invocation** — YES. `producerState.scheduled: false` (no CF self-timer — Gate 2); every `tick()` fired from the daemon beat; no CF fault or render-path CF call in the console for 12 min.
9. **Timing/window + connector evidence captured** — YES. Raw JSON: 36 timestamped samples, 78 `/api/*` calls with status, full console tail.
10. **Result recorded** — this document.

---

## What the window showed about CF behaviour on live data

**The formation was transient (3 / 36 samples) — and that is the substrate working as designed.**
Every pathway shows `lastCorroboratedBatch: 0` — the WO-1874 connectors fire **once on mount**
(their real polling intervals are 10 min – 24 h), so no pathway was re-corroborated inside the
12-min window. The 11 external-source pathways decayed to `νₜ = 0`; the 6 `economic_flow`
pathways held `νₜ` 0.36–0.56. The KNOWLEDGE+MEDIA+TECHNOLOGY formation admitted while those
pathways were currently-supported, then was correctly **de-admitted** once support lapsed — the
X5 / IS-4 firewall (persistence ≠ current structural evidence) operating on live data.
Pathway **memory** persisted (17 held for 11 min); pathway **admission** did not, absent live
support. This is the FC-REQ-05 / X5 invariant, demonstrated live.

## Caveats (recorded, no interpretation)

- **FRED + Finnhub connectors returned HTTP 500 for the entire window** (50 calls, VPS `/api/fred`
  and `/api/finnhub` proxy not serving). CF's live data therefore came from `/api/signals`
  (14 × 200) and the WO-1874 connectors, **not** the FRED/Finnhub daemon path. Real connector
  data was exercised; the specific FRED/Finnhub route was not.
- Local mock/engine servers (`:3001`, `:4000`) were down for the window.
- Criterion #3 (guest-path latency under live load) was not instrumented — owed before WS6 exit.
- `producerState.pending` oscillated 0 ↔ ~12 843: `/api/signals` replays a large record history
  each cycle; `io.written` stayed 34 (correct lineage dedup) — not a leak, but the ingest volume
  per tick is high and worth a Founder note.

## WS6 gate status after Gate 3

| Gate | State |
|---|---|
| Gate 2 — scheduler | CLOSED |
| Gate 1 — render integration | CLOSED |
| Gate 3 — real-I/O telemetry | **PASS on criteria 1/2/4; criterion 3 (live latency profile) owed** |

WS6 exit / production-integration ruling is the Founder's call given criterion 3 is not yet
instrumented and the FRED/Finnhub connector path was 500 throughout. No merge, no deploy.
