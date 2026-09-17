// cfecosystemtaxonomy.js — CF-ECO v1.2 §5/§5.1 (KRYL-1297). The authoritative E.
//
// Single source of truth for the ecosystem taxonomy, mirroring ontology.js's role for
// the six canonical domains ("no component may declare its own domain list"). This is
// that same rule applied to ecosystems: no processor mints an ecosystem_id, no processor
// invents membership criteria -- both live here only.
//
// Membership is DETERMINISTIC and STRUCTURAL, never probabilistic (§5.1, §9's own
// "contextual proximity is not a relationship" principle applied to ecosystems too): an
// observation qualifies for an ecosystem only via a hard NAICS-prefix match or an exact
// grounded entity-tag match. No text similarity, no semantic scoring, no LLM
// classification -- Defect A (Semantic Substitution) is excluded by construction.
//
// Ratified set + membership criteria: Founder-authored (KRYL-1297), not engineering-derived.

export const CANONICAL_ECOSYSTEMS = Object.freeze([
  'SEMICONDUCTOR',
  'DEFENSE_AEROSPACE',
  'PHARMA_BIOTECH',
  'AI_COMPUTING',
  'CLOUD_INFRASTRUCTURE',
  'FINANCIAL_SERVICES',
  'CONSTRUCTION_REAL_ESTATE',
]);
const ECOSYSTEM_SET = Object.freeze(new Set(CANONICAL_ECOSYSTEMS));

// ecosystem_id -> { naicsPrefixes: string[], entityTags: string[] }
const MEMBERSHIP_CRITERIA = Object.freeze({
  SEMICONDUCTOR:            Object.freeze({ naicsPrefixes: Object.freeze(['3344']),               entityTags: Object.freeze(['FAB', 'LITHOGRAPHY', 'SILICON', 'EDA']) }),
  DEFENSE_AEROSPACE:        Object.freeze({ naicsPrefixes: Object.freeze(['3364', '541715']),      entityTags: Object.freeze(['CAGE_CODE', 'DOD_CONTRACT', 'MIL-SPEC']) }),
  PHARMA_BIOTECH:           Object.freeze({ naicsPrefixes: Object.freeze(['3254', '541714']),      entityTags: Object.freeze(['FDA_APPROVAL', 'CLINICAL_TRIAL', 'API_MFG']) }),
  AI_COMPUTING:             Object.freeze({ naicsPrefixes: Object.freeze(['541511', '541512']),    entityTags: Object.freeze(['LLM', 'TENSOR', 'GPU_CLUSTER', 'NEURAL_NET']) }),
  CLOUD_INFRASTRUCTURE:     Object.freeze({ naicsPrefixes: Object.freeze(['5182', '541513']),      entityTags: Object.freeze(['DATA_CENTER', 'HYPERSCALER', 'COLOCATION']) }),
  FINANCIAL_SERVICES:       Object.freeze({ naicsPrefixes: Object.freeze(['522', '523']),           entityTags: Object.freeze(['AUM', 'LIQUIDITY_POOL', 'CLEARING_HOUSE']) }),
  CONSTRUCTION_REAL_ESTATE: Object.freeze({ naicsPrefixes: Object.freeze(['236', '531']),           entityTags: Object.freeze(['ZONING', 'CAP_RATE', 'COMMERCIAL_LEASE']) }),
});

/**
 * isKnownEcosystem — simple membership-in-taxonomy check. This is the function to pass
 * as cfecotag.js's makeEcoTag(..., { isValidEcosystem }) argument: "is this ecosystem_id
 * one of the 7 ratified IDs at all" — it does not look at any observation content.
 */
export function isKnownEcosystem(ecosystemId) {
  return ECOSYSTEM_SET.has(ecosystemId);
}

/**
 * observationQualifiesForEcosystem — the deterministic routing gate (§5.1: "the
 * observation satisfies the published membership criteria for e"). A processor calls
 * this BEFORE constructing an EcoTag, to decide which ecosystem_id(s) to use — it is
 * not itself part of makeEcoTag()'s validation (that only re-checks the ID is known,
 * per isKnownEcosystem above; it has no access to raw observation shape by design).
 *
 * Qualifies via a hard NAICS-prefix match OR an exact entity-tag match. Never text
 * similarity, never semantic scoring.
 *
 * @param {{ metadata?: { naicsCode?: string }, entityTags?: string[] }} observation
 * @param {string} ecosystemId  one of CANONICAL_ECOSYSTEMS
 * @returns {boolean}
 */
export function observationQualifiesForEcosystem(observation, ecosystemId) {
  const criteria = MEMBERSHIP_CRITERIA[ecosystemId];
  if (!criteria) return false;

  const naicsCode = observation?.metadata?.naicsCode;
  const hasNaicsMatch = typeof naicsCode === 'string' &&
    criteria.naicsPrefixes.some(prefix => naicsCode.startsWith(prefix));

  const tags = observation?.entityTags;
  const hasTagMatch = Array.isArray(tags) &&
    criteria.entityTags.some(tag => tags.includes(tag));

  return hasNaicsMatch || hasTagMatch;
}

/**
 * ecosystemsForObservation — every ecosystem this observation deterministically
 * qualifies for (§17 Multi-Ecosystem Membership: an entity/observation may belong to
 * more than one). Convenience wrapper over observationQualifiesForEcosystem — does not
 * add any new matching logic of its own.
 */
export function ecosystemsForObservation(observation) {
  return Object.freeze(
    CANONICAL_ECOSYSTEMS.filter(id => observationQualifiesForEcosystem(observation, id))
  );
}

export { MEMBERSHIP_CRITERIA };
