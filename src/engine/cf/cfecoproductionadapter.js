// cfecoproductionadapter.js — CF-ECO's first production consumer (KRYL-1295 integration).
//
// Wires real dispatched observations into CF-ECO's classify -> persist -> compare
// pipeline. Purely additive: called AFTER a connector's real dispatch/admission already
// happened, never touches existing dispatch/formation logic, never throws into the
// caller -- a CF-ECO classification failure can never break a real observation.
//
// Connector-agnostic by design: takes an already-normalized observation shape, not a
// connector-specific artifact, so any of this app's real connectors can call it the
// same way (the first live wiring is capitalrealizationconnector.js -- confirmed live
// caller path: analysisidlefield.jsx's handleExecute() -> fireTopicConnectors() ->
// runCapitalRealizationSync(), fires on every real query that resolves a known entity).
//
// Honest gap, as of this integration: no entity anywhere in this app's live data
// (entityresolution.js's domainTags is KRYLO's 6-domain ontology, a DIFFERENT vocabulary
// than CF-ECO's ecosystem entity tags) carries a naicsCode or a CF-ECO entityTags value.
// tagObservationForCfEco() will therefore honestly return { tagged: false, skipped: true }
// for every real observation today -- this is correct per §19 (absence preserved, never
// manufactured), not a broken integration. Mapping domainTags onto ecosystem tags would be
// exactly the semantic substitution CF-ECO forbids (§9.1) -- not done here or anywhere else.

import { ecosystemsForObservation, isKnownEcosystem } from './cfecosystemtaxonomy.js';
import { makeEcoTag, ClassificationBasis } from './cfecotag.js';
import { persistEcoTag } from './cfecomemory.js';

/**
 * tagObservationForCfEco — attempt to classify + persist one real observation as one or
 * more CF-ECO EcoTags (§17: an observation may qualify for more than one ecosystem).
 * Never throws into the caller.
 *
 * @param {object} input
 * @param {string[]} input.entityIds        real, already-resolved entity identifier(s)
 * @param {string}   input.domain           one of KRYLO's canonical domains (lowercased
 *   or uppercased, cfecotag.js's isCanonicalDomain is case-insensitive)
 * @param {string|number} input.observedAt  epoch ms or ISO-8601 string
 * @param {string}   input.provenanceId     traces back to the originating observation
 * @param {?string}  [input.sourceId]
 * @param {?string}  [input.naicsCode]      real NAICS code, if this connector's data
 *   contract happens to carry one — passed through to observationQualifiesForEcosystem()
 *   unchanged, never invented
 * @param {?string[]} [input.entityTags]    real CF-ECO entity tags, if present — same
 * @returns {{ tagged: boolean, ecoTags?: object[], skipped?: boolean, reason?: string }}
 */
export function tagObservationForCfEco(input) {
  try {
    const { entityIds, domain, observedAt, provenanceId, sourceId = null,
      naicsCode = null, entityTags = null } = input ?? {};

    if (!Array.isArray(entityIds) || entityIds.length === 0 || !domain || !provenanceId) {
      return { tagged: false, skipped: true, reason: 'missing entityIds/domain/provenanceId' };
    }

    const rawObservation = { metadata: { naicsCode }, entityTags: entityTags ?? undefined };
    const ecosystems = ecosystemsForObservation(rawObservation);
    if (ecosystems.length === 0) {
      return {
        tagged: false, skipped: true,
        reason: 'no ecosystem membership criteria matched (no real naicsCode/entityTags on this observation)',
      };
    }

    const iso = typeof observedAt === 'number' ? new Date(observedAt).toISOString()
      : /^\d{4}-\d{2}-\d{2}T/.test(observedAt ?? '') ? observedAt
      : new Date(observedAt ?? Date.now()).toISOString();

    const ecoTags = ecosystems.map(ecosystem_id => persistEcoTag(makeEcoTag({
      ecosystem_id,
      entity_ids: entityIds,
      domain: [String(domain).toLowerCase()],
      relationship_id: null, // ⊥ — no relationship identity available at this integration point
      relationship_type: 'UNCLASSIFIED',
      observed_at: iso,
      route_id: null,
      provenance_id: provenanceId,
      source_id: sourceId,
      classification_basis: ClassificationBasis.SOURCE_CONTEXT, // the only basis that applies at this boundary
    }, { isValidEcosystem: isKnownEcosystem, routeAware: false, sourceExists: !!sourceId })));

    return { tagged: true, ecoTags };
  } catch (err) {
    return { tagged: false, skipped: true, reason: err.message };
  }
}
