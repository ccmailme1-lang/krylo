# CF Production-Readiness — WS6: Integration-Validation Gates

**Status:** WS6 OPEN — integration validation only (Founder, 2026-09-02).
**Constraints:** WS2–WS5 contracts immutable · no change to the 3 synchronous `inferFormation`
call sites · no change to admission semantics · no architectural refactor · no deployment.
Production integration accepted only after all three gates independently pass.

Order (Founder): **Gate 2 (scheduler) → Gate 1 (render wiring) → Gate 3 (real-I/O telemetry).**
Scheduler first so UI wiring never implicitly owns CF execution cadence.

---

## WS6 Scope Boundary — Structural Form Emergence (Founder, 2026-09-02)

> WS6 SHALL validate integration of the **existing CF substrate only**.
> WS6 SHALL NOT implement, infer, encode, or otherwise operationalize **Structural Form
> Emergence**.
>
> Structural Form Emergence is a separate normative contract governing abstraction across
> preserved Formations and SHALL be specified independently
> (`SPEC-structural-form-emergence.md`).
>
> WS6 SHALL preserve the ability of the substrate to retain individual Formations as distinct
> instances without requiring or introducing a predefined Structural Form.
>
> Closed-Loop Perception and Structural Form Emergence SHALL remain separate mechanisms. Neither
> SHALL be implemented as an interpretation of the other.

CF-002 is **not** modified to absorb Structural Form Emergence. Hierarchy:
`CF-002 → substrate/runtime contract → Formation → Closed-Loop Perception spec` (observation /
re-entry), and separately `Formation population → Structural Form Emergence spec`
(cross-instance abstraction).

---

## Gate 2 — `tick()` scheduler authority

### KRYLO's existing scheduling model (as-is)

| mechanism | what it drives | owner |
|---|---|---|
| `src/ingestion/daemon.js` — `startIngestionDaemon()` | 30 s `setInterval` cycle: fetch FRED/Finnhub → normalize → `dispatchToSubstrate` | infra module; started once from `app.jsx:774` in a mount `useEffect` |
| per-connector `setInterval` (× ~34) | each connector polls its own source, independently staggered | each connector |
| `surfacerouter` | reconciliation — **event/pressure-driven, no wall-clock** | router |

There is **no single central connector scheduler**. The ingestion daemon is the closest thing to
an *authoritative ingestion pulse*.

### Options for CF `tick()` cadence

| # | scheduler | INV-006 | cadence owner | notes |
|---|---|---|---|---|
| A | **end of `daemon.js` `runCycle()`**, after `dispatchToSubstrate` | ✓ — runs after the ingestion cycle, not on a render path | **infra (`daemon.js`)** | CF processes whatever the pool tap captured that cycle; no new timer; 30 s beat = ingestion beat |
| B | dedicated `setInterval` inside `producer.js` (`startCFProducer({tickMs})`) | ✓ | **producer (self-owned)** | another timer; "built ≠ wired" risk; cadence authority sits in CF, not infra — Founder flagged this as undesirable |
| C | debounced off the `subsignalbuffer` subscription (`queueMicrotask` / `setTimeout(0)` after a burst settles) | ✓ if the debounce fires outside the `append` stack | tap-driven | naturally backpressure-aware; no polling; but the debounce timer still needs an owner |
| D | `requestIdleCallback` | ✓ by construction (yields to rendering) | browser idle | browser-only; unbounded delay under sustained load; not available server-side |
| E | UI-mounted interval (a component `useEffect`) | ✗ risk — UI owns cadence | **UI** | **rejected** — exactly what the Founder said not to do |

### Gate 2 — DECISION: ACCEPT / Option A (Founder, 2026-09-02)

> **Gate 2 is OPEN as an architectural decision, not as authorization to modify runtime wiring.**

**CF cadence invariant (LOCKED):**

> CF cadence SHALL be derived from the authoritative ingestion cadence
> (`daemon.js` → `dispatchToSubstrate()` → `cfProducerTick()`). CF SHALL NOT establish an
> independent execution clock.

Disposition: **A ACCEPT** · B reject (CF becomes its own scheduler) · C reject (implicit/unowned
cadence) · D reject (browser execution semantics) · E reject (UI lifecycle owns analytical
execution).

The `daemon.js` edit (`import + cfProducerTick()` after `dispatchToSubstrate`) is **not** made
now — it is applied only when **Gate 1** is authorized. SF-001 (Structural Form Emergence) SHALL
NOT enter the Gate-2 implementation.

**Option A — the ingestion daemon's cycle is the authoritative CF scheduler.**

- `daemon.js` gains one call: `cfProducerTick()` at the end of `runCycle()`, after
  `dispatchToSubstrate(merged)`. (One import + one line — inside the WS6 "no refactor" bound;
  applied only when Gate 1 wiring is authorized.)
- CF cadence = ingestion cadence = 30 s, owned by `daemon.js` (infra), not the UI, not the
  producer.
- `producer.startCFProducer({ tickMs })` keeps its self-timer option **for tests and a future
  server context only** — not used in the app.
- Server-side equivalent (if CF ever runs off the client): a cron / scheduled job calls
  `producer.tick()` — same principle, infra owns the cadence.

**Not chosen:** B (CF owns its own cadence), C (adds an unowned debounce), D (browser-only,
unbounded), E (UI owns cadence — rejected).

### Gate 2 acceptance

- [x] Founder confirms Option A (2026-09-02) — ingestion cadence is the authoritative CF clock;
      no independent CF timer.
- [x] The scheduler is a named infra module (`src/ingestion/daemon.js`), documented here — not
      the UI, not `producer.js`'s self-timer. Applied in commit `96cc387`:
      `startCFProducer({ tickMs: null })` at daemon start, `cfProducerTick()` in `runCycle()`'s
      guarded `finally` block, `stopCFProducer()` in `stopIngestionDaemon()`.
- [x] `producer.tick()` remains idempotent per drain and telemetered (`recordAnalytical`) — met.

**Gate 2 — CLOSED (2026-09-02).** Architectural decision (Option A) confirmed and the wiring is
on the branch. This is not merge/deploy authorization.

---

## Gate 1 — render integration (BLOCKED on Gate 2)

Wire `cffield.jsx` into a parent as a **distinct section, not inside 02 FORMATION**. Verify:
- `cffield.jsx` still imports only `cf/read.js` (`qa_cf_telemetry.mjs` + `qa_cf_integration.mjs`
  enforce this);
- the CF read surface stays O(1) on render (no `tick()` from a render path);
- the 3 synchronous call sites remain byte-identical;
- the CF section is visually and semantically distinct (label "COGNITIVE FABRIC READ", the
  `CF_FORMATION_CANDIDATE` kind).

Parent candidate: a new section in the Target Packet **after** `05 PROVENANCE`, or a HUD slot —
Founder's call on placement. Not decided here.

### Gate 1 acceptance — DONE (2026-09-02, commit `96cc387`; recorded §0a, commit `321f303`)

- [x] Placement: `<CFField />` rendered in `src/components/analysis/targetpacket.jsx` as a
      DISTINCT section immediately **after** `05 PROVENANCE` — not a numbered 01–05 packet
      section, not inside 02 FORMATION.
- [x] `cffield.jsx` imports only `../../engine/cf/read.js` (the O(1) pure read surface).
      `qa_cf_integration.mjs` enforces it.
- [x] CF read surface is O(1) on render — no `tick()` on a render path (`getCFFormation()` only).
- [x] The 3 synchronous `inferFormation(field.particles)` call sites grep-confirmed
      BYTE-IDENTICAL: `targetpacket.jsx:334`, `analysisfield.jsx:546`,
      `formationprospectusproducer.js:19`.
- [x] No render path imports an analytical CF module (producer/pathwaystore/significance/
      runner/telemetry) — `qa_cf_integration.mjs` WS5 checks pass.
- [x] Section is visually + semantically distinct: label "COGNITIVE FABRIC READ",
      `CF_FORMATION_CANDIDATE` kind, hairline divider / no fill (§6/§7).

**Gate 1 — CLOSED (2026-09-02).** Branch only. Not merge/deploy authorization.

---

## Gate 3 — real-I/O telemetry — OPEN / PENDING (Gate 1 unblocked it 2026-09-02)

**Status: not started, and cannot be completed on the branch alone.** Gate 3 requires a live
connector-execution measurement window — the running app with real FRED/Finnhub/EDGAR/
PatentsView traffic through `daemon.js` → `dispatchToSubstrate` → `cfProducerTick()`. It is
explicitly **not** something to synthesise from the harness. Left open deliberately.

Re-run `qa_cf_telemetry.mjs`-equivalent against **live connector activity**, and — amended
acceptance criterion (Founder, 2026-09-02) — **demonstrate the measured telemetry corresponds to
actual connector activity, not merely the synthetic/harness execution path.** Concretely:
- the `objects examined/written` counts must track real `dispatchBatch` volume over the window;
- `processingTime` must reflect real `inferFormation(admissibleParticles())` cost at real pool
  sizes;
- guest p95 latency measured against the real render tree must stay flat while real connector
  volume varies;
- a provenance check: each CF pathway's `source` traces to a real connector id, not `'fixture'`.

---

## WS6 exit

All three gates pass independently → the findings go to the Founder for the
**production-integration ruling**. WS6 passing is **not** itself deployment authorization.

### WS6 gate status (2026-09-02)

| gate | state |
|---|---|
| Gate 2 — scheduler authority | **CLOSED** — Option A, wired in `96cc387` |
| Gate 1 — render integration | **CLOSED** — `96cc387`, recorded §0a `321f303` |
| Gate 3 — real-I/O telemetry | **OPEN / PENDING** — needs a live connector measurement window; branch work cannot close it |

WS6 does not exit until Gate 3 passes. No merge, no deploy, no production-integration ruling
before then. `cf-canonical-substrate-experiment` stays isolated.
