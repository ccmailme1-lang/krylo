# CF WS6 Gate 3 — Real-I/O Telemetry — RESULT

**Ticket:** KRYL-1259 · **Branch:** `cf-canonical-substrate-experiment` @ `c488d5d` (+ held IS-4 diff)
**Window:** 2026-09-03 16:43:34Z → 16:55:50Z (12 min, 36 samples @ 20 s)
**Method:** the running branch on `localhost:5173`, both dev gates bypassed, page held open in a
headless browser. Every 20 s: `import('/src/engine/cf/read.js')` + `pathwaystore.js` in page
context → `getCFFormation()`, `producerState()`, `pathwayCount()`, `ioCounters()`,
`serialize()`. All `/api/*` traffic + console captured. No fixture data, no synthetic replay.
Raw: `specs/cf-gate3-live-window-raw-20260903.json`.

---

## Result: **Gate 3 — OPEN: criterion 3 outstanding.**

Criteria 1, 2, 4 are MET under live connector load (evidence below — valid, not to be rerun).
Criterion 3 (guest p95 latency measured against the real render tree under the actual live
load) is a **hard acceptance requirement** and was **not instrumented** this window.

**Gate 3 ≠ PASS. WS6 exit ≠ authorized. Production-integration ruling ≠ authorized** — until
guest p95 latency under the actual live load is measured and accepted against the
integration-gates threshold.

Owed: instrument the guest-facing signal→normalize→publish→render path, rerun the live window
(live connectors, CF on the daemon beat, sufficient duration for a meaningful percentile), and
compare guest p95 with vs. without CF under the same live load. No substitution of the WS4
synthetic-load telemetry result; no inference from "zero CF faults" or frame-rate.

---

## Acceptance contract (SPEC-cf-prodval-06 §Gate 3)

| # | Criterion | Result |
|---|---|---|
| 1 | `objects examined/written` track real `dispatchBatch` volume | **MET** — `io.examined` 0 → 391 over the window, tracking live `/api/signals` + WO-1874 connector dispatch; `io.written` = 34 (17 pathways, deduped by lineage) |
| 2 | `processingTime` reflects real `inferFormation(admissibleParticles())` cost at real pool sizes | **MET** — CF `tick()` ran on the 30 s daemon beat (`cfProducerTick()` in `daemon.js` `runCycle` finally); the `_pending` queue reached ~12 843 real records/cycle and drained each tick; no `[CF] producer tick fault` in 12 min |
| 3 | guest p95 latency measured against the real render tree stays flat while real connector volume varies | **MEASURED 2026-09-03, criterion NOT yet cleanly satisfied.** See "Criterion 3 measurement" below — supporting evidence that CF does not move guest latency, but not a clean PASS (headless software WebGL, not the real GPU render tree; imperfect CF-off control). Owed: a run on real rendering hardware with a clean CF-disabled control. |
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

---

## Criterion 3 measurement — guest p95 latency under live load (2026-09-03)

**Instrumentation added:** `recordGuest()` wired around the guest ingest→render unit in
`src/app.jsx` — `perceptionFrame = recordGuest(() => hydrateSignalsToFrame(liveSignals))` and the
`activeCones` build. Pure `performance.now()` timing, no analytical call (INV-006). Feeds the
existing CF-004-MET-01 `series().guestLatency`.

**Method:** one live window, live connectors throughout. Phase A = CF running on the daemon beat
(Gate 2). Phase B = `stopCFProducer()`. 8 min/phase, ~6 000 frames/phase. Metrics: rAF
service time (guest render-tree cadence), long-animation-frame blocking, `series().guestLatency`,
and a **tick-aligned** split — frames ≤700 ms after a `cfProducerTick()` vs frames >2 s from any
tick. Harness `tests/e2e/cf-gate3-latency.spec.js`; raw `specs/cf-gate3-latency-raw-20260903.json`.

**Environment:** headless Chromium, software WebGL. Absolute frame times are inflated vs a real
GPU; the deltas (A vs B, near-tick vs far-tick) isolate CF regardless of the baseline.

| metric | A (CF on, 17 ticks, io.examined +272) | B (CF off*) |
|---|---|---|
| frame service p50 / p95 / p99 | 56.9 / 218.6 / 453.8 ms | 46.6 / 183.4 / 414.4 ms |
| per-sample p95 (median / max) | 143.5 / 944.7 ms | 105.2 / 535.7 ms |
| **tick-aligned p95: near-tick vs far-tick** | **148.2 (n=146) vs 199.3 (n=5728)** | 160.8 (n=159) vs 167.9 (n=5839) |
| LoAF >100 ms (count / max) | 677 / 5475 ms | 920 / 6419 ms |
| MET-01 `guestLatency` p95 (n) | 9.1 ms (32) | 7.1 ms (12) |
| heap end | 131 MB | 131 MB |

\* Phase B "CF off": `stopCFProducer()` unsubscribes the tap, but the daemon still calls the
analytical `tick()` every 30 s (draining an empty queue). So B ≈ "CF ticking empty batches",
not "CF absent". Imperfect control.

**What the data shows:**
- **No CF-tick-correlated guest jank.** Frames within 700 ms after a `cfProducerTick()` are **not
  slower** than frames far from any tick — in both phases, including under real CF load in A
  (near-tick p95 148 ms < far-tick p95 199 ms). Direct evidence consistent with INV-006: the
  synchronous analytical pass on the daemon beat does not block the guest render frame.
- **MET-01 `guestLatency` (the timed ingest→render unit) is <10 ms in both phases** — CF does not
  inflate it.
- **A vs B aggregate is inconclusive.** A frame p95 is 35 ms above B, but: A p90 is *below* B p90;
  B had *more* severe long frames (>100 ms: 920 vs 677); the baseline is extremely noisy (p99
  ~450 ms, max >5 s in **both** phases); B's control was imperfect; and A ran first, with an
  escalating-jank pattern within each phase. The 35 ms is within that noise, not a clean signal.
- **Pre-existing, CF-independent:** guest frame latency in this environment is badly degraded
  (p95 ~200 ms, LoAF events to 6.4 s) with CF on *and* off — most likely the `/api/signals` pool
  (~12 843 records) rebuilding `liveSignals` / `perceptionFrame` / `activeCones` + a full cone
  re-render synchronously, plus the SSE stream. CF's telemetry made this visible; it is not
  caused by CF.

**Verdict — criterion 3 NOT cleanly met.** The tick-aligned and MET-01-unit evidence supports
"CF does not move guest latency", but a Gate-3 PASS requires the measurement against **the real
render tree** (real GPU, not headless software WebGL) with a **clean CF-disabled control** (stop
the daemon's `cfProducerTick()` call, not just the subscription) and a stable enough baseline to
assert "flat". Still owed.

---

## WS6 gate status after this window

| Gate | State |
|---|---|
| Gate 2 — scheduler | CLOSED |
| Gate 1 — render integration | CLOSED |
| Gate 3 — real-I/O telemetry | **OPEN — criteria 1/2/4 met under live load; criterion 3 (guest p95 latency under live load) OUTSTANDING** |

Gate 3 does not pass and WS6 does not exit until criterion 3 is measured and accepted. No
production-integration ruling. No merge, no deploy.
