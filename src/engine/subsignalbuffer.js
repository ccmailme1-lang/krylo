// KRYL-1132 — Subsignal Fan-Out Substrate.
// Spec: specs/SPEC-subsignal-fanout-substrate.md. Doctrine: specs/DOCTRINE-subsignal-floor-principle.md (§25 proposed).
//
// A passive, read-only tap on the same §16 tuple every connector already dispatches —
// gives it a second exit point so future detectors (anomaly, trend, absence-transition) can
// subscribe without touching ingestion. Pass-through only: this file must never gain
// filtering, weighting, scoring, or domain-interpretation logic (§3/§21 — that would make it
// a second inference layer wearing a substrate's name).
//
// Retention (Founder decision, 2026-08-01): in-memory bounded ring buffer, most recent
// 10,000 records OR last 24 hours, whichever bound is hit first. Self-pruning on every
// append() — no background timer. Lost on process restart; if a future detector needs
// deeper history, swap this file's internal storage for a persistent one behind the same
// append/subscribe/read API — callers never need to change.

const MAX_RECORDS = 10_000;
const MAX_AGE_MS  = 24 * 60 * 60 * 1000;

const _records    = []; // SubsignalRecord[], oldest first
const _subscribers = new Set();

function prune(now) {
  while (_records.length > MAX_RECORDS) _records.shift();
  while (_records.length && (now - _records[0].ts) > MAX_AGE_MS) _records.shift();
}

// @param {object} tuple — BaseSubsignalTuple { source, domain, signal, confidence, ts }
//   plus optional canonicalEventId (WO-2004 enrichment reference, never a prerequisite).
export function append(tuple) {
  const now = tuple?.ts ?? Date.now();
  const record = { ...tuple, ts: now };
  _records.push(record);
  prune(now);

  // Isolation requirement (spec §9): a subscriber's latency or exception must never affect
  // the caller (dispatchBatch) or any other subscriber. Each call is independently guarded.
  for (const fn of _subscribers) {
    try { fn(record); } catch { /* subscriber fault — never propagates */ }
  }
}

// @returns {function} unsubscribe
export function subscribe(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

export function read({ since, domain, limit } = {}) {
  let out = _records;
  if (since != null) out = out.filter(r => r.ts >= since);
  if (domain != null) out = out.filter(r => r.domain === domain);
  if (limit != null) out = out.slice(-limit);
  return out.slice(); // defensive copy — never hand out the live array
}

// test-only
export function _resetSubsignalBuffer() {
  _records.length = 0;
  _subscribers.clear();
}
