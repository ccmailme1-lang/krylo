// qa_patent_assignee.mjs -- KRYL-1416 (granted-patent assignee, ratified narrowly 2026-10-13). The table rows here are a SYNTHETIC SAMPLE in the documented PatentsView schema
// (tests/fixtures/patentsview/g_assignee_disambiguated.SYNTHETIC-SAMPLE.tsv): they test the matching and admission logic, not USPTO data. The real file is read the same way.
import fs from 'fs';
import os from 'os';
import path from 'path';
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'pv-'));
process.env.KRYLO_PATENT_DIR = dir;
const { patentsFor, patentFile, scanForNames } = await import('./as-diff/patentbulk.js');
const { fetchPatentAssignments } = await import('./src/engine/connectors/patentassignee.js');
const { admitPatentAssignments, buildPatentAssertion } = await import('./src/engine/patentassigneeadmission.js');
const { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } = await import('./src/engine/canonicalrelationshipprojection.js');
const { canonicalRelationshipSentence, canonicalDetailLines } = await import('./src/engine/canonicalrelationshiptext.js');
const { buildAdmittedFormation } = await import('./src/engine/admittedformation.js');
const { buildSynthesis } = await import('./src/engine/analyticalsynthesis.js');
const { validateSynthesis } = await import('./src/engine/benchmarkprobe.js');
const { producerEligibility } = await import('./src/engine/produceridentifiers.js');
const { NODE_LABELS } = await import('./src/engine/entitytopologyregistry.js');

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const TESLA = { cik: '0001318605', name: 'Tesla, Inc.' };

console.log('A missing file is reported as missing');
{
  ok(patentFile() === null, 'no file in the directory: patentFile() is null');
  const r = await patentsFor('Tesla, Inc.'); ok(r.error === 'FILE_MISSING' && /g_assignee_disambiguated\.tsv\.zip/.test(r.need) && r.where, 'the lookup says the file is missing and where to put it; it never says "no patents"');
  const c = await fetchPatentAssignments({ entity: TESLA, fetchImpl: async () => ({ ok: true, json: async () => r }) });
  ok(c.fileMissing && c.patents.length === 0 && !c.failed, 'the client carries the missing-file state through, not an empty result');
}

console.log('Exact legal name, by column name, from the table');
{
  fs.copyFileSync('tests/fixtures/patentsview/g_assignee_disambiguated.SYNTHETIC-SAMPLE.tsv', path.join(dir, 'g_assignee_disambiguated.tsv'));
  const r = await patentsFor('Tesla, Inc.');
  ok(r.total === 4 && r.assigneeNames.sort().join('|') === 'TESLA INC|Tesla, Inc.' && r.newest.join() === '11700009,11000003,10000002,10000001', 'Tesla, Inc.: the exact-name rows (the legal-suffix variants of the same name), newest patent numbers first');
  ok(!r.assigneeNames.includes('Tesla Motors, Inc.'), 'a different legal name ("Tesla Motors, Inc.") is not matched');
  const o = await patentsFor('Oracle Corporation');
  ok(o.total === 0 && o.newest.length === 0, 'Oracle Corporation: the subsidiary "Oracle International Corporation" is a different legal entity and does not match');
  const i = await patentsFor('Intel Corporation'); ok(i.total === 2 && i.newest.includes('D1100008'), 'design patents are read as granted patents (D1100008)');
  { const again = await patentsFor('TESLA INC'); ok(again.total === 4 && again.newest.join() === r.newest.join(), 'a repeat lookup (the SEC-style spelling of the name) is answered from the in-memory index with the same exact-name rows'); }
  const bad = path.join(dir, 'bad.tsv'); fs.writeFileSync(bad, 'foo\tbar\nx\ty\n');
  const e = await scanForNames(['Tesla'], { path: bad, zip: false, size: 1, mtime: 'x', key: 'k' }); ok(String(e.error).startsWith('COLUMNS_NOT_FOUND'), 'a file without the expected columns is an error naming what was found, not an empty result');
  fs.copyFileSync('tests/fixtures/patentsview/g_assignee_disambiguated.SYNTHETIC-SAMPLE.tsv', path.join(dir, 'x.tsv'));
}

console.log('Client: every row is re-checked against the resolved entity');
{
  const serverRow = { source: { product: 'pvgpatdis', table: 'g_assignee_disambiguated' }, fileAsOf: '2026-10-01T00:00:00.000Z', total: 4, assigneeNames: ['Tesla, Inc.', 'Tesla Motors, Inc.'], newest: ['11700009', '11000003'] };
  const c = await fetchPatentAssignments({ entity: TESLA, fetchImpl: async () => ({ ok: true, json: async () => serverRow }) });
  ok(c.patents.length === 2 && c.patents.every(p => p.assigneeName === 'Tesla, Inc.') && !c.assigneeNames.includes('Tesla Motors, Inc.'), 'a name the server returned that does not equal the entity\'s legal name is dropped on the client');
  const none = await fetchPatentAssignments({ entity: { cik: '0001341439', name: 'ORACLE CORP' }, fetchImpl: async () => ({ ok: true, json: async () => ({ ...serverRow, assigneeNames: [], newest: [], total: 0 }) }) });
  ok(none.patents.length === 0 && !none.fileMissing && !none.failed, 'no exact-name patents: none, stated as none (the file was read)');
}

console.log('Admission through the ratified rule');
{
  _clearAdmittedForTests();
  const patents = ['11700009', '11000003', '10000002'].map(id => ({ id, assigneeName: 'Tesla, Inc.', fileAsOf: '2026-10-01T00:00:00.000Z', product: 'pvgpatdis', table: 'g_assignee_disambiguated' }));
  const res = admitPatentAssignments({ entity: TESLA, patents });
  ok(res.admitted.length === 3 && res.rejected.length === 0 && res.admitted.every(a => a.predicate === 'NEW'), 'three assignments admitted');
  const rels = findAdmittedRelationshipsFor('CIK:0001318605').filter(r => r.type === 'ASSIGNEE_OF_GRANTED_PATENT');
  ok(rels.length === 3 && rels.every(r => r.part[0] === 'CIK:0001318605' && /^PATENT:US\d+$/.test(r.part[1])), 'ordered (company by SEC CIK, patent by its granted number)');
  ok(admitPatentAssignments({ entity: TESLA, patents }).admitted.every(a => a.predicate === 'PERSISTENT'), 'a repeat is PERSISTENT');
  const mk = (mut) => { const b = buildPatentAssertion({ entity: TESLA, patent: patents[0] }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: TESLA.name, companyCik: TESLA.cik, patentLabel: 'x' }); };
  ok(mk(a => { a.evidence.provenance.assigneeMatch = 'SIMILAR_NAME'; }).admitted === false, 'an assignee that is not the exact legal name is refused');
  ok(mk(a => { a.part = ['TESLA_MOTORS', a.part[1]]; }).admitted === false, 'a company that is not an entity identified by its SEC CIK is refused');
  ok(mk(a => { a.evidence.provenance.patentId = 'abc'; }).admitted === false, 'a patent without a granted number is refused');
  ok(mk(a => { a.evidence.provenance.source = 'WEB'; }).admitted === false, 'another source is refused');
  ok(mk(a => { a.evidence.provenance.fileAsOf = null; }).admitted === false, 'no dataset date: refused');
  console.log('Formation, words, synthesis, contract');
  const labelOf = (id) => String(NODE_LABELS[id] ?? id);
  const f = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
  ok(f.structure.domains.join() === 'TECHNOLOGY', 'TECHNOLOGY is an admitted domain');
  ok(canonicalRelationshipSentence('ASSIGNEE_OF_GRANTED_PATENT', 'Tesla, Inc.', 'US 11700009', {}) === 'Tesla, Inc. is the assignee of granted patent US 11700009', 'wording: "is the assignee of granted patent ..."');
  const lines = canonicalDetailLines(latestEvidenceFor(rels[0].id));
  ok(/grant date, subject matter and whether the patent is in force are not stated here/.test(lines[0]) && /equals the resolved entity's legal name exactly; a subsidiary or a similarly named company would be a different legal entity/.test(lines[1]), 'detail lines: the table\'s statement and the limits; the subsidiary rule');
  const S = buildSynthesis({ subject: 'Tesla, Inc.', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation: f });
  const st = S.statements.find(s => /lists Tesla, Inc\. \(exact legal name\) as the assignee of 3 granted patents/.test(s.text));
  ok(st && st.status === 'SUPPORTED' && /similarly named company, or to a subsidiary the company's own Form 10-K Exhibit 21 does not list, are different legal entities/.test(st.text) && st.evidence.length === 3, 'a SUPPORTED statement counts the patents and says subsidiaries are not counted');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
  ok(producerEligibility({ name: 'Tesla, Inc.', identifiers: { edgar: '0001318605' } }).eligible.includes('patents') && !producerEligibility({ name: 'X', identifiers: {} }).eligible.includes('patents'), 'the patents producer needs a resolved entity carrying an SEC CIK');
}

console.log('Exhibit 21 subsidiary rule (Founder ratified 2026-10-13)');
{
  const { parseExhibit21, exhibit21For } = await import('./as-diff/exhibit21.js');
  const bc = parseExhibit21(fs.readFileSync('tests/fixtures/sec/ex21-broadcom-0001730168-25-000121.htm', 'utf8'));
  ok(bc.length === 10 && bc.includes('Broadcom Corporation') && bc.includes('Avago Technologies International Sales Pte. Limited') && !bc.some(n => /^name of subsidiary$/i.test(n)), 'Broadcom Exhibit 21 (real filing 0001730168-25-000121): the subsidiary names, no header row');
  const or = parseExhibit21(fs.readFileSync('tests/fixtures/sec/ex21-oracle-0001193125-26-277521.htm', 'utf8'));
  ok(or.length === 8 && or.includes('Oracle International Corporation') && or.includes('Oracle America, Inc.'), 'Oracle Exhibit 21 (real filing 0001193125-26-277521): the subsidiary names');
  const bs = parseExhibit21(fs.readFileSync('tests/fixtures/sec/ex21-bostonscientific-0000885725-26-000010.htm', 'utf8'));
  ok(bs.length > 100 && bs.includes('Boston Scientific AG') && bs.includes('American Medical Systems Europe B.V.') && !bs.some(n => /\)$/.test(n) && /\((Germany|Switzerland|China)\)$/.test(n)), 'Boston Scientific Exhibit 21 (div list, "(Country)" after each name): names without the jurisdiction');
  ok(parseExhibit21('<p>Subsidiaries of Acme</p><p>Acme Labs, Inc.</p><p>Acme Europe GmbH</p>').join('|') === 'Acme Labs, Inc.|Acme Europe GmbH', 'an exhibit without a table: the lines that end in a legal form');
  const search = (id, type, date) => JSON.stringify({ hits: { hits: [{ _id: id, _source: { file_type: type, file_date: date } }, { _id: '0000000001-24-000001:main.htm', _source: { file_type: '10-K', file_date: '2024-01-01' } }] } });
  const calls = [];
  const mock = async (host, pth) => { calls.push(host); return host === 'efts.sec.gov' ? search('0001730168-25-000121:ex211.htm', 'EX-21.1', '2025-12-18') : fs.readFileSync('tests/fixtures/sec/ex21-broadcom-0001730168-25-000121.htm', 'utf8'); };
  const ex = await exhibit21For('1730168', { getFn: mock });
  ok(ex.accession === '0001730168-25-000121' && ex.form === 'EX-21.1' && ex.filedAt === '2025-12-18' && ex.names.length === 10, 'the latest 10-K Exhibit 21 is found by its file type, with accession and filing date');
  ok((await exhibit21For('0000000000', { getFn: mock })).error === 'cik required', 'a CIK is required');
  ok((await exhibit21For('999', { getFn: async () => JSON.stringify({ hits: { hits: [] } }) })).error === 'EXHIBIT21_NOT_FOUND', 'no Exhibit 21 found: stated as not found, not as no subsidiaries');
  ok(String((await exhibit21For('998', { getFn: async () => { throw new Error('boom'); } })).error).startsWith('EXHIBIT21_LOOKUP_FAILED'), 'a failed lookup is stated as failed');

  const BR = { cik: '0001730168', name: 'BROADCOM INC' };
  const ex21 = { accession: '0001730168-25-000121', file: 'ex211.htm', form: 'EX-21.1', filedAt: '2025-12-18', listed: 10 };
  const row = { source: { product: 'pvgpatdis', table: 'g_assignee_disambiguated' }, fileAsOf: '2026-10-01T00:00:00.000Z', legalName: 'Broadcom Inc.', total: 0, assigneeNames: [], newest: [], exhibit21: ex21,
    subsidiaryHolders: [{ name: 'Broadcom Corporation', assigneeNames: ['Broadcom Corporation'], total: 120, newest: ['9000003', '8000002'] }, { name: 'Avago Technologies U.S. Inc.', assigneeNames: ['Avago Technologies U.S. Inc', 'Avago Technologies General IP (Singapore) Pte. Ltd.'], total: 30, newest: ['10000009'] }] };
  const c = await fetchPatentAssignments({ entity: BR, fetchImpl: async () => ({ ok: true, json: async () => row }) });
  ok(c.patents.length === 3 && c.patents[0].id === '10000009' && c.patents.every(p => p.subsidiary?.exhibit21?.accession === '0001730168-25-000121') && c.total === 150, 'subsidiary-held patents: newest first, each carries its subsidiary and the Exhibit 21, total counts both holders');
  ok(c.patents.find(p => p.id === '10000009').assigneeName === 'Avago Technologies U.S. Inc', 'the assignee name is the one the table states, matched to the listed subsidiary only by exact legal name (punctuation and Inc spelling aside)');
  const none = await fetchPatentAssignments({ entity: BR, fetchImpl: async () => ({ ok: true, json: async () => ({ ...row, exhibit21: null }) }) });
  ok(none.patents.length === 0, 'with no Exhibit 21 cited, a holder the server returned is not read as a subsidiary');
  const wrong = await fetchPatentAssignments({ entity: BR, fetchImpl: async () => ({ ok: true, json: async () => ({ ...row, subsidiaryHolders: [{ name: 'Broadcom Corporation', assigneeNames: ['Broadcom Corporation of Texas'], total: 5, newest: ['7000001'] }] }) }) });
  ok(wrong.patents.length === 0, 'a holder whose assignee name is not exactly the listed subsidiary is dropped');
  _clearAdmittedForTests();
  const res = admitPatentAssignments({ entity: BR, patents: c.patents });
  ok(res.admitted.length === 3 && res.rejected.length === 0, 'subsidiary-held patents admitted through the single write path');
  const rels = findAdmittedRelationshipsFor('CIK:0001730168').filter(r => r.type === 'ASSIGNEE_OF_GRANTED_PATENT');
  ok(rels.length === 3 && rels.every(r => r.nuId?.heldBy), 'identity carries the subsidiary (heldBy)');
  ok(canonicalRelationshipSentence('ASSIGNEE_OF_GRANTED_PATENT', 'Broadcom Inc.', 'US 9000003', { heldBy: 'Broadcom Corporation' }) === "Broadcom Corporation, a subsidiary listed in Broadcom Inc.'s 10-K Exhibit 21, is the assignee of granted patent US 9000003", 'wording names the subsidiary and the Exhibit 21; it does not say the company is the assignee');
  const lines = canonicalDetailLines(latestEvidenceFor(rels[0].id));
  ok(/accession 0001730168-25-000121, filed 2025-12-18/.test(lines[1]) && /does not state that the subsidiary held this patent when it was granted/.test(lines[1]), 'detail lines cite the exhibit and state its limits');
  const mk = (mut) => { const b = buildPatentAssertion({ entity: BR, patent: c.patents[0] }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: BR.name, companyCik: BR.cik, patentLabel: 'x' }); };
  ok(mk(a => { delete a.evidence.provenance.subsidiary.exhibit21.accession; }).admitted === false, 'no Exhibit 21 accession: refused');
  ok(mk(a => { a.evidence.provenance.subsidiary.exhibit21.filerCik = '0000000001'; }).admitted === false, 'an Exhibit 21 of a different filer: refused');
  ok(mk(a => { a.nuId = {}; }).admitted === false, 'a subsidiary-held patent that does not name the subsidiary: refused');
  const labelOf = (id) => String(NODE_LABELS[id] ?? id);
  const S = buildSynthesis({ subject: 'Broadcom Inc.', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation: buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf }) });
  const st = S.statements.find(x => /named exactly in the Exhibit 21 of Broadcom Inc\.'s own Form 10-K \(accession 0001730168-25-000121, filed 2025-12-18\)/.test(x.text));
  ok(st && st.status === 'SUPPORTED' && /does not state that the subsidiary held a patent when it was granted/.test(st.text) && st.evidence.length === 3 && !S.statements.some(x => /lists Broadcom Inc\. \(exact legal name\)/.test(x.text)), 'a SUPPORTED statement for the subsidiary-held patents, citing the exhibit and its limit; no claim that the company itself is the assignee');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
