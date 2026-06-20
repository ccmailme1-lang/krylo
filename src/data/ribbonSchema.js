// WO-1815 — Opportunity Ribbon producer contract
// Producer for WO-1822 (Investor Decision Architecture)
// Domain mapping: ribbon domains → 6 canonical Krylo cones

export const RIBBON_DOMAIN_MAP = {
  PHYSICAL_INTELLIGENCE: 'LABOR',
  SOVEREIGN_CAPITAL:     'CAPITAL',
  PRIVATE_CREDIT:        'CAPITAL',
  // extend as new ribbon domains are registered
};

export const SYSTEMIC_STATES = {
  ACCELERATING: 'ACCELERATING',
  STABLE:       'STABLE',
  TURBULENT:    'TURBULENT',
  DECELERATING: 'DECELERATING',
};

// Maps systemic_state → Krylo convergence state (locked 2026-05-09)
export const SYSTEMIC_TO_CONVERGENCE = {
  ACCELERATING: 'BUILDING_CONVERGENCE',
  STABLE:       'LOW_SIGNAL_YIELD',
  TURBULENT:    'TURBULENT_CONVERGENCE',
  DECELERATING: 'LOW_SIGNAL_YIELD',
};

/**
 * RibbonNode — one element in the live Opportunity Ribbon stream
 *
 * @typedef {Object} RibbonNode
 * @property {string} node_id              — unique identifier
 * @property {string} domain               — ribbon-layer domain label
 * @property {string} canonicalDomain      — mapped Krylo 6-cone domain (derived via RIBBON_DOMAIN_MAP)
 * @property {string} label                — human-readable trend label, seeds thesis on click
 * @property {string} routing_target       — WO identifier for downstream synthesizer
 * @property {Object} velocity
 * @property {number} velocity.current_score  — 0–100 convergence score
 * @property {string} velocity.direction      — 'UP' | 'DOWN' | 'TURB' | 'FLAT'
 * @property {Object} velocity.intervals      — raw delta shifts (not %)
 * @property {number} velocity.intervals['1d']
 * @property {number} velocity.intervals['7d']
 * @property {number} velocity.intervals['30d']
 * @property {number} velocity.intervals['90d']
 * @property {string} systemic_state       — see SYSTEMIC_STATES
 * @property {number} leakage_risk         — 0–1 data contamination floor
 */

// Baseline payload — WO-1815 locked 2026-06-20
export const RIBBON_BASELINE = {
  $schema:        'https://api.krylo.io/schemas/wo-1815.json',
  epoch:          6,
  stream_id:      'ribbon_live_01f8',
  active_threads: 6,
  payload: [
    {
      node_id:        'PI_094',
      domain:         'PHYSICAL_INTELLIGENCE',
      canonicalDomain: 'LABOR',
      label:          'Automation Labor Displacement',
      routing_target: 'WO-1795',
      velocity: {
        current_score: 84,
        direction:     'UP',
        intervals:     { '1d': 3, '7d': 14, '30d': 38, '90d': 52 },
      },
      systemic_state: 'ACCELERATING',
      leakage_risk:   0.12,
    },
    {
      node_id:        'SC_112',
      domain:         'SOVEREIGN_CAPITAL',
      canonicalDomain: 'CAPITAL',
      label:          'Vendor Platform Decoupling',
      routing_target: 'WO-1801',
      velocity: {
        current_score: 62,
        direction:     'UP',
        intervals:     { '1d': 1, '7d': 2, '30d': 9, '90d': 11 },
      },
      systemic_state: 'STABLE',
      leakage_risk:   0.04,
    },
    {
      node_id:        'PC_401',
      domain:         'PRIVATE_CREDIT',
      canonicalDomain: 'CAPITAL',
      label:          'Mid-Market Liquidity Gaps',
      routing_target: 'WO-1800',
      velocity: {
        current_score: 79,
        direction:     'TURB',
        intervals:     { '1d': 9, '7d': 21, '30d': 44, '90d': 68 },
      },
      systemic_state: 'TURBULENT',
      leakage_risk:   0.41,
    },
  ],
};

/**
 * Resolves canonicalDomain for a given ribbon domain label.
 * Falls back to 'CAPITAL' if unmapped — log warning in dev.
 */
export function resolveCanonicalDomain(ribbonDomain) {
  const resolved = RIBBON_DOMAIN_MAP[ribbonDomain];
  if (!resolved) {
    console.warn(`[WO-1815] Unmapped ribbon domain: ${ribbonDomain} — defaulting to CAPITAL`);
    return 'CAPITAL';
  }
  return resolved;
}
