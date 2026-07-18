// skillemergence.js — KRYL-1016 Workforce Intent: Skill Emergence (start-small slice).
// Detects the FIRST appearance of a skill family (e.g. CUDA, nuclear, optical) for an entity — an
// atomic, historical first-observation FACT (detect-not-predict §11a; §21 route-clean, one event per
// call). Hiring/postings are a LEADING INTENT precursor, not a labor outcome. Builds ON the existing
// federal connectors (usajobsconnector.js / blsconnector.js) — this is the derived intent layer, not
// a new connector (anti-ghost §4).
//
// DOCTRINE:
//  §17 — NO 7th domain. WORKFORCE_INTENT is an evidence-type TAG only; every emergence routes to one
//        of the six locked domains (skills→TECHNOLOGY, capex-proxy→CAPITAL, exec/org→OWNERSHIP, …).
//  §22 — an unknown skill family is WITHHELD (classified), never a fabricated emergence.
//  KRYL-977 — confidence comes from Modality-Weighted Evidence Reliability, not a new scheme.
//
// BOUNDARY (honest): this emits a graph-READY evidence node. Inserting it into the EvidenceGraph
// (WO-2004/2005B) is gated on a one-time ontology decision — a WORKFORCE_INTENT evidence DESCRIPTOR
// (epistemic tier + calibration prior) in evidencetiers.js. Until that lands, whytrace's No-Rewrite
// Rule would reject the type, so the node carries boundary:'GRAPH_INSERT_PENDING_DESCRIPTOR'.
import { computeWeightedEvidence } from './evidenceweighting.js';

// Skill family → canonical §17 domain. Small, explicit routing table (extend as families are named).
// A capex-proxy or org/exec family routes off LABOR — the gap the ticket names.
export const SKILL_FAMILY_DOMAIN = Object.freeze({
  cuda:        'TECHNOLOGY',
  optical:     'TECHNOLOGY',
  quantum:     'TECHNOLOGY',
  ml:          'TECHNOLOGY',
  nuclear:     'CAPITAL',      // capital-intensive buildout proxy
  fab:         'CAPITAL',
  reactor:     'CAPITAL',
  chief:       'OWNERSHIP',    // exec/org formation
  vp:          'OWNERSHIP',
  recruiting:  'LABOR',
});

const EVIDENCE_TAG = 'WORKFORCE_INTENT'; // evidence-type tag, NOT a domain (§17)

// First-observation ledger: `${entity}::${family}` → ts. Emergence = the transition into this map.
const _firstSeen = new Map();
export function resetSkillEmergence() { _firstSeen.clear(); }

const key = (entity, family) => `${String(entity).toLowerCase()}::${String(family).toLowerCase()}`;

/**
 * detectSkillEmergence(entity, skillFamily, obs) — is THIS the first time entity declares skillFamily?
 * @param {string} entity
 * @param {string} skillFamily   must be a known family in SKILL_FAMILY_DOMAIN
 * @param {Object} obs           { ts, source, modality, payload, sourceHistory?, concurrentPayloads? }
 * @returns one of:
 *   { withheld:true,  reason:'UNKNOWN_SKILL_FAMILY', skillFamily }            // §22
 *   { emergence:false, firstObservedTs }                                      // seen before → not new
 *   { emergence:true, node:{ type:'SKILL_EMERGENCE', evidenceType, entity, skillFamily, domain,
 *       firstObservedTs, source, confidence, weighted, factors, boundary } } // first observation
 */
export function detectSkillEmergence(entity, skillFamily, obs = {}) {
  const fam = String(skillFamily ?? '').toLowerCase();
  const domain = SKILL_FAMILY_DOMAIN[fam];
  if (!domain) return { withheld: true, reason: 'UNKNOWN_SKILL_FAMILY', skillFamily };

  const k = key(entity, fam);
  const prior = _firstSeen.get(k);
  if (prior != null) return { emergence: false, firstObservedTs: prior };

  const ts = obs.ts ?? Date.now();
  _firstSeen.set(k, ts);

  // Confidence via KRYL-977 (no new scheme). payload = a presence signal (1) for the posting.
  const w = computeWeightedEvidence(
    { entity_id: entity, modality: obs.modality ?? 'job_posting', payload: obs.payload ?? 1, timestamp: ts },
    { sourceHistory: obs.sourceHistory, concurrentPayloads: obs.concurrentPayloads },
  );

  return {
    emergence: true,
    node: {
      type:            'SKILL_EMERGENCE',
      evidenceType:    EVIDENCE_TAG,          // TAG only — not a domain (§17)
      entity,
      skillFamily:     fam,
      domain,                                  // one of the six §17 domains
      firstObservedTs: ts,
      source:          obs.source ?? 'USAJOBS',
      confidence:      w.reliability_weight,   // null when metadata missing (§22, not a fake score)
      weighted:        w.weighted_payload,
      factors:         w.factors ?? null,
      boundary:        'GRAPH_INSERT_PENDING_DESCRIPTOR',
    },
  };
}
