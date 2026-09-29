// structuralqueryinterpreter.js — KRYL-1335, RSI Structural Query Path.
//
// PURE, additive, domain-agnostic. Extracts structural participants (entities) and
// relationship/change language from free text, independent of the six canonical domains
// (CAPITAL/TECHNOLOGY/KNOWLEDGE/LABOR/MEDIA/OWNERSHIP) and independent of DOMAIN_LEXICON
// (canonicalresolution.js), which deliberately excludes this vocabulary -- that exclusion
// is untouched by this file (§1 KRYLO_2026-09-29 RSI spec, §3 "architectural boundaries").
//
// This is NOT a domain classifier and NOT an entity resolver. It answers one narrow
// question: "is this question grammatically asking about a relationship/structural change
// between named participants?" Real evidence-grounding (does a relationship between these
// participants actually exist) happens downstream, in structuralentitysynthesis.js -- this
// file only interprets the question's shape, it never asserts a relationship is real.
//
// Investigated before writing (§2 Shared Data Gate n/a -- this is a new, standalone module,
// no existing field/function touched): intentparser.js (unwired to querysynthesis.js, extracts
// one verb + one coarse domain tag from a different taxonomy, not entity pairs) and
// relationontology.js (relation-TYPE schema over already-identified observations, not a
// free-text parser) were checked and confirmed NOT to already do this -- see
// validation/rsi-production-test-results.md and the KRYL-1335 ticket description.

// Structural participant vocabulary -- generic structural-role nouns, not domain keywords.
// Explicitly NOT added to DOMAIN_LEXICON (canonicalresolution.js) or querysynthesis.js's own
// domain scorer -- this list exists only here, and only feeds `entities`, never a domain.
const ENTITY_PATTERNS = [
  ['SUPPLIER',    /\bsuppliers?\b/],
  ['DISTRIBUTOR', /\bdistributors?\b/],
  ['FACILITY',    /\bfacilit(?:y|ies)\b/],
  ['LOGISTICS',   /\blogistics?\b/],
  ['COMPANY',     /\bcompan(?:y|ies)\b/],
  ['LOCATION',    /\blocations?\b/],
  ['MARKET',      /\bmarkets?\b/],
  ['TECHNOLOGY',  /\btechnology\b/],
  ['OWNERSHIP',   /\bownership\b/],
  ['PARTNER',     /\bpartners?\b/],
  ['COMPETITOR',  /\bcompetitors?\b/],
  ['INVESTMENT',  /\b(?:investment|investor)s?\b/],
  ['ACQUISITION', /\bacquisitions?\b/],
];

// Relationship / structural-change intent language -- verbs and phrases describing a
// relationship existing, forming, or changing, not domain content.
const RELATIONSHIP_INTENT_PATTERNS = [
  ['EMERGING',       /\bemerging\b/],
  ['CHANGING',        /\bchang(?:e|es|ed|ing)\b/],
  ['CONCENTRATING',   /\bconcentrat(?:e|es|ed|ing|ion)\b/],
  ['CONNECTED',       /\bconnect(?:s|ed|ing|ion)?\b/],
  ['DISRUPTED',       /\bdisrupt(?:s|ed|ing|ion)?\b/],
  ['DEPENDENT',       /\bdepend(?:s|ent|ency|encies|ing)?\b/],
  ['AFFECTING',       /\baffect(?:s|ed|ing)?\b/],
  ['INTERCONNECTED',  /\binterconnect(?:s|ed|ing|ion)?\b/],
  ['FRICTION',        /\bfriction\b/],
  ['STRUCTURAL',      /\bstructural\b/],
  ['RELATIONSHIP',    /\brelationships?\b/],
  ['WATCHING',        /\bwatch(?:ing)?\b/],
];

function findMatches(q, patterns) {
  const out = [];
  for (const [label, re] of patterns) if (re.test(q)) out.push(label);
  return out;
}

/**
 * interpretStructuralQuery — additive, always-safe to call. Never throws, never asserts a
 * relationship is real (that's structuralentitysynthesis.js's job, against real evidence).
 * @param {string} query
 * @returns {{ state: 'INTERPRETABLE'|'UNRESOLVED', entities: string[], relationshipIntent: string[], context: string }}
 */
export function interpretStructuralQuery(query) {
  const q = (query ?? '').toLowerCase();
  const entities = findMatches(q, ENTITY_PATTERNS);
  const relationshipIntent = findMatches(q, RELATIONSHIP_INTENT_PATTERNS);

  // INTERPRETABLE requires both a structural participant AND relationship/change language --
  // either alone is not enough (a bare "supplier" with no relationship language is a lookup,
  // not a structural question; bare "changing" with no participant has nothing to relate).
  const state = (entities.length >= 1 && relationshipIntent.length >= 1) ? 'INTERPRETABLE' : 'UNRESOLVED';

  return Object.freeze({
    state,
    entities: Object.freeze(entities),
    relationshipIntent: Object.freeze(relationshipIntent),
    context: query ?? '',
  });
}
