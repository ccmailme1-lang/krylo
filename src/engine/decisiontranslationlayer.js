// KRYL-987 — Decision Translation Layer (DTL, canonical contract)
// Spec: v2, locked 2026-07-05 (specs/ — see Jira KRYL-987 description for full text).
//
// The sole translation boundary between validated analytical outputs and
// downstream decision-oriented consumers (decisionframe.jsx and similar).
// Standardizes how findings are expressed WITHOUT modifying, recomputing,
// weighting, ranking, aggregating, or extending them.
//
// Boundary (non-negotiable):
//   NO evidence evaluation/routing/weighting/aggregation — CI-R/RBCS/KRYL-977 own that
//   NO metric computation or threshold evaluation — metricsengine.js owns that
//   NO inference, prediction, or recommendation generation
//   NO workflow orchestration, execution, or system state mutation
//   ONLY: accept finalized artifacts -> normalize into DecisionPacket -> package by reference
//
// Design rule: every field is a reference. The packet owns no analytical
// truth — it exposes references to truth that lives in upstream systems
// (identitykernel.js, structuralconfirmation.js, rbcsengine.js,
// metricsengine.js, whytrace.js KRYL-980, pathmemoryretrieval.js KRYL-978,
// structuralfingerprint.js KRYL-976). The DecisionPacket is NOT a
// persistence cache and SHALL NOT duplicate analytical values owned by
// upstream systems.
//
// Consumer scope (v2 patch 3, narrowed): decision-oriented consumers only
// (decisionframe.jsx and similar). Non-decision APIs, exports, and
// infrastructure interfaces are explicitly out of scope for this contract.
//
// Absence handling (v2 patch 1, section 22 compliant): an unresolved
// reference does NOT abort packet generation. It is represented as an
// explicit AbsenceReference with a classified absence_type drawn from the
// existing section 22 taxonomy. completeness becomes PARTIAL rather than
// failing the whole operation. Missing analytical references are represented
// as explicit absence artifacts and SHALL NOT be interpreted as null, zero,
// false, or unknown (v2 patch 2).

export const ABSENCE_TYPES = ['STRUCTURAL', 'TEMPORAL', 'ANOMALOUS', 'FILTERED'];

const REF_LIST_FIELDS = [
  'finding_refs', 'evidence_refs', 'metric_refs', 'rationale_refs',
  'historical_refs', 'trace_refs', 'provenance_refs',
];

const PACKET_SCHEMA_VERSION = 1;

// Deterministic FNV-1a-32 hash — same pattern already used in identitykernel.js
// and structuralconfirmation.js. packet_id is content-addressed (a hash of the
// resolved reference set), not random, so identical inputs deterministically
// produce identical packet_ids (FR2).
function fnv32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function isFinalized(ref) {
  return ref != null && ref.resolved !== undefined && ref.resolved !== null;
}

// FM5: circular reference detection — a reference's own id appearing in its
// own `via` provenance chain.
function findCircularReference(allRefs) {
  for (const ref of allRefs) {
    if (Array.isArray(ref?.via) && ref.via.includes(ref.reference_id)) {
      return ref.reference_id;
    }
  }
  return null;
}

/**
 * createDecisionPacket — the only way a DecisionPacket is constructed.
 *
 * @param {object} input — { finding_refs, evidence_refs, metric_refs,
 *   rationale_refs, historical_refs, trace_refs, constraints, provenance_refs }
 *   Each ref list holds either:
 *     - a resolved reference: { reference_id, resolved, source_subsystem, via? }
 *     - an unresolved reference: { reference_id, absence_type, source_subsystem, via? }
 *       (absence_type MUST be one of ABSENCE_TYPES — FM3 otherwise)
 *
 * @returns {{ ok: true, packet: DecisionPacket } | { ok: false, error: string, ...details }}
 *
 * Failure modes (per spec):
 *   FM2 INVALID_PROVENANCE      — a resolved ref is missing source_subsystem
 *   FM3 SCHEMA_MISMATCH         — an unresolved ref has no valid absence_type
 *   FM4 NON_FINALIZED_ARTIFACT  — reserved for future artifact-maturity checks
 *   FM5 CIRCULAR_REFERENCE      — a ref's id appears in its own via-chain (aborts)
 *   FM1 UNRESOLVED_REFERENCE    — NOT a failure (v2 patch): becomes an AbsenceReference
 */
export function createDecisionPacket(input = {}) {
  const {
    finding_refs = [], evidence_refs = [], metric_refs = [], rationale_refs = [],
    historical_refs = [], trace_refs = [], constraints = [], provenance_refs = [],
  } = input;

  const listsByField = {
    finding_refs, evidence_refs, metric_refs, rationale_refs,
    historical_refs, trace_refs, provenance_refs,
  };

  const allRefs = Object.values(listsByField).flat();

  // FM5 — circular reference aborts packet generation entirely (unlike FM1).
  const circularId = findCircularReference(allRefs);
  if (circularId) {
    return { ok: false, error: 'FM5_CIRCULAR_REFERENCE', reference_id: circularId };
  }

  const resolvedLists = {};
  const absence_refs = [];

  for (const field of REF_LIST_FIELDS) {
    resolvedLists[field] = [];
    for (const ref of listsByField[field] ?? []) {
      if (isFinalized(ref)) {
        // FM2 — a resolved reference must carry provenance.
        if (!ref.source_subsystem) {
          return { ok: false, error: 'FM2_INVALID_PROVENANCE', reference_id: ref.reference_id ?? null };
        }
        resolvedLists[field].push({
          reference_id: ref.reference_id,
          source_subsystem: ref.source_subsystem,
        });
      } else {
        // v2 patch 1: unresolved reference -> explicit AbsenceReference, packet continues.
        if (!ref?.absence_type || !ABSENCE_TYPES.includes(ref.absence_type)) {
          return {
            ok: false, error: 'FM3_SCHEMA_MISMATCH', reference_id: ref?.reference_id ?? null,
            reason: 'unresolved reference missing a valid section-22 absence_type',
          };
        }
        absence_refs.push({
          reference_id: ref.reference_id,
          absence_type: ref.absence_type,
          source_subsystem: ref.source_subsystem ?? null,
          detected_at: Date.now(),
        });
      }
    }
  }

  const completeness = absence_refs.length > 0 ? 'PARTIAL' : 'COMPLETE';

  // Content-addressed packet_id: hash of resolved refs + absence refs + constraints,
  // so identical inputs always produce an identical packet_id (FR2 determinism),
  // independent of generated_at (real wall-clock time, not part of the identity).
  const contentDigest = JSON.stringify({ resolvedLists, absence_refs, constraints });
  const packet_id = fnv32(contentDigest);

  const packet = Object.freeze({
    packet_id,
    generated_at: Date.now(),
    schema_version: PACKET_SCHEMA_VERSION,
    ...resolvedLists,
    constraints: [...constraints],
    completeness,
    absence_refs,
  });

  return { ok: true, packet };
}

/**
 * validateDecisionPacket — confirms a packet matches the canonical schema.
 * Read-only; does not mutate the packet.
 */
export function validateDecisionPacket(packet) {
  if (!packet || typeof packet !== 'object') return { valid: false, reason: 'not an object' };
  if (packet.schema_version !== PACKET_SCHEMA_VERSION) return { valid: false, reason: 'schema_version mismatch' };
  if (!['COMPLETE', 'PARTIAL'].includes(packet.completeness)) return { valid: false, reason: 'invalid completeness value' };
  for (const field of REF_LIST_FIELDS) {
    if (!Array.isArray(packet[field])) return { valid: false, reason: `${field} is not an array` };
  }
  if (!Array.isArray(packet.absence_refs)) return { valid: false, reason: 'absence_refs is not an array' };
  for (const a of packet.absence_refs) {
    if (!ABSENCE_TYPES.includes(a.absence_type)) return { valid: false, reason: `invalid absence_type: ${a.absence_type}` };
  }
  return { valid: true };
}

/**
 * serializeDecisionPacket / loadDecisionPacket — plain JSON round-trip.
 * No transformation beyond stringify/parse; the packet is already a plain
 * frozen object, so this is intentionally trivial.
 */
export function serializeDecisionPacket(packet) {
  return JSON.stringify(packet);
}

export function loadDecisionPacket(serialized) {
  const parsed = JSON.parse(serialized);
  const { valid, reason } = validateDecisionPacket(parsed);
  if (!valid) {
    const err = new Error(`E_DTL_INVALID_PACKET: ${reason}`);
    err.code = 'E_DTL_INVALID_PACKET';
    throw err;
  }
  return Object.freeze(parsed);
}
