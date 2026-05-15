# WO-1092 — Surface Binding Layer Spec v1.0

**Status:** PENDING BUILD  
**Authored:** 2026-05-15  
**Layer:** UI Orchestration — sits between streaming pipeline and rendering surfaces  
**Dep:** WO-1091 (Persistence + Replay Layer) — COMPLETE

---

## 1. PURPOSE

WO-1092 defines the **runtime data routing and surface hydration layer** for KRYLO.

It is not:
- Codec / ABI (WO-1082 / 1084)
- Streaming ingest / replay (WO-1090 / 1091)
- Visual rendering semantics (SPEC-VIS-001)

It is:
> The system that takes decoded events and decides **where they go in the UI**, in real time, as a continuous incremental process.

---

## 2. SYSTEM POSITION

```
[ WO-1082 / 1084 ]   ABI encoding + validation
        ↓
[ WO-1090 / 1091 ]   Frame ingest + persistence + replay
        ↓
[ WO-1092 ]          Routing + surface hydration   ← THIS SPEC
        ↓
[ SPEC-VIS-001 ]     Visual rendering semantics
        ↓
[ UI surfaces ]      React / WebGL rendering
```

---

## 3. WHAT ALREADY EXISTS (DO NOT REBUILD)

| Existing piece | File | Role in WO-1092 |
|---|---|---|
| `RENDER_OWNER` | `src/engine/surfacecontract.js` | Canvas ownership signal — routing reads this |
| `SURFACE_PHASE` | `src/engine/surfacecontract.js` | Phase signal — routing sets this on surface transitions |
| `hydrateFromSignals()` | `src/context/SurfaceContext.jsx` | Bulk hydration — WO-1092 extends to incremental delta hydration |
| `useframeingest.js` | `src/hooks/useframeingest.js` | Upstream decoded frame source |
| `usereplay.js` | `src/hooks/usereplay.js` | Historical frame source |
| `FlowController` | `runtime/flowcontroller.cjs` | Backpressure state machine — WO-1092 reads its state |
| `mergedRecords` | `src/app.jsx` | Current unpartitioned signal pool — WO-1092 replaces its downstream routing |

---

## 4. SURFACES IN SCOPE

Three surfaces receive routed events:

| Surface | RENDER_OWNER | File | Role |
|---|---|---|---|
| Oracle View | `RENDER_OWNER.ORACLE` | `src/components/oracleview.jsx` | Convergence synthesis + convergence state display |
| Feed (Signal Map) | `RENDER_OWNER.MAP` | `src/components/spine/spinemap.jsx` | Geographic node topology |
| Analysis | — | `src/components/tenkvault.jsx` | Deep ETR data, charts, foresight |

---

## 5. EVENT DOMAIN CLASSIFICATION

Decoded events are classified into one of three domains before routing. An event may belong to multiple domains.

### 5.1 Domain identifiers

```js
export const EVENT_DOMAIN = {
  ORACLE:   'oracle',    // convergence + synthesis records
  FEED:     'feed',      // geographic + social raw signals
  ANALYSIS: 'analysis',  // deep ETR records + historical data
};
```

### 5.2 Classification rules

An event is classified into **ORACLE** if any of the following are true:
- `event.confidence` is a number (0–1)
- `event.convergenceState` is present
- `event.source_type === 'truth'`
- `event.truth_statement` is present
- `event.fs` is present and `event.fs >= 0.5`

An event is classified into **FEED** if any of the following are true:
- `event.source_type === 'hn'` or `event.source === 'hn'`
- `event.origin` is a US state name or city
- `event.geoWeight` is present
- `event.zone` is one of `local | regional | national`
- `event._isStub === true`

An event is classified into **ANALYSIS** if any of the following are true:
- `event.definition` is present
- `event.comments` is an array
- `event.source_type === 'replay'`
- `event.seq` is present (replay frame provenance)
- `event.compliance` is present

**Fallback:** An event that matches no rule is classified into `FEED` (raw signal default).

### 5.3 Classification function signature

```js
// Returns an array of domain strings — a single event may belong to multiple domains.
classifyEventDomains(event) → string[]
```

---

## 6. SUBSCRIPTION MODEL

Each surface registers a subscription with the router at mount time. The router maintains a subscription registry.

### 6.1 Subscription registration

```js
// Surface declares which domains it accepts.
router.subscribe(surfaceId, domains, handler)

// Example:
router.subscribe('oracle',   [EVENT_DOMAIN.ORACLE],                    handleOracleEvent)
router.subscribe('feed',     [EVENT_DOMAIN.FEED],                       handleFeedEvent)
router.subscribe('analysis', [EVENT_DOMAIN.ANALYSIS, EVENT_DOMAIN.ORACLE], handleAnalysisEvent)
```

Analysis subscribes to both ANALYSIS and ORACLE domains because it needs convergence state alongside deep ETR data.

### 6.2 Subscription registry shape

```js
{
  surfaceId: string,
  domains:   string[],     // EVENT_DOMAIN values this surface accepts
  handler:   function,     // called with (event, operation)
  active:    boolean,      // false when surface is IDLE or unmounted
}
```

### 6.3 Unsubscribe

Surfaces call `router.unsubscribe(surfaceId)` on unmount. Router sets `active: false` and stops dispatching.

---

## 7. ROUTING DISPATCH

### 7.1 Dispatch flow

```
decoded event
    ↓
classifyEventDomains(event) → [domain, ...]
    ↓
for each domain:
    find all active subscriptions that include this domain
    check backpressure state (§10)
    call handler(event, operation)
```

### 7.2 Dispatch function signature

```js
router.dispatch(event)      // single event
router.dispatchBatch(events) // array — processes in order, respects backpressure per event
```

### 7.3 Operation determination

Before calling each subscriber's handler, the router determines the hydration operation (§8) by checking the subscriber's current surface state registry.

```js
const operation = resolveOperation(surfaceId, event)
handler(event, operation)
```

---

## 8. HYDRATION DELTA SEMANTICS

Surfaces are not replaced on new data. They are updated via four discrete operations. This is the core of incremental stream hydration.

### 8.1 Operation types

```js
export const HYDRATION_OP = {
  APPEND:     'append',     // event id not in surface registry → add
  PATCH:      'patch',      // event id exists, fields have changed → merge
  RECONCILE:  'reconcile',  // periodic pass — re-score, re-order existing events
  EVICT:      'evict',      // event exceeds TTL or marked stale → remove
};
```

### 8.2 Operation resolution rules

The router resolves the operation for each (surfaceId, event) pair:

| Condition | Operation |
|---|---|
| `event.id` not in surface's current registry | `APPEND` |
| `event.id` exists AND any tracked field differs | `PATCH` |
| `event.id` exists AND no fields differ | no-op (skip dispatch) |
| `event.ts < now - SURFACE_TTL[surfaceId]` | `EVICT` |
| Periodic reconcile tick fires | `RECONCILE` (broadcast to all active surfaces) |

### 8.3 Surface TTL values

```js
export const SURFACE_TTL = {
  oracle:   300_000,   // 5 minutes — convergence window
  feed:     600_000,   // 10 minutes — signal map decay
  analysis: Infinity,  // analysis holds data until query changes
};
```

### 8.4 Tracked fields per surface

Only tracked fields trigger PATCH. Other field changes are ignored.

| Surface | Tracked fields |
|---|---|
| oracle | `confidence`, `convergenceState`, `fs`, `truth_statement` |
| feed | `state`, `strength`, `geoWeight`, `zone`, `origin` |
| analysis | `definition`, `comments`, `fs`, `fidelity`, `seq` |

### 8.5 Reconcile tick

The router fires a RECONCILE operation every 30 seconds to all active surfaces. Surfaces use this to re-score their internal ordering and evict stale items.

---

## 9. SURFACE STATE MACHINE

Each surface maintains a state independent of the router. The router drives transitions by reading RENDER_OWNER and the event stream.

### 9.1 States

```js
export const SURFACE_STATE = {
  IDLE:       'idle',       // no active query, surface dormant
  LOADING:    'loading',    // query submitted, no events received yet
  HYDRATING:  'hydrating',  // events flowing in, surface updating
  RESOLVED:   'resolved',   // signal density threshold met, surface stable
  STALE:      'stale',      // query changed, surface needs refresh
};
```

### 9.2 Transition table

```
IDLE ──── query submitted ────────────────────> LOADING
LOADING ── first APPEND received ──────────────> HYDRATING
HYDRATING ─ threshold reached (§9.3) ──────────> RESOLVED
RESOLVED ── query changed ─────────────────────> STALE
STALE ───── new query submitted ───────────────> LOADING
STALE ───── same query re-submitted ───────────> HYDRATING
HYDRATING ─ query changed ─────────────────────> STALE
* ──────── surface unmounted ───────────────────> IDLE
```

### 9.3 RESOLVED threshold

A surface enters RESOLVED when it has received at least N APPEND operations for the current query:

| Surface | Threshold N |
|---|---|
| oracle | 1 (first synthesis record is sufficient) |
| feed | 3 (minimum viable topology) |
| analysis | 1 (first full ETR record) |

### 9.4 SURFACE_PHASE alignment

When a surface transitions state, it MUST also update `SURFACE_PHASE` via `transitionTo()`:

| SURFACE_STATE | SURFACE_PHASE |
|---|---|
| IDLE | `AMBIENT` |
| LOADING | `SCANNING` |
| HYDRATING | `SCANNING` |
| RESOLVED | `RESOLVED` |
| STALE | `SCANNING` |

---

## 10. BACKPRESSURE HANDLING

WO-1092 reads backpressure state from WO-1093's `FlowController`. It does not implement backpressure itself.

### 10.1 FlowController states and routing behavior

| FlowController state | Routing behavior |
|---|---|
| `OPEN` | Dispatch all events immediately |
| `THROTTLED` | Batch events into 250ms windows, dispatch per window |
| `BACKPRESSURE` | Queue events; dispatch only on `drain` signal from FlowController |
| `DROPPING` | Dispatch only events where `event.fs >= HIGH_PRIORITY_FS` (0.7) |

### 10.2 High-priority threshold

```js
const HIGH_PRIORITY_FS = 0.70;
```

When in DROPPING state, events below this threshold are discarded at the router, not queued. This prevents surfaces from receiving noise during overload.

### 10.3 Queue limits

```js
const ROUTE_QUEUE_MAX = 200;  // max queued events before oldest are dropped
```

If the queue exceeds this limit, oldest events are dropped regardless of fs score.

---

## 11. IMPLEMENTATION PLAN

### Phase A — Router core (buildable now)

Files to create:
- `src/engine/surfacerouter.js` — router singleton: `classifyEventDomains()`, `subscribe()`, `unsubscribe()`, `dispatch()`, `dispatchBatch()`
- `src/hooks/usesurfacerouter.js` — React hook: wraps router, exposes `subscribe()` + backpressure state

Files to modify:
- `src/app.jsx` — replace downstream fan-out of `mergedRecords` with `router.dispatchBatch(mergedRecords)` after merge

### Phase B — Surface subscriptions (requires Phase A)

Files to modify:
- `src/components/oracleview.jsx` — add `router.subscribe('oracle', [EVENT_DOMAIN.ORACLE], ...)`
- `src/components/spine/spinemap.jsx` — add `router.subscribe('feed', [EVENT_DOMAIN.FEED], ...)`
- `src/components/tenkvault.jsx` — add `router.subscribe('analysis', [EVENT_DOMAIN.ANALYSIS, EVENT_DOMAIN.ORACLE], ...)`

Each surface replaces its current prop-drilled signal array with router-hydrated local state.

### Phase C — Backpressure integration (requires Phase B + WO-1093 running)

Files to modify:
- `src/engine/surfacerouter.js` — add FlowController state polling (SSE or polling `/api/signals/stream` lag field)

---

## 12. WHAT THIS SPEC DOES NOT COVER

- **Visual rendering** — how routed events look. That is SPEC-VIS-001.
- **Codec / ABI** — how events are encoded. That is WO-1082/1084.
- **Event generation** — what produces events. That is WO-1090/1091/1093.
- **Constitutional FSM** — valid app-level state combinations. That is WO-1301.
- **Subscription persistence** — subscriptions are runtime-only; they do not survive page reload.

---

## 13. OPEN ITEMS (REQUIRE FOUNDER RESOLUTION BEFORE BUILD)

| # | Question | Impact |
|---|---|---|
| OI-1 | Does Analysis surface own its own copy of events, or share Oracle's after filtering? | Determines whether ANALYSIS domain is additive or derivative |
| OI-2 | Should `mergedRecords` continue to exist in app.jsx as a shared pool, or be fully replaced by routed per-surface state? | Architecture scope of Phase B |
| OI-3 | RECONCILE tick = 30s. Acceptable? | Affects how quickly stale data is evicted from Signal Map |
| OI-4 | `ROUTE_QUEUE_MAX = 200`. Accept or adjust? | Affects backpressure queue depth |

---

## 14. VALIDATION CRITERIA

WO-1092 is COMPLETE when:

1. `classifyEventDomains(event)` correctly classifies all 3 domain types against the rules in §5.2
2. Oracle View receives ONLY `EVENT_DOMAIN.ORACLE` events
3. Feed (Signal Map) receives ONLY `EVENT_DOMAIN.FEED` events
4. Analysis receives `EVENT_DOMAIN.ANALYSIS` + `EVENT_DOMAIN.ORACLE` events
5. A new APPEND event causes the receiving surface to update without re-rendering other surfaces
6. A PATCH event updates only the changed fields on the target record
7. EVICT removes records exceeding SURFACE_TTL from the surface
8. Under DROPPING backpressure, events with `fs < 0.70` do not reach surfaces
9. Surface state transitions correctly through IDLE → LOADING → HYDRATING → RESOLVED

---

*Spec status: v1.0 — awaiting Founder review of Open Items before Phase A build begins.*
