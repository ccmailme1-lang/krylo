// admittedformation.js -- Step 5 of the decision record (2026-10-11): FORMATION consumes only admitted relationships.
// Input: the admitted canonical relationships present in the analytical snapshot (the frozen view), with their evidence. Co-presence in the signal pool
// is NOT an input: it stays a labelled contextual lead (formationinference.js, shown separately) and never becomes a formation member.
//
// A relationship speaks to one or more domains: by its type (ownership disclosure = OWNERSHIP) or, for a capital event, by the locked event-class map
// (eventdomains.js: an equity offering speaks to CAPITAL and OWNERSHIP). Two domains are LINKED only when admitted relationships connect them:
//   (a) one relationship speaks to both domains (its own evidence says so), or
//   (b) a participant (an entity) takes part in an admitted relationship of each domain.
// A link carries the ratified domain-pair type (domainintelligence.js admitCrossDomainRelationship), the connecting entities and the relationship ids,
// so every statement traces to relationships and through them to filings. No score is computed from admitted relationships: `existence` is null
// (the pool-based composite used magnitudes; admitted relationships carry none, and none is invented).
//
//   buildAdmittedFormation({ relationships, evidenceFor, labelOf, domainMagnitudes? }) -> { structure, formation | null }
import { admitCrossDomainRelationship } from './domainintelligence.js';
import { EVENT_DOMAIN_MAP } from './eventdomains.js';

const TYPE_DOMAINS = Object.freeze({
  HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE: ['OWNERSHIP'],
  ACQUIRED: ['CAPITAL', 'OWNERSHIP'],                 // an acquisition is capital deployed and a change of ownership (the 8-K map: ACQUISITION -> capital, ownership)
  SHARED_PATENT_ASSIGNMENT: ['TECHNOLOGY'],           // patent records feed TECHNOLOGY in patentsviewconnector.js
  CAPITAL_EVENT_INVOLVES: ['CAPITAL'],                // refined by the event class below
  HAS_OFFICER_OR_DIRECTOR_DISCLOSURE: ['LABOR'],
  HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE: ['LABOR'],
  ASSIGNEE_OF_GRANTED_PATENT: ['TECHNOLOGY'],              // KRYL-1416: the USPTO granted-patent table assigns a patent to the company
  LEAD_SPONSOR_OF_CLINICAL_TRIAL: ['KNOWLEDGE'],           // KRYL-1414: ClinicalTrials.gov states the company leads a registered study   // KRYL-1413: a private filer's officer or director as its own Form D states it      // KRYL-1411: an officer or director of the issuer, as an SEC insider form states it
});

/** The domains one admitted relationship speaks to. */
export function domainsOf(rho, evidence) {
  if (rho.type === 'CAPITAL_EVENT_INVOLVES') {
    const cls = evidence?.provenance?.eventClass;
    const mapped = cls ? EVENT_DOMAIN_MAP[cls] : null;
    const d = (mapped ?? TYPE_DOMAINS.CAPITAL_EVENT_INVOLVES).map(x => String(x).toUpperCase());
    return d.includes('CAPITAL') ? d : ['CAPITAL', ...d];
  }
  return [...(TYPE_DOMAINS[rho.type] ?? [])];
}

export function buildAdmittedFormation({ relationships = [], evidenceFor = () => null, labelOf = (id) => id, domainMagnitudes = {} } = {}) {
  const rels = relationships.map(r => ({ id: r.id, type: r.type, part: r.part, nuId: r.nuId ?? {}, domains: domainsOf(r, evidenceFor(r.id)) })).filter(r => r.domains.length);
  const byType = {}, byDomain = {}; const entities = new Set();
  const domainEntities = new Map(), domainRels = new Map();
  for (const r of rels) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    for (const e of r.part) entities.add(e);
    for (const d of r.domains) {
      byDomain[d] = (byDomain[d] ?? 0) + 1;
      (domainRels.get(d) ?? domainRels.set(d, []).get(d)).push(r);
      const es = domainEntities.get(d) ?? domainEntities.set(d, new Set()).get(d); r.part.forEach(e => es.add(e));
    }
  }
  const domains = [...domainRels.keys()].sort();
  const links = [];
  for (let i = 0; i < domains.length; i++) for (let k = i + 1; k < domains.length; k++) {
    const a = domains[i], b = domains[k];
    const adm = admitCrossDomainRelationship(a, b); if (!adm.admitted) continue;
    const same = rels.filter(r => r.domains.includes(a) && r.domains.includes(b));                       // (a) one relationship speaks to both
    const aOnly = rels.filter(r => r.domains.includes(a) && !r.domains.includes(b)), bOnly = rels.filter(r => r.domains.includes(b) && !r.domains.includes(a));
    const entsA = new Set(aOnly.flatMap(r => r.part)), entsB = new Set(bOnly.flatMap(r => r.part));
    const shared = [...entsA].filter(e => entsB.has(e));                                                 // (b) a participant takes part in a relationship of each domain
    if (!same.length && !shared.length) continue;
    const relIds = [...new Set([...same.map(r => r.id), ...[...aOnly, ...bOnly].filter(r => r.part.some(e => shared.includes(e))).map(r => r.id)])];
    links.push({ a, b, pairType: adm.type, basis: same.length && shared.length ? 'RELATIONSHIP_AND_SHARED_PARTICIPANT' : (same.length ? 'ONE_RELATIONSHIP_SPEAKS_TO_BOTH' : 'SHARED_PARTICIPANT'), via: shared.map(e => ({ id: e, label: labelOf(e) })), relationshipIds: relIds });
  }
  const linkedDomains = [...new Set(links.flatMap(l => [l.a, l.b]))].sort();
  const structure = { relationships: rels.length, byType, byDomain, entities: entities.size, domains, links: links.length, linkedDomains, unlinkedDomains: domains.filter(d => !linkedDomains.includes(d)) };
  if (!links.length) return { structure, formation: null };
  const formation = {
    id: `admitted:${links.map(l => `${l.a}-${l.b}`).join('+')}`, basis: 'ADMITTED_RELATIONSHIPS',
    participatingDomains: linkedDomains,
    graph: { vertices: linkedDomains.map(d => ({ domain: d, meanMagnitude: domainMagnitudes[d] ?? 0 })), edges: links.map(l => ({ a: l.a, b: l.b, admittedType: l.pairType, pairType: l.pairType, basis: l.basis, via: l.via, relationshipIds: l.relationshipIds })) },
    existence: null,                                   // no composite score: admitted relationships carry no magnitude
    links, relationships: rels.map(r => r.id),
  };
  return { structure, formation };
}

/** One sentence for the brief: what the admitted relationships establish, or why nothing is established. */
const TYPE_NOUN = { HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE: ['beneficial-ownership disclosure', 'beneficial-ownership disclosures'], CAPITAL_EVENT_INVOLVES: ['capital-event relationship', 'capital-event relationships'], ACQUIRED: ['acquisition', 'acquisitions'], SHARED_PATENT_ASSIGNMENT: ['shared patent assignment', 'shared patent assignments'], HAS_OFFICER_OR_DIRECTOR_DISCLOSURE: ['officer or director disclosure', 'officer or director disclosures'], HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE: ['Form D officer or director disclosure', 'Form D officer or director disclosures'], LEAD_SPONSOR_OF_CLINICAL_TRIAL: ['clinical-trial sponsorship', 'clinical-trial sponsorships'], ASSIGNEE_OF_GRANTED_PATENT: ['granted-patent assignment', 'granted-patent assignments'] };
const typeNoun = (t, n) => (TYPE_NOUN[t] ?? [t.toLowerCase().replace(/_/g, ' '), t.toLowerCase().replace(/_/g, ' ')])[n === 1 ? 0 : 1];
export function admittedFormationSentence({ structure, formation }, subjectLabel) {
  if (!structure.relationships) return `No formation established: no admitted relationship is on record for ${subjectLabel} yet.`;
  const parts = Object.entries(structure.byType).map(([t, n]) => `${n} ${typeNoun(t, n)}`).join(', ');
  if (!formation) return `No formation established: the ${structure.relationships} admitted relationship${structure.relationships !== 1 ? 's' : ''} (${parts}) speak${structure.relationships === 1 ? 's' : ''} to ${structure.domains.length === 1 ? 'one domain only (' + structure.domains[0] + ')' : 'domains with no shared participant'}.`;
  const ls = formation.links.map(l => `${l.a} ↔ ${l.b} (${l.pairType}${l.via.length ? ` · through ${l.via.slice(0, 2).map(v => v.label).join(', ')}` : ''})`).join('; ');
  return `${structure.relationships} admitted relationship${structure.relationships !== 1 ? 's' : ''} (${parts}) connect ${formation.participatingDomains.length} domains: ${ls}.`;
}
