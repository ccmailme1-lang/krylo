// qa_formd_people.mjs -- KRYL-1413 (Form D officers and directors, ratified 2026-10-12). Real Form D documents (saved). The role is what the issuer's own Form D states; the person is the
// name as the filing states it, scoped to the issuer; Promoter is not a role here; no end is inferred; nothing is merged with any other person.
import fs from 'fs';
import { parseFormD, rolesFromFormD, personNodeId, fetchFormDPeople } from './src/engine/connectors/formdpeople.js';
import { admitFormDRoles, buildFormDRoleAssertion } from './src/engine/formdpeopleadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation } from './src/engine/admittedformation.js';
import { canonicalRelationshipSentence, canonicalDetailLines } from './src/engine/canonicalrelationshiptext.js';
import { buildSynthesis } from './src/engine/analyticalsynthesis.js';
import { validateSynthesis } from './src/engine/benchmarkprobe.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const dir = fs.readdirSync('tests/fixtures/sec'); const fx = (p) => fs.readFileSync('tests/fixtures/sec/' + dir.find(f => f.startsWith(p)), 'utf8');
const DB = { cik: '0001784241', name: 'Databento Inc.' };
const doc = parseFormD(fx('formd-databento'));
const labelOf = (id) => String(NODE_LABELS[id] ?? id);

console.log('Reading the issuer\'s own Form D');
{
  ok(doc.issuerCik === '0001784241' && doc.issuerName === 'Databento Inc.' && doc.previousNames.includes('Elisify, Inc.') && doc.persons.length === 3, 'issuer CIK and name, previous names and three related persons are read from the filing');
  const roles = rolesFromFormD(doc);
  ok(roles.length === 4 && roles.filter(r => r.role === 'DIRECTOR').length === 3 && roles.filter(r => r.role === 'OFFICER').length === 1, 'roles: three directors and one executive officer; Promoter (stated for two persons) yields nothing');
  ok(roles.some(r => r.personName === 'Christina Qi' && r.role === 'OFFICER') && roles.some(r => r.personName === 'Christina Qi' && r.role === 'DIRECTOR') && roles.some(r => r.personName === 'Geoffrey Bernstein' && r.role === 'DIRECTOR'), 'a person who is both executive officer and director is two roles; the names are as the filing states them');
  ok(parseFormD(fx('formd-integratedbiosciences')).issuerCik === '0002148371', 'a second real Form D (Integrated Biosciences) is read the same way');
}

console.log('Producer: the newest filing of the issuer, its own document');
{
  const hit = (acc, d, ciks) => ({ _id: `${acc}:primary_doc.xml`, _source: { adsh: acc, form: 'D', file_date: d, ciks } });
  const hits = [hit('0001784241-25-000001', '2025-02-01', ['0001784241']), hit('0001784241-26-000003', '2026-07-09', ['0001784241']), hit('0002128729-26-000001', '2026-08-01', ['0002128729'])];
  const reads = []; const fetchImpl = async (u) => { reads.push(new URLSearchParams(u.split('?')[1]).get('accession')); return { ok: true, text: async () => fx('formd-databento') }; };
  const r = await fetchFormDPeople({ issuer: DB, searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms === 'D' ? hits : [] }), fetchImpl, now: Date.parse('2026-10-12'), sleep: async () => {} });
  ok(reads.length === 1 && reads[0] === '000178424126000003' && r.roles.length === 4 && r.roles.every(x => x.accession === '0001784241-26-000003' && x.filingDate === '2026-07-09' && x.form === 'Form D'), 'only the newest Form D of THIS issuer is read (a look-alike issuer\'s filing and the older filing are not)');
  const bad = await fetchFormDPeople({ issuer: { cik: '0000000099', name: 'X' }, searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms === 'D' ? [hit('0000000099-26-000001', '2026-01-01', ['0000000099'])] : [] }), fetchImpl, now: Date.parse('2026-10-12'), sleep: async () => {} });
  ok(bad.roles.length === 0 && bad.failedDoc === true, 'a document whose issuer CIK is not the issuer\'s own yields no roles');
  const f = await fetchFormDPeople({ issuer: DB, searchFn: async () => ({ ok: false, status: 503, hits: [] }), fetchImpl, sleep: async () => {} });
  const am = await fetchFormDPeople({ issuer: DB, searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms === 'D/A' ? [{ ...hit('0001784241-26-000009', '2026-09-01', ['0001784241']), _source: { adsh: '0001784241-26-000009', form: 'D/A', file_date: '2026-09-01', ciks: ['0001784241'] } }] : hits }), fetchImpl, now: Date.parse('2026-10-12'), sleep: async () => {} });
  ok(am.roles.length === 4 && am.roles.every(x => x.form === 'Form D/A' && x.accession === '0001784241-26-000009'), 'an amendment (searched separately) newer than the original is the filing read');
  ok(f.failed === 'HTTP 503' && f.roles.length === 0, 'a failed search is a stated failure');
}

console.log('Admission through the ratified rule');
{
  _clearAdmittedForTests();
  const roles = rolesFromFormD(doc).map(r => ({ ...r, form: 'Form D', accession: '0001784241-26-000003', filingDate: '2026-07-09', issuerCik: DB.cik }));
  const res = admitFormDRoles({ issuer: DB, roles });
  ok(res.admitted.length === 4 && res.rejected.length === 0 && res.admitted.every(a => a.predicate === 'NEW'), 'four relationships admitted');
  const rels = findAdmittedRelationshipsFor('CIK:0001784241');
  ok(rels.length === 4 && rels.every(r => r.type === 'HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE' && r.part[0] === 'CIK:0001784241' && r.part[1].startsWith('FORMD_PERSON:0001784241:')), 'ordered (issuer by SEC CIK, person scoped to the issuer); no person node equals an SEC CIK node');
  ok(labelOf(personNodeId(DB.cik, 'Christina Qi')) === 'Christina Qi' && rels.filter(r => r.part[1] === personNodeId(DB.cik, 'Christina Qi')).length === 2, 'the scoped person node displays the filing\'s name; the person with two roles has two relationships');
  const again = admitFormDRoles({ issuer: DB, roles }); ok(again.admitted.every(a => a.predicate === 'PERSISTENT'), 'a repeat of the same filing is PERSISTENT');
  const ev = latestEvidenceFor(rels[0].id).provenance;
  ok(ev.source === 'SEC_FORM_D' && ev.personIdentity === 'NAME_SCOPED_TO_ISSUER_FILING' && ev.roleStated === true && ev.accession === '0001784241-26-000003', 'the evidence carries the Form D accession, the stated role and the scoped-identity label');
  // the same name in another issuer's Form D is a different node: never merged
  ok(personNodeId('0000000009', 'Christina Qi') !== personNodeId(DB.cik, 'Christina Qi'), 'the same name in another issuer\'s filing is a different person node: never merged across issuers');
  const mk = (mut) => { const b = buildFormDRoleAssertion({ issuer: DB, role: { ...roles[0] } }); mut(b.assertion); return admitAndProject(b.assertion, b.meta); };
  ok(mk(a => { a.nuId = { role: 'PROMOTER' }; }).admitted === false, 'Promoter is refused');
  ok(mk(a => { a.evidence.provenance.roleStated = false; }).admitted === false, 'a Form D that does not state the role is refused');
  ok(mk(a => { a.part = ['CIK:0001784241', 'CIK:0001142624']; }).admitted === false, 'a person identified by an SEC CIK node (not scoped to the filing) is refused by this type');
  ok(mk(a => { a.evidence.provenance.source = 'SEC_FORM_3_4_5'; }).admitted === false, 'another source is refused');
  ok(mk(a => { a.evidence.provenance.accession = null; }).admitted === false, 'no citable accession: refused');

  console.log('Formation, words, synthesis');
  const f = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
  ok(f.structure.domains.join() === 'LABOR' && !f.formation, 'LABOR is an admitted domain; officers alone connect no domains');
  ok(canonicalRelationshipSentence('HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE', 'Databento Inc.', 'Christina Qi', { role: 'OFFICER' }) === 'Christina Qi is stated as an executive officer of Databento Inc. in its Form D', 'wording: "is stated as an executive officer of ... in its Form D"');
  const lines = canonicalDetailLines(latestEvidenceFor(rels[0].id));
  ok(/as of that filing; no end of the role is stated or inferred/.test(lines[0]) && /the person has no SEC CIK and is not matched to any other person or entity/.test(lines[1]), 'detail lines: the filing, as-of, no end inferred; the person has no SEC CIK and is not matched');
  const S = buildSynthesis({ subject: 'Databento Inc.', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation: f });
  const st = S.statements.find(s => /stated as officers or directors of Databento Inc\. in its own Form D/.test(s.text));
  ok(st && st.status === 'SUPPORTED' && /3 people/.test(st.text) && /the person has no SEC CIK/.test(st.text) && st.evidence.length === 4, 'a SUPPORTED statement counts the people and roles, cites the filing and says the people are identified only by the filing\'s names');
  ok(validateSynthesis(S, rels, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
