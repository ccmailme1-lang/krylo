// Signal calibration constants — single source of truth.
// CALIBRATE: review thresholds after live data integration.
// Do not redefine these in other files — import from here.

export const HIGH_CONVERGENCE_FLOOR = 75;  // locked from convergenceclassifier.js D>=0.75
export const COUNTER_SIGNAL_CEILING = 30;  // live calibration pass required

// Minimum statistical power contract — WO-1825.
// These gate when calibration truth-claims can be asserted.
// Treat as contract, not configuration: changes require architectural review.
export const CALIBRATION_MIN_OVERALL = 5;  // overall accuracy threshold
export const CALIBRATION_MIN_DOMAIN  = 3;  // per domain-set threshold
export const CALIBRATION_MIN_HP      = 2;  // happy path accuracy threshold

// WO-1854 — Signal polarity contract
export const POLARITY = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  ABSENT:   'ABSENT',
};

// WO-1856 — Decay tier contract (surfacerouter reads this field)
export const DECAY = {
  DAILY:     'DAILY',
  WEEKLY:    'WEEKLY',
  QUARTERLY: 'QUARTERLY',
};

// WO-1855 — Topology cluster amplifier: applied to confidence when batch signals share topology overlap
export const TOPOLOGY_CLUSTER_AMPLIFIER = 1.2;

// WO-1856 — Canonical source tags
export const SIGNAL_SOURCE = {
  PATENTSVIEW:      'PATENTSVIEW',
  VOID_CLASSIFIER:  'VOID_CLASSIFIER',
  SUPPLY_CHAIN:      'SUPPLY_CHAIN',      // WO-1857
  ECONOMIC_FLOW:     'ECONOMIC_FLOW',     // WO-1858
  FINANCIAL_MARKET:  'FINANCIAL_MARKET',  // WO-1859
};
