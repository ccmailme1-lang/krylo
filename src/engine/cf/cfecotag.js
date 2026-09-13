// cfecotag.js — CF-ECO v1.2 (specs/CF-ECO-v1.2-distributed-ecosystem-tagging.md), §4/§22.
// Schema + factory + conformance validators ONLY. No formation, no causality, no risk,
// no inference of any kind — see §18 hard boundaries. A distributed processor calls
// makeEcoTag() to classify an observation; it never asserts what the observation means.
//
// KRYL-1296/1297 dependency status at authoring time:
//   R (relationship_id) — RESOLVED. Canonical identity = RelationCore.id
//     (relationontology.js). TYPED_EDGES (entitytopologyregistry.js) is a separate, valid
//     system for fast graph traversal, NOT consolidated into R (diffed: only 7 vs 14
//     relation-type values, only ENABLES overlaps by name — genuinely distinct vocabularies).
//     This module does NOT verify relationship_id against a live RelationCore store —
//     no such queryable registry exists yet (KRYL-1296 finding). Shape-validated only
//     (non-empty string or absent); existence-checking is a follow-on once that store exists.
//   E (ecosystem_id) — NOT YET DEFINED (KRYL-1297, needs-founder-spec). This module never
//     hardcodes an ecosystem list — the authoritative set is injected by the caller
//     (isValidEcosystem). Until KRYL-1297 lands, callers must supply their own interim
//     set explicitly; this file fabricates nothing.
//   D (domain) — aliases CANONICAL_DOMAINS from ontology.js directly (KRYL-1063/§17: "No
//     component may declare its own domain list"). Never redeclared here.

import { CANONICAL_DOMAINS, isCanonicalDomain } from '../ontology.js';

export const CF_ECO_VERSION = '1.2';

// ── §9 — permitted classification-basis set ──────────────────────────────────
export const ClassificationBasis = Object.freeze({
  EXPLICIT:                        'EXPLICIT',
  DERIVED_FROM_KNOWN_ENTITY:        'DERIVED_FROM_KNOWN_ENTITY',
  DERIVED_FROM_KNOWN_RELATIONSHIP:  'DERIVED_FROM_KNOWN_RELATIONSHIP',
  ROUTE_CONTEXT:                    'ROUTE_CONTEXT',
  SOURCE_CONTEXT:                   'SOURCE_CONTEXT',
});
const BASIS_SET = Object.freeze(new Set(Object.values(ClassificationBasis)));
export const isClassificationBasis = b => BASIS_SET.has(b);

// §18.1/EC-V8 — the forbidden semantic set. A processor's output must never carry any of
// these keys. Checked structurally (key presence), not by value — presence alone is the
// violation, regardless of what the value would have been.
const FORBIDDEN_KEYS = Object.freeze([
  'formation', 'formation_status', 'consequentiality', 'causality', 'causal_interpretation',
  'risk', 'risk_interpretation', 'opportunity', 'opportunity_interpretation',
  'dependency', 'inferred_dependency', 'structural_significance', 'predicted_outcome',
  'prediction', 'friction', 'friction_score', 'ecosystem_change', 'ecosystem_importance',
  'importance', 'confidence_score', 'semantic_conclusion',
]);

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const isNonEmptyString = v => typeof v === 'string' && v.length > 0;
const isNonEmptyArray   = v => Array.isArray(v) && v.length > 0;

/**
 * makeEcoTag — the canonical EcoTag factory (§4.2). Validates every field against the
 * frozen contract; never guesses a value, never fills a missing field with a default.
 *
 * @param {object} input
 * @param {string}   input.ecosystem_id        must satisfy isValidEcosystem (§5.1)
 * @param {string[]} input.entity_ids          non-empty
 * @param {string[]} input.domain              non-empty, subset of CANONICAL_DOMAINS
 * @param {?string}  input.relationship_id     RelationCore.id or null/undefined (⊥) — §8.1
 * @param {string}   [input.relationship_type] defaults to 'UNCLASSIFIED' — §8.2
 * @param {string}   input.observed_at         ISO-8601
 * @param {?string}  [input.route_id]          required when routeAware is true — §11
 * @param {string}   input.provenance_id       required — §12
 * @param {?string}  [input.source_id]         required when a source exists — §12
 * @param {string}   input.classification_basis  one of ClassificationBasis — §9
 * @param {object}   opts
 * @param {(id: string) => boolean} opts.isValidEcosystem  authoritative E membership check —
 *   MUST be supplied by the caller (KRYL-1297); this module holds no ecosystem list itself.
 * @param {boolean}  [opts.routeAware]          whether this processor execution is route-aware
 * @param {boolean}  [opts.sourceExists]        whether a determinable source exists for this observation
 * @returns {object} frozen EcoTag
 */
export function makeEcoTag(input, opts) {
  const {
    ecosystem_id, entity_ids, domain, relationship_id = null,
    relationship_type = 'UNCLASSIFIED', observed_at, route_id = null,
    provenance_id, source_id = null, classification_basis,
  } = input ?? {};
  const { isValidEcosystem, routeAware = false, sourceExists = false } = opts ?? {};

  if (typeof isValidEcosystem !== 'function') {
    throw new Error('makeEcoTag: opts.isValidEcosystem is required (E is externally governed, §5.1 — never assumed here)');
  }

  // EC-V1 — ecosystem
  if (!isNonEmptyString(ecosystem_id) || !isValidEcosystem(ecosystem_id)) {
    throw new Error(`EcoTag EC-V1 violation: ecosystem_id "${ecosystem_id}" not authorized by the ecosystem taxonomy`);
  }
  // EC-V2 — entities
  if (!isNonEmptyArray(entity_ids)) {
    throw new Error('EcoTag EC-V2 violation: entity_ids must be non-empty');
  }
  // EC-V3 — domains
  if (!isNonEmptyArray(domain)) {
    throw new Error('EcoTag EC-V3 violation: domain must be non-empty');
  }
  const badDomains = domain.filter(d => !isCanonicalDomain(d));
  if (badDomains.length) {
    throw new Error(`EcoTag EC-V3 violation: domain contains non-canonical value(s): ${badDomains.join(', ')}`);
  }
  // EC-V4 — relationship identity: shape-only (⊥ or non-empty string). No existence check
  // against a live RelationCore store — none exists yet (KRYL-1296 finding, see file header).
  if (relationship_id !== null && !isNonEmptyString(relationship_id)) {
    throw new Error('EcoTag EC-V4 violation: relationship_id must be a non-empty string or null (⊥)');
  }
  // EC-V5 — temporal validity
  if (!isNonEmptyString(observed_at) || !ISO_8601.test(observed_at)) {
    throw new Error(`EcoTag EC-V5 violation: observed_at "${observed_at}" is not a valid ISO-8601 timestamp`);
  }
  // EC-V6 — classification basis
  if (!isClassificationBasis(classification_basis)) {
    throw new Error(`EcoTag EC-V6 violation: classification_basis "${classification_basis}" not in the permitted set`);
  }
  // EC-V7 — conditional route/source
  if (routeAware && !isNonEmptyString(route_id)) {
    throw new Error('EcoTag EC-V7 violation: route_id is required for route-aware processor execution');
  }
  if (sourceExists && !isNonEmptyString(source_id)) {
    throw new Error('EcoTag EC-V7 violation: source_id is required when a source exists and is determinable');
  }
  // §12 — provenance is always required, independent of routeAware/sourceExists
  if (!isNonEmptyString(provenance_id)) {
    throw new Error('EcoTag §12 violation: provenance_id is required (no EcoTag may be detached from its originating observation)');
  }
  // EC-V8 — forbidden output. Checked against the raw input object, not just the fields
  // this factory reads, so a caller cannot smuggle a forbidden key through unexamined.
  const present = FORBIDDEN_KEYS.filter(k => Object.prototype.hasOwnProperty.call(input ?? {}, k));
  if (present.length) {
    throw new Error(`EcoTag §18.1/EC-V8 violation: forbidden semantic field(s) present: ${present.join(', ')}`);
  }

  return Object.freeze({
    ecosystem_id,
    entity_ids: Object.freeze([...entity_ids]),
    domain: Object.freeze([...domain]),
    relationship_id,
    relationship_type,
    observed_at,
    route_id,
    provenance_id,
    source_id,
    classification_basis,
    cf_eco_version: CF_ECO_VERSION,
  });
}

// EC-V9 — determinism helper. normalize(o) is intentionally left to the caller (transport-
// specific); this just re-asserts the invariant so callers have a single conformance check
// to run in tests: same normalized observation -> same EcoTag, field for field.
export function assertDeterministic(tagA, tagB) {
  const keys = ['ecosystem_id', 'domain', 'relationship_id', 'relationship_type',
    'classification_basis'];
  for (const k of keys) {
    const a = JSON.stringify(tagA[k]);
    const b = JSON.stringify(tagB[k]);
    if (a !== b) {
      throw new Error(`EcoTag EC-V9 violation: field "${k}" differs across equivalent normalized observations (${a} vs ${b})`);
    }
  }
  return true;
}

export { CANONICAL_DOMAINS };
