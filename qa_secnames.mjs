// qa_secnames.mjs -- KRYL-1407 canonical name resolution (Founder approval 2026-10-11): exact / unique-prefix names are CANDIDATES verified by CIK, near
// matches are suggestions that never bind, ambiguous names stay unresolved. Rows are a real subset of SEC company_tickers.json (2026-10-11); no network.
import fs from 'fs';
import os from 'os';
import path from 'path';
process.env.KRYLO_SEC_NAMES_FILE = path.join(process.env.TMPDIR || os.tmpdir(), `sec-names-test-${process.pid}.json`);
const { buildNameIndex, matchListedName, editDistance } = await import('./src/engine/secnamematch.js');
const { secNames, _resetSecNamesForTests, SEC_NAMES_TTL_MS } = await import('./as-diff/secnames.js');
const { verifyPublicFiler, admitPublicFiler, nameResolutionNote, getNameResolution, _clearNameResolutionForTests } = await import('./src/engine/secfileradmission.js');
const { resolve } = await import('./src/engine/entityresolution.js');

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const sample = JSON.parse(fs.readFileSync('./tests/fixtures/sec/company-tickers-sample.json', 'utf8'));
const idx = buildNameIndex(sample.rows);
const names = (r) => r.candidates.map(c => c.name);

console.log('Matching tiers (real SEC rows)');
{
  let r = matchListedName(idx, 'Ford Motor Company'); ok(r.tier === 'EXACT' && names(r)[0] === 'FORD MOTOR CO' && r.candidates[0].cik === '0000037996', 'Ford Motor Company -> EXACT FORD MOTOR CO, CIK 0000037996');
  ok(r.candidates.length === 1 && r.candidates[0].tickers.length >= 2, 'share classes (F, F-PB, ...) collapse to one registrant');
  r = matchListedName(idx, 'Ford'); ok(r.tier === 'UNIQUE_PREFIX' && names(r)[0] === 'FORD MOTOR CO', 'Ford -> UNIQUE_PREFIX candidate FORD MOTOR CO');
  r = matchListedName(idx, 'Ford Motor Compnany'); ok(r.tier === 'NEAR' && names(r)[0] === 'FORD MOTOR CO', 'Ford Motor Compnany (misspelt suffix) -> NEAR, suggestion only');
  r = matchListedName(idx, 'Frod'); ok(r.tier === 'NEAR' && names(r)[0] === 'FORD MOTOR CO', 'Frod -> NEAR FORD MOTOR CO');
  r = matchListedName(idx, 'Fordd'); ok(r.tier === 'NEAR' && names(r)[0] === 'FORD MOTOR CO', 'Fordd -> NEAR FORD MOTOR CO');
  r = matchListedName(idx, 'Tesle'); ok(r.tier === 'NEAR' && names(r)[0] === 'Tesla, Inc.', 'Tesle -> NEAR Tesla, Inc.');
  r = matchListedName(idx, 'Netflx'); ok(r.tier === 'NEAR' && names(r)[0] === 'NETFLIX INC', 'Netflx -> NEAR NETFLIX INC');
  r = matchListedName(idx, 'Meta'); ok(r.tier === 'AMBIGUOUS' && names(r).length === 2 && names(r).includes('Meta Platforms, Inc.') && names(r).includes('Meta Critical Minerals Inc.'), 'Meta -> AMBIGUOUS, both registrants listed');
  r = matchListedName(idx, 'Oracle'); ok(r.tier === 'EXACT' && names(r)[0] === 'ORACLE CORP', 'Oracle -> EXACT');
  r = matchListedName(idx, 'Zzzzqq Holdings'); ok(r.tier === 'NONE' && !r.candidates.length, 'an unknown name -> NONE');
  r = matchListedName(idx, 'Fo'); ok(r.tier === 'NONE', 'a prefix shorter than four characters is not matched');
  r = matchListedName(idx, ''); ok(r.tier === 'NONE', 'empty text -> NONE');
}

console.log('Identity safeguards');
{
  ok(matchListedName(idx, 'Ford Motor Compnany').tier !== 'EXACT', 'suffix tolerance can never produce EXACT');
  ok(matchListedName(idx, 'Ford Motor Company, Inc').tier === 'EXACT' || matchListedName(idx, 'Ford Motor Company, Inc').tier === 'NEAR', 'a legal-suffix variant still points at the same registrant, never another');
  ok(editDistance('frod', 'ford') === 1 && editDistance('tesle', 'tesla') === 1, 'edit distance counts a transposition as one edit');
  const twoSame = buildNameIndex([{ cik_str: 1, ticker: 'AAA', title: 'Acme Corp' }, { cik_str: 2, ticker: 'BBB', title: 'ACME INC' }]);
  ok(matchListedName(twoSame, 'Acme').tier === 'AMBIGUOUS', 'one exact name shared by two CIKs is AMBIGUOUS');
}

console.log('Server module: daily cache, stale copy, failure');
{
  _resetSecNamesForTests(); try { fs.unlinkSync(process.env.KRYLO_SEC_NAMES_FILE); } catch {}
  let calls = 0; const j = Object.fromEntries(sample.rows.map((r, i) => [String(i), r]));
  const fetchFn = async () => { calls++; return j; };
  const T0 = Date.parse('2026-10-11T10:00:00Z');
  const a = await secNames('Ford', { now: T0, fetchFn });
  ok(a.tier === 'UNIQUE_PREFIX' && a.source === 'SEC company_tickers.json' && a.asOf === new Date(T0).toISOString() && a.stale === false, 'first call fetches and answers with source and as-of');
  await secNames('Frod', { now: T0 + 3600e3, fetchFn }); ok(calls === 1, 'a second call within a day is served from the cache');
  _resetSecNamesForTests(); await secNames('Ford', { now: T0 + 3600e3, fetchFn }); ok(calls === 1, 'a restarted engine reads the disk cache (no fetch)');
  const b = await secNames('Ford', { now: T0 + SEC_NAMES_TTL_MS + 1000, fetchFn }); ok(calls === 2 && b.asOf !== a.asOf, 'after the TTL the file is fetched again');
  const dead = async () => { throw new Error('SEC down'); };
  const c = await secNames('Ford', { now: T0 + 3 * SEC_NAMES_TTL_MS, fetchFn: dead }); ok(c.tier === 'UNIQUE_PREFIX' && c.stale === true, 'SEC unreachable: the last good copy answers and is flagged stale');
  _resetSecNamesForTests(); try { fs.unlinkSync(process.env.KRYLO_SEC_NAMES_FILE); } catch {}
  const d = await secNames('Ford', { now: T0, fetchFn: dead }); ok(!!d.error, 'SEC unreachable and no copy: an error, not a guess');
  ok(!!(await secNames('x')).error, 'a name under two characters is rejected');
}

console.log('Admission: candidates are verified by CIK; suggestions never bind');
{
  const hit = (name, tickers, cik, form = '10-K', date = '2026-02-20') => ({ _source: { adsh: `${cik}-26-000001`, form, file_date: date, ciks: [cik], display_names: [`${name}  ${tickers ? `(${tickers})  ` : ''}(CIK ${cik})`] } });
  const NOW = Date.parse('2026-10-11T12:00:00Z');
  const nameFn = async (t) => ({ ...matchListedName(idx, t), source: 'SEC company_tickers.json', asOf: '2026-10-11T00:00:00.000Z' });
  const trusts = Array.from({ length: 30 }, (_, i) => hit(`Ford Credit Auto Lease Trust 20${20 + (i % 6)}-${i}`, '', String(1700000 + i).padStart(10, '0')));
  const fordHit = hit('FORD MOTOR CO', 'F', '0000037996', '10-K', '2026-02-05');
  const calls = [];
  const searchFn = (hits) => async (p) => { calls.push(p); return { ok: true, status: 200, hits: typeof hits === 'function' ? hits(p) : hits }; };

  _clearNameResolutionForTests();
  let v = await verifyPublicFiler('Ford', { searchFn: searchFn([...trusts, fordHit]), nameFn, now: NOW });
  ok(v.verified && v.cik === '0000037996' && v.rule === 'listed-name-unique-prefix+cik', 'Ford: unique prefix, verified by the filing index record of CIK 0000037996 despite look-alike trusts');
  ok(calls.at(-1).entityName === 'FORD MOTOR CO', 'the filing-index search uses the registrant\'s legal name from the source, not the typed text');
  v = await verifyPublicFiler('Ford Motor Company', { searchFn: searchFn([...trusts, fordHit]), nameFn, now: NOW });
  ok(v.verified && v.rule === 'listed-name-exact+cik', 'Ford Motor Company: exact legal name, verified by CIK');

  v = await verifyPublicFiler('Ford', { searchFn: searchFn(trusts), nameFn, now: NOW });
  ok(!v.verified && v.reason === 'NOT_VERIFIED', 'a unique-prefix candidate whose CIK has no annual filings in the index is NOT admitted');
  ok(nameResolutionNote('Ford').includes('not assumed') && nameResolutionNote('Ford').includes('FORD MOTOR CO'), 'and the message names it as not assumed');

  calls.length = 0;
  for (const typo of ['Ford Motor Compnany', 'Frod', 'Fordd']) {
    v = await verifyPublicFiler(typo, { searchFn: searchFn([fordHit]), nameFn, now: NOW });
    ok(!v.verified && v.reason === 'NEAR_MATCH' && v.candidates[0].includes('FORD MOTOR CO'), `${typo}: NEAR_MATCH, not verified`);
  }
  ok(calls.length === 0, 'a near match never reaches the filing-index search (nothing to bind)');
  ok(nameResolutionNote('Frod').startsWith(' Closest listed registrant: FORD MOTOR CO, not assumed.'), 'the suggestion text begins exactly "Closest listed registrant: FORD MOTOR CO, not assumed."');
  const before = resolve('Frod'); ok(before === null, 'a suggestion creates no registry entity');
  const adm = await admitPublicFiler('Tesle', { searchFn: searchFn([hit('Tesla, Inc.', 'TSLA', '0001318605')]), nameFn, now: NOW });
  ok(adm.entity === null && adm.outcome === 'NEAR_MATCH', 'admitPublicFiler binds nothing on a near match');

  v = await verifyPublicFiler('Meta', { searchFn: searchFn([hit('Meta Platforms, Inc.', 'META', '0001326801')]), nameFn, now: NOW });
  ok(!v.verified && v.reason === 'AMBIGUOUS' && v.candidates.length === 2, 'Meta: AMBIGUOUS, nothing admitted');
  ok(nameResolutionNote('Meta').includes('None is assumed'), 'and says that none is assumed');

  v = await verifyPublicFiler('Netflix', { searchFn: searchFn([hit('NETFLIX INC', 'NFLX', '0001065280')]), nameFn: async () => ({ error: 'HTTP 502' }), now: NOW });
  ok(v.verified && v.rule === 'exact-base-name', 'name source unavailable: the original name-based check still applies');
  v = await verifyPublicFiler('Zzzzqq Holdings', { searchFn: searchFn([]), nameFn, now: NOW });
  ok(!v.verified && v.reason === 'NO_MATCH', 'NONE: falls to the original check, which finds nothing');
  v = await verifyPublicFiler('Netflix', { searchFn: searchFn([hit('NETFLIX INC', 'NFLX', '0001065280')]), now: NOW });
  ok(v.verified, 'without a name source the original behaviour is unchanged');
}

try { fs.unlinkSync(process.env.KRYLO_SEC_NAMES_FILE); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
