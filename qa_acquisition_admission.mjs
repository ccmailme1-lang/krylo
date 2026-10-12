// qa_acquisition_admission.mjs -- KRYL-1409. Real 8-K filings (saved) -> acquisition candidates -> counterparty matching (real SEC responses, saved) -> admission of
// ACQUIRED through the single write path. Only a confirmed identity is admitted; direction and deal status come from the filing; private or unresolved parties are
// reported, never admitted.
import fs from 'fs';
import { htmlToText, itemBodies } from './src/engine/connectors/edgar8kcontent.js';
import { extractAcquisitions } from './src/engine/connectors/edgar8kacquisition.js';
import { _clearCounterpartyCache } from './src/engine/counterpartymatch.js';
import { admitAcquisitions, buildAcquisitionAssertion } from './src/engine/capitaleventadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _admittedRelationshipsFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { canonicalRelationshipSentence, canonicalDetailLines } from './src/engine/canonicalrelationshiptext.js';
import { buildSynthesis } from './src/engine/analyticalsynthesis.js';
import { validateSynthesis } from './src/engine/benchmarkprobe.js';
import { nodeId, NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const resp = JSON.parse(fs.readFileSync('tests/fixtures/sec/acq-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = resp[`${p.forms}|${p.entityName}`]; return r ? { ok: r.ok, status: 200, hits: r.hits } : { ok: false, status: 0, hits: [] }; };
const NOW = Date.parse('2026-10-11T12:00:00Z');
const event = (file, registrant, accession, filingDate, items) => ({ accession, filingDate, form: '8-K', items, acquisition: extractAcquisitions({ bodies: itemBodies(htmlToText(fs.readFileSync('tests/fixtures/sec/' + file, 'utf8'))), registrant, accession }) });
const run = (filer, events) => { _clearCounterpartyCache(); return admitAcquisitions({ filer, events, searchFn, now: NOW, sleep: async () => {}, gapMs: 0 }); };
const BOEING = { cik: '0000012927', name: 'BOEING CO' };

console.log('Boeing / Spirit AeroSystems (agreement, Item 1.01, pending)');
_clearAdmittedForTests();
let r = await run(BOEING, [event('8k-acq-boeing-2024-07-01-1.01_7.01_9.01.htm', 'BOEING CO', '0001193125-24-172676', '2024-07-01', ['1.01'])]);
const sp = r.admitted[0];
ok(r.admitted.length === 1 && sp.predicate === 'NEW' && sp.kind === 'ACQUISITION', 'one ACQUIRED relationship admitted (NEW)');
const rho = sp.relationship; let ev = latestEvidenceFor(rho.id);
ok(rho.type === 'ACQUIRED' && rho.part[0] === 'CIK:0000012927' && rho.part[1] === 'CIK:0001364885', 'ordered part (acquirer, target) by SEC CIK: Boeing then Spirit AeroSystems Holdings');
ok(rho.nuState.dealStatus === 'PENDING' && ev.provenance.accession === '0001193125-24-172676' && ev.provenance.item === '1.01' && ev.provenance.source === 'SEC_8K_ACQUISITION', 'deal status PENDING, accession, item and source recorded');
ok(ev.provenance.counterpartyMatch.outcome === 'SAME_ENTITY_CONFIRMED' && ev.provenance.counterpartyMatch.identifier.value === '0001364885' && /Spirit AeroSystems Holdings, Inc\./.test(ev.provenance.passage), 'the matching outcome is carried as returned and the passage is the filing\'s own');
ok(findAdmittedRelationshipsFor('CIK:0001364885').some(x => x.id === rho.id) && findAdmittedRelationshipsFor('CIK:0000012927').some(x => x.id === rho.id), 'readable from the single read path by either party (subject-bound for Boeing and for Spirit)');

console.log('The same filing again, then the completion: PENDING to CLOSED is RECONFIGURED');
r = await run(BOEING, [event('8k-acq-boeing-2024-07-01-1.01_7.01_9.01.htm', 'BOEING CO', '0001193125-24-172676', '2024-07-01', ['1.01'])]);
ok(r.admitted[0].predicate === 'PERSISTENT' && _admittedRelationshipsFor('ACQUIRED').filter(x => x.part.join() === rho.part.join()).length === 1, 'a repeat of the same evidence is PERSISTENT: still one relationship');
const completion = { accession: '0001193125-25-999999', filingDate: '2025-12-08', form: '8-K', items: ['2.01'], acquisition: { candidates: [{ item: '2.01', accession: '0001193125-25-999999', dealStatus: 'CLOSED', filerRole: 'ACQUIRER', otherParty: { name: 'Spirit AeroSystems Holdings, Inc.', passage: 'completed its acquisition of Spirit AeroSystems Holdings, Inc. ("Spirit")' }, agreement: null }], skipped: [] } };
r = await run(BOEING, [completion]);
ok(r.admitted[0].predicate === 'RECONFIGURED' && r.admitted[0].relationship.nuState.dealStatus === 'CLOSED', 'a completion (synthetic Item 2.01 event, same identity) moves the relationship PENDING to CLOSED as RECONFIGURED');

console.log('Direction is read from the filing');
_clearAdmittedForTests();
const SPIRIT = { cik: '0001364885', name: 'Spirit AeroSystems Holdings, Inc.' };
r = await run(SPIRIT, [event('8k-acq-spirit-2024-07-01-1.01_2.03_5.02_8.01_9.01.htm', 'Spirit AeroSystems Holdings, Inc.', '0001104659-24-076479', '2024-07-01', ['1.01'])]);
ok(r.admitted.length === 1 && r.admitted[0].relationship.part[0] === 'CIK:0000012927' && r.admitted[0].relationship.part[1] === 'CIK:0001364885', 'Spirit\'s own filing: the filer is the TARGET, so the part is (Boeing, Spirit)');

console.log('The other real cases');
for (const [file, reg, filer, acc, date, items, other, status] of [
  ['8k-acq-verizon-2024-09-05-1.01_7.01_9.01.htm', 'Verizon Communications Inc.', { cik: '0000732712', name: 'VERIZON COMMUNICATIONS INC' }, '0001193125-24-213664', '2024-09-05', ['1.01'], '0000020520', 'PENDING'],
  ['8k-acq-netflix-2025-12-05-1.01_7.01_9.01.htm', 'Netflix, Inc.', { cik: '0001065280', name: 'NETFLIX INC' }, '0001193125-25-308651', '2025-12-05', ['1.01'], '0001437107', 'PENDING'],
  ['8k-acq-bostonscientific-2026-01-15-1.01_9.01.htm', 'Boston Scientific Corp', { cik: '0000885725', name: 'BOSTON SCIENTIFIC CORP' }, '0000947871-26-000037', '2026-01-15', ['1.01'], '0001321732', 'PENDING'],
  ['8k-acq-broadcom-2023-11-22-2.01_2.03_8.01_9.01.htm', 'Broadcom Inc.', { cik: '0001730168', name: 'Broadcom Inc.' }, '0001140361-23-054354', '2023-11-22', ['2.01'], '0001124610', 'CLOSED'],
]) {
  _clearAdmittedForTests();
  const res = await run(filer, [event(file, reg, acc, date, items)]);
  const a = res.admitted[0];
  ok(res.admitted.length === 1 && a.relationship.part[0] === 'CIK:' + filer.cik && a.relationship.part[1] === 'CIK:' + other && a.relationship.nuState.dealStatus === status, `${reg}: admitted, other party CIK ${other}, ${status}`);
}

console.log('Not admitted');
{
  _clearAdmittedForTests();
  const jrd = { accession: 'a1', filingDate: '2026-03-30', form: '8-K', items: ['1.01'], acquisition: { candidates: [{ item: '1.01', accession: 'a1', dealStatus: 'PENDING', filerRole: 'ACQUIRER', otherParty: { name: 'JRD Unico, Inc.', passage: 'with JRD Unico, Inc., a Delaware corporation' }, agreement: 'Agreement and Plan of Merger' }], skipped: [] } };
  const res = await run({ cik: '0000096021', name: 'SYSCO CORP' }, [jrd]);
  ok(res.admitted.length === 0 && res.rejected[0].outcome === 'UNRESOLVED' && res.rejected[0].kind === 'ACQUISITION', 'a party that matches no SEC registrant (private) is reported UNRESOLVED and never admitted');
  ok(_admittedRelationshipsFor('ACQUIRED').length === 0, 'nothing reached the store');
  const b = buildAcquisitionAssertion({ filer: BOEING, event: { accession: 'x', filingDate: '2026-01-01' }, candidate: jrd.acquisition.candidates[0], match: { outcome: 'AFFILIATION_CONFIRMED', identifier: { value: '1' }, canonicalName: 'X' } });
  ok(!!b.skip, 'an affiliation is not an acquisition of the entity: skipped');
  const noAcc = admitAndProject({ part: ['CIK:1', 'CIK:2'], type: 'ACQUIRED', nuId: {}, nuState: { dealStatus: 'PENDING' }, evidence: { ts: 1, provenance: {} } }, {});
  ok(noAcc.admitted === false, 'the ratified rule still refuses an acquisition with no citable filing');
}

console.log('Words and synthesis');
{
  ok(canonicalRelationshipSentence('ACQUIRED', 'A', 'B', {}, 'PENDING') === 'A entered an agreement to acquire B (pending)', 'PENDING reads as an agreement, never as a completed acquisition');
  ok(canonicalRelationshipSentence('ACQUIRED', 'A', 'B', {}, 'CLOSED') === 'A completed its acquisition of B', 'CLOSED reads as completed');
  _clearAdmittedForTests();
  const res = await run(BOEING, [event('8k-acq-boeing-2024-07-01-1.01_7.01_9.01.htm', 'BOEING CO', '0001193125-24-172676', '2024-07-01', ['1.01'])]);
  const rel = res.admitted[0].relationship; const e2 = latestEvidenceFor(rel.id);
  const lines = canonicalDetailLines(e2);
  ok(lines.length === 3 && /deal status as the filing states it: PENDING/.test(lines[0]) && /SAME_ENTITY_CONFIRMED/.test(lines[1]) && /Spirit AeroSystems/.test(lines[2]), 'detail lines: agreement, status, matching outcome, the quoted passage');
  const labelOf = (id) => NODE_LABELS[id] ?? id;
  const syn = buildSynthesis({ subject: 'BOEING CO', relationships: [rel], evidenceFor: latestEvidenceFor, labelOf });
  const doc = syn.statements.find(s => s.status === 'DOCUMENTED');
  ok(doc && /entered an agreement to acquire/.test(doc.text) && doc.evidence[0].accession === '0001193125-24-172676', 'a DOCUMENTED statement with the filing\'s accession');
  const v = validateSynthesis(syn, [rel], latestEvidenceFor, null);
  ok(v.problems.length === 0, 'every statement\'s label is supported by its evidence (validator: no problems)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
