# KRYL-1075: Temporal Observation Fabric (TOF)

**The substrate the RFA reasons over — not a reasoning engine.** Founder 2026-07-17. Status: slice 1
built (`temporalobservationfabric.js`); external feeds are follow-on WOs.

## Why

The invariance test (`causalepistemicstamp.invariance`, KRYL-1074) needs real state transitions.
- **Co-occurrence** — "did A and B appear together?" — weak; a chart alone proves nothing.
- **Temporal invariance** — "across changing environment states, what persists / disappears /
  inverts?" — the environmental VARIATION is the test. KRYLO needs the second.

Without negative states the system cannot separate `A causes B` from `A and B happened to be visible
at once`. Stage-3 EDL (absence testing) depends on it.

## Record contract (per Entity/Signal, per timestamp)

```
{ signal, ts, present: boolean, confidence, provenance, context }
```
`present` is an explicit boolean — never coerced. Unobserved stays unknown (§22: unobserved ≠ absent).

## Flow

```
external temporal datasets → Observation Normalizer (observe / observeRow)
                           → Temporal State Graph (buckets: ts → signal → state)
                           → recordForFactory → causalepistemicstamp.invariance() → CORROBORATED
```

## Invariance record (contemporaneous, same-bucket)

For α↔β, only buckets with EXPLICIT observations of BOTH contribute (unobserved β is skipped, never
counted as absent). Counts `{presentTotal, presentWithEffect, absentTotal, absentWithEffect}` feed the
strict biconditional in `invariance()`. (Time-lagged windows are a documented future refinement.)

## Doctrine rule (machine-testable, locked)

> KRYLO will not claim invariance without observed state transitions containing BOTH presence and
> absence counterstates.

Enforced in `buildInvarianceRecord`: if the present sample OR the absent sample is below the
counterstate floor (`DEFAULT_MIN_COUNTERSTATES`, a RUNTIME_POLICY — not a core invariant knob, §11a),
the record is **WITHHELD** (null) → the edge stays PROJECTED. Environmental variation is mandatory.

## Sources (follow-on ingestion WOs, §16 shared pool)

Gov/regulatory time series (EIA energy, grid load, gas storage, outages) — strongest; logistics/
infrastructure (port congestion, dwell, rail/truck); earth observation (weather, drought, seismic);
market microstructure (price + volume + liquidity + order imbalance + macro constraint — with care).
Requirement across all: they must record the NEGATIVE state (event did NOT happen), not only events.

## Definition of Done (slice 1 — DONE)

- `createFabric / observe / observeRow / buildInvarianceRecord / recordForFactory` — pure, tested.
- Wires into `stampChain(edges, { recordFor })`; a real invariant reaches CORROBORATED; a missing
  counterstate WITHHOLDS. 6 TOF + 20 regression tests pass; build clean.
- Follow-on: external dataset connectors (normalize → observe); optional time-lagged window model.
