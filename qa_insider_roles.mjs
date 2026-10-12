// qa_insider_roles.mjs -- KRYL-1411 (LABOR ratified 2026-10-12). Real SEC Forms 4 (saved): the role is what the filing states, both parties are identified by SEC CIK,
// an insider form alone is not the relationship, no end of a role is inferred, and the ratified rule refuses anything weaker.
import fs from 'fs';
import { parseOwnershipDocument, rolesFromDocument, fetchInsiderRoles, _clearInsiderCache } from './src/engine/connectors/insiderroles.js';
import { admitInsiderRoles, buildInsiderRoleAssertion } from './src/engine/insiderroleadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation } from './src/engine/admittedformation.js';
import { canonicalRelationshipSentence, canonicalDetailLines } from './src/engine/canonicalrelationshiptext.js';
import { buildSynthesis } from './src/engine/analyticalsynthesis.js';
import { validateSynthesis } from './src/engine/benchmarkprobe.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const ORACLE = { cik: '0001341439', name: 'ORACLE CORP' };
const docDir = fs.readdirSync('tests/fixtures/sec');
const docs = { director: parseOwnershipDocument(fx(docDir.find(f => f.startsWith('form4-director-oracle')))), officer: parseOwnershipDocument(fx(docDir.find(f => f.startsWith('form4-officer-oracle')))), both: parseOwnershipDocument(fx(docDir.find(f => f.startsWith('form4-both-oracle')))), joint: parseOwnershipDocument(fx(docDir.find(f => f.startsWith('form4-joint')))) };
const labelOf = (id) => String(NODE_LABELS[id] ?? id).replace(/\s*\(CIK\s*\d+\)\s*$/, '');

console.log('The role is what the filing states');
{
  const d = docs.director, o = d.owners[0];
  ok(d.issuerCik === '0001341439' && o.cik === '0001142624' && o.isDirector && !o.isOfficer && o.name === 'RUSCKOWSKI STEPHEN H', 'a director: issuer and person read by their SEC CIKs from the form itself');
  ok(JSON.stringify(rolesFromDocument(d, '0001142624')) === JSON.stringify([{ role: 'DIRECTOR', officerTitle: null }]), 'director only: one DIRECTOR role, no title');
  const of = rolesFromDocument(docs.officer, docs.officer.owners[0].cik); ok(of.length === 1 && of[0].role === 'OFFICER' && of[0].officerTitle === 'EVP, Chief Accounting Officer', 'an officer: one OFFICER role with the title as written (whitespace normalised)');
  const b = rolesFromDocument(docs.both, docs.both.owners[0].cik); ok(b.length === 2 && b[0].role === 'DIRECTOR' && b[1].role === 'OFFICER' && b[1].officerTitle === 'Vice Chairman', 'a person who is both director and officer: two roles, the title on the officer role');
  ok(docs.joint.owners.length > 1 && docs.joint.owners.every(x => x.isTenPercentOwner && !x.isDirector && !x.isOfficer), 'a real joint filing of ten-percent owners (several reporting persons)');
  ok(docs.joint.owners.every(x => rolesFromDocument(docs.joint, x.cik).length === 0), 'a ten-percent owner states no officer or director role: nothing qualifies (ownership is a different relationship)');
  ok(rolesFromDocument(docs.director, '0000000001').length === 0, 'a CIK that is not a reporting person on the form has no role from it');
}

console.log('Reading the SEC search: newest filing per person, one document read per filing, limits stated');
{
  _clearInsiderCache();
  const mkHit = (acc, file, date, ciks, form = '4') => ({ _id: `${acc}:form4.xml`, _source: { adsh: acc, form, file_date: date, ciks, display_names: [] } });
  const dirFile = docDir.find(f => f.startsWith('form4-director-oracle')), offFile = docDir.find(f => f.startsWith('form4-officer-oracle'));
  const files = { 'A-DIR-NEW': fx(dirFile), 'A-OFF': fx(offFile) };
  const hits = [mkHit('A-DIR-OLD', 'x', '2026-01-10', ['0001142624', '0001341439']), mkHit('A-DIR-NEW', 'x', '2026-10-01', ['0001142624', '0001341439']), mkHit('A-OFF', 'x', '2026-09-23', [docs.officer.owners[0].cik, '0001341439']), mkHit('A-OTHER', 'x', '2026-09-01', ['0000555555', '0000999999'])];
  const calls = []; const searchFn = async (p) => { calls.push(p); return { ok: true, status: 200, hits }; };
  const fetchImpl = async (u) => { const acc = new URLSearchParams(u.split('?')[1]).get('accession'); calls.push(acc); const f = files[Object.keys(files).find(k => k.replace(/-/g, '') === acc)]; return f ? { ok: true, text: async () => f } : { ok: false, status: 404 }; };
  const r = await fetchInsiderRoles({ issuer: ORACLE, from: '2025-10-12', searchFn, fetchImpl, sleep: async () => {}, now: Date.parse('2026-10-12') });
  ok(calls[0].forms === '3,4,5' && calls[0].entityName === 'ORACLE CORP', 'one search of Forms 3, 4 and 5 for the issuer');
  ok(r.personsSeen === 2 && r.roles.length === 2 && r.roles.some(x => x.role === 'DIRECTOR' && x.accession === 'A-DIR-NEW' && x.filingDate === '2026-10-01') && r.roles.some(x => x.role === 'OFFICER'), 'a filing of another issuer is ignored; the NEWEST filing of each person is the one read (not the older one)');
  ok(calls.filter(c => c === 'ADIRNEW' || c === 'AOFF').length === 2 && !calls.includes('ADIROLD'), 'one document read per person, none for the superseded filing');
  const rc = await fetchInsiderRoles({ issuer: ORACLE, from: '2025-10-12', searchFn, fetchImpl, sleep: async () => {}, maxPersons: 1 });
  ok(rc.capped === true && rc.personsSeen === 2 && rc.personsRead === 1, 'when the cap is reached it is reported (read 1 of 2 persons)');
  const rf = await fetchInsiderRoles({ issuer: ORACLE, from: '2025-10-12', searchFn: async () => ({ ok: false, status: 503, hits: [] }), fetchImpl, sleep: async () => {} });
  ok(rf.failed === 'HTTP 503' && rf.roles.length === 0, 'a failed search is a stated failure, not an empty result');
  _clearInsiderCache();
  const rd = await fetchInsiderRoles({ issuer: ORACLE, from: '2025-10-12', searchFn, fetchImpl: async () => ({ ok: false, status: 500 }), sleep: async () => {} });
  ok(rd.failedDocs === 2 && rd.roles.length === 0, 'documents that could not be read are counted, never turned into roles');
}

console.log('Admission through the ratified rule');
{
  _clearAdmittedForTests();
  const roles = [];
  for (const [k, who] of [['director', docs.director], ['officer', docs.officer], ['both', docs.both]]) for (const r of rolesFromDocument(who, who.owners[0].cik)) roles.push({ personCik: who.owners[0].cik, personName: who.owners[0].name, role: r.role, officerTitle: r.officerTitle, form: 'Form 4', accession: `ACC-${k}`, filingDate: '2026-09-23', periodOfReport: who.periodOfReport, jointFiling: false, issuerCik: ORACLE.cik });
  const res = admitInsiderRoles({ issuer: ORACLE, roles });
  ok(res.admitted.length === 4 && res.rejected.length === 0 && res.admitted.every(a => a.predicate === 'NEW'), 'four roles admitted (director; officer; and the director-and-officer person as TWO relationships)');
  const rels = findAdmittedRelationshipsFor('CIK:0001341439').filter(r => r.type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE');
  const bothCik = docs.both.owners[0].cik; const two = rels.filter(r => r.part[1] === 'CIK:' + bothCik);
  ok(rels.length === 4 && two.length === 2 && two.map(r => r.nuId.role).sort().join() === 'DIRECTOR,OFFICER', 'one person holding both roles is two relationships, identified by CIK and role');
  ok(rels.every(r => r.part[0] === 'CIK:0001341439' && /^CIK:\d{10}$/.test(r.part[1])), 'ordered part (issuer, person), both by SEC CIK');
  const again = admitInsiderRoles({ issuer: ORACLE, roles: [roles[0]] }); ok(again.admitted[0].predicate === 'PERSISTENT', 'a repeat of the same evidence is PERSISTENT');
  const ofRole = roles.find(r => r.role === 'OFFICER' && r.accession === 'ACC-officer');
  const promoted = admitInsiderRoles({ issuer: ORACLE, roles: [{ ...ofRole, officerTitle: 'Chief Financial Officer', accession: 'ACC-officer-2', filingDate: '2026-10-05' }] });
  ok(promoted.admitted[0].predicate === 'RECONFIGURED' && promoted.admitted[0].relationship.nuState.title === 'Chief Financial Officer', 'a different title stated later is RECONFIGURED');
  const ev = latestEvidenceFor(rels[0].id).provenance;
  ok(ev.source === 'SEC_FORM_3_4_5' && ev.roleStated === true && ev.accession && ev.periodOfReport && ev.issuerCik === '0001341439', 'the evidence carries the form, accession, period of report and both CIKs');

  const base = roles[0];
  const refuse = (mut, why) => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: { ...base, ...mut } }); return admitAndProject(b.assertion, b.meta); };
  const r1 = (() => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: base }); b.assertion.evidence.provenance.roleStated = false; return admitAndProject(b.assertion, b.meta); })();
  ok(r1.admitted === false && /insider form alone is not the relationship/.test(r1.reason), 'an insider form that does not state the role is refused (roleStated false)');
  const r2 = (() => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: base }); b.assertion.nuId = { role: 'TEN_PERCENT_OWNER' }; return admitAndProject(b.assertion, b.meta); })(); ok(r2.admitted === false && /DIRECTOR or OFFICER/.test(r2.reason), 'a ten-percent-owner "role" is refused: ownership is a different relationship');
  const r3 = (() => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: base }); b.assertion.part = ['CIK:0001341439', 'RUSCKOWSKI_STEPHEN_H']; return admitAndProject(b.assertion, b.meta); })(); ok(r3.admitted === false && /SEC CIKs/.test(r3.reason), 'a person identified only by name is refused');
  const r4 = (() => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: base }); b.assertion.evidence.provenance.accession = null; return admitAndProject(b.assertion, b.meta); })(); ok(r4.admitted === false && /accession/.test(r4.reason), 'no citable accession: refused');
  const r5 = (() => { const b = buildInsiderRoleAssertion({ issuer: ORACLE, role: base }); b.assertion.evidence.provenance.form = 'Schedule 13G'; return admitAndProject(b.assertion, b.meta); })(); ok(r5.admitted === false && /Form 3, 4 or 5/.test(r5.reason), 'another form as the source: refused');
}

console.log('LABOR joins formation through a shared participant, never by name');
{
  const own = (cik, name, acc) => admitAndProject({ part: ['CIK:0001341439', 'CIK:' + cik], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: acc, source: 'SEC_13D_13G', filingDate: '2026-03-01', form: 'SCHEDULE 13G/A' }, ts: Date.parse('2026-03-01') } }, { subjectCik: '0001341439', subjectName: 'ORACLE CORP', filerCik: cik, filerName: name, source: 'SEC_13D_13G' });
  const f0 = buildAdmittedFormation({ relationships: findAdmittedRelationshipsFor('CIK:0001341439'), evidenceFor: latestEvidenceFor, labelOf });
  ok(!f0.formation, 'officers and directors alone (one domain) establish no cross-domain formation');
  own(docs.director.owners[0].cik, 'RUSCKOWSKI STEPHEN H', '0000000-26-000001');
  own('0000777777', 'SOME UNRELATED HOLDER LLC', '0000000-26-000002');
  const rels = findAdmittedRelationshipsFor('CIK:0001341439');
  const f = buildAdmittedFormation({ relationships: rels, evidenceFor: latestEvidenceFor, labelOf });
  const link = f.formation?.links.find(l => [l.a, l.b].sort().join() === 'LABOR,OWNERSHIP');
  ok(!!link && link.basis === 'SHARED_PARTICIPANT' && link.via.some(v => /RUSCKOWSKI/.test(v.label)), 'a person who is both a disclosed holder and a director links LABOR and OWNERSHIP through that person (same SEC CIK)');
  ok(link.via.some(v => /RUSCKOWSKI/.test(v.label)) && link.via.some(v => /ORACLE/.test(v.label)) && !link.via.some(v => /UNRELATED/.test(v.label)), 'the link runs through the issuer (every admitted relationship has it) and through the shared person; an unrelated holder is not a participant of the link');
  ok(f.structure.byDomain.LABOR === 4 && f.structure.domains.includes('LABOR'), 'LABOR appears among the admitted domains (4 role relationships)');

  console.log('Words and synthesis');
  const rr = rels.find(r => r.type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE' && r.nuId.role === 'DIRECTOR');
  ok(canonicalRelationshipSentence('HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', 'ORACLE CORP', 'RUSCKOWSKI STEPHEN H', { role: 'DIRECTOR' }) === 'RUSCKOWSKI STEPHEN H is disclosed as a director of ORACLE CORP', 'a director reads as "is disclosed as a director of"');
  ok(canonicalRelationshipSentence('HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', 'A', 'B', { role: 'OFFICER' }) === 'B is disclosed as an officer of A', 'an officer reads as "is disclosed as an officer of"');
  const lines = canonicalDetailLines(latestEvidenceFor(rr.id));
  ok(/director/.test(lines[0]) && /disclosed as of 2026-09-23/.test(lines[0]) && /no end of the role is stated or inferred/.test(lines[0]) && /issuer 0001341439/.test(lines[1]), 'detail lines: the role, the form and period, "disclosed as of", no end inferred, both CIKs');
  const S = buildSynthesis({ subject: 'ORACLE CORP', relationships: rels, evidenceFor: latestEvidenceFor, labelOf, formation: f, laborReport: { personsSeen: 40, personsRead: 30, capped: true } });
  const sum = S.statements.find(s => /disclosed as officers or directors of ORACLE CORP/.test(s.text));
  ok(sum && sum.status === 'SUPPORTED' && /3 people are disclosed/.test(sum.text) && /4 director|1 director/.test(sum.text) !== null && /no end of a role is stated by these forms/.test(sum.text) && sum.evidence.length === 4, 'a SUPPORTED statement counts people and roles, lists the relationships and the filings, and says no end of a role is stated');
  ok(S.statements.some(s => s.status === 'SUPPORTED' && /RUSCKOWSKI STEPHEN H is disclosed both as a director of ORACLE CORP and as a beneficial-ownership filer/.test(s.text)), 'the person who is both a director and a disclosed holder is stated with both relationships behind it');
  ok(S.statements.some(s => s.status === 'UNRESOLVED' && /10 further reporting persons/.test(s.text)), 'the person cap is stated as UNRESOLVED (10 further persons not read)');
  const v = validateSynthesis(S, rels, latestEvidenceFor, null); ok(v.problems.length === 0, 'every statement\'s label is supported by its evidence (validator: no problems)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
