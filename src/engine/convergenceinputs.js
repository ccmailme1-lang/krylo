// convergenceinputs.js -- DEF-1373 (spec: specs/spec-def-1373-reconciled-five-state-v0.5-DRAFT-20261008.md).
// Measured inputs for the convergence classifier: T (temporal alignment from real event dates), V' (confidence
// dispersion on 0..1) and the declared magnitude scale. Pure functions, no pool access, no defaults standing in
// for evidence: T is null (a classified absence) when fewer than two valid event dates exist.

// ── Magnitude scale (spec section 1 / 5): declared by the producer, never inferred from the data.
// The domain pool emits confidence and magnitude on 0..100 (domaingravity.js computeDomainPressure).
export const MAGNITUDE_SCALE = '0-100';
const SUPPORTED_SCALES = ['0-1', '0-100'];

export function assertMagnitudeScaleConfigured(scale) { // no default: an undefined declaration must fail, not fall back
  if (!SUPPORTED_SCALES.includes(scale)) {
    const err = new Error(`CONFIGURATION_ERROR: magnitude_scale must be one of ${SUPPORTED_SCALES.join(', ')}; got ${String(scale)}`);
    err.code = 'CONFIGURATION_ERROR';
    throw err;
  }
  return scale;
}
assertMagnitudeScaleConfigured(MAGNITUDE_SCALE); // startup check: a missing or unsupported declaration stops the module from loading

// Fixed mapping to 0..1. Returns null for anything non-numeric or non-finite (the classifier treats null as invalid).
export function toUnitMagnitude(raw, scale = MAGNITUDE_SCALE) {
  assertMagnitudeScaleConfigured(scale);
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  return scale === '0-100' ? raw / 100 : raw;
}

// ── T: T = 1 - min(1, sigma_t / kappa), kappa = W / sqrt(12), W = 365 days, sigma_t the population standard
// deviation of the event dates in days.
export const TEMPORAL_HORIZON_DAYS = 365;
const KAPPA = TEMPORAL_HORIZON_DAYS / Math.sqrt(12);
const DAY_MS = 86_400_000;

function toDayNumber(d) {
  if (d == null || d === '') return null;
  const ms = typeof d === 'number' ? d : Date.parse(String(d));
  return Number.isFinite(ms) ? ms / DAY_MS : null;
}

// dates: iterable of event dates (ISO strings, Date-parsable strings or epoch ms). Invalid entries are skipped.
export function computeT(dates) {
  const days = [];
  for (const d of dates ?? []) { const n = toDayNumber(d); if (n !== null) days.push(n); }
  if (days.length < 2) return { T: null, n: days.length, reason: 'insufficient temporal evidence' };
  const mean = days.reduce((a, b) => a + b, 0) / days.length;
  const sigma = Math.sqrt(days.reduce((s, x) => s + (x - mean) ** 2, 0) / days.length);
  return { T: 1 - Math.min(1, sigma / KAPPA), n: days.length, reason: null };
}

// ── V': V' = min(1, sigma_c / 0.5), sigma_c the population standard deviation of confidences on 0..1.
// A single reading has observed dispersion 0 (the existing precedent in analysisfield.jsx, not an invention);
// no readings, or any invalid reading, is invalid evidence (null), never a measured score.
export function computeVPrime(confidences01) {
  const vals = [...(confidences01 ?? [])];
  if (vals.length === 0 || vals.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)) return null;
  if (vals.length === 1) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sigma = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  return Math.min(1, sigma / 0.5);
}

// Convenience for pool entries (domaingravity getDomainSignals): confidence 0..100, optional eventDate.
export function measuredInputsFromSignals(signals, magnitudeRaw) {
  const confs = (signals ?? []).map(s => (typeof s?.confidence === 'number' ? s.confidence / 100 : NaN));
  const { T } = computeT((signals ?? []).map(s => s?.eventDate));
  const M = toUnitMagnitude(magnitudeRaw);
  return { D: M, A: M, V: computeVPrime(confs), T };
}
