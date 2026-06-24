// WO-1866 — Payload Contract Layer
// Drop-in emission guard. Validates every payload before it emits.
// Fail-open: violations are logged to telemetry, never thrown.
// No routing logic. No schema changes. Gate only.

import { emitTelemetry } from './telemetry.js';

export const CANONICAL_DOMAINS = new Set([
  'TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP',
]);

const INVALID_LENSES = new Set(['RESTART', 'UNSET', '']);

/**
 * Validates a payload before emission.
 * @param {object} payload    - export payload from buildExportPayload()
 * @param {object} dvReport   - optional DV report from decisionvelocity emit()
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validatePayload(payload, dvReport = null) {
  const violations = [];

  // 1. Domain — must resolve to canonical 6
  const domain = (
    payload?.subject?.domain ??
    payload?.domains?.[Object.keys(payload?.domains ?? {})[0]]?.domain ??
    null
  );
  if (!domain || !CANONICAL_DOMAINS.has(domain.toUpperCase())) {
    violations.push(`DOMAIN_INVALID: "${domain}" not in canonical set`);
  }

  // 2. Lens — routing failure states are not valid lenses
  const lens = payload?.subject?.lens ?? null;
  if (lens && INVALID_LENSES.has(String(lens).toUpperCase())) {
    violations.push(`LENS_INVALID: "${lens}" is a routing failure state, not a lens`);
  }

  // 3. Confidence semantic drift — confidence must not equal fs
  const confidence = payload?.signal_snapshot?.confidence ?? null;
  const fs         = payload?.provenance?.fidelity_score   ?? null;
  if (confidence !== null && fs !== null && confidence === fs) {
    violations.push(`CONFIDENCE_DRIFT: confidence === fs — semantic substitution detected (fs=${fs})`);
  }

  // 4–6. DV emission completeness
  if (dvReport !== null) {
    const { decision, flowId, timestamps } = dvReport;

    // 4. Decision must be binary
    if (decision !== 'allow' && decision !== 'deny') {
      violations.push(`DECISION_INVALID: expected 'allow'|'deny', got "${decision}"`);
    }

    // 5. flowId required
    if (!flowId) {
      violations.push('FLOW_ID_MISSING: no flowId on emission');
    }

    // 6. t0 and t2 required; t1 absence is degraded-valid
    if (timestamps?.t0 === null || timestamps?.t0 === undefined) {
      violations.push('T0_MISSING: ingest boundary not stamped');
    }
    if (timestamps?.t2 === null || timestamps?.t2 === undefined) {
      violations.push('T2_MISSING: decision boundary not resolved');
    }
  }

  const valid = violations.length === 0;

  // Emit to telemetry — non-fatal, always
  try {
    emitTelemetry({
      type:       'PAYLOAD_CONTRACT',
      valid,
      violations,
      domain,
      lens,
      flowId:     dvReport?.flowId ?? null,
      ts:         Date.now(),
    });
  } catch {
    // telemetry failure is never fatal
  }

  return { valid, violations };
}

/**
 * Attach contract result to payload as a non-enumerable audit field.
 * Does not mutate payload content — audit field only.
 */
export function attachContractAudit(payload, contractResult) {
  Object.defineProperty(payload, '_contract', {
    value:        contractResult,
    enumerable:   false,   // excluded from JSON.stringify → doesn't pollute export
    configurable: true,
  });
  return payload;
}
