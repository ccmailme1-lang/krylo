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
  ok((await patentsFor('Tesla, Inc.')).cached === true, 'a repeat lookup is served from the on-disk cache (same file size and date)');
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
  ok(st && st.status === 'SUPPORTED' && /subsidiaries or similarly named companies are different legal entities/.test(st.text) && st.evidence.length === 3, 'a SUPPORTED statement counts the patents and says subsidiaries are not counted');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
  ok(producerEligibility({ name: 'Tesla, Inc.', identifiers: { edgar: '0001318605' } }).eligible.includes('patents') && !producerEligibility({ name: 'X', identifiers: {} }).eligible.includes('patents'), 'the patents producer needs a resolved entity carrying an SEC CIK');
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
