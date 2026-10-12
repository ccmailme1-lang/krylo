// qa_findings.mjs -- findings-first synthesis (integrated plan workstream 4). Real saved filings, real SEC matches, the real KRYL-1386 change classification.
// A finding is built from admitted relationships only; each carries its supporting relationships, temporal basis, strength, alternatives and its significance to the question.
import fs from 'fs';
import { extractCapitalEvent } from './src/engine/connectors/edgar8kcontent.js';
import { extractAcquisitions } from './src/engine/connectors/edgar8kacquisition.js';
import { htmlToText, itemBodies } from './src/engine/connectors/edgar8kcontent.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitCapitalEvents, admitAcquisitions } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation } from './src/engine/admittedformation.js';
import { buildFindings, questionDomainsFrom, STRENGTH } from './src/engine/analyticalfindings.js';
import { classifyOwnershipChange } from './src/engine/relationshipchange.js';
import { parseSchedule13GXml } from './src/engine/ownershipposition.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const cp = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses, ap = JSON.parse(fs.readFileSync('tests/fixtures/sec/acq-search-responses.json', 'utf8')).responses;
const mk = (src) => async (p) => { const r = src[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z'); const html = (n) => fs.readFileSync(`tests/fixtures/sec/8k-${n}.htm`, 'utf8'); const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const labelOf = (id) => String(NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');
const ev = (file, items, reg, acc, date, cls) => ({ accession: acc, filingDate: date, form: '8-K', items, eventClass: cls, capital: extractCapitalEvent({ html: html(file), items, registrant: reg, accession: acc }) });
const O = (o) => ({ issuerCik: '0001652044', family: 'new', dateBasis: 'event', form: 'SCHEDULE 13G/A', soleVote: 1, sharedVote: 0, soleDisp: 1, sharedDisp: 0, below5Flag: false, comments: null, releaseNumber: null, source: 'SEC', ...o });
const run = (rels, extra) => { const formation = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf }); return buildFindings({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation, ...extra }); };
const kinds = (F) => F.findings.map(f => f.kind);

console.log('Question domains');
ok(JSON.stringify(questionDomainsFrom('What structural relationships are forming around Broadcom across ownership, technology, and capital?')) === JSON.stringify(['OWNERSHIP', 'CAPITAL', 'TECHNOLOGY']), 'ownership, technology and capital named in the question are read');
ok(questionDomainsFrom('Across all six domains, what formation exists around Oracle?').length === 6, '"all six domains" means every domain');
ok(questionDomainsFrom('What is forming around Oracle?') === null, 'a question naming no domain returns null (every admitted domain is relevant)');

console.log('Ownership: who holds, what changed, what cannot be confirmed (Alphabet, real 13G records)');
_clearAdmittedForTests(); _clearCounterpartyCache();
const GOOG = { cik: '0001652044', name: 'Alphabet Inc.' };
const g = ev('alphabet-1-01-7-01-8-01-2026-06-04', ['1.01', '7.01', '8.01', '9.01'], 'Alphabet Inc.', '0001193125-26-257724', '2026-06-04', 'MATERIAL_CONTRACT');
const rg = await admitCapitalEvents({ filer: GOOG, events: [g], searchFn: mk(cp), now: NOW, sleep: async () => {}, gapMs: 0 });
const exit = parseSchedule13GXml(fx('new-vanguard-group-exit-2026-03-26.xml')), vcm = parseSchedule13GXml(fx('new-vanguard-capital-mgmt-2026-04-29.xml'));
const obs = [
  O({ accession: '0001104659-24-020000', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-13', eventDate: '2023-12-29', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 8.34 }),
  O({ accession: '0000102909-26-000584', filingDate: '2026-03-26', eventDate: '2026-03-13', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 0, shares: 0, below5Flag: true, comments: exit.person.comments, releaseNumber: exit.person.releaseNumber }),
  O({ accession: '0002100119-26-000161', form: 'SCHEDULE 13G', filingDate: '2026-04-29', eventDate: '2026-03-31', holderCik: '0002100119', holderName: 'VANGUARD CAPITAL MANAGEMENT LLC', cusip: '02079K305', percent: 7.48, comments: vcm.person.comments, releaseNumber: vcm.person.releaseNumber }),
  O({ accession: '0000950170-25-109161', filingDate: '2025-08-14', eventDate: '2025-06-30', holderCik: '0001242463', holderName: 'SCHMIDT ERIC E', cusip: '02079K305', percent: 0.83, below5Flag: true }),
];
const change = classifyOwnershipChange({ observations: obs, T: '2026-10-09', coverage: { complete: true } });
let rels = findAdmittedRelationshipsFor('CIK:0001652044');
for (const [holder, hcik, acc, d] of [['VANGUARD GROUP INC', '0000102909', '0000102909-26-000584', '2026-03-26'], ['VANGUARD CAPITAL MANAGEMENT LLC', '0002100119', '0002100119-26-000161', '2026-04-29']]) admitAndProject({ part: ['CIK:0001652044', 'CIK:' + hcik], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: acc, source: 'SEC_13D_13G', filingDate: d, form: 'SCHEDULE 13G/A' }, ts: Date.parse(d) } }, { subjectCik: '0001652044', subjectName: 'Alphabet Inc.', filerCik: hcik, filerName: holder, source: 'SEC_13D_13G' });
rels = findAdmittedRelationshipsFor('CIK:0001652044');
let F = run(rels, { subject: 'Alphabet Inc.', change, admissionReport: rg, questionDomains: ['OWNERSHIP', 'CAPITAL'] });
const own = F.findings.find(f => f.kind === 'OWNERSHIP_STRUCTURE');
ok(!!own && /holders? (has|have) disclosed beneficial ownership in Alphabet Inc\./.test(own.headline) && /reported ending (its|their) position \(VANGUARD GROUP INC\)/.test(own.headline) && /newly reported a position \(VANGUARD CAPITAL MANAGEMENT LLC\)/.test(own.headline), 'the ownership finding states who disclosed, who ended a position and who newly reported one');
ok(own.strength === STRENGTH.SUPPORTED && own.supporting.length === rels.filter(r => r.type === 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE').length && own.supporting.every(s => s.relationshipId), 'strength SUPPORTED; the supporting admitted relationships are listed by id');
ok(/two adjacent 12-month periods/.test(own.temporal) && own.alternatives.some(a => /does not show the shares were sold/.test(a)), 'the temporal basis is stated and a zero-percent filing is not read as a sale');
const realign = F.findings.find(f => f.kind === 'OWNERSHIP_REALIGNMENT');
ok(!!realign && realign.strength === STRENGTH.DOCUMENTED && /terminated filing .* states a realignment/.test(realign.headline) && /VANGUARD GROUP INC/.test(realign.headline) && /VANGUARD CAPITAL MANAGEMENT LLC/.test(realign.headline), 'a realignment between related filers is DOCUMENTED, in the filings\' own words, naming both filers');
ok(realign.alternatives.some(a => /do not establish why/.test(a)), 'and says the filings do not establish why');
ok(/ownership change the question asks about/.test(realign.significance) && own.significance.startsWith('This is the ownership part of the question'), 'significance to the question is stated when the question names ownership');

console.log('Financing, recurrence and what is unresolved (Intel, real 8-K)');
_clearAdmittedForTests(); _clearCounterpartyCache();
const INTEL = { cik: '0000050863', name: 'INTEL CORP' };
const e1 = ev('intel-3-02-2025-12-29', ['3.02'], 'INTEL CORP', '0000050863-25-000204', '2025-12-29', 'EQUITY_OFFERING'); const e2 = { ...e1, accession: '0000050863-26-000001', filingDate: '2026-02-02' };
const ri = await admitCapitalEvents({ filer: INTEL, events: [e1, e2], searchFn: mk(cp), now: NOW, sleep: async () => {}, gapMs: 0 });
admitAndProject({ part: ['CIK:0000050863', 'CIK:0001045810'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: '0001045810-26-000010', source: 'SEC_13D_13G', filingDate: '2026-02-10', form: 'SCHEDULE 13G' }, ts: Date.parse('2026-02-10') } }, { subjectCik: '0000050863', subjectName: 'INTEL CORP', filerCik: '0001045810', filerName: 'NVIDIA CORP', source: 'SEC_13D_13G' });
rels = findAdmittedRelationshipsFor('CIK:0000050863');
F = run(rels, { subject: 'INTEL CORP', admissionReport: { ...ri, rejected: [...ri.rejected, { counterparty: 'Goldman Sachs & Co. LLC', outcome: 'UNRESOLVED' }] }, questionDomains: ['CAPITAL'] });
const fin = F.findings.find(f => f.kind === 'FINANCING');
ok(!!fin && /INTEL CORP reported 2 capital events \(2025-12-29 to 2026-02-02\) naming 1 identified counterparty/.test(fin.headline) && /NVIDIA/.test(fin.headline), 'the financing finding counts events and identified counterparties with the dates');
ok(/is named in more than one event/.test(fin.headline) && /1 other named party could not be identified/.test(fin.headline), 'recurrence and the unidentified party are stated');
ok(fin.alternatives.some(a => /does not establish the terms of a continuing relationship/.test(a)) && fin.alternatives.some(a => /Goldman Sachs & Co\. LLC/.test(a)), 'alternatives: participation is not a continuing relationship; the unidentified party is named');
ok(F.findings[0].kind === 'FINANCING', 'the lead finding is the one that answers the capital question');
const cross = F.findings.find(f => f.kind === 'CROSS_DOMAIN');
ok(cross && /Admitted relationships connect CAPITAL, OWNERSHIP/.test(cross.headline) && cross.supporting.length > 0, 'the cross-domain finding names the domains the admitted relationships connect');

console.log('Acquisition, from the filing (Boeing / Spirit, real 8-K)');
_clearAdmittedForTests(); _clearCounterpartyCache();
const BOEING = { cik: '0000012927', name: 'BOEING CO' };
const aev = { accession: '0001193125-24-172676', filingDate: '2024-07-01', form: '8-K', items: ['1.01'], acquisition: extractAcquisitions({ bodies: itemBodies(htmlToText(fs.readFileSync('tests/fixtures/sec/8k-acq-boeing-2024-07-01-1.01_7.01_9.01.htm', 'utf8'))), registrant: 'BOEING CO', accession: '0001193125-24-172676' }) };
await admitAcquisitions({ filer: BOEING, events: [aev], searchFn: mk(ap), now: NOW, sleep: async () => {}, gapMs: 0 });
rels = findAdmittedRelationshipsFor('CIK:0000012927'); F = run(rels, { subject: 'BOEING CO', questionDomains: ['CAPITAL', 'OWNERSHIP'] });
const aq = F.findings.find(f => f.kind === 'ACQUISITION');
ok(!!aq && aq.strength === STRENGTH.DOCUMENTED && /entered an agreement to acquire Spirit AeroSystems Holdings, Inc\.; the deal is pending as the latest filing read states it \(reported 2024-07-01\)/.test(aq.headline), 'a stated acquisition is DOCUMENTED, pending as the filing states it, with the filing date');
ok(aq.alternatives.some(a => /7\.01 or 8\.01/.test(a)) && aq.evidence[0].accession === '0001193125-24-172676' && /Spirit AeroSystems/.test(aq.evidence[0].passage), 'the Items 7.01 and 8.01 limit is stated as an open alternative; the evidence carries the accession and the passage');

console.log('A domain the question names that has no admitted relationship is stated, not implied empty');
F = run(rels, { subject: 'BOEING CO', questionDomains: ['OWNERSHIP', 'CAPITAL', 'TECHNOLOGY', 'LABOR'] });
const lim = F.findings.find(f => f.kind === 'COVERAGE_LIMIT');
ok(!!lim && lim.strength === STRENGTH.UNRESOLVED && /TECHNOLOGY, LABOR/.test(lim.headline) && /nothing there can be stated as part of BOEING CO's structure/.test(lim.headline), 'technology and labor named, no admitted relationship: a COVERAGE_LIMIT finding says so plainly');
ok(['COVERAGE_LIMIT', 'NONE_FOUND'].includes(F.findings[F.findings.length - 1].kind), 'coverage statements are listed last, after the findings that do exist');
const own1 = [{ id: 'r1', type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['CIK:1', 'CIK:2'], nuId: {} }];
F = run(own1, { subject: 'X', questionDomains: ['OWNERSHIP', 'CAPITAL', 'TECHNOLOGY'] });
const nf = F.findings.find(f => f.kind === 'NONE_FOUND'), cl = F.findings.find(f => f.kind === 'COVERAGE_LIMIT');
ok(nf && /CAPITAL/.test(nf.headline) && !/TECHNOLOGY/.test(nf.headline) && /8-K capital events and acquisitions/.test(nf.headline) && /not that no such relationship exists/.test(nf.alternatives[0]), 'capital HAS a producer but none was found for the company: worded as what the filings read contain, not as "no type exists"');
ok(cl && /TECHNOLOGY/.test(cl.headline) && !/CAPITAL/.test(cl.headline), 'technology has no producing type: the coverage limit names only technology');
ok(!/checked and found empty/.test(lim.headline) && lim.alternatives[0].includes('not company-bound'), 'it does not imply the domains were checked and found empty');

console.log('One domain only: no cross-domain structure, said once');
F = run([{ id: 'r1', type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['CIK:1', 'CIK:2'], nuId: {} }], { subject: 'X', questionDomains: null });
ok(F.findings.some(f => f.kind === 'CROSS_DOMAIN' && /No cross-domain structure is established/.test(f.headline) && /one domain only \(OWNERSHIP\)/.test(f.headline)), 'relationships in one domain: "no cross-domain structure is established" with the reason');
F = run([], { subject: 'X' });
ok(F.findings.length === 0 && F.lead === null, 'no admitted relationships: no finding is invented');

console.log('Never a verdict');
{
  const all = JSON.stringify(run(rels, { subject: 'BOEING CO', questionDomains: ['OWNERSHIP', 'CAPITAL'] }).findings);
  ok(!/\b(should|recommend|good investment|bad investment|attractive|risky|safe to|we advise)\b/i.test(all), 'no finding recommends, advises or judges');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
