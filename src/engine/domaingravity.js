// WO-1879 — Domain Gravity Wells
// Computes per-domain live pressure with polarity from signal flow.
// §20 (Direction Honesty Principle): polarity distinguishes constructive from fracture.
//
// TWO domain vocabularies exist in KRYLO:
//   Signal domains (6 locked):  TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP
//   Query domains:              STARTUP_FINANCE, CAREER, REAL_ESTATE, etc. (resolvePrimary output)
//
// getDomainPressure(signalDomain)  — primary API for WO-1880 Fracture Output Surface
// getQueryDomainPressure(qDomain)  — maps query domain → signal domain for detectDomain() tie-breaker

import { surfaceRouter } from './surfacerouter.js';
import { POLARITY }       from './signalconstants.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEFAULT_WINDOW_MS = 300_000; // 5 min — matches surfacerouter oracle TTL

// DEF-1375: the MAP's own field window. DEFAULT_WINDOW_MS (5 min) is shorter than the slowest feed's polling
// interval (EDGAR Form D polls every 15 min, useedgarsignals.js), so EDGAR-sourced entries were visible for
// 5 of every 15 minutes and the map emptied between polls. 30 min = 2x the slowest poll, the same 2x ratio
// this module already prunes at. Value is the Founder's to change; used by structurepanel.jsx only.
export const MAP_FIELD_WINDOW_MS = 1_800_000;

// How long an entry is kept in the pool (memory bound only: every read filters by its own window, so keeping
// entries longer changes no reader's result). Must cover MAP_FIELD_WINDOW_MS plus a margin; it was
// DEFAULT_WINDOW_MS * 2 (10 min), which deleted entries before a 30-min read could see them.
export const POOL_RETENTION_MS = 2_100_000; // 35 min

// 40%+ fracture signals in window → domain polarity = 'fracture'
export const FRACTURE_POLARITY_THRESHOLD = 0.40;

// Relative score gap below which tie-breaker fires in detectDomain()
export const GRAVITY_TIE_THRESHOLD = 0.15;

// 6 locked signal domains (§6 / §16)
import { CANONICAL_DOMAINS } from './ontology.js';
const SIGNAL_DOMAINS = CANONICAL_DOMAINS.map(d => d.toUpperCase()); // KRYL-1065 — sourced from ontology

// Query domain → signal domain bridge
// Covers all DOMAIN_SCORE_PATTERNS keys + resolvePrimary() output labels.
// Unmapped query domains produce zero-pressure (safe default).
const QUERY_TO_SIGNAL_DOMAIN = {
  // CAPITAL
  STARTUP_FINANCE:           'CAPITAL',
  RETIREMENT:                'CAPITAL',
  EXPENSE_REDUCTION:         'CAPITAL',
  SOVEREIGN_CAPITAL:         'CAPITAL',
  PRIVATE_CREDIT:            'CAPITAL',
  STRUCTURAL_RESILIENCE:     'CAPITAL',
  VC_INVERSION:              'CAPITAL',
  NON_INSTITUTIONAL_ALPHA:   'CAPITAL',
  COMMERCIAL_DISTRESS:       'CAPITAL',
  CREATOR_HOLDCO:            'CAPITAL',
  OPERATIONAL_CARRY_RISK:    'CAPITAL',
  PHILANTHROPIC_CAPITAL:     'CAPITAL',
  BRAND_EQUITY_STABILITY:    'CAPITAL',
  // LABOR
  CAREER:                    'LABOR',
  LABOR_VOLATILITY:          'LABOR',
  // OWNERSHIP
  REAL_ESTATE:               'OWNERSHIP',
  AUTO:                      'OWNERSHIP',
  FLEXIBLE_SPACE:            'OWNERSHIP',
  // TECHNOLOGY
  FORWARD_COMPUTE:           'TECHNOLOGY',
  SOVEREIGN_HARDWARE:        'TECHNOLOGY',
  INDUSTRIAL_FLYWHEEL:       'TECHNOLOGY',
  FINTECH_INFRA:             'TECHNOLOGY',
  STARTUP_READINESS:         'TECHNOLOGY',
  LONG_DURATION_CONVERGENCE: 'TECHNOLOGY',
  CONTRARIAN_FRONTIER:       'TECHNOLOGY',
  // MEDIA
  RELEVANCE_WARFARE:         'MEDIA',
  ATTENTION_SATURATION:      'MEDIA',
  SOCIAL_GRAPH:              'MEDIA',
  CONTENT_COMMERCE:          'MEDIA',
  BOXING_DISRUPTION:         'MEDIA',
  ATHLETE_ENTERPRISE:        'MEDIA',
  BRAND_SPINOFF:             'MEDIA',
  CULTURAL_INFLUENCE:        'MEDIA',
  VIRTUAL_ECONOMY:           'MEDIA',
  // KNOWLEDGE
  HEALTH:                    'KNOWLEDGE',
};

// ── Signal pool ────────────────────────────────────────────────────────────────

// _pool: signalDomain → Array<{ confidence, polarity, ts, source, signal }>
// WO-1 (2026-08-29): `source` + `signal` retained so per-facet attribution and the
// shared-source distinct-facet AC are possible. Additive — every existing consumer
// reads only { confidence, polarity, ts }. See specs/SPEC-connector-event-contract.md.
const _pool = new Map(SIGNAL_DOMAINS.map(d => [d, []]));

// Passive observer — subscribes to all surfaces, never dispatches.
// Gravity is read-only: it observes signal flow, it does not influence it.
surfaceRouter.subscribe('__gravity__', ['oracle', 'feed', 'analysis'], (event) => {
  if (!event || !event.domain) return;
  const domain = event.domain.toUpperCase();
  if (!_pool.has(domain)) return;

  const isFracture =
    event.polarity === POLARITY.NEGATIVE ||
    event.polarity === POLARITY.ABSENT   ||
    event.convergenceState === 'TURBULENT_CONVERGENCE';

  const entry = {
    // id lets a repeat dispatch of the same observation refresh its entry instead of adding a
    // second one (count stays the same, ts moves forward). Additive: existing readers ignore it.
    id:         event.id ?? null,
    confidence: typeof event.confidence === 'number' ? event.confidence : 50,
    polarity:   isFracture ? 'fracture' : 'constructive',
    ts:         event.ts ?? Date.now(),
    source:     event.source ?? null,
    // `signal` is the connector's named signal ('TECHNOLOGY_VELOCITY:<cluster>') or,
    // for numeric-signal connectors, the raw 0–100 value. Overloaded — the
    // connector-event contract (SPEC-connector-event-contract.md) formalises this.
    signal:     event.signal ?? null,
    // KRYL-1220 — preserve entity attribution when the dispatching connector already
    // carries it (capitalrealizationconnector.js's `meta.canonicalId` today), rather than
    // discarding it here as before. Additive only: every existing reader of this pool
    // ignores an unknown field, so this changes nothing for ambient (no-subject) consumers.
    // Not invented — null when the connector never attributed the event, same as everything
    // else in this pool. dispatchBatch()/dispatch()/_route() spread the event unmodified, so
    // `event.meta` survives from the connector call site unchanged (verified: surfacerouter.js).
    canonicalId: event.meta?.canonicalId ?? null,
    // eventDate — the real historical event/filing date, when the connector distinguishes it
    // from ts (observation/ingestion time, e.g. edgar8ksignal.js's targeted sync). null for
    // every connector that doesn't carry this distinction — not fabricated, not required.
    eventDate: event.meta?.eventDate ?? null,
    // KRYL-1399 step A -- the 8-K item-code event class and the filing accession, when the connector carries them
    // (edgar8ksignal.js). Additive and informational: no reader's magnitude, polarity or domain logic uses them.
    eventClass: event.eventClass ?? null,
    accession: event.meta?.accession ?? null,
    capitalEvent: event.meta?.capitalEvent ?? null,   // KRYL-1399 step B: quoted amount / instrument / counterparties, or its stated absence
  };
  const arr = _pool.get(domain);
  const existing = entry.id != null ? arr.findIndex(s => s.id === entry.id) : -1;
  if (existing >= 0) arr[existing] = entry;
  else arr.push(entry);

  // Prune entries beyond 2× window to bound memory
  const cutoff = Date.now() - POOL_RETENTION_MS;
  _pool.set(domain, _pool.get(domain).filter(s => s.ts >= cutoff));
});

// ── Frozen view (KRYL-1398) ─────────────────────────────────────────────────────
// While a snapshot is frozen, every reader of this pool (computeDomainPressure, getDomainSignals, getAllSignals and
// so everything built on them) reads a copy taken at freeze time, with every window measured from the freeze instant
// instead of the clock. Live writes keep landing in _pool and are invisible to readers until the next freeze. One
// frozen view at a time: freezePool() replaces the previous one in a single synchronous step (atomic refresh).
let _frozen = null; // { id, at, entries: Map(domain -> entries[]) }
const _view = () => (_frozen ? _frozen.entries : _pool);
const _now  = () => (_frozen ? _frozen.at : Date.now());

export function freezePool(id, at = Date.now()) {
  const entries = new Map();
  for (const [d, arr] of _pool) entries.set(d, arr.filter(s => s.ts <= at).map(s => ({ ...s })));
  _frozen = { id, at, entries };
  return { id, at, count: [...entries.values()].reduce((n, a) => n + a.length, 0) };
}
export function unfreezePool() { _frozen = null; }
export const getFrozenPoolInfo = () => (_frozen ? { id: _frozen.id, at: _frozen.at } : null);

// ── Core computation ───────────────────────────────────────────────────────────

export function computeDomainPressure(domain, windowMs = DEFAULT_WINDOW_MS) {
  const d      = (domain ?? '').toUpperCase();
  const pool   = _view().get(d) ?? [];
  const cutoff = _now() - windowMs;
  const active = pool.filter(s => s.ts >= cutoff);

  if (active.length === 0) {
    return { domain: d, magnitude: 0, polarity: 'constructive', signalCount: 0, windowMs };
  }

  const magnitude     = active.reduce((sum, s) => sum + s.confidence, 0) / active.length;
  const fractureCount = active.filter(s => s.polarity === 'fracture').length;
  const polarity      = (fractureCount / active.length) >= FRACTURE_POLARITY_THRESHOLD
    ? 'fracture'
    : 'constructive';

  return {
    domain:      d,
    magnitude:   parseFloat(magnitude.toFixed(1)),
    polarity,
    signalCount: active.length,
    windowMs,
  };
}

// Pressure for a signal domain (TECHNOLOGY, CAPITAL, etc.)
// Primary API for WO-1880 Fracture Output Surface.
export function getDomainPressure(signalDomain) {
  return computeDomainPressure(signalDomain);
}

// Pressure for a query domain (STARTUP_FINANCE, CAREER, etc.)
// Maps to corresponding signal domain — used in detectDomain() tie-breaker.
export function getQueryDomainPressure(queryDomain) {
  const signalDomain = QUERY_TO_SIGNAL_DOMAIN[queryDomain];
  if (!signalDomain) {
    return { domain: queryDomain, magnitude: 0, polarity: 'constructive', signalCount: 0, windowMs: DEFAULT_WINDOW_MS };
  }
  return computeDomainPressure(signalDomain);
}

// All 6 signal domain pressures — consumed by WO-1880 Fracture Output Surface.
export function getAllDomainPressures(windowMs = DEFAULT_WINDOW_MS) {
  const result = {};
  for (const d of SIGNAL_DOMAINS) {
    result[d] = computeDomainPressure(d, windowMs);
  }
  return result;
}

// KRYL-XXXX — Raw domain signal access for the Formation Inference Layer (§21 route-don't-aggregate).
// Read-only, windowed, shallow-copied particles. Does NOT collapse magnitude or vote on polarity —
// the formation engine owns that (Q needs per-particle sign+confidence). computeDomainPressure() is
// untouched; existing consumers are unaffected. No mutation path: _pool objects never escape by reference.
export function getDomainSignals(domain, windowMs = DEFAULT_WINDOW_MS) {
  const d      = (domain ?? '').toUpperCase();
  const cutoff = _now() - windowMs;
  return (_view().get(d) ?? []).filter(s => s.ts >= cutoff).map(s => ({ domain: d, ...s }));
}

export function getAllSignals(windowMs = DEFAULT_WINDOW_MS) {
  const cutoff = _now() - windowMs;
  const out = [];
  for (const [d, arr] of _view()) {
    for (const s of arr) if (s.ts >= cutoff) out.push({ domain: d, ...s });
  }
  return out;
}
