// KRYL-1158 — Evidence Intake Layer (Component 2).
// Boundary between raw upstream signal events and the Hydration Engine (Component 3). No
// invalid payload may pass this boundary — malformed events are quarantined (kept, tagged,
// telemetered) rather than silently dropped, per §22 absence-is-signal (FILTERED ABSENCE is a
// classified state, not a null).
//
// Validates against the ALREADY-LOCKED §16 signal ingestion contract (CLAUDE.md §16 Signal
// Ingestion Architecture): every source dispatches { source, domain, signal, confidence, ts }
// on a 0-100 scale. This module does not invent a new upstream shape — it enforces the
// existing one at the perception-frame boundary specifically.
//
// Migration Phase 1 — additive only. Nothing live imports this yet.

import { CANONICAL_DOMAINS } from './ontology.js';
import { emitTelemetry } from './telemetry.js';

const MAX_QUARANTINE = 200; // bounded ring buffer — quarantine is for diagnosis, not an unbounded log
const STALENESS_MS = 24 * 60 * 60 * 1000; // §16 doesn't set this; 24h is a conservative, documented default

let _quarantine = [];

/**
 * @typedef {{ source: string, domain: string, signal: number, confidence: number, ts: number }} RawEvidenceEvent
 * @typedef {{ domain: string, value: number, ts: number, source: string, confidence: number }} ValidatedEvidence
 */

/**
 * Validates one raw evidence event against the §16 contract. Returns violations — never
 * throws, never mutates input.
 * @param {Partial<RawEvidenceEvent>} raw
 * @returns {string[]}
 */
export function validateEvidenceEvent(raw) {
  const violations = [];
  if (!raw || typeof raw !== 'object') return ['evidence event must be an object'];

  if (typeof raw.source !== 'string' || !raw.source.trim()) {
    violations.push('missing or invalid "source"');
  }
  if (typeof raw.domain !== 'string' || !CANONICAL_DOMAINS.includes(raw.domain.toLowerCase())) {
    violations.push(`"domain" must be one of the 6 canonical domains (got ${JSON.stringify(raw.domain)})`);
  }
  if (typeof raw.signal !== 'number' || Number.isNaN(raw.signal) || raw.signal < 0 || raw.signal > 100) {
    violations.push(`"signal" must be a number in [0,100] (got ${JSON.stringify(raw.signal)})`);
  }
  if (typeof raw.confidence !== 'number' || Number.isNaN(raw.confidence) || raw.confidence < 0 || raw.confidence > 1) {
    violations.push(`"confidence" must be a number in [0,1] (got ${JSON.stringify(raw.confidence)})`);
  }
  if (typeof raw.ts !== 'number' || Number.isNaN(raw.ts) || raw.ts <= 0) {
    violations.push(`"ts" must be a positive number (got ${JSON.stringify(raw.ts)})`);
  } else if (raw.ts > Date.now() + 60_000) {
    // 60s tolerance for clock skew across sources, not zero-tolerance
    violations.push(`"ts" is in the future (${raw.ts} > now)`);
  } else if (Date.now() - raw.ts > STALENESS_MS) {
    violations.push(`"ts" is stale (older than ${STALENESS_MS}ms)`);
  }

  return violations;
}

/**
 * The single intake boundary. Accepts one raw event, returns either validated evidence
 * (ready for the Hydration Engine) or null (rejected — already quarantined + telemetered
 * before returning). Callers never need to separately quarantine or telemeter a rejection.
 * @param {Partial<RawEvidenceEvent>} raw
 * @returns {ValidatedEvidence|null}
 */
export function intake(raw) {
  const violations = validateEvidenceEvent(raw);

  if (violations.length) {
    const entry = { raw, violations, quarantinedAt: Date.now() };
    _quarantine.push(entry);
    if (_quarantine.length > MAX_QUARANTINE) _quarantine.splice(0, _quarantine.length - MAX_QUARANTINE);
    emitTelemetry({ type: 'perception.intake.rejected', violations, source: raw?.source ?? null, domain: raw?.domain ?? null });
    return null;
  }

  emitTelemetry({ type: 'perception.intake.accepted', source: raw.source, domain: raw.domain });

  return Object.freeze({
    domain:     raw.domain.toLowerCase(),
    value:      raw.signal,
    ts:         raw.ts,
    source:     raw.source,
    confidence: raw.confidence,
  });
}

/**
 * Runs intake() over a batch, returning only the validated survivors — rejections are
 * quarantined/telemetered individually as a side effect, same as intake() does per-event.
 * @param {Partial<RawEvidenceEvent>[]} rawEvents
 * @returns {ValidatedEvidence[]}
 */
export function intakeBatch(rawEvents) {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map(intake).filter(Boolean);
}

/**
 * Read-only view of quarantined (rejected) events — diagnostic access only, never a
 * secondary data path back into the perception engine.
 * @returns {ReadonlyArray<{raw: object, violations: string[], quarantinedAt: number}>}
 */
export function getQuarantine() {
  return Object.freeze([..._quarantine]);
}

/** Test/dev utility — resets the quarantine buffer. Not used by any production call path. */
export function _resetQuarantineForTests() {
  _quarantine = [];
}
