// WO-2007B — Identity Lineage Event Bus
// Observable pub/sub for graph mutation events. Makes "energy pulses" traceable —
// every stability transition in the identity kernel is emitted here rather than
// being a silent internal state change.
//
// Event shape: { type, identityId, trigger, stabilityBefore, stabilityAfter, ts }
//
// Types:
//   CREATED    — new CanonicalEvent initialized
//   NODE_ADDED — single node inserted; stability delta observable
//   MERGED     — two events collapsed into one; trigger = [idA, idB]
//   FRAGMENTED — event marked FRAGMENTED by resolveIdentity split pass

const subscribers = new Set();
const history     = [];
const MAX_HISTORY = 500;

// subscribe(cb) — returns an unsubscribe function.
export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

// dispatch(event) — broadcasts to all subscribers, prepends to history ring.
// Consumer errors are swallowed — one bad subscriber must not corrupt the lineage.
export function dispatch(event) {
  const e = { ...event, ts: event.ts ?? Date.now() };
  history.unshift(e);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  for (const cb of subscribers) {
    try { cb(e); } catch {}
  }
  return e;
}

// getHistory(identityId?) — full ring or filtered to one identity's transitions.
export function getHistory(identityId) {
  return identityId
    ? history.filter(e => e.identityId === identityId || (Array.isArray(e.trigger) && e.trigger.includes(identityId)))
    : [...history];
}

export function clearHistory() { history.length = 0; }
