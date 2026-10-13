// qa_resolution_contracts.mjs -- producer identifier contracts and actionable resolution failures (Founder direction 2026-10-12).
// Identity and producer eligibility are separate contracts; an unresolved subject says which identity sources were actually checked and what each returned.
import fs from 'fs';
import { producerEligibility, ineligibleNote, PRODUCERS } from './src/engine/produceridentifiers.js';
import { verifyPublicFiler, admitPublicFiler, nameResolutionNote, getNameResolution, _clearNameResolutionForTests, IDENTITY_SOURCES_NOT_CHECKED } from './src/engine/secfileradmission.js';
import { buildNameIndex, matchListedName } from './src/engine/secnamematch.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const idx = buildNameIndex(JSON.parse(fs.readFileSync('tests/fixtures/sec/company-tickers-sample.json', 'utf8')).rows);
const nameFn = async (t) => ({ ...matchListedName(idx, t), source: 'SEC company_tickers.json' });
const noHits = async () => ({ ok: true, status: 200, hits: [] });
const reg = (name) => ({ source: 'x' });

console.log('Producer identifier contracts');
{
  const listed = producerEligibility({ name: 'ORACLE CORP', identifiers: { edgar: '0001341439' } });
  ok(listed.ineligible.map(x => x.id).join() === 'formd-people' && listed.eligible.length === PRODUCERS.length - 1, 'a listed company carrying an SEC CIK: every producer is eligible except the Form D one (private filers only)');
  const lei = producerEligibility({ name: 'DATABENTO INC.', identifiers: { lei: '254900DQ2GKA6Q48SJ38' } });
  ok(lei.ineligible.map(x => x.id).sort().join() === '8k,clinical,counterparty,formd-people,labor,ownership,patents' && lei.eligible.join() === 'capital', 'an entity carrying only an LEI: the four SEC-keyed producers are ineligible, the name-based observation producer stays eligible');
  ok(lei.ineligible.every(x => x.missing.join() === 'edgar' || x.missing.join() === 'edgar'), 'each ineligible producer names the identifier it lacks');
  const none = producerEligibility({ name: 'X', identifiers: {} });
  ok(none.ineligible.length === 7 && none.eligible.join() === 'capital', 'an entity with no registry identifier: SEC producers do not run; no identifier is manufactured');
  const note = ineligibleNote({ name: 'DATABENTO INC.', identifiers: { lei: '254900DQ2GKA6Q48SJ38' } });
  ok(/Evidence sources not run for this entity:/.test(note) && /requires an SEC CIK/.test(note) && /carries lei/.test(note) && /no identifier is substituted or inferred/.test(note), 'the reader is told which producers did not run, what each requires, what the entity carries, and that nothing is substituted');
  ok(ineligibleNote({ name: 'ORACLE CORP', identifiers: { edgar: '0001341439' } }) === '', 'a listed company is not told that the private-filer producer did not run (it does not apply)');
  ok(producerEligibility({ name: 'X', identifiers: { edgar: '0001784241' }, admissionClass: 'SEC_FORM_D_ISSUER' }).eligible.sort().join() === 'capital,clinical,formd-people,patents', 'a private SEC filer (Form D class): the Form D, clinical-trial and patent producers and the observation producer run; the four listed-company producers do not (they support registry and listed companies only)');
  ok(/supports only registry or listed SEC companies; this entity is a private SEC filer \(Form D\)/.test(ineligibleNote({ name: 'X', identifiers: { edgar: '0001784241' }, admissionClass: 'SEC_FORM_D_ISSUER' })), 'and the reader is told why');
  ok(producerEligibility({ name: 'ORACLE CORP', identifiers: { edgar: '0001341439' } }).eligible.includes('clinical') && !producerEligibility({ name: 'ORACLE CORP', identifiers: { edgar: '0001341439' } }).eligible.includes('formd-people'), 'a listed company runs the clinical-trial producer and not the Form D one');
  ok(PRODUCERS.every(p => p.requires.length && p.produces && p.evidence && p.why), 'every producer declares its required identifiers, what it produces, the evidence and why it needs that identifier');
  ok(PRODUCERS.find(p => p.id === 'capital').produces.includes('observation only'), 'the name-based producer is declared observation-only, never a relationship');
}

console.log('Actionable resolution failures');
{
  _clearNameResolutionForTests();
  let r = await admitPublicFiler('Databento', { searchFn: noHits, nameFn, now: Date.parse('2026-10-12') });
  const note = nameResolutionNote('Databento');
  ok(r.entity === null && r.outcome === 'NO_MATCH', 'a private company that matches no listed registrant stays unresolved');
  ok(/Identity sources checked: static registry \(no match\); SEC listed companies \(company_tickers\.json\) \(no match\); SEC annual-report filers \(filing index\) \(no match\); SEC Form D issuers \(no match\)\./.test(note), 'the message lists the sources actually checked and what each returned');
  ok(/Not checked: GLEIF \(LEI\), UK Companies House, the federal contractor registry \(UEI\) \(identity classes not yet ratified\)\./.test(note) && IDENTITY_SOURCES_NOT_CHECKED.length === 3, 'sources not checked are named as not checked, never as checked');
  ok(/What would resolve it: the exact legal name of an SEC registrant, or an identifier from one of the sources not yet checked\./.test(note), 'it says what would resolve the subject');
  ok(!/Closest listed registrant/.test(note), 'no suggestion is invented when nothing is similar');

  _clearNameResolutionForTests();
  r = await admitPublicFiler('Frod', { searchFn: noHits, nameFn });
  const n2 = nameResolutionNote('Frod');
  ok(n2.startsWith(' Closest listed registrant: FORD MOTOR CO, not assumed.') && /SEC listed companies \(company_tickers\.json\) \(only a similar name, not assumed\)/.test(n2), 'a near match keeps the suggestion first and records that only a similar name was found');
  ok(!/annual-report filers/.test(n2), 'the filing-index source is not listed as checked when the name source ended the resolution (it was not run)');

  _clearNameResolutionForTests();
  const two = buildNameIndex([{ cik_str: 1, ticker: 'AAA', title: 'Zenvo Systems Corp' }, { cik_str: 2, ticker: 'BBB', title: 'ZENVO SYSTEMS INC' }]);
  r = await admitPublicFiler('Zenvo Systems', { searchFn: noHits, nameFn: async (t) => matchListedName(two, t) });
  const n3 = nameResolutionNote('Zenvo Systems');
  ok(/Several listed registrants match: Zenvo Systems Corp; ZENVO SYSTEMS INC\. None is assumed\./.test(n3) && /several registrants share the name, none assumed/.test(n3), 'an ambiguous name lists the candidates, assumes none, and says so in the checked-sources line');
  _clearNameResolutionForTests();
  r = await admitPublicFiler('Meta', { searchFn: noHits, nameFn });
  ok(r.outcome === 'ALREADY_KNOWN' && nameResolutionNote('Meta') === '', 'a name the static registry already knows resolves from the registry first and carries no explanation (registry precedence)');

  _clearNameResolutionForTests();
  r = await admitPublicFiler('Databento', { searchFn: async () => ({ ok: false, status: 503, hits: [] }), nameFn: async () => ({ error: 'HTTP 502' }), now: Date.parse('2026-10-12') });
  const n4 = nameResolutionNote('Databento');
  ok(r.outcome === 'LOOKUP_FAILED' && /SEC listed companies \(company_tickers\.json\) \(the lookup failed, so this is not evidence of absence\)/.test(n4) && /SEC annual-report filers \(filing index\) \(the lookup failed, so this is not evidence of absence\)/.test(n4), 'a failed lookup is reported as failed for each source, never as "no match"');

  _clearNameResolutionForTests();
  const hit = { _source: { adsh: '0001730168-26-000001', form: '10-K', file_date: '2026-02-20', ciks: ['0001730168'], display_names: ['Broadcom Inc.  (AVGO)  (CIK 0001730168)'] } };
  r = await admitPublicFiler('Broadcom', { searchFn: async () => ({ ok: true, status: 200, hits: [hit] }), nameFn: async () => ({ tier: 'NONE', candidates: [] }), now: Date.parse('2026-10-12') });
  ok(r.outcome === 'ADMITTED' && nameResolutionNote('Broadcom') === '', 'a resolved subject carries no unresolved explanation');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
