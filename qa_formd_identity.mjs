// qa_formd_identity.mjs -- KRYL-1412 (SEC Form D issuer identity class, ratified 2026-10-12). Real recorded SEC searches (tests/fixtures/sec/formd-search-responses.json).
// Exact legal name, exactly one issuer, verified by the issuer's own Form D; look-alike vehicles never bind; identity only.
import fs from 'fs';
import { verifyFormDIssuer, FORM_D_CLASS } from './src/engine/secformdissuer.js';
import { admitPublicFiler, nameResolutionNote, _clearNameResolutionForTests } from './src/engine/secfileradmission.js';
import { resolve } from './src/engine/entityresolution.js';
import { findAdmittedRelationshipsFor } from './src/engine/canonicalrelationshipprojection.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const rec = JSON.parse(fs.readFileSync('tests/fixtures/sec/formd-search-responses.json', 'utf8')).responses;
const searchFn = async (p) => { const r = rec[`${p.forms}|${p.entityName}`]; return r ? { ok: true, status: 200, hits: r.hits } : { ok: true, status: 200, hits: [] }; };
const NOW = Date.parse('2026-10-12T12:00:00Z'); const noSleep = async () => {};

console.log('Resolves only on an exact, unique issuer name');
{
  let r = await verifyFormDIssuer('Databento', { searchFn, now: NOW, sleep: noSleep });
  ok(r.verified && r.cik === '0001784241' && r.canonicalName === 'Databento Inc.', 'Databento resolves to Databento Inc., SEC CIK 0001784241');
  ok(r.evidence.form === 'Form D' && /^0001784241-/.test(r.evidence.accession) && r.evidence.lookAlikesNotBound >= 2, 'verified by its own Form D (accession and date carried); the look-alike issuers are counted and not bound');
  r = await verifyFormDIssuer('Integrated Biosciences', { searchFn, now: NOW, sleep: noSleep });
  ok(r.verified && r.cik === '0002148371' && r.canonicalName === 'Integrated Biosciences, Inc.', 'Integrated Biosciences resolves to Integrated Biosciences, Inc., SEC CIK 0002148371');
  r = await verifyFormDIssuer('Daytona', { searchFn, now: NOW, sleep: noSleep });
  ok(r.verified && r.cik === '0001977563' && r.canonicalName === 'Daytona Platforms Inc.' && /curated-alias/.test(r.rule) && r.curatedAlias.alias === 'Daytona', 'Daytona resolves through the Founder-curated alias, found by the legal name Daytona Platforms Inc. and carrying exactly the recorded CIK 0001977563');
  r = await verifyFormDIssuer('Daytona', { searchFn: async (p) => (p.entityName === 'Daytona Platforms Inc.' ? { ok: true, status: 200, hits: [{ _id: 'x:p.xml', _source: { adsh: 'x', form: 'D', file_date: '2026-01-01', ciks: ['0000000042'], display_names: ['Daytona Platforms Inc.  (CIK 0000000042)'] } }] } : searchFn(p)), now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'CURATED_CIK_MISMATCH', 'the curated alias is never applied to an issuer carrying a different CIK');
  r = await verifyFormDIssuer('Daytona Beach Hotel', { searchFn, now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'NO_MATCH', 'a similar name is not an alias: only the exact curated alias applies');
  r = await verifyFormDIssuer('Anduril', { searchFn, now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'NO_MATCH' && r.similar.length > 0 && r.similar.every(n => /anduril/i.test(n)), 'Anduril: investor vehicles named after it never bind; unresolved by this class');
  r = await verifyFormDIssuer('Acme Nonexistent Holdings', { searchFn, now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'NO_MATCH' && r.similar.length === 0, 'a name with no Form D issuer is NO_MATCH');
}

console.log('Ambiguity, empty results and failures');
{
  const two = { ok: true, status: 200, hits: [{ _id: 'a:p.xml', _source: { adsh: 'a', form: 'D', file_date: '2026-01-01', ciks: ['0000000001'], display_names: ['Zenvo Systems Inc.  (CIK 0000000001)'] } }, { _id: 'b:p.xml', _source: { adsh: 'b', form: 'D', file_date: '2026-02-01', ciks: ['0000000002'], display_names: ['ZENVO SYSTEMS, LLC  (CIK 0000000002)'] } }] };
  let r = await verifyFormDIssuer('Zenvo Systems', { searchFn: async () => two, now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'AMBIGUOUS' && r.candidates.length === 2, 'two issuers with the same name stay unresolved, both listed');
  let calls = 0;
  r = await verifyFormDIssuer('Databento', { searchFn: async (p) => { calls++; return calls === 1 ? { ok: true, status: 200, hits: [] } : searchFn(p); }, now: NOW, sleep: noSleep });
  ok(r.verified && calls === 2, 'an empty first answer (the SEC search returns empty under bursts) is repeated once before it is believed');
  calls = 0; r = await verifyFormDIssuer('Nobody', { searchFn: async () => { calls++; return { ok: true, status: 200, hits: [] }; }, now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'NO_MATCH' && calls === 2, 'an empty answer confirmed by the repeat is NO_MATCH');
  r = await verifyFormDIssuer('Databento', { searchFn: async () => ({ ok: false, status: 503, hits: [] }), now: NOW, sleep: noSleep });
  ok(!r.verified && r.reason === 'LOOKUP_FAILED', 'a failed lookup is LOOKUP_FAILED, never "no match"');
}

console.log('Admission: identity only, labelled, after the listed-company path');
{
  _clearNameResolutionForTests();
  const listedSearch = async (p) => (p.forms === 'D' ? searchFn(p) : { ok: true, status: 200, hits: [] });
  const nameFn = async () => ({ tier: 'NONE', candidates: [] });
  const r = await admitPublicFiler('Databento', { searchFn: listedSearch, nameFn, now: NOW, sleep: noSleep, formDGapMs: 0 });
  ok(r.outcome === 'ADMITTED' && r.entity.identifiers.edgar === '0001784241' && r.entity.admissionClass === FORM_D_CLASS, 'Databento is admitted as an entity carrying its SEC CIK and the class SEC_FORM_D_ISSUER');
  ok(/private SEC filer \(Form D\), not listed/.test(r.entity.admissionSource) && /Form D 0001784241-/.test(r.entity.admissionEvidence) && /look-alike issuers not bound/.test(r.entity.admissionEvidence) && /not listed \(no ticker\)/.test(r.entity.admissionEvidence), 'its provenance names the class, the Form D, the look-alikes not bound, and that it is not listed');
  ok(findAdmittedRelationshipsFor('CIK:0001784241').length === 0, 'identity only: no relationship is created by resolving it');
  const again = await admitPublicFiler('Databento Inc.', { searchFn: listedSearch, nameFn, now: NOW, sleep: noSleep });
  ok(again.outcome === 'ALREADY_KNOWN' && resolve('Databento')?.admissionClass === FORM_D_CLASS, 'the next resolution finds the admitted entity; the registry now resolves the name');
  _clearNameResolutionForTests();
  const d = await admitPublicFiler('Daytona Beach Hotel', { searchFn: listedSearch, nameFn, now: NOW, sleep: noSleep, formDGapMs: 0 });
  const note = nameResolutionNote('Daytona Beach Hotel');
  ok(d.entity === null && !/Not checked: SEC Form D/.test(note) && /SEC Form D issuers \(/.test(note) && /Not checked: UK Companies House, the federal contractor registry \(UEI\)/.test(note), 'an unresolved name states that Form D was checked (and GLEIF, when its lookup ran), and that Companies House and UEI were not');
  _clearNameResolutionForTests();
  const dy = await admitPublicFiler('Daytona', { searchFn: listedSearch, nameFn, now: NOW, sleep: noSleep, formDGapMs: 0 });
  ok(dy.outcome === 'ADMITTED' && dy.entity.canonicalName === 'Daytona Platforms Inc.' && dy.entity.identifiers.edgar === '0001977563' && /curated alias "Daytona"/.test(dy.entity.admissionEvidence), 'Daytona is admitted as Daytona Platforms Inc. with the curated alias recorded in its provenance');
  const hit = { _source: { adsh: '0001730168-26-000001', form: '10-K', file_date: '2026-02-20', ciks: ['0001730168'], display_names: ['Broadcom Inc.  (AVGO)  (CIK 0001730168)'] } };
  const b = await admitPublicFiler('Broadcom', { searchFn: async (p) => (p.forms === 'D' ? { ok: true, status: 200, hits: [] } : { ok: true, status: 200, hits: [hit] }), nameFn, now: NOW, sleep: noSleep });
  ok(b.outcome === 'ADMITTED' && b.entity.admissionClass == null && /issuer verification/.test(b.entity.admissionSource), 'a listed company is still admitted by the listed path, unchanged (no Form D class)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
