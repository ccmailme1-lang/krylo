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

const DEFAULT_WINDOW_MS = 300_000; // 5 min — matches surfacerouter oracle TTL

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

// _pool: signalDomain → Array<{ confidence, polarity, ts }>
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

  _pool.get(domain).push({
    confidence: typeof event.confidence === 'number' ? event.confidence : 50,
    polarity:   isFracture ? 'fracture' : 'constructive',
    ts:         event.ts ?? Date.now(),
  });

  // Prune entries beyond 2× window to bound memory
  const cutoff = Date.now() - DEFAULT_WINDOW_MS * 2;
  _pool.set(domain, _pool.get(domain).filter(s => s.ts >= cutoff));
});

// ── Core computation ───────────────────────────────────────────────────────────

export function computeDomainPressure(domain, windowMs = DEFAULT_WINDOW_MS) {
  const d      = (domain ?? '').toUpperCase();
  const pool   = _pool.get(d) ?? [];
  const cutoff = Date.now() - windowMs;
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
