// qa_admittedformation.mjs -- Step 5: formation from admitted relationships only. Real saved filings and real SEC matches build the admitted
// relationships (capital events and ownership); co-presence plays no part.
import fs from 'fs';
import { extractCapitalEvent } from './src/engine/connectors/edgar8kcontent.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitCapitalEvents } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation, admittedFormationSentence, domainsOf } from './src/engine/admittedformation.js';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { buildPerceptionField } from './src/engine/perceptionread.js';
import { inferFormation } from './src/engine/formationinference.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const cp = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = cp[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z');
const html = (n) => fs.readFileSync(`tests/fixtures/sec/8k-${n}.htm`, 'utf8');
const GOOG = { cik: '0001652044', name: 'Alphabet Inc.' };
const build = (domainMagnitudes = {}) => { const rels = findAdmittedRelationshipsFor('CIK:0001652044'); return buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf: (id) => (NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, ''), domainMagnitudes }); };

console.log('Nothing admitted: no formation (co-presence cannot make one)');
_clearAdmittedForTests();
for (const d of ['capital', 'ownership', 'technology', 'labor']) for (let k = 0; k < 6; k++) surfaceRouter.dispatchBatch([{ id: `af-${d}-${k}`, domain: d, confidence: 80, ts: Date.now(), source: 'EDGAR_8K', meta: { canonicalId: 'af-co', eventDate: '2026-09-01' } }]);
const field = buildPerceptionField({ subject: 'af-co', windowMs: 1_800_000 });
const poolFormation = field.particles.length ? inferFormation(field.particles) : null;
ok(poolFormation && poolFormation.graph.edges.length >= 3, 'the signal pool alone would form a four-domain co-presence graph (the old mechanism)');
let r = build();
ok(r.formation === null && r.structure.relationships === 0, 'the admitted formation is empty: co-presence is not an input');
ok(/^No formation established: no admitted relationship/.test(admittedFormationSentence(r, 'Alphabet')), 'and it says why');

console.log('Capital events only: one domain, no cross-domain link');
const events = [{ accession: '0001193125-26-257724', filingDate: '2026-06-04', form: '8-K', items: ['1.01', '7.01', '8.01', '9.01'], eventClass: 'MATERIAL_CONTRACT', capital: extractCapitalEvent({ html: html('alphabet-1-01-7-01-8-01-2026-06-04'), items: ['1.01', '7.01', '8.01', '9.01'], registrant: 'Alphabet Inc.', accession: '0001193125-26-257724' }) }];
_clearCounterpartyCache(); const adm = await admitCapitalEvents({ filer: GOOG, events, searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
r = build();
ok(adm.admitted.length === 2 && r.structure.relationships === 2 && r.structure.byDomain.CAPITAL === 2 && r.formation === null, 'two admitted capital-event relationships speak to CAPITAL only: no formation');
ok(/one domain only \(CAPITAL\)/.test(admittedFormationSentence(r, 'Alphabet')), 'the sentence says the relationships speak to one domain only');

console.log('Add an ownership relationship through the same entity: a cross-domain link');
const own = admitAndProject({ part: ['CIK:0001652044', 'CIK:0000102909'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: '0000102909-26-000584', source: 'SEC_13D_13G', filingDate: '2026-03-26', form: 'SCHEDULE 13G/A' }, ts: Date.parse('2026-03-26') } }, { subjectCik: '0001652044', subjectName: 'Alphabet Inc.', filerCik: '0000102909', filerName: 'VANGUARD GROUP INC', source: 'SEC_13D_13G' });
r = build({ CAPITAL: 76, OWNERSHIP: 50 });
ok(own.admitted && r.formation && r.formation.participatingDomains.join() === 'CAPITAL,OWNERSHIP' && r.formation.graph.edges.length === 1, 'ownership + capital-event relationships sharing the filer link OWNERSHIP and CAPITAL');
const link = r.formation.links[0];
ok(link.pairType === 'financing of control / control financed' && link.basis === 'SHARED_PARTICIPANT' && link.via.some(v => /Alphabet/.test(v.label)), 'the link carries the ratified domain-pair type and the connecting entity (Alphabet), by shared participant');
ok(link.relationshipIds.length === 3, 'it lists the admitted relationships behind it (3), each traceable to a filing');
ok(r.formation.existence === null && r.formation.basis === 'ADMITTED_RELATIONSHIPS' && r.formation.graph.vertices.every(v => typeof v.meanMagnitude === 'number'), 'no composite score is computed (existence null); vertices carry the field magnitude only as context for the map');
ok(/connect 2 domains: CAPITAL ↔ OWNERSHIP \(pair name: financing of control/.test(admittedFormationSentence(r, 'Alphabet')) && /connected only because [^)]*takes part in a relationship of each domain\)/.test(admittedFormationSentence(r, 'Alphabet')), 'the sentence names the domains, the ontology\'s pair name and says how the pair is connected (only because the entity takes part in a relationship of each)');

console.log('A relationship that speaks to two domains links them by itself');
const eq = admitAndProject({ part: ['CIK:0000050863', 'CIK:0001045810'], type: 'CAPITAL_EVENT_INVOLVES', nuId: { event: 'X-EQ', partyQualifier: 'NONE' }, nuState: {}, evidence: { ts: 1, provenance: { source: 'SEC_8K_CAPITAL_EVENT', accession: 'X-EQ', form: '8-K', filingDate: '2025-12-29', items: ['3.02'], eventClass: 'EQUITY_OFFERING', instrument: 'Securities Purchase Agreement', passage: 'to NVIDIA Corporation ("NVIDIA")', counterpartyName: 'NVIDIA Corporation', counterpartyMatch: { outcome: 'SAME_ENTITY_CONFIRMED', identifier: { value: '0001045810' }, canonicalName: 'NVIDIA CORP', partyIsNamed: true, evidence: { accession: 'E' } }, ladderStep: 'ESTABLISHED_RELATIONSHIP', magnitude: 'INDETERMINATE' } } }, { filerName: 'INTEL CORP', filerCik: '0000050863', counterpartyName: 'NVIDIA CORP', counterpartyCik: '0001045810', counterpartyLabel: 'NVIDIA CORP (CIK 0001045810)' });
const ir = buildAdmittedFormation({ relationships: findAdmittedRelationshipsFor('CIK:0000050863'), evidenceFor: latestEvidenceFor });
ok(eq.admitted && domainsOf(eq.relationship, latestEvidenceFor(eq.relationship.id)).join() === 'CAPITAL,OWNERSHIP' && ir.formation?.links[0].basis === 'ONE_RELATIONSHIP_SPEAKS_TO_BOTH', 'an equity offering (event class maps to CAPITAL and OWNERSHIP) links the two domains through that one relationship');

console.log('The unnamed-affiliate qualification and evidence survive into the link');
const bhRel = findAdmittedRelationshipsFor('CIK:0001652044').find(x => x.nuId?.partyQualifier === 'UNNAMED_AFFILIATE_OF');
ok(!!bhRel && latestEvidenceFor(bhRel.id).provenance.counterpartyMatch.partyIsNamed === false, 'the Berkshire relationship is still an unnamed affiliate in the evidence the link points at');

console.log('A pair says how it is supported (found 2026-10-14)');
{
  const { buildAdmittedFormation: baf, describeLinkSupport } = await import('./src/engine/admittedformation.js');
  const rels = [
    ...Array.from({ length: 3 }, (_, i) => ({ id: `o${i}`, type: 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', part: ['CIK:0000000001', `P${i}`], nuId: {} })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: `b${i}`, type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['CIK:0000000001', `H${i}`], nuId: {} })),
  ];
  const f = baf({ relationships: rels, evidenceFor: () => null, labelOf: (id) => (id === 'CIK:0000000001' ? 'Acme' : id) });
  const l = f.formation.links[0], d = describeLinkSupport(l, rels);
  ok(l.basis === 'SHARED_PARTICIPANT' && /no single relationship connects the two domains; Acme takes part in a relationship of each/.test(d.basis), 'a shared-participant pair says no single relationship connects the two domains');
  ok(/LABOR: 3 officer or director disclosures/.test(d.sides) && /OWNERSHIP: 2 beneficial-ownership disclosures/.test(d.sides) && d.total === 5, 'it lists which admitted relationships sit on each side');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
