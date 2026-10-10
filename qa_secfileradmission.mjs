// qa_secfileradmission.mjs -- KRYL-1380 admission path (Founder decision 2026-10-10): verified public SEC filers, CIK identity,
// identity only. Fake SEC responses shaped like real filing-index hits; Broadcom AND a second company so the path is not a special case.
import { admitPublicFiler, verifyPublicFiler, parseDisplayName, getAdmissionLog } from './src/engine/secfileradmission.js';
import { resolve, toTopologyNodeId } from './src/engine/entityresolution.js';
import { subjectScope } from './src/engine/subjectscope.js';
import { findAdmittedRelationshipsFor } from './src/engine/canonicalrelationshipprojection.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const hit = (name, tickers, cik, form = '10-K', date = '2026-02-20', adsh = null) => ({ _source: { adsh: adsh ?? `${cik}-26-000001`, form, file_date: date, ciks: [cik], display_names: [`${name}  ${tickers ? '(' + tickers + ')  ' : ''}(CIK ${cik})`] } });
const search = (hits, calls = []) => async (p) => { calls.push(p); return { ok: true, status: 200, hits: typeof hits === 'function' ? hits(p) : hits }; };
const NOW = Date.parse('2026-10-10T12:00:00Z');

console.log('Display-name parsing');
{
  const p = parseDisplayName('Broadcom Inc.  (AVGO)  (CIK 0001730168)');
  ok(p.name === 'Broadcom Inc.' && p.tickers[0] === 'AVGO' && p.cik === '0001730168', 'name, ticker and CIK are read from the SEC display name');
  ok(parseDisplayName('Some Private Co  (CIK 0000012345)').tickers.length === 0, 'no ticker when the record has none');
}

console.log('Broadcom (the failing case)');
{
  ok(resolve('Broadcom') === null || resolve('Broadcom')?.admissionSource, 'before admission Broadcom is not a registry entity');
  const calls = [];
  const r = await admitPublicFiler('Broadcom', { searchFn: search([hit('Broadcom Inc.', 'AVGO', '0001730168', '10-K', '2025-12-18', '0001730168-25-000121')], calls), now: NOW });
  ok(r.outcome === 'ADMITTED' && r.entity.canonicalName === 'Broadcom Inc.' && r.entity.identifiers.edgar === '0001730168', 'admitted by SEC CIK with the registered name');
  ok(/10-K 0001730168-25-000121 filed 2025-12-18; ticker AVGO; rule exact-base-name/.test(r.entity.admissionEvidence) && r.entity.admissionSource === 'SEC/EDGAR issuer verification', 'provenance records the source filing, ticker and rule');
  ok(resolve('Broadcom')?.canonicalId === r.entity.canonicalId && resolve('AVGO')?.canonicalId === r.entity.canonicalId, 'afterwards the name and the ticker resolve to the entity');
  const s = subjectScope('What structural relationships are forming around Broadcom across ownership, technology, and capital?');
  ok(s.kind === 'ENTITY' && s.entity.identifiers.edgar === '0001730168', 'the guest question now scopes to the Broadcom ENTITY (was UNRESOLVED)');
  ok(findAdmittedRelationshipsFor(toTopologyNodeId(r.entity.canonicalId)).length === 0, 'identity only: admission creates no relationship');
  ok(r.entity.domainTags.length === 0, 'identity only: no sector or domain inferred');
  ok(calls[0].forms.includes('10-K') && calls[0].entityName === 'Broadcom', 'the SEC filing index was asked for annual reports by name');
}

console.log('Second company, not in the registry (reusability)');
{
  const r = await admitPublicFiler('Costco', { searchFn: search([hit('COSTCO WHOLESALE CORP /NEW', 'COST', '0000909832', '10-K', '2026-10-07')]), now: NOW });
  ok(r.outcome === 'ADMITTED' && r.entity.canonicalName === 'COSTCO WHOLESALE CORP' && r.entity.identifiers.edgar === '0000909832', 'Costco: admitted through the same path (SEC suffix "/NEW" removed; unique-prefix rule)');
  ok(/rule unique-prefix/.test(r.entity.admissionEvidence), 'the rule used is recorded');
}

console.log('Refusals (nothing is guessed)');
{
  const lookalike = await verifyPublicFiler('Alphabet Stage', { searchFn: search([hit('Alphabet Inc.', 'GOOG, GOOGL', '0001652044')]), now: NOW });
  ok(lookalike.verified === false && lookalike.reason === 'NO_MATCH', 'a different company with a similar name is not admitted (name match alone is not identity)');
  const amb = await verifyPublicFiler('Apple', { searchFn: search([hit('Apple Hospitality REIT, Inc.', 'APLE', '0001418121'), hit('Apple Bank Holdings Inc', 'APLB', '0000999999')]), now: NOW });
  ok(amb.verified === false && amb.reason === 'AMBIGUOUS' && amb.candidates.length === 2, 'two companies match the prefix: AMBIGUOUS, nothing admitted, candidates listed');
  const nolist = await verifyPublicFiler('Privateco', { searchFn: search([hit('Privateco Inc', '', '0000555555')]), now: NOW });
  ok(nolist.verified === false && nolist.reason === 'NOT_LISTED', 'a registrant with no ticker is NOT_LISTED');
  const none = await verifyPublicFiler('Daytona', { searchFn: search([]), now: NOW });
  ok(none.verified === false && none.reason === 'NO_MATCH', 'a company with no annual reports (private) is NO_MATCH');
  const failed = await admitPublicFiler('Zzcorp', { searchFn: async () => ({ ok: false, status: 500, hits: [] }), now: NOW });
  ok(failed.outcome === 'LOOKUP_FAILED' && failed.entity === null && resolve('Zzcorp') === null, 'a failed SEC lookup admits nothing and says LOOKUP_FAILED (not "no such company")');
  const thrown = await verifyPublicFiler('Zzcorp', { searchFn: async () => { throw new Error('network'); }, now: NOW });
  ok(thrown.reason === 'LOOKUP_FAILED', 'a thrown lookup error is LOOKUP_FAILED');
  const short = await verifyPublicFiler('AB', { searchFn: search([hit('AB Inc', 'AB', '1')]), now: NOW });
  ok(short.verified === false, 'a two-letter query is not looked up');
}

console.log('Registry wins, idempotence, log');
{
  let called = 0;
  const r = await admitPublicFiler('Alphabet', { searchFn: async () => { called++; return { ok: true, hits: [] }; }, now: NOW });
  ok(r.outcome === 'ALREADY_KNOWN' && called === 0, 'a registered entity resolves with no SEC lookup');
  const a = await admitPublicFiler('Broadcom Inc.', { searchFn: search([hit('Broadcom Inc.', 'AVGO', '0001730168')]), now: NOW });
  ok(a.outcome === 'ALREADY_KNOWN' && a.entity.canonicalId === 'broadcom', 'admitting the same company again returns the same entity');
  ok(getAdmissionLog().length >= 8 && getAdmissionLog().every(x => x.query && x.at), 'every verification attempt is logged with its time and outcome');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
