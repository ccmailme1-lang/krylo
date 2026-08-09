// src/contracts/perceptionframe.js
// KRYL-1158 (Phase 1) — Perception Contract.
// Defines the frame schema every consumer of domain signal state must read, and nothing else.
// Full spec: KRYL-1158/1159/1160.

export const CANONICAL_DOMAIN_ORDER = Object.freeze([
  'capital', 'ownership', 'labor', 'media', 'technology', 'knowledge',
]);

// AWAITING — domain exists, no contributing evidence has arrived yet (genuine temporal absence).
// OBSERVED — domain has at least one valid contributing record; pressure/volatility are real.
// STALE    — domain was OBSERVED but its evidence has aged past validity (not yet produced by
//            any hydrator in this phase — reserved for a future TTL-aware hydration pass).
// INVALID  — domain received evidence, but all of it failed schema validation.
export const DOMAIN_STATE = Object.freeze({
  AWAITING: 'AWAITING',
  OBSERVED: 'OBSERVED',
  STALE:    'STALE',
  INVALID:  'INVALID',
});

const VALID_STATES = new Set(Object.values(DOMAIN_STATE));

/**
 * @typedef {Object} DomainFrame
 * @property {string} domain
 * @property {'AWAITING'|'OBSERVED'|'STALE'|'INVALID'} state
 * @property {number|null} pressure   - null unless state === OBSERVED or STALE
 * @property {number|null} volatility - null unless state === OBSERVED or STALE
 * @property {number} recordCount     - number of valid records that contributed
 * @property {number} rejectedCount   - number of records rejected by schema validation
 */

/**
 * @typedef {Object} PerceptionFrame
 * @property {string} frameId
 * @property {'COMPLETE'|'PARTIAL'} status - COMPLETE iff every domain is OBSERVED
 * @property {number} createdAt
 * @property {DomainFrame[]} domains - always exactly the 6 canonical domains, fixed order
 */

function isFiniteInRange(v, lo, hi) {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
}

/** Validates a single DomainFrame entry. Returns true/false — never throws. */
export function isValidDomainFrame(df) {
  if (!df || typeof df !== 'object') return false;
  if (!CANONICAL_DOMAIN_ORDER.includes(df.domain)) return false;
  if (!VALID_STATES.has(df.state)) return false;
  if (df.state === DOMAIN_STATE.OBSERVED || df.state === DOMAIN_STATE.STALE) {
    if (!isFiniteInRange(df.pressure, 0, 100)) return false;
    if (!isFiniteInRange(df.volatility, 0, 1)) return false;
  } else {
    // AWAITING / INVALID carry no numeric truth claim.
    if (df.pressure !== null || df.volatility !== null) return false;
  }
  return true;
}

/** Validates a full PerceptionFrame. Returns true/false — never throws. */
export function isValidPerceptionFrame(frame) {
  if (!frame || typeof frame !== 'object') return false;
  if (typeof frame.frameId !== 'string' || !frame.frameId) return false;
  if (frame.status !== 'COMPLETE' && frame.status !== 'PARTIAL') return false;
  if (!Array.isArray(frame.domains) || frame.domains.length !== 6) return false;
  const domainsPresent = new Set(frame.domains.map(d => d?.domain));
  if (domainsPresent.size !== 6) return false;
  for (const d of CANONICAL_DOMAIN_ORDER) if (!domainsPresent.has(d)) return false;
  return frame.domains.every(isValidDomainFrame);
}

/**
 * Builds a frozen, immutable PerceptionFrame from already-classified DomainFrame entries.
 * Does not do aggregation/validation itself — src/engine/perceptionhydrator.js does that.
 * This is the one place a frame object gets constructed, so shape can't drift per call site.
 */
export function createPerceptionFrame(frameId, domainFrames) {
  const byDomain = new Map(domainFrames.map(d => [d.domain, d]));
  const domains = CANONICAL_DOMAIN_ORDER.map(d =>
    Object.freeze(byDomain.get(d) ?? {
      domain: d, state: DOMAIN_STATE.AWAITING, pressure: null, volatility: null,
      recordCount: 0, rejectedCount: 0,
    })
  );
  const status = domains.every(d => d.state === DOMAIN_STATE.OBSERVED) ? 'COMPLETE' : 'PARTIAL';
  const frame = Object.freeze({ frameId, status, createdAt: Date.now(), domains });
  return frame;
}
