// subjectrelationships.js — WO-5B stage 5B-3a (KRYL-1234).
//
// The subject-scoped relationship OBJECT. Its OWN model — the ConeMap OBSERVE
// layer is precedent for perception, NOT authority for this model. Founder
// contract (2026-08-30):
//   • vocabulary: the ratified 15 cross-domain types (admitCrossDomainRelationship)
//   • endpoint A + endpoint B: real 5B-2 subject observations (A(d,Subject).observations)
//   • NO relationship unless BOTH endpoints exist
//   • NO borrowed ConeMap state / strength; NO invented confidence
//   • NO synthetic / proxy observations
//   chain: bound observation ↔ admitted relationship ↔ bound observation
//
// QUARANTINE (KRYL-1235): this module MUST NOT import querysynthesis / synthGeneral
// / recommendedAction. The formation path is observation → relationship → formation,
// never legacy-narrative → confirmed-by-observations.

import { allDomains } from './adsubject.js';
import { admitCrossDomainRelationship } from './domainintelligence.js';

export const __quarantined = true;   // static assertion the Guest Acceptance Harness reads
export const SUBJECT_RELATIONSHIPS_VERSION = '5b-3a';

// scope: a subjectScope. → SubjectRelationship[] — empty unless ≥2 domains each
// carry a real subject observation AND their pair is one of the ratified 15.
export function subjectRelationships(scope) {
  if (scope?.kind !== 'ENTITY') return [];

  const observed = allDomains(scope)
    .filter(([, ad]) => ad.scoped && Array.isArray(ad.observations) && ad.observations.length > 0)
    .map(([d, ad]) => [d, ad.observations]);

  const out = [];
  for (let i = 0; i < observed.length; i++) {
    for (let j = i + 1; j < observed.length; j++) {
      const [a, obsA] = observed[i];
      const [b, obsB] = observed[j];
      const adm = admitCrossDomainRelationship(a, b);
      if (!adm.admitted) continue;               // not in the ratified 15 → no relationship
      out.push(Object.freeze({
        pair: adm.pair,
        type: adm.type,                           // the ratified type name, verbatim
        a, b,
        observationA: obsA[0],                    // the bound observation, unmodified
        observationB: obsB[0],
        observedBoth: true,
        // deliberately NO state / strength / confidence — per contract
      }));
    }
  }
  return out;
}

// Packet-facing summary: is there anything to perceive, and — honestly — why not.
export function subjectRelationshipState(scope) {
  if (scope?.kind !== 'ENTITY')
    return { status: 'NOT_APPLICABLE', reason: 'no resolvable subject', relationships: [] };

  const rels = subjectRelationships(scope);
  if (rels.length > 0)
    return { status: 'ADMITTED_RELATIONSHIPS', reason: null, relationships: rels };

  const observedCount = allDomains(scope)
    .filter(([, ad]) => Array.isArray(ad.observations) && ad.observations.length > 0).length;
  return {
    status: 'NO_ADMITTED_RELATIONSHIP',
    reason: observedCount < 2
      ? `${observedCount} domain${observedCount === 1 ? '' : 's'} carr${observedCount === 1 ? 'ies' : 'y'} a subject observation — a relationship needs two bound endpoints`
      : 'the observed domains are not an admitted cross-domain pair',
    relationships: [],
  };
}
