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
