// cfecomemory.js — CF-ECO v1.2 §13 (CF Persistence) / §15 (Ecosystem Memory).
//
// CF remembers. It does not interpret. This module accepts already-classified,
// already-validated EcoTags (from cfecotag.js's makeEcoTag()) and persists them as
// traversal history -- append-only, keyed by ecosystem and entity for retrieval.
//
// What this module does NOT do (§18.2 CF MUST NOT):
//   - turn recurrence automatically into formation
//   - replace current evidence with historical evidence
//   - obscure provenance
//   - collapse unrelated routes because of shared ecosystem membership
//   - create semantic conclusions from EcoTags
//   - treat missing EcoTags as ecosystem absence
//   - convert traversal history into asserted meaning
// That is Homebase's and the structural layer's job (§14), not this one.
//
// OBSERVED vs DERIVED (§13): this module never needs its own gate for that distinction
// -- cfecotag.js's makeEcoTag() already rejects every forbidden semantic field (EC-V8)
// before a tag can exist at all, so nothing that reaches persistEcoTag() can be
// "derived" content. The guarantee is structural, not re-checked here.
//
// Persistence backing: in-memory, append-only arrays -- the same pattern already
// established in this codebase for exactly this kind of registry (entitytopologyregistry.js's
// TYPED_EDGES). Not a database; this is the minimal real implementation for the current
// scope, matching precedent rather than inventing new infrastructure (CLAUDE.md §1).
//
// §10 Temporal Preservation: records are NEVER overwritten or mutated. A later
// observation of the same ecosystem/entity/relationship is a NEW record, appended
// alongside the earlier ones -- both remain independently traversable.

const byEcosystem = new Map(); // ecosystem_id -> EcoTag[]
const byEntity    = new Map(); // entity_id    -> EcoTag[]
const byProvenance= new Map(); // provenance_id -> EcoTag[]  (§12 provenance chain lookup)

/**
 * persistEcoTag — append a validated EcoTag to persistent traversal history.
 * Never overwrites, never mutates, never deduplicates by content (two identical-looking
 * observations at different times are two real, distinct observations -- §10).
 *
 * @param {object} ecoTag  a frozen EcoTag from cfecotag.js's makeEcoTag() — NOT
 *   re-validated here. CF persists what the processor already classified; it does not
 *   re-run classification (separation of concerns, §25).
 * @returns {object} the same ecoTag, for chaining
 */
export function persistEcoTag(ecoTag) {
  if (!ecoTag || typeof ecoTag !== 'object') {
    throw new Error('persistEcoTag: ecoTag is required');
  }
  if (!ecoTag.ecosystem_id || !Array.isArray(ecoTag.entity_ids) || !ecoTag.provenance_id) {
    throw new Error('persistEcoTag: not a well-formed EcoTag (missing ecosystem_id/entity_ids/provenance_id) -- did this come from makeEcoTag()?');
  }

  const ecoList = byEcosystem.get(ecoTag.ecosystem_id) ?? [];
  ecoList.push(ecoTag);
  byEcosystem.set(ecoTag.ecosystem_id, ecoList);

  for (const entityId of ecoTag.entity_ids) {
    const entList = byEntity.get(entityId) ?? [];
    entList.push(ecoTag);
    byEntity.set(entityId, entList);
  }

  const provList = byProvenance.get(ecoTag.provenance_id) ?? [];
  provList.push(ecoTag);
  byProvenance.set(ecoTag.provenance_id, provList);

  return ecoTag;
}

/**
 * getEcosystemHistory — every EcoTag ever persisted for this ecosystem, in the order
 * persisted (append order == temporal order of arrival, not necessarily observed_at
 * order -- callers needing observed_at ordering should sort explicitly, since replay
 * order and observation-time order are not the same guarantee).
 *
 * §15: "a new query does not begin with an empty world" -- this is that world.
 * Absence of prior history (empty array) is a real, honest state, not an error --
 * it means no observation has been persisted for this ecosystem yet, nothing more.
 */
export function getEcosystemHistory(ecosystemId) {
  return Object.freeze([...(byEcosystem.get(ecosystemId) ?? [])]);
}

/**
 * getEntityHistory — every EcoTag mentioning this entity, across every ecosystem it
 * has ever been classified into (§17: an entity may belong to multiple ecosystems).
 */
export function getEntityHistory(entityId) {
  return Object.freeze([...(byEntity.get(entityId) ?? [])]);
}

/**
 * getProvenanceChain — every EcoTag traced back to a single originating observation
 * (§12). Normally a 1:1 lookup (one observation -> one EcoTag), but kept as an array
 * since nothing in the contract forbids a single observation producing more than one
 * classification (e.g. two ecosystems independently satisfied, §17).
 */
export function getProvenanceChain(provenanceId) {
  return Object.freeze([...(byProvenance.get(provenanceId) ?? [])]);
}

/**
 * knownEcosystems — the set of ecosystem_ids that actually have persisted history.
 * NOT the authoritative ecosystem taxonomy (E, KRYL-1297) -- this is "what has been
 * observed so far," a strictly smaller, purely descriptive set. Never used to validate
 * a new ecosystem_id; that authority lives in isValidEcosystem (cfecotag.js), external
 * to this module (§5.1).
 */
export function knownEcosystems() {
  return Object.freeze([...byEcosystem.keys()]);
}

// Test-only escape hatch -- CF-ECO has no "reset the world" concept in the spec, and
// production code must never call this. Exists so conformance tests can start from a
// clean slate without restarting the process.
export function __resetForTests() {
  byEcosystem.clear();
  byEntity.clear();
  byProvenance.clear();
}
