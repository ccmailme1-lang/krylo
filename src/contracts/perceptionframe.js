// KRYL-1158 — Perception Contract (Component 1).
// Defines the immutable PerceptionFrame schema all downstream rendering consumes.
// Pure contract module: no rendering, no I/O, no mutable state of its own.
//
// Migration Phase 1 (KRYL-1158 §Migration Strategy) — this file is additive. It does not
// replace or touch the live ConeMap/OrientationSurface/AnalysisField render path. Nothing
// currently running imports this yet.

import { CANONICAL_DOMAINS } from '../engine/ontology.js';

// §2 Explicit Domain State Model. Exactly these four — no fifth state, no shorthand.
export const DOMAIN_STATE = Object.freeze({
  AWAITING: 'AWAITING', // expected, not yet observed — §22 TEMPORAL ABSENCE, never rendered as 0
  OBSERVED: 'OBSERVED', // real evidence hydrated, value is meaningful
  STALE:    'STALE',    // was OBSERVED, evidence has aged past freshness window
  INVALID:  'INVALID',  // malformed/rejected evidence — §22 FILTERED ABSENCE, never silently dropped
});

const VALID_STATES = new Set(Object.values(DOMAIN_STATE));

// Only these two states carry a real observed value. AWAITING/INVALID must carry `value: null`
// — enforced below, not left to caller discipline. This is the concrete mechanism behind the
// ticket's rule set: UNKNOWN ≠ ZERO, NO EVIDENCE ≠ LOW SIGNAL, INVALID DATA ≠ ABSENT DATA.
const VALUE_BEARING_STATES = new Set([DOMAIN_STATE.OBSERVED, DOMAIN_STATE.STALE]);

// §2 Rules: legal domain-state transitions. Anything not listed here is a contract violation —
// validateTransition() below is the single enforcement point, not left to call-site discipline.
const ALLOWED_TRANSITIONS = Object.freeze({
  [DOMAIN_STATE.AWAITING]: new Set([DOMAIN_STATE.OBSERVED, DOMAIN_STATE.INVALID]),
  [DOMAIN_STATE.OBSERVED]: new Set([DOMAIN_STATE.STALE, DOMAIN_STATE.INVALID, DOMAIN_STATE.OBSERVED]),
  [DOMAIN_STATE.STALE]:    new Set([DOMAIN_STATE.OBSERVED, DOMAIN_STATE.INVALID]),
  [DOMAIN_STATE.INVALID]:  new Set([DOMAIN_STATE.AWAITING, DOMAIN_STATE.OBSERVED]),
});

// §Definition of Done #4 — frame-level status, derived only, never set directly by a caller.
export const FRAME_STATUS = Object.freeze({
  COMPLETE: 'COMPLETE', // all six domains OBSERVED (STALE counts as complete-but-aging)
  PARTIAL:  'PARTIAL',  // mix of AWAITING and OBSERVED/STALE, no INVALID present
  DEGRADED: 'DEGRADED', // at least one domain INVALID — §6 Fault Containment: others still render
});

/**
 * @typedef {{ domain: string, state: string, value: number|null, ts: number, source: string|null }} DomainState
 * @typedef {{ frameId: string, status: string, createdAt: number, domains: Readonly<DomainState[]> }} PerceptionFrame
 */

let _frameCounter = 0;

/**
 * Validates one domain-state entry against the contract. Returns a violation list — never
 * throws. Callers (Evidence Intake Layer, Component 2) decide what to do with violations;
 * this module only defines what a violation IS.
 * @param {Partial<DomainState>} entry
 * @returns {string[]} violations, empty if valid
 */
export function validateDomainState(entry) {
  const violations = [];
  if (!entry || typeof entry !== 'object') {
    return ['domain state entry must be an object'];
  }
  if (!CANONICAL_DOMAINS.includes(entry.domain)) {
    violations.push(`domain "${entry.domain}" is not one of the 6 canonical domains`);
  }
  if (!VALID_STATES.has(entry.state)) {
    violations.push(`state "${entry.state}" is not a valid DOMAIN_STATE`);
  }
  const mustBeNull = entry.state === DOMAIN_STATE.AWAITING || entry.state === DOMAIN_STATE.INVALID;
  if (mustBeNull && entry.value !== null) {
    violations.push(`state ${entry.state} must carry value:null (got ${JSON.stringify(entry.value)}) — unknown/invalid is not zero`);
  }
  if (VALUE_BEARING_STATES.has(entry.state) && typeof entry.value !== 'number') {
    violations.push(`state ${entry.state} requires a numeric value (got ${JSON.stringify(entry.value)})`);
  }
  if (typeof entry.ts !== 'number') {
    violations.push('domain state entry requires a numeric ts (timestamp)');
  }
  return violations;
}

/**
 * Validates a proposed state transition. Pure function, no side effects — the single
 * enforcement point for "prevent ambiguous states" (KRYL-1158 Component 1 responsibility).
 * @param {string} fromState
 * @param {string} toState
 * @returns {boolean}
 */
export function validateTransition(fromState, toState) {
  if (!VALID_STATES.has(fromState) || !VALID_STATES.has(toState)) return false;
  return ALLOWED_TRANSITIONS[fromState]?.has(toState) ?? false;
}

/**
 * Constructs one AWAITING domain-state entry — the correct default for a domain with no
 * evidence yet. Never `{ value: 0 }`.
 * @param {string} domain
 * @returns {DomainState}
 */
export function awaitingDomainState(domain) {
  return Object.freeze({ domain, state: DOMAIN_STATE.AWAITING, value: null, ts: Date.now(), source: null });
}

/**
 * Builds an immutable PerceptionFrame from a full set of domain-state entries. Enforces the
 * Six Domain Contract: exactly the 6 canonical domains, no more, no fewer, no duplicates.
 * Frame-level `status` is derived, never accepted as caller input.
 * @param {DomainState[]} domainStates — must cover all 6 canonical domains exactly once
 * @returns {{ frame: PerceptionFrame|null, violations: string[] }}
 */
export function buildPerceptionFrame(domainStates) {
  const violations = [];

  if (!Array.isArray(domainStates)) {
    return { frame: null, violations: ['domainStates must be an array'] };
  }

  const byDomain = new Map();
  for (const entry of domainStates) {
    const entryViolations = validateDomainState(entry);
    if (entryViolations.length) {
      violations.push(...entryViolations);
      continue;
    }
    if (byDomain.has(entry.domain)) {
      violations.push(`duplicate domain state for "${entry.domain}" — a frame must have exactly one entry per domain`);
      continue;
    }
    byDomain.set(entry.domain, entry);
  }

  for (const domain of CANONICAL_DOMAINS) {
    if (!byDomain.has(domain)) {
      violations.push(`missing required domain "${domain}" — Six Domain Contract requires all 6 present in every frame`);
    }
  }

  if (violations.length) {
    return { frame: null, violations };
  }

  const orderedDomains = Object.freeze(CANONICAL_DOMAINS.map(d => byDomain.get(d)));
  const hasInvalid = orderedDomains.some(d => d.state === DOMAIN_STATE.INVALID);
  const allObserved = orderedDomains.every(d => d.state === DOMAIN_STATE.OBSERVED || d.state === DOMAIN_STATE.STALE);

  const status = hasInvalid ? FRAME_STATUS.DEGRADED : (allObserved ? FRAME_STATUS.COMPLETE : FRAME_STATUS.PARTIAL);

  _frameCounter += 1;
  const frame = Object.freeze({
    frameId: `pf_${Date.now().toString(36)}_${_frameCounter}`,
    status,
    createdAt: Date.now(),
    domains: orderedDomains,
  });

  return { frame, violations: [] };
}

/**
 * Cold-start frame: all 6 domains AWAITING. KRYL-1159 Test 1 — 6 cones created, none observed.
 * @returns {PerceptionFrame}
 */
export function coldStartFrame() {
  const { frame } = buildPerceptionFrame(CANONICAL_DOMAINS.map(awaitingDomainState));
  return frame;
}
