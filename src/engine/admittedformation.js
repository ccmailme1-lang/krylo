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
  HAS_STATED_ROLE_ON_ISSUER_PAGE: ['LABOR'],                // KRYL-1419: the company's own page states a person's role (source-stated)
  LED_FUNDING_ROUND_PER_ISSUER: ['CAPITAL'],                // KRYL-1419: the company's own announcement states who led its funding round (source-stated)
  NAMED_IN_ARTICLE: ['MEDIA'],                              // KRYL-1418: a dated article's title names the company (nothing else is established)
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
  // Ratified 2026-10-13 (Intel, patents as KNOWLEDGE): an admitted granted-patent relationship also counts toward the KNOWLEDGE domain's COVERAGE, as patent-derived evidence only. It never forms a
  // cross-domain link (linkDomains excludes it): a patent does not establish research impact, author affiliation or any other knowledge relationship, and no link wording may imply one.
  // Ratified 2026-10-13 (a MEDIA relationship): a dated article that names the company counts toward MEDIA's COVERAGE and forms no cross-domain link (linkDomains is empty), because the relationship
  // establishes only that the title names the company: no connection to a workforce event, a control change or anything else may be implied by a link's meaning.
  const rels = relationships.map(r => { const dom = domainsOf(r, evidenceFor(r.id)); const link = r.type === 'NAMED_IN_ARTICLE' ? [] : dom; return { id: r.id, type: r.type, part: r.part, nuId: r.nuId ?? {}, linkDomains: link, domains: r.type === 'ASSIGNEE_OF_GRANTED_PATENT' && link.length ? [...link, 'KNOWLEDGE'] : dom }; }).filter(r => r.domains.length);
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
  // Founder ruling 2026-10-14 (reviewer finding, Broadcom): a pair belongs to the FORMATION only when ONE admitted relationship itself speaks to both domains. A pair whose only support is that the
  // same participant takes part in a relationship of each domain is NOT a formation: no record states a connection between the two domains. It is kept as a contextual lead, said to be one.
  const links = [], leads = [];
  for (let i = 0; i < domains.length; i++) for (let k = i + 1; k < domains.length; k++) {
    const a = domains[i], b = domains[k];
    const adm = admitCrossDomainRelationship(a, b); if (!adm.admitted) continue;
    const same = rels.filter(r => r.linkDomains.includes(a) && r.linkDomains.includes(b));                       // one relationship speaks to both
    if (same.length) { links.push({ a, b, pairType: adm.type, basis: 'ONE_RELATIONSHIP_SPEAKS_TO_BOTH', via: [], relationshipIds: same.map(r => r.id) }); continue; }
    const aOnly = rels.filter(r => r.linkDomains.includes(a)), bOnly = rels.filter(r => r.linkDomains.includes(b));
    const entsA = new Set(aOnly.flatMap(r => r.part)), entsB = new Set(bOnly.flatMap(r => r.part));
    const shared = [...entsA].filter(e => entsB.has(e));                                                         // a participant takes part in a relationship of each domain
    if (!shared.length) continue;
    const relIds = [...new Set([...aOnly, ...bOnly].filter(r => r.part.some(e => shared.includes(e))).map(r => r.id))];
    leads.push({ a, b, pairType: adm.type, basis: 'SHARED_PARTICIPANT', via: shared.map(e => ({ id: e, label: labelOf(e) })), relationshipIds: relIds });
  }
  const linkedDomains = [...new Set(links.flatMap(l => [l.a, l.b]))].sort();
  const structure = { relationships: rels.length, byType, byDomain, entities: entities.size, domains, links: links.length, linkedDomains, unlinkedDomains: domains.filter(d => !linkedDomains.includes(d)), patentDerivedKnowledge: domainRels.has('KNOWLEDGE') && !rels.some(r => r.linkDomains.includes('KNOWLEDGE')), articleOnlyMedia: domainRels.has('MEDIA') && !rels.some(r => r.linkDomains.includes('MEDIA')), leads: leads.length, sharedParticipantLeads: leads };
  if (!links.length) return { structure, formation: null, leads };
  const formation = {
    id: `admitted:${links.map(l => `${l.a}-${l.b}`).join('+')}`, basis: 'ADMITTED_RELATIONSHIPS',
    participatingDomains: linkedDomains,
    graph: { vertices: linkedDomains.map(d => ({ domain: d, meanMagnitude: domainMagnitudes[d] ?? 0 })), edges: links.map(l => ({ a: l.a, b: l.b, admittedType: l.pairType, pairType: l.pairType, basis: l.basis, via: l.via, relationshipIds: l.relationshipIds })) },
    existence: null,                                   // no composite score: admitted relationships carry no magnitude
    links, relationships: [...new Set(links.flatMap(l => l.relationshipIds))],
  };
  return { structure, formation, leads };
}

/** One sentence for the brief: what the admitted relationships establish, or why nothing is established. */
const TYPE_NOUN = { HAS_STATED_ROLE_ON_ISSUER_PAGE: ['role the company\'s own page states', 'roles the company\'s own page states'], LED_FUNDING_ROUND_PER_ISSUER: ['funding-round lead the company states', 'funding-round leads the company states'], NAMED_IN_ARTICLE: ['named-in-article relationship', 'named-in-article relationships'], HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE: ['beneficial-ownership disclosure', 'beneficial-ownership disclosures'], CAPITAL_EVENT_INVOLVES: ['capital-event relationship', 'capital-event relationships'], ACQUIRED: ['acquisition', 'acquisitions'], SHARED_PATENT_ASSIGNMENT: ['shared patent assignment', 'shared patent assignments'], HAS_OFFICER_OR_DIRECTOR_DISCLOSURE: ['officer or director disclosure', 'officer or director disclosures'], HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE: ['Form D officer or director disclosure', 'Form D officer or director disclosures'], LEAD_SPONSOR_OF_CLINICAL_TRIAL: ['clinical-trial sponsorship', 'clinical-trial sponsorships'], ASSIGNEE_OF_GRANTED_PATENT: ['granted-patent assignment', 'granted-patent assignments'] };
export const typeNoun = (t, n) => (TYPE_NOUN[t] ?? [t.toLowerCase().replace(/_/g, ' '), t.toLowerCase().replace(/_/g, ' ')])[n === 1 ? 0 : 1];
export function admittedFormationSentence({ structure, formation }, subjectLabel) {
  if (!structure.relationships) return `No formation established: no admitted relationship is on record for ${subjectLabel} yet.`;
  const parts = Object.entries(structure.byType).map(([t, n]) => `${n} ${typeNoun(t, n)}`).join(', ');
  const setAside = (d) => !(structure.patentDerivedKnowledge && d === 'KNOWLEDGE') && !(structure.articleOnlyMedia && d === 'MEDIA');
  // One short clause each: the MAP shows this sentence in a panel with a fixed budget of height, and a longer text takes the plot's room (found 2026-10-14).
  const notes = `${structure.patentDerivedKnowledge ? '; KNOWLEDGE (patent-derived) counts toward coverage and forms no link' : ''}${structure.articleOnlyMedia ? '; MEDIA (named-in-article) counts toward coverage and forms no link' : ''}`;
  if (!formation) {
    const dl = structure.domains.filter(setAside);
    return `No formation established: the ${structure.relationships} admitted relationship${structure.relationships !== 1 ? 's' : ''} (${parts}) speak${structure.relationships === 1 ? 's' : ''} to ${dl.length === 1 ? 'one domain only (' + dl[0] + ')' : `${dl.length} domains (${dl.join(', ')}) and no single admitted relationship speaks to two of them`}${notes}.`;
  }
  const ls = formation.links.map(l => `${l.a} ↔ ${l.b} (pair name: ${l.pairType} · one admitted relationship speaks to both)`).join('; ');
  return `${structure.relationships} admitted relationship${structure.relationships !== 1 ? 's' : ''} (${parts}) connect ${formation.participatingDomains.length} domains: ${ls}${notes}.`;
}

/**
 * How a Formation pair is supported, in words a reader can check: which admitted relationships sit on each side, and the basis. A pair whose basis is SHARED_PARTICIPANT is connected only
 * because the same party takes part in a relationship of each domain; no single relationship connects the two domains. A relationship counts in every pair its domain belongs to, so the
 * counts of different pairs overlap and are not meant to be added up.
 */
export function describeLinkSupport(link, relationships, evidenceFor = () => null) {
  const byId = new Map((relationships ?? []).map(r => [r.id, r]));
  const side = (dom) => {
    const c = {};
    for (const id of link.relationshipIds ?? []) { const r = byId.get(id); if (r && domainsOf(r, evidenceFor(r.id)).includes(dom)) c[r.type] = (c[r.type] ?? 0) + 1; }
    return Object.entries(c).map(([t, n]) => `${n} ${typeNoun(t, n)}`).join(' + ') || 'none';
  };
  const via = (link.via ?? []).map(v => v.label).slice(0, 3).join(', ');
  const basis = link.basis === 'ONE_RELATIONSHIP_SPEAKS_TO_BOTH' ? 'one admitted relationship speaks to both domains'
    : `no single relationship connects the two domains; ${via} takes part in a relationship of each`;
  return { basis, sides: `${link.a}: ${side(link.a)} · ${link.b}: ${side(link.b)}`, total: (link.relationshipIds ?? []).length };
}

/** The pairs that are NOT a formation: connected only because one participant takes part in a relationship of each domain. A contextual lead, never an admitted relationship.
 *  compact: one short line for the brief and the MAP (the full list, with each pair's support, is on the Analysis); the full form is for the synthesis. */
export function formationLeadsSentence({ leads = [] } = {}, { compact = false } = {}) {
  if (!leads.length) return '';
  const via = [...new Set(leads.flatMap(l => l.via.map(v => v.label)))].slice(0, 2).join(', ');
  const n = leads.length, pairs = `${n} domain pair${n !== 1 ? 's share' : ' shares'} a participant (${via})`;
  if (compact) return `Contextual leads, not a formation: ${pairs} and no admitted relationship speaks to both domains of ${n !== 1 ? 'any of them' : 'it'}.`;
  return `Contextual leads, not a formation: ${pairs} but no single admitted relationship speaks to both domains of a pair: ${leads.map(l => `${l.a} ↔ ${l.b} (pair name: ${l.pairType})`).join('; ')}.`;
}
