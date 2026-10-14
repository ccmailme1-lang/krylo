// issuerpageadmission.js -- KRYL-1419 (Founder ratified 2026-10-14). What the company's OWN pages state (connectors/issuerpage.js) -> admitted HAS_STATED_ROLE_ON_ISSUER_PAGE (LABOR) and
// LED_FUNDING_ROUND_PER_ISSUER (CAPITAL) relationships through the single write path. The company is the entity already identified by its GLEIF LEI (its record confirmed at query time); the person
// and the investor are the names as the page states them, scoped to the issuer's page (no matching, no merging). The ratified rule decides; a refusal is reported with its reason.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { NODE_LABELS } from './entitytopologyregistry.js';
import { companyNode } from './patentassigneeadmission.js';
import './ratifiedrelationshiptypes.js';

const slug = (n) => String(n ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '_');
export const issuerPersonNode = (lei, name) => `ISSUER_PAGE_PERSON:${String(lei).toUpperCase()}:${slug(name)}`;
export const issuerInvestorNode = (lei, name) => `ISSUER_PAGE_INVESTOR:${String(lei).toUpperCase()}:${slug(name)}`;

const identityOf = (entity) => ({ source: 'GLEIF', class: 'GLEIF_LEI', lei: String(entity.lei).toUpperCase(), legalName: entity.name, entityStatus: entity.gleif?.entityStatus ?? null, registrationStatus: entity.gleif?.registrationStatus ?? null, retrievedAt: entity.gleif?.retrievedAt ?? null });
const common = (entity, page, url, pageKind) => ({ source: 'ISSUER_PAGE', officialDomain: page.officialDomain, url, pageKind, retrievedAt: page.retrievedAt, identity: identityOf(entity), accession: url, filingDate: String(page.retrievedAt).slice(0, 10), form: 'Issuer web page' });

export function buildRoleAssertion({ entity, page, person }) {
  const node = issuerPersonNode(entity.lei, person.name);
  return { node, label: person.name, assertion: { part: [companyNode(entity), node], type: 'HAS_STATED_ROLE_ON_ISSUER_PAGE', nuId: { role: person.role }, nuState: {},
    evidence: { ts: Date.parse(page.retrievedAt) || Date.now(), provenance: { ...common(entity, page, page.leadership.url, 'LEADERSHIP'), personName: person.name, role: person.role, roleStated: true, personIdentity: 'NAME_SCOPED_TO_ISSUER_PAGE' } } } };
}
export function buildLeadAssertion({ entity, page, investor }) {
  const f = page.financing, node = issuerInvestorNode(entity.lei, investor);
  return { node, label: investor, assertion: { part: [companyNode(entity), node], type: 'LED_FUNDING_ROUND_PER_ISSUER', nuId: { round: f.label }, nuState: {},
    evidence: { ts: Date.parse(f.date ?? page.retrievedAt) || Date.now(), provenance: { ...common(entity, page, f.url, 'FINANCING_ANNOUNCEMENT'), investorName: investor, round: f.label, amount: f.amount, valuation: f.valuation ?? null, leads: f.leads, sentence: f.sentence, announcementDate: f.date ?? null, investorIdentity: 'NAME_SCOPED_TO_ISSUER_PAGE' } } } };
}

/** @returns {{ admitted: object[], rejected: object[] }} */
export function admitIssuerPage({ entity, page }) {
  const admitted = [], rejected = [];
  if (!entity?.lei || !page) return { admitted, rejected };
  const lbl = companyNode(entity); if (!NODE_LABELS[lbl]) NODE_LABELS[lbl] = entity.displayName ?? entity.name;
  const run = (b, kind) => {
    NODE_LABELS[b.node] = b.label;
    const res = admitAndProject(b.assertion, { companyName: entity.displayName ?? entity.name, partyLabel: b.label, source: 'ISSUER_PAGE' });
    if (res.admitted) admitted.push({ kind, party: b.label, predicate: res.predicate, relationship: res.relationship }); else rejected.push({ kind, party: b.label, reason: res.reason });
  };
  for (const person of page.leadership?.people ?? []) run(buildRoleAssertion({ entity, page, person }), 'ROLE');
  if (page.financing) for (const investor of page.financing.leads ?? []) run(buildLeadAssertion({ entity, page, investor }), 'LEAD');
  return { admitted, rejected };
}
