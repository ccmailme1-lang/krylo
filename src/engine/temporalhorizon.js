// WO-1342 — TemporalHorizon System
// Operator-declared or template-defaulted. Never silently inferred.

export const TemporalHorizon = {
  IMMEDIATE:  'IMMEDIATE',   // minutes → hours
  SHORT:      'SHORT',       // hours → days
  MEDIUM:     'MEDIUM',      // days → weeks  (default)
  LONG:       'LONG',        // weeks → months
  STRUCTURAL: 'STRUCTURAL',  // months → years
};

export const HORIZON_META = {
  IMMEDIATE:  { span: 'minutes → hours',  urgencyWeight: 1.00, decayRate: 0.95 },
  SHORT:      { span: 'hours → days',     urgencyWeight: 0.80, decayRate: 0.70 },
  MEDIUM:     { span: 'days → weeks',     urgencyWeight: 0.60, decayRate: 0.45 },
  LONG:       { span: 'weeks → months',   urgencyWeight: 0.40, decayRate: 0.25 },
  STRUCTURAL: { span: 'months → years',   urgencyWeight: 0.20, decayRate: 0.08 },
};

export const DEFAULT_HORIZON = TemporalHorizon.MEDIUM;

export const HORIZON_ORDER = ['IMMEDIATE', 'SHORT', 'MEDIUM', 'LONG', 'STRUCTURAL'];

export function resolveHorizon(horizon, declaredBy = 'TEMPLATE') {
  const h = (horizon && TemporalHorizon[horizon]) ? horizon : DEFAULT_HORIZON;
  return {
    horizon:       h,
    declared_by:   declaredBy,
    confidence:    declaredBy === 'OPERATOR' ? 1.0 : 0.70,
    provenance_ref: `horizon:${h}:${Date.now()}`,
  };
}
