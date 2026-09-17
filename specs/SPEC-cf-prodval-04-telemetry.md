# CF Production-Readiness — WS4: CF-004-MET-01 Telemetry & INV-006

**Status:** BUILT + VALIDATED (`qa_cf_telemetry.mjs`, 2026-09-02). Branch only. No merge/deploy.
**Executes:** WS4 — *"build the CF telemetry module before WS5 wiring."*
**Preserves:** CF-004-INV-006 (guest-path non-interference), CF-004-MET-01 (independent
measurability).

## 1. The telemetry module — `src/engine/cf/telemetry.js`

Bounded ring buffers, zero dependencies, no I/O. Captures the four MET-01 series **independently**:

| series | source | mechanism |
|---|---|---|
| guest-facing end-to-end latency | `recordGuest(fn)` | times a guest unit of work |
| analytical queue delay | `recordAnalytical(op, fn, {enqueuedAt})` | `start − enqueuedAt` |
| analytical processing time | `recordAnalytical(op, fn)` | `end − start` |
| state objects examined / written | `recordIO(pathwaystore.ioCounters())` | counters in `pathwaystore.ingest` (`written`) and `admissibleParticles` (`examined`) |

`series()` → `{ guestLatency, queueDelay, processingTime, objects }` with `p50/p95/max/mean/n`.

The guest recorder and the analytical recorder are **separate call paths** — recording one never
invokes the other.

## 2. INV-006 — now measurable, not just asserted

### (a) Structural isolation — VALIDATED

`qa_cf_telemetry.mjs` greps the tree:
- **no `.jsx` render module imports `engine/cf/*`** — the CF substrate has zero guest-path
  consumers today;
- **no `engine/cf/*` module imports a `.jsx` render module**;
- `cf/telemetry.js` is imported by no render module.

### (c) No on-demand analytical execution from rendering — VALIDATED

The harness's guest unit of work (`guestUnit`) calls **zero** CF functions. This is the shape
WS5 must preserve: guest rendering consumes already-computed state, never triggers a CF pass.

### MET-01 — guest latency flat under load — VALIDATED

Load sweep 10 → 5000 pathways:

| load | analytical proc p50 | objects examined | guest p95 |
|---|---|---|---|
| 10 | 0.045 ms | 10 | 0.0041 ms |
| 100 | 0.050 ms | 100 | 0.0029 ms |
| 1000 | 0.31 ms | 1000 | 0.0034 ms |
| 5000 | 1.48 ms | 5000 | 0.0029 ms |

Analytical processing time grew **176×** (0.58 → 101 ms total per pass); objects examined grew
**500×**; **guest p95 latency did not move** (0.0041 → 0.0029 ms, within noise). The falsifiable
MET-01 claim holds for the offline substrate.

## 3. What WS5 inherits

- The async CF loop MUST wrap its work in `recordAnalytical(...)` and report `recordIO(...)` each
  pass.
- The guest-path render slot for the CF FormationCandidate MUST read a pre-computed value; if a
  future change makes it call any `engine/cf/*` function synchronously, `qa_cf_telemetry.mjs`
  invariant (a) fails and blocks.
- Production wiring must re-run this harness against real connector I/O timings before the WS6
  gate (the offline numbers are µs-scale; real connector latency is the dominant term and must be
  measured, not modelled — CF-008 §ΔC note).

## 4. Files

- `src/engine/cf/telemetry.js` — the module.
- `src/engine/cf/pathwaystore.js` — `_io` counters + `ioCounters()`.
- `qa_cf_telemetry.mjs` — WS4 validation harness.
