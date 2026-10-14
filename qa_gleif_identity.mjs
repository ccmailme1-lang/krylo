// qa_gleif_identity.mjs -- KRYL-1417 (GLEIF identity class, ratified 2026-10-13: identity resolution supporting the patent producer only). The GLEIF responses are real index answers
// (tests/fixtures/gleif); the patent rows are the synthetic sample in the documented PatentsView schema.
import fs from 'fs';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${m}`); };
const { verifyGleifEntity, gleifAliasFor, baseKey } = await import('./src/engine/gleifidentity.js');
const { shapeRecord, gleifByLegalName } = await import('./as-diff/gleif.js');
const { admitPublicFiler, nameResolutionNote, getNameResolution } = await import('./src/engine/secfileradmission.js');
const { producerEligibility, ineligibleNote } = await import('./src/engine/produceridentifiers.js');
const { admitPatentAssignments, buildPatentAssertion } = await import('./src/engine/patentassigneeadmission.js');
const { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } = await import('./src/engine/canonicalrelationshipprojection.js');
const { toTopologyNodeId } = await import('./src/engine/entityresolution.js');
const fx = (n) => JSON.parse(fs.readFileSync(`tests/fixtures/gleif/${n}.json`, 'utf8'));
const answer = (n) => async () => ({ records: fx(n).data.map(shapeRecord), source: 'GLEIF Global LEI Index (api.gleif.org)', asOf: '2026-10-13T00:00:00.000Z' });

console.log('Identity: one ACTIVE, ISSUED record with the exact legal name');
{
  const v = await verifyGleifEntity('Anduril Industries, Inc.', { gleifFn: answer('lei-records-anduril-industries-inc') });
  ok(v.verified && v.lei === '254900CIXLZUXXNYQW57' && v.canonicalName === 'ANDURIL INDUSTRIES, INC.' && v.evidence.jurisdiction === 'US-DE' && v.evidence.registeredAs === '6386483', 'Anduril Industries, Inc.: the GLEIF record (real answer) verifies it, with LEI, jurisdiction and registration number');
  const a = await verifyGleifEntity('Anduril', { gleifFn: async (q) => { ok(q === 'Anduril Industries, Inc.', 'the curated alias is looked up by its recorded legal name'); return answer('lei-records-anduril-industries-inc')(); } });
  ok(a.verified && a.curatedAlias?.alias === 'Anduril' && a.rule === 'gleif-curated-alias+exact-legal-name+lei', 'the curated alias "Anduril" resolves through the same record');
  const n = await verifyGleifEntity('Netflix', { gleifFn: answer('lei-records-netflix-inc') });
  ok(n.verified && n.canonicalName === 'NETFLIX, INC.' && n.evidence.lookAlikesNotBound >= 1, 'a name equal to the legal name with the form set aside binds; Netflix International B.V., Netflix Finland Oy and the Netflix ETF do not');
  const bad = await verifyGleifEntity('Anduril Industries, Inc.', { gleifFn: answer('lei-records-netflix-inc') });
  ok(!bad.verified && bad.reason === 'NO_MATCH', 'a record set without the exact legal name does not verify');
  const recs = fx('lei-records-anduril-industries-inc').data.map(shapeRecord);
  const lapsed = recs.map(r => (r.lei === '254900CIXLZUXXNYQW57' ? { ...r, registrationStatus: 'LAPSED' } : r));
  ok((await verifyGleifEntity('Anduril Industries, Inc.', { gleifFn: async () => ({ records: lapsed }) })).reason === 'NOT_ACTIVE', 'a lapsed registration does not confirm the entity');
  const dup = [...recs, { ...recs[0], lei: '999999999999999999AA' }];
  ok((await verifyGleifEntity('Anduril Industries, Inc.', { gleifFn: async () => ({ records: dup }) })).reason === 'AMBIGUOUS', 'two qualifying records with the same name: ambiguous, none bound');
  const other = recs.map(r => (r.lei === '254900CIXLZUXXNYQW57' ? { ...r, lei: '111111111111111111AA' } : r));
  ok((await verifyGleifEntity('Anduril', { gleifFn: async () => ({ records: other }) })).reason === 'CURATED_LEI_MISMATCH', 'the curated alias is never applied to a record with a different LEI');
  ok((await verifyGleifEntity('Anduril Industries, Inc.', { gleifFn: async () => { throw new Error('down'); } })).reason === 'LOOKUP_FAILED', 'a failed lookup is reported as failed');
  ok(gleifAliasFor('anduril')?.lei === '254900CIXLZUXXNYQW57' && gleifAliasFor('Daytona') === null, 'the alias record is looked up by class');
  ok(baseKey('ANDURIL INDUSTRIES, INC.') === 'anduril industries' && baseKey('Netflix, Inc.') === 'netflix', 'the legal form is set aside, nothing else');
  ok((await gleifByLegalName('x')).error?.startsWith('name required'), 'the server route requires a name');
  const srv = await gleifByLegalName('Anduril Industries, Inc.', { getFn: async () => fx('lei-records-anduril-industries-inc') });
  ok(srv.records.length === 15 && srv.records[0].lei === '254900CIXLZUXXNYQW57', 'the server returns the index records as shaped, unfiltered');
}

console.log('Admission and eligibility');
{
  // a name the static registry does not hold: admitted at runtime under the GLEIF class (records re-labelled from the real Anduril answer so the test needs no second fixture)
  const rec = fx('lei-records-anduril-industries-inc').data.map(shapeRecord).map(r => (r.lei === '254900CIXLZUXXNYQW57' ? { ...r, legalName: 'QUILLFEATHER HOLDINGS, INC.', lei: '5493001KJTIIGC8Y1R12' } : r));
  const opts = { gleifFn: async () => ({ records: rec, source: 'GLEIF Global LEI Index (api.gleif.org)' }), searchFn: async () => ({ ok: true, status: 200, hits: [] }), nameFn: async () => ({ tier: 'NONE', candidates: [] }), sleep: async () => {}, formDGapMs: 0 };
  const { entity, outcome } = await admitPublicFiler('Quillfeather Holdings', opts);
  ok(outcome === 'ADMITTED' && entity.identifiers.lei === '5493001KJTIIGC8Y1R12' && !entity.identifiers.edgar && entity.admissionClass === 'GLEIF_LEI', 'a name no SEC source holds is admitted under the GLEIF class with its LEI and no SEC CIK');
  ok(/LEI 5493001KJTIIGC8Y1R12/.test(entity.admissionEvidence) && /identity only/.test(entity.admissionEvidence), 'the admission evidence cites the LEI record and says identity only');
  ok(toTopologyNodeId(entity.canonicalId) === 'LEI:5493001KJTIIGC8Y1R12', 'the entity\'s node is its LEI');
  const el = producerEligibility({ ...entity, name: entity.canonicalName });   // the subject scope presents the card with `name`
  ok(el.eligible.includes('patents') && !['ownership', '8k', 'counterparty', 'labor', 'formd-people', 'clinical'].some(x => el.eligible.includes(x)), 'the patent producer runs; the SEC-keyed producers, Form D and clinical trials do not');
  ok(/an SEC CIK/.test(ineligibleNote({ ...entity, name: entity.canonicalName })), 'the producers that did not run are named with the identifier they need');
  const none = await admitPublicFiler('Zzyzx Quuxberry', { ...opts, gleifFn: async () => ({ records: [] }) });
  const note = nameResolutionNote('Zzyzx Quuxberry');
  ok(none.entity === null && /GLEIF Global LEI Index \(no match\)/.test(note) && !/GLEIF/.test(note.split('Not checked:')[1] ?? ''), 'an unresolved name lists GLEIF among the sources checked, not among those not checked');
}

console.log('The registry entity that carries a curated LEI (Anduril)');
{
  const { resolve } = await import('./src/engine/entityresolution.js');
  const { verifyGleifLei } = await import('./src/engine/gleifidentity.js');
  const { gleifByLei } = await import('./as-diff/gleif.js');
  const an = (() => { const c = resolve('Anduril'); return { ...c, name: c.canonicalName }; })();   // the subject scope presents the card with `name`
  ok(an.canonicalId === 'anduril-industries' && an.identifiers.lei === '254900CIXLZUXXNYQW57' && !an.identifiers.edgar, 'Anduril resolves from the static registry carrying the curated LEI and no SEC CIK');
  const el = producerEligibility(an);
  ok(el.eligible.includes('patents') && !el.eligible.includes('ownership') && !el.eligible.includes('labor') && !el.eligible.includes('clinical'), 'only the patent producer is eligible (needs an SEC CIK or an LEI); the others still name the SEC CIK they need');
  const one = { records: fx('lei-records-anduril-industries-inc').data.map(shapeRecord).filter(r => r.lei === '254900CIXLZUXXNYQW57'), source: 'GLEIF Global LEI Index (api.gleif.org)' };
  const v = await verifyGleifLei(an, { gleifLeiFn: async () => one });
  ok(v.verified && v.legalName === 'ANDURIL INDUSTRIES, INC.' && v.evidence.entityStatus === 'ACTIVE' && v.evidence.registrationStatus === 'ISSUED', 'the live record for the carried LEI confirms the entity (ACTIVE, ISSUED, legal name equal)');
  ok((await verifyGleifLei(an, { gleifLeiFn: async () => ({ records: [{ ...one.records[0], registrationStatus: 'LAPSED' }] }) })).reason === 'NOT_ACTIVE', 'a lapsed registration: the producer does not run');
  ok((await verifyGleifLei(an, { gleifLeiFn: async () => ({ records: [{ ...one.records[0], legalName: 'SOMETHING ELSE LLC' }] }) })).reason === 'NAME_MISMATCH', 'a record with a different legal name: the producer does not run');
  ok((await verifyGleifLei(an, { gleifLeiFn: async () => ({ records: [] }) })).reason === 'NO_RECORD', 'no record for the LEI: the producer does not run');
  ok((await verifyGleifLei(an, { gleifLeiFn: async () => ({ error: 'HTTP 502' }) })).reason === 'LOOKUP_FAILED', 'a failed lookup is reported as failed');
  const srv = await gleifByLei('254900cixlzuxxnyqw57', { getFn: async (p) => { ok(p === '/api/v1/lei-records/254900CIXLZUXXNYQW57', 'the record is fetched by the LEI itself'); return { data: fx('lei-records-anduril-industries-inc').data[0] }; } });
  ok(srv.records.length === 1 && srv.records[0].lei === '254900CIXLZUXXNYQW57', 'the server returns that one record');
  ok((await gleifByLei('bad')).error?.startsWith('lei required'), 'an LEI must be 20 characters');
}

console.log('Patents for an LEI-identified entity');
{
  _clearAdmittedForTests();
  const AN = { lei: '254900CIXLZUXXNYQW57', name: 'ANDURIL INDUSTRIES, INC.', displayName: 'ANDURIL INDUSTRIES', gleif: { entityStatus: 'ACTIVE', registrationStatus: 'ISSUED', retrievedAt: '2026-10-14T00:00:00.000Z' } };
  const patents = ['12000001', '11000002'].map(id => ({ id, assigneeName: 'Anduril Industries, Inc.', fileAsOf: '2026-10-01T00:00:00.000Z', product: 'pvgpatdis', table: 'g_assignee_disambiguated' }));
  const res = admitPatentAssignments({ entity: AN, patents });
  ok(res.admitted.length === 2 && res.rejected.length === 0, 'granted patents are admitted for the LEI-identified company');
  const rels = findAdmittedRelationshipsFor('LEI:254900CIXLZUXXNYQW57');
  ok(rels.length === 2 && rels.every(r => r.part[0] === 'LEI:254900CIXLZUXXNYQW57'), 'ordered (company by LEI, patent by its number)');
  const mk = (mut) => { const b = buildPatentAssertion({ entity: AN, patent: patents[0] }); mut(b.assertion); return admitAndProject(b.assertion, { companyName: AN.name, companyCik: null, patentLabel: 'x' }); };
  ok(mk(a => { delete a.evidence.provenance.identity; }).admitted === false, 'no GLEIF record cited: refused');
  ok(mk(a => { a.evidence.provenance.identity.registrationStatus = 'LAPSED'; }).admitted === false, 'a GLEIF record that is not ACTIVE and ISSUED: refused');
  ok(mk(a => { a.evidence.provenance.identity.lei = '111111111111111111AA'; }).admitted === false, 'a GLEIF record for a different LEI: refused');
  ok(mk(a => { a.evidence.provenance.assigneeMatch = 'EXACT_LEGAL_NAME_OF_EXHIBIT_21_SUBSIDIARY'; }).admitted === false, 'no subsidiary rule for an LEI-identified company (there is no 10-K Exhibit 21)');
  ok(mk(a => { a.part = ['LEI:SHORT', a.part[1]]; }).admitted === false, 'a malformed LEI node is refused');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
