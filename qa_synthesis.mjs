// qa_synthesis.mjs -- Step 6: structural synthesis with transparent evidence attribution. Real saved filings and SEC matches; the temporal result is
// the real KRYL-1386 classification over parsed 13G filings.
import fs from 'fs';
import { extractCapitalEvent } from './src/engine/connectors/edgar8kcontent.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitCapitalEvents } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation } from './src/engine/admittedformation.js';
import { buildSynthesis, STATUS } from './src/engine/analyticalsynthesis.js';
import { classifyOwnershipChange } from './src/engine/relationshipchange.js';
import { parseSchedule13GXml } from './src/engine/ownershipposition.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const cp = JSON.parse(fs.readFileSync('tests/fixtures/sec/cp-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = cp[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z'); const html = (n) => fs.readFileSync(`tests/fixtures/sec/8k-${n}.htm`, 'utf8'); const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const ev = (file, items, reg, acc, date, cls) => ({ accession: acc, filingDate: date, form: '8-K', items, eventClass: cls, capital: extractCapitalEvent({ html: html(file), items, registrant: reg, accession: acc }) });
const labelOf = (id) => String(NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');

// Subject: Intel. The NVIDIA purchase is reported twice (two accessions) so a repeat counterparty exists; NVIDIA is also a disclosed holder.
_clearAdmittedForTests(); _clearCounterpartyCache();
const INTEL = { cik: '0000050863', name: 'INTEL CORP' };
const e1 = ev('intel-3-02-2025-12-29', ['3.02'], 'INTEL CORP', '0000050863-25-000204', '2025-12-29', 'EQUITY_OFFERING');
const e2 = { ...e1, accession: '0000050863-26-000001', filingDate: '2026-02-02' };
const report = await admitCapitalEvents({ filer: INTEL, events: [e1, e2], searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
admitAndProject({ part: ['CIK:0000050863', 'CIK:0001045810'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: '0001045810-26-000010', source: 'SEC_13D_13G', filingDate: '2026-02-10', form: 'SCHEDULE 13G' }, ts: Date.parse('2026-02-10') } }, { subjectCik: '0000050863', subjectName: 'INTEL CORP', filerCik: '0001045810', filerName: 'NVIDIA CORP', source: 'SEC_13D_13G' });
const rels = findAdmittedRelationshipsFor('CIK:0000050863');
const formation = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
const S = buildSynthesis({ subject: 'INTEL CORP', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation, change: null, admissionReport: { ...report, rejected: [...report.rejected, { accession: '0000050863-25-000204', counterparty: 'Goldman Sachs & Co. LLC', outcome: 'UNRESOLVED' }] } });
const by = (st) => S.statements.filter(s => s.status === st);

console.log('Every statement carries one status and its evidence');
ok(S.statements.length > 0 && S.statements.every(s => Object.values(STATUS).includes(s.status)), 'each statement has exactly one of DOCUMENTED, SUPPORTED, INFERRED, UNRESOLVED');
ok(by('DOCUMENTED').length === 2 && by('DOCUMENTED').every(s => s.evidence[0].accession && s.evidence[0].passage && s.evidence[0].match === 'SAME_ENTITY_CONFIRMED'), 'the two capital events are DOCUMENTED, each with accession, quoted passage and its matching outcome');
ok(by('DOCUMENTED').every(s => s.evidence[0].passage.includes('NVIDIA Corporation')), 'the quoted passages contain the counterparty name as the filing states it');
ok(/\$5\.0 billion \(aggregate purchase price in cash of\) as stated; no magnitude is derived/.test(by('DOCUMENTED')[0].text), 'amounts are quoted with the filing\'s wording and no magnitude is derived');
ok(S.statements.filter(s => s.status !== 'UNRESOLVED' || s.evidence.length).every(s => s.evidence.length > 0), 'every statement that asserts something has at least one evidence reference');

console.log('Supported structure and what is inferred from it');
ok(by('SUPPORTED').some(s => /connect 2 domains: CAPITAL ↔ OWNERSHIP/.test(s.text)), 'the formation the admitted relationships establish is SUPPORTED');
const rep = by('SUPPORTED').find(s => /named as a counterparty in 2 of the 2 admitted capital events/.test(s.text));
ok(!!rep && rep.evidence.length === 2, 'a repeat counterparty is a SUPPORTED count over admitted relationships (2 of 2 events, both listed)');
const inf = by('INFERRED');
ok(inf.length === 2 && inf.every(s => s.evidence.length > 0 && Array.isArray(s.rests_on) && s.rests_on.length), 'two INFERRED statements, each naming what it rests on and the relationships behind it');
ok(inf.every(s => /(points to|may hold)/.test(s.text) && /(documents? each)/.test(s.text)), 'an inference is worded as an inference and says what the filings document');
ok(by('SUPPORTED').some(s => /both as a disclosed holder and as a capital-event counterparty/.test(s.text)), 'a holder who is also a counterparty is a SUPPORTED observation about two admitted relationships');

console.log('What is unresolved is stated, not dropped');
const un = by('UNRESOLVED');
ok(un.some(s => /could not be matched to an identified entity/.test(s.text) && /Goldman Sachs & Co\. LLC/.test(s.text)), 'an unmatched counterparty is UNRESOLVED and named');
ok(un.some(s => /magnitude is not assessed in this version \(INDETERMINATE\)/.test(s.text)), 'capital-event magnitude is stated INDETERMINATE');

console.log('Unnamed affiliate and ownership change');
_clearAdmittedForTests(); _clearCounterpartyCache();
const GOOG = { cik: '0001652044', name: 'Alphabet Inc.' };
const g = ev('alphabet-1-01-7-01-8-01-2026-06-04', ['1.01', '7.01', '8.01', '9.01'], 'Alphabet Inc.', '0001193125-26-257724', '2026-06-04', 'MATERIAL_CONTRACT');
const rg = await admitCapitalEvents({ filer: GOOG, events: [g], searchFn, now: NOW, sleep: async () => {}, gapMs: 0 });
const exit = parseSchedule13GXml(fx('new-vanguard-group-exit-2026-03-26.xml')), vcm = parseSchedule13GXml(fx('new-vanguard-capital-mgmt-2026-04-29.xml'));
const O = (o) => ({ issuerCik: '0001652044', family: 'new', dateBasis: 'event', form: 'SCHEDULE 13G/A', soleVote: 1, sharedVote: 0, soleDisp: 1, sharedDisp: 0, below5Flag: false, comments: null, releaseNumber: null, source: 'SEC', ...o });
const obs = [
  O({ accession: '0001104659-24-020000', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-13', eventDate: '2023-12-29', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 8.34 }),
  O({ accession: '0000102909-26-000584', filingDate: '2026-03-26', eventDate: '2026-03-13', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 0, shares: 0, below5Flag: true, comments: exit.person.comments, releaseNumber: exit.person.releaseNumber }),
  O({ accession: '0002100119-26-000161', form: 'SCHEDULE 13G', filingDate: '2026-04-29', eventDate: '2026-03-31', holderCik: '0002100119', holderName: 'VANGUARD CAPITAL MANAGEMENT LLC', cusip: '02079K305', percent: 7.48, comments: vcm.person.comments, releaseNumber: vcm.person.releaseNumber }),
  O({ accession: '0000950170-25-109161', filingDate: '2025-08-14', eventDate: '2025-06-30', holderCik: '0001242463', holderName: 'SCHMIDT ERIC E', cusip: '02079K305', percent: 0.83, below5Flag: true }),
];
const change = classifyOwnershipChange({ observations: obs, T: '2026-10-09', coverage: { complete: true } });
const grels = findAdmittedRelationshipsFor('CIK:0001652044');
const S2 = buildSynthesis({ subject: 'Alphabet Inc.', relationships: grels, evidenceFor: latestEvidenceFor, labelOf, formation: buildAdmittedFormation({ relationships: grels, evidenceFor: latestEvidenceFor, labelOf }), change, admissionReport: rg });
const bh = S2.statements.find(s => /berkshire/i.test(s.text) && s.status === 'DOCUMENTED');
ok(bh && /an unnamed affiliate of BERKSHIRE HATHAWAY INC/i.test(bh.text), 'the unnamed-affiliate wording is preserved in the DOCUMENTED statement');
const vg = S2.statements.find(s => /VANGUARD GROUP INC/.test(s.text) && s.status === 'SUPPORTED');
ok(vg && /DISSOLVED/.test(vg.text) && /8\.34% in SC 13G\/A 0001104659-24-020000 → 0% in SCHEDULE 13G\/A 0000102909-26-000584/.test(vg.text) && vg.evidence.length === 2 && /not established by them/.test(vg.text), 'a DISSOLVED holder is SUPPORTED with both filings as evidence and the reason is not claimed');
ok(S2.statements.some(s => /VANGUARD CAPITAL MANAGEMENT LLC/.test(s.text) && /NEW/.test(s.text)), 'a NEW holder is stated with its filing');
ok(S2.statements.some(s => s.status === 'UNRESOLVED' && /J\.P\. Morgan Securities LLC/.test(s.text) && /Morgan Stanley/.test(s.text)), 'unresolved counterparties (ambiguous and search-limit) are named');

console.log('A statement is never SUPPORTED without relationships behind it (found by the milestone-1 validator)');
const oneDomain = buildSynthesis({ subject: 'X', relationships: [{ id: 'r1', type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['CIK:1', 'CIK:2'], nuId: {} }], evidenceFor: () => ({ provenance: { accession: 'A-1' } }), labelOf: (i) => i, formation: buildAdmittedFormation({ relationships: [{ id: 'r1', type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['CIK:1', 'CIK:2'], nuId: {} }], evidenceFor: () => ({ provenance: { accession: 'A-1' } }) }) });
ok(oneDomain.statements[0].status === 'SUPPORTED' && oneDomain.statements[0].evidence[0].relationshipId === 'r1' && /one domain only \(OWNERSHIP\)/.test(oneDomain.statements[0].text), 'relationships in one domain only: "no formation established" is SUPPORTED by those relationships and lists them');
const none = buildSynthesis({ subject: 'X', relationships: [], formation: buildAdmittedFormation({ relationships: [] }) });
ok(none.statements[0].status === 'UNRESOLVED' && none.statements[0].evidence.length === 0, 'no admitted relationship at all: the statement is an absence, labelled UNRESOLVED');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
