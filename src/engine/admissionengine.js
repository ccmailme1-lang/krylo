// src/engine/admissionengine.js
// WO-2049 — Admission machinery. Evaluates one candidate relationship against Gate-0 policy and
// produces a TruthEvent. Pure. Rule-based (PASS/FAIL/ESCALATE per KRYL-1133 §3) — no numeric
// aggregation, no confidence blending. Additive. Not wired into any live surface.
//
// Discovery ≠ Admission ≠ Storage (KRYL-1133's irreducible principle):
//   - Discovery: the caller supplies a candidate (RelationCore-shaped) — this module never
//     originates one.
//   - Admission: this module evaluates it against GATE0_POLICY and decides.
//   - Storage: this module returns a TruthEvent; it does not persist it. Persistence/topology is
//     DQ-1 (RESOLVED: single ledger) and is the caller's responsibility, not this engine's.
//
// I1 (no self-validation): `decidedBy` must be supplied by the caller and must not equal the
// candidate's own `provenanceHash`-linked producer — this module cannot enforce that a *different*
// component called it (that's an architectural/deployment guarantee), but it refuses to default
// or infer `decidedBy`, which is the one thing in its control.

import { GATE0_POLICY } from './gate0policy.js';
import { makeTruthEvent, EventType, Vocabulary } from './truthevent.js';

const admissionState = Object.freeze({
  VALIDATED: 'VALIDATED',
  REJECTED:  'REJECTED',
  PROPOSED:  'PROPOSED', // ESCALATE outcome — undecided, not admitted, not rejected
});

/**
 * evaluateAdmission — pure predicate evaluation, PASS/FAIL/ESCALATE per rule, never blended.
 * @param {{vocabulary, relationType, origin}} candidate
 * @param {object} policy — defaults to the real GATE0_POLICY; injectable for testing
 * @returns {{ decision, rationale: [{ruleId, outcome, message}] }}
 */
export function evaluateAdmission({ vocabulary, relationType, origin }, policy = GATE0_POLICY) {
  const rationale = [];

  // GATE0_VOCAB and GATE0_TYPE are genuine prerequisites, not short-circuits: without a resolved
  // `table`/`entry`, GATE0_ENABLED and GATE0_ORIGIN have no policy object to evaluate against —
  // there is nothing left to record, not merely something skipped for convenience.
  const table = policy[vocabulary];
  if (!table) {
    rationale.push({ ruleId: 'GATE0_VOCAB', outcome: 'FAIL', message: `unknown vocabulary ${vocabulary}` });
    return { decision: admissionState.REJECTED, rationale };
  }
  rationale.push({ ruleId: 'GATE0_VOCAB', outcome: 'PASS', message: `vocabulary ${vocabulary} recognized` });

  const entry = table[relationType];
  if (!entry) {
    rationale.push({ ruleId: 'GATE0_TYPE', outcome: 'FAIL', message: `${relationType} not in Gate-0 table for ${vocabulary}` });
    return { decision: admissionState.REJECTED, rationale };
  }
  rationale.push({ ruleId: 'GATE0_TYPE', outcome: 'PASS', message: `${relationType} present in Gate-0 table` });

  // From here, GATE0_ENABLED and GATE0_ORIGIN are both independently evaluable off the same
  // `entry` — both are always recorded, never short-circuited, so rationale is a complete audit
  // record of every applicable rule, not just the rules reached before the first failure.
  rationale.push(entry.enabled
    ? { ruleId: 'GATE0_ENABLED', outcome: 'PASS', message: `${relationType} is Gate-0 enabled` }
    : { ruleId: 'GATE0_ENABLED', outcome: 'FAIL', message: `${relationType} is Gate-0 disabled (Defer)` });

  if (entry.allowedOrigins) {
    if (!origin) {
      rationale.push({ ruleId: 'GATE0_ORIGIN', outcome: 'ESCALATE', message: 'origin required but not supplied' });
    } else if (!entry.allowedOrigins.includes(origin)) {
      rationale.push({ ruleId: 'GATE0_ORIGIN', outcome: 'FAIL', message: `origin ${origin} not in allowedOrigins [${entry.allowedOrigins.join(', ')}]` });
    } else {
      rationale.push({ ruleId: 'GATE0_ORIGIN', outcome: 'PASS', message: `origin ${origin} allowed` });
    }
  }

  // Aggregate per KRYL-1133 §3, applied once over the complete rule set: any FAIL -> REJECTED;
  // else any ESCALATE -> PROPOSED (operationalStatus AWAITING_REVIEW); else VALIDATED.
  const hasFail     = rationale.some(r => r.outcome === 'FAIL');
  const hasEscalate = rationale.some(r => r.outcome === 'ESCALATE');
  const decision = hasFail ? admissionState.REJECTED
    : hasEscalate ? admissionState.PROPOSED
    : admissionState.VALIDATED;

  return { decision, rationale };
}

/**
 * admitCandidate — evaluates + wraps the result into a TruthEvent. Does not persist it (see
 * module header: storage is the caller's concern, this is admission only).
 * @param {object} candidate — RelationCore-shaped: { id, sourceId, targetId, relationType,
 *   provenanceHash }, plus { vocabulary, origin } for Gate-0 evaluation
 * @param {{ decidedBy, rulesetVersion, evidenceRefs?, now? }} opts
 */
export function admitCandidate(candidate, opts) {
  if (!opts?.decidedBy) throw new Error('admitCandidate: decidedBy is required (I1 — no self-validation, no default)');
  if (!candidate?.provenanceHash) throw new Error('admitCandidate: candidate must carry provenanceHash (no unsourced relation)');

  const { decision, rationale } = evaluateAdmission(candidate);
  const now = opts.now ?? Date.now();

  const eventType = decision === admissionState.VALIDATED ? EventType.RELATIONSHIP_ADMITTED
    : decision === admissionState.REJECTED ? EventType.RELATIONSHIP_REJECTED
    : EventType.RELATIONSHIP_PROPOSED;

  const event = makeTruthEvent({
    eventId: `evt_${candidate.id}_${now}`,
    eventType,
    vocabulary: candidate.vocabulary,
    relationType: candidate.relationType,
    relationshipId: candidate.id,
    subjectId: candidate.sourceId,
    objectId: candidate.targetId,
    decision,
    rationale,
    decidedBy: opts.decidedBy,
    rulesetVersion: opts.rulesetVersion,
    evidenceRefs: opts.evidenceRefs ?? [],
    supersedes: null,
    producedAt: candidate.createdAt ?? now,
    recordedAt: now,
  }, opts.sreRelationTypes ?? new Set());

  return { decision, event };
}
