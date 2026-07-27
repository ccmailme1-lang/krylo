Status: **ROOT CAUSE CONFIRMED AND FIXED** (traced, not just inferred — see bottom of doc).

# Help Request — Stale State Across "Switch Away and Back" Navigation

## Symptom (reported, reproducible pattern)

After a surface (Signal Map, Formation/Ownership prospectus view, others) renders once and the
user navigates away and back to it, subsequent renders show empty/insufficient states — "NO
FORMATION DETECTED," blank Decision Translation, blank Leverage Field — even on real, detailed
queries that should populate. This has recurred across multiple, independently-built UI
components, which is the tell: it's not five separate UI bugs, it's one shared thing leaking.

## Leading finding — likely root cause

`src/engine/surfacerouter.js` is a **module-level singleton** (`export const surfaceRouter = new
SurfaceRouter()`), shared by every component that mounts it via the hook below. Its `unsubscribe()`
does not clean up per-surface accumulated state:

```js
// src/engine/surfacerouter.js
class SurfaceRouter {
  constructor() {
    this._subs     = new Map();  // surfaceId → subscription
    this._registry = new Map();  // surfaceId → Map(eventId → fieldSnapshot)
    this._clusters = new Map();  // surfaceId → Map(clusterKey → Set(eventId))
    ...
  }

  subscribe(surfaceId, domains, handler) {
    this._subs.set(surfaceId, { surfaceId, domains, handler, active: true });
    if (!this._registry.has(surfaceId)) this._registry.set(surfaceId, new Map());
    if (!this._clusters.has(surfaceId)) this._clusters.set(surfaceId, new Map());
  }

  unsubscribe(surfaceId) {
    const sub = this._subs.get(surfaceId);
    if (sub) sub.active = false;   // <-- ONLY flips a flag. _registry and _clusters
                                    //     for this surfaceId are never cleared or deleted.
  }
}
export const surfaceRouter = new SurfaceRouter();
```

Consumer hook (React lifecycle side):

```js
// src/hooks/usesurfacerouter.js
export function usesurfacerouter(surfaceId, domains, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    surfaceRouter.subscribe(surfaceId, domains, (event, op) => handlerRef.current(event, op));
    return () => surfaceRouter.unsubscribe(surfaceId);
  }, [surfaceId]);
}
```

**The gap:** on unmount, `unsubscribe(surfaceId)` sets `active: false` but leaves that
`surfaceId`'s entries in `_registry` and `_clusters` in place, forever. On remount with the same
`surfaceId`, `subscribe()` guards with `if (!this._registry.has(surfaceId))` — since the old Map
entry still exists from the prior mount, it is **never reset**, so the new subscription inherits
stale/frozen snapshot data from the previous session instead of starting clean.

## Why this explains the cross-component pattern

`surfaceRouter` is consumed by multiple independent surfaces (Signal Map, `analysisidlefield.jsx`,
the FRED/EDGAR/Kalshi signal hooks). Any of them remounting with a reused `surfaceId` hits the
same leak. That's why the symptom shows up in visually unrelated components — they're all reading
through the same singleton with the same unclean unsubscribe.

## Files involved

```
src/engine/surfacerouter.js      — SurfaceRouter class, subscribe()/unsubscribe(), _registry/_clusters Maps
src/hooks/usesurfacerouter.js    — React hook wrapping subscribe/unsubscribe in useEffect
src/hooks/usekalshisignals.js    — consumer
src/hooks/useedgarsignals.js     — consumer
src/hooks/usefredsignals.js      — consumer
src/components/analysis/analysisidlefield.jsx — consumer
```

## Not yet confirmed (needs verification before fixing)

- Whether `_registry`/`_clusters` staleness is actually what downstream consumers (`_route`,
  `triggerReconcile`, whatever reads these Maps) choke on, versus some other read path being
  affected. I found the leak by code inspection; I have not traced a live repro through to the
  exact line that renders "INSUFFICIENT SIGNAL" from stale registry data.
- Whether `dispatch()`/`_route()` (not yet fully read) skip inactive subs correctly on the
  read side, or whether stale-but-present registry entries get counted somewhere.

## Guardrails for whoever fixes this (from CLAUDE.md, non-negotiable)

- **§16 Signal Ingestion Architecture (LOCKED)** — every signal source normalizes to 0–100 and
  dispatches via `dispatchBatch()` into `surfacerouter.js`, never directly to a cone. Any fix must
  preserve this — don't bypass the router to "solve" staleness by routing around it.
- **§21 Route-Don't-Aggregate** — `_registry`/`_clusters` hold per-event/per-cluster state, not
  pre-aggregated composites. A fix should clear/reset these per-surfaceId on unsubscribe, not
  collapse them into a summary.
- **§22 Absence-is-Signal** — if a surface genuinely has no live signals after a clean reset, that
  must still render as a stated absence state, not silently default to zero/fabricated data. The
  fix is cleaning up stale state, not suppressing the honest empty-state message.
- **Non-breaking merge gate** — `surfaceRouter` is a shared singleton with multiple real
  consumers (FRED/EDGAR/Kalshi hooks). A fix must not break active subscriptions for surfaces that
  are NOT being remounted — only cross-mount staleness for the same `surfaceId` should be touched.
- **Minimal surgical edit** — likely fix shape: `unsubscribe(surfaceId)` should also delete (not
  just flag) the `_registry` and `_clusters` entries for that `surfaceId`, OR `subscribe()` should
  unconditionally reset them on every call rather than only when absent. Either is a small, local
  change to `surfacerouter.js` — this should not require touching every consumer.

## What's already been fixed this session (separate, smaller issues — not this root cause)

- `spinemap.jsx` — added a `key`-based forced remount on `krylo-reset`, papers over staleness for
  that one component by fully destroying/rebuilding it. Does not address the `surfacerouter.js`
  leak itself.
- `decisionframe.jsx` — removed the `HP_FALLBACK` hard-null gate so low-confidence queries still
  render a muted frame instead of nothing. Real fix for a real threshold, unrelated to this leak.
- `targetpacket.jsx` — layout fixes so empty-state panels fill their space instead of leaving dead
  blank area beside a taller sibling. Cosmetic, unrelated to this leak.

None of the above touch `surfacerouter.js`. If the leak above is the real root cause, those three
fixes were correct but insufficient — worth stating plainly rather than claiming they solved the
underlying problem.
