// src/engine/perceptionhydrator.js
// KRYL-1158 (Phase 1) — Perception Hydration Engine.
// Pure function: raw signal records -> validated, immutable PerceptionFrame.
// Sits between Evidence Intake (schema validation, done inline here — this app has no
// separate transport layer to intercept) and the ConeMap renderer, which must consume
// only the frame this produces, never the raw records.
import { createPerceptionFrame, DOMAIN_STATE, CANONICAL_DOMAIN_ORDER } from '../contracts/perceptionframe.js';

/**
 * @typedef {Object} RawSignalRecord
 * @property {string} domain
 * @property {number} leverage   - raw 0-100 pressure candidate
 * @property {number} volatility - raw 0-1 volatility candidate
 */

function isFiniteInRange(v, lo, hi) {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
}

/**
 * Evidence Intake validation for one raw record. Returns true iff the record is
 * structurally sound enough to contribute to aggregation. Malformed records are
 * REJECTED here, not coerced or defaulted — a rejected record never reaches
 * aggregation, and is counted so INVALID can be distinguished from AWAITING.
 */
export function validateRawRecord(rec) {
  if (!rec || typeof rec !== 'object') return false;
  if (!CANONICAL_DOMAIN_ORDER.includes(rec.domain)) return false;
  if (!isFiniteInRange(rec.leverage, 0, 100)) return false;
  if (!isFiniteInRange(rec.volatility, 0, 1)) return false;
  return true;
}

/**
 * hydrate(rawRecords) -> PerceptionFrame
 *
 * Deterministic: same input array (by value) always produces the same frame (module-scope
 * counter only affects frameId, never domain content — see hydrate.test below for the
 * content-equality check that matters).
 *
 * Domain state rules (KRYL-1159 Gate 2):
 *   - domain has >=1 valid record            -> OBSERVED, pressure/volatility = mean of valid records
 *   - domain has 0 records at all             -> AWAITING (genuine temporal absence)
 *   - domain has >=1 record but ALL rejected  -> INVALID (evidence arrived, all of it malformed)
 */
export function hydrate(rawRecords = []) {
  const byDomain = new Map(CANONICAL_DOMAIN_ORDER.map(d => [d, { valid: [], rejected: 0 }]));

  for (const rec of rawRecords) {
    const domain = rec?.domain;
    if (!CANONICAL_DOMAIN_ORDER.includes(domain)) continue; // not a canonical domain at all — not this contract's concern
    const bucket = byDomain.get(domain);
    if (validateRawRecord(rec)) bucket.valid.push(rec);
    else bucket.rejected += 1;
  }

  const domainFrames = CANONICAL_DOMAIN_ORDER.map(domain => {
    const { valid, rejected } = byDomain.get(domain);
    if (valid.length > 0) {
      const pressure   = Math.min(100, Math.max(0, valid.reduce((s, r) => s + r.leverage, 0) / valid.length));
      const volatility = Math.min(1,   Math.max(0, valid.reduce((s, r) => s + r.volatility, 0) / valid.length));
      return { domain, state: DOMAIN_STATE.OBSERVED, pressure, volatility, recordCount: valid.length, rejectedCount: rejected };
    }
    if (rejected > 0) {
      return { domain, state: DOMAIN_STATE.INVALID, pressure: null, volatility: null, recordCount: 0, rejectedCount: rejected };
    }
    return { domain, state: DOMAIN_STATE.AWAITING, pressure: null, volatility: null, recordCount: 0, rejectedCount: 0 };
  });

  const frameId = `pf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return createPerceptionFrame(frameId, domainFrames);
}
