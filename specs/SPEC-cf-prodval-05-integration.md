# CF Production-Readiness — WS5: KRYLO Integration Boundary

**Status:** BUILT + VALIDATED (`qa_cf_integration.mjs`, 2026-09-02). Branch only. **Not wired into
the live render tree.** No merge/deploy.
**Executes:** WS5 — *only after WS4 telemetry exists* (it does). Parallel async CF producer,
read-only pool tap, persistent pathway construction, independent FormationCandidate, distinct
labelled render slot, **zero replacement** of the synchronous path.
**Preserves:** INV-006, CF §2.1 (CF runs *beside* the synchronous path), CF-006 (candidate ≠
admitted).

## 1. The components

| file | role |
|---|---|
| `src/engine/cf/producer.js` | the parallel async producer — subscribes to the pool tap, enqueues, runs the formation pass on `tick()` (telemetered analytical work), stores one pre-computed `_latestCandidate` |
| `src/engine/cf/read.js` | the **only** CF module a render path may import — pure O(1) read accessors (`getCFFormation`, `producerState`) |
| `src/components/analysis/cffield.jsx` | the distinct labelled render slot — reads `getCFFormation()`, renders "COGNITIVE FABRIC READ". **Not imported by any parent yet** (WS6 deliverable) |
| `qa_cf_integration.mjs` | WS5 validation |

## 2. The boundary

```
connectors → dispatchBatch → subsignalbuffer.append ──(sync, publish path)──→ existing consumers
                                        │
                                        └─ subsignalbuffer.subscribe(fn)   ← CF producer taps here
                                             fn(rec): _pending.push(rec)     (enqueue ONLY — INV-006)

                          ─────────── separate, scheduled ───────────
CF producer.tick()  →  ingest(→pathwaystore)  →  inferFormation(admissibleParticles())  →  _latestCandidate
                       [ all wrapped in telemetry.recordAnalytical / recordIO ]

render:  cffield.jsx → cf/read.getCFFormation()  →  _latestCandidate   (O(1), no work)
```

The synchronous path — `inferFormation(field.particles)` at `targetpacket.jsx:333`,
`analysisfield.jsx:546`, `formationprospectusproducer.js` — is **untouched and authoritative for
02 FORMATION**. CF produces a *separate* `CF_FORMATION_CANDIDATE` object, never overwriting it.

## 3. What was validated

### Zero replacement — structural
- None of the 3 synchronous call sites imports any CF module.
- `targetpacket.jsx` still calls `inferFormation(field.particles)` — unchanged.
- `cffield.jsx` is not wired into any parent.
- `cffield.jsx` imports **only** `cf/read.js` (enforced by `qa_cf_telemetry.mjs` + `qa_cf_integration.mjs`).

### Read-only pool tap — INV-006
- The producer subscribes to `subsignalbuffer` (a tap whose own doctrine forbids
  "filtering, weighting, scoring").
- The subscribe callback **only enqueues** — 5000 appends → 5000 pending, 0 processed synchronously.
- Append latency with the CF subscriber attached is **not materially higher** (2.34 ms → 1.57 ms
  for 5000 appends) — no analytical work on the signal-publish path.
- Analytical work happens **only** on `tick()`.

### Independent candidate — no cross-mutation
- The CF candidate is a distinct object `kind: 'CF_FORMATION_CANDIDATE'` with `label:
  'COGNITIVE FABRIC READ'`.
- It is a different object from the synchronous `inferFormation()` result — no shared reference.
- `getCFFormation()` is O(1): 200k reads in ~1 ms — safe to call from a render path.

## 4. Reference continuity from real signals (WS1 applied)

`producer.toParticle(rec)`:
- **Tier A:** records sharing a `canonicalEventId` (WO-2004) → `lineageKey = evt:<id>` → EXTEND
  one pathway (fanout siblings).
- **default:** `lineageKey = <source>:<domain>` — one monitoring stream per connector+domain (a
  connector re-polling a domain is one lineage; decoy-safe). **Never** keyed on entity/subject
  alone (X3 §3.5).
- `confidence > 1 ? /100` — DEFECT-WO1-CONF tolerance.

## 5. Remaining before WS6

- Wire `cffield.jsx` into a parent (a distinct section, not inside 02 FORMATION) — **a WS6
  deliverable, gated on the Founder production-integration ruling.**
- Decide the `tick()` scheduler (server cron / a bounded interval / demand-driven) — infra.
- Re-run `qa_cf_telemetry.mjs` against real connector I/O timings (the offline numbers are µs).
- Lazy-load the analytical chunk if bundle size matters (build concern, not INV-006).

## 6. Files

`src/engine/cf/producer.js`, `src/engine/cf/read.js`, `src/engine/cf/telemetry.js` (WS4),
`src/engine/cf/pathwaystore.js` (`_io` counters), `src/components/analysis/cffield.jsx`,
`qa_cf_integration.mjs`.
