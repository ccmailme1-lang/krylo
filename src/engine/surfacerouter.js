// WO-1092 — Surface Binding Layer: Router Core
// Locked decisions (2026-05-25):
//   - Reconciliation is event/pressure-driven only (no wall-clock interval)
//   - Queue overflow uses priority-based shedding (lowest fs dropped first)
//   - Each surface receives its own event copy (immutability per surface)
//   - Eviction preserves last causal cluster representative (provenance rule)
import { RENDER_OWNER } from './surfacecontract.js';
import { resolveTopology } from './entitytopologyregistry.js';
import { TOPOLOGY_CLUSTER_AMPLIFIER, DECAY } from './signalconstants.js';

// WO-1856 — Extended λ for QUARTERLY decay signals (patent data ages over quarters, not minutes)
const QUARTERLY_TTL = 90 * 24 * 60 * 60 * 1000;

export const EVENT_DOMAIN = {
  ORACLE:   'oracle',
  FEED:     'feed',
  ANALYSIS: 'analysis',
};

export const HYDRATION_OP = {
  APPEND:    'append',
  PATCH:     'patch',
  RECONCILE: 'reconcile',
  EVICT:     'evict',
};

export const SURFACE_TTL = {
  oracle:   300_000,   // 5 min — convergence window
  feed:     600_000,   // 10 min — signal map decay
  analysis: Infinity,  // holds until query changes
};

const HIGH_PRIORITY_FS = 0.70;
const ROUTE_QUEUE_MAX  = 200;

// Tracked fields per surface — only changes to these trigger PATCH
const TRACKED_FIELDS = {
  oracle:   ['confidence', 'convergenceState', 'fs', 'truth_statement'],
  feed:     ['state', 'strength', 'geoWeight', 'zone', 'origin'],
  analysis: ['definition', 'comments', 'fs', 'fidelity', 'seq'],
};

// Cluster key for causal provenance — groups events by origin entity
function clusterKey(event) {
  return event.origin ?? event.source_type ?? 'unclassified';
}

export function classifyEventDomains(event) {
  const domains = new Set();

  // ORACLE
  if (
    typeof event.confidence === 'number' ||
    event.convergenceState !== undefined ||
    event.source_type === 'truth' ||
    event.truth_statement !== undefined ||
    (typeof event.fs === 'number' && event.fs >= 0.5)
  ) domains.add(EVENT_DOMAIN.ORACLE);

  // FEED
  if (
    event.source_type === 'hn' || event.source === 'hn' ||
    typeof event.origin === 'string' ||
    event.geoWeight !== undefined ||
    ['local', 'regional', 'national'].includes(event.zone) ||
    event._isStub === true
  ) domains.add(EVENT_DOMAIN.FEED);

  // ANALYSIS
  if (
    event.definition !== undefined ||
    Array.isArray(event.comments) ||
    event.source_type === 'replay' ||
    event.seq !== undefined ||
    event.compliance !== undefined
  ) domains.add(EVENT_DOMAIN.ANALYSIS);

  if (domains.size === 0) domains.add(EVENT_DOMAIN.FEED);

  return Array.from(domains);
}

class SurfaceRouter {
  constructor() {
    this._subs     = new Map();  // surfaceId → subscription
    this._registry = new Map();  // surfaceId → Map(eventId → fieldSnapshot)
    this._clusters = new Map();  // surfaceId → Map(clusterKey → Set(eventId))
    this._queue    = [];
    this._bpState  = 'OPEN';
  }

  subscribe(surfaceId, domains, handler) {
    this._subs.set(surfaceId, { surfaceId, domains, handler, active: true });
    if (!this._registry.has(surfaceId)) this._registry.set(surfaceId, new Map());
    if (!this._clusters.has(surfaceId)) this._clusters.set(surfaceId, new Map());
  }

  unsubscribe(surfaceId) {
    const sub = this._subs.get(surfaceId);
    if (sub) sub.active = false;
  }

  setBackpressure(state) {
    this._bpState = state;
    if (state === 'OPEN' || state === 'THROTTLED') this._drain();
  }

  // Pressure-driven reconcile — called externally by flow events, not a timer
  triggerReconcile() {
    for (const [, sub] of this._subs) {
      if (!sub.active) continue;
      sub.handler(null, HYDRATION_OP.RECONCILE);
    }
  }

  dispatch(event) {
    const bp = this._bpState;
    if (bp === 'DROPPING') {
      if ((event.fs ?? 0) < HIGH_PRIORITY_FS) return;
    }
    if (bp === 'BACKPRESSURE') {
      this._enqueue(event);
      return;
    }
    this._route(event);
  }

  dispatchBatch(events) {
    // WO-1855 — tag topology, then apply cluster amplifier to overlapping signals
    const tagged = events.map(e => ({
      ...e,
      topology: e.topology?.length ? e.topology : resolveTopology(e.source),
    }));

    const batchSources = new Set(
      tagged.map(e => e.source?.toUpperCase().replace(/[\s-]/g, '_')).filter(Boolean)
    );

    const amplified = tagged.map(e => {
      if (!e.topology?.length) return e;
      const hasOverlap = e.topology.some(t => batchSources.has(t));
      if (!hasOverlap) return e;
      return {
        ...e,
        confidence: e.confidence !== undefined
          ? Math.min(100, e.confidence * TOPOLOGY_CLUSTER_AMPLIFIER)
          : e.confidence,
      };
    });

    amplified.forEach(e => this.dispatch(e));
  }

  // EVENT IMMUTABILITY: each surface receives its own shallow copy — no shared references
  _route(event) {
    const domains = classifyEventDomains(event);
    for (const [surfaceId, sub] of this._subs) {
      if (!sub.active) continue;
      if (!domains.some(d => sub.domains.includes(d))) continue;
      const op = this._resolveOp(surfaceId, event);
      if (op === null) continue;
      sub.handler({...event}, op);
      this._updateRegistry(surfaceId, event, op);
    }
  }

  _resolveOp(surfaceId, event) {
    const reg = this._registry.get(surfaceId);
    if (!reg) return HYDRATION_OP.APPEND;
    const id = event.id;
    if (!id) return HYDRATION_OP.APPEND;

    // WO-1856 — QUARTERLY signals use extended λ regardless of surface TTL
    const ttl = event.decay === DECAY.QUARTERLY ? QUARTERLY_TTL : (SURFACE_TTL[surfaceId] ?? Infinity);
    if (ttl !== Infinity && event.ts && (Date.now() - event.ts) > ttl) {
      // PROVENANCE PRESERVATION: never evict the last representative of a causal cluster
      if (this._isLastClusterRepresentative(surfaceId, event)) return null;
      return HYDRATION_OP.EVICT;
    }

    if (!reg.has(id)) return HYDRATION_OP.APPEND;

    const snapshot = reg.get(id);
    const tracked  = TRACKED_FIELDS[surfaceId] ?? [];
    const changed  = tracked.some(f => event[f] !== undefined && event[f] !== snapshot[f]);
    return changed ? HYDRATION_OP.PATCH : null;
  }

  _isLastClusterRepresentative(surfaceId, event) {
    const clusters = this._clusters.get(surfaceId);
    if (!clusters) return false;
    const key     = clusterKey(event);
    const members = clusters.get(key);
    return members?.size === 1 && members.has(event.id);
  }

  _updateRegistry(surfaceId, event, op) {
    if (!event.id) return;
    const reg      = this._registry.get(surfaceId);
    const clusters = this._clusters.get(surfaceId);
    if (!reg || !clusters) return;

    if (op === HYDRATION_OP.EVICT) {
      reg.delete(event.id);
      const key     = clusterKey(event);
      const members = clusters.get(key);
      if (members) {
        members.delete(event.id);
        if (members.size === 0) clusters.delete(key);
      }
      return;
    }

    // APPEND or PATCH — update field snapshot and cluster membership
    const tracked  = TRACKED_FIELDS[surfaceId] ?? [];
    const snapshot = reg.get(event.id) ?? {};
    tracked.forEach(f => { if (event[f] !== undefined) snapshot[f] = event[f]; });
    reg.set(event.id, snapshot);

    const key = clusterKey(event);
    if (!clusters.has(key)) clusters.set(key, new Set());
    clusters.get(key).add(event.id);
  }

  // PRIORITY-BASED SHEDDING: when queue is full, drop lowest fs instead of new event if new is higher
  _enqueue(event) {
    if (this._queue.length < ROUTE_QUEUE_MAX) {
      this._queue.push(event);
      return;
    }
    let lowestIdx = 0;
    let lowestFs  = this._queue[0].fs ?? 0;
    for (let i = 1; i < this._queue.length; i++) {
      const fs = this._queue[i].fs ?? 0;
      if (fs < lowestFs) { lowestFs = fs; lowestIdx = i; }
    }
    if ((event.fs ?? 0) > lowestFs) this._queue[lowestIdx] = event;
    // else new event is lower priority — discard
  }

  // Drain highest-priority first (not FIFO)
  _drain() {
    this._queue.sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0));
    const batch = this._queue.splice(0);
    batch.forEach(e => this._route(e));
  }
}

export const surfaceRouter = new SurfaceRouter();
