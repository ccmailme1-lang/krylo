// qa_temporal_store.mjs -- Step 4b: the temporal comparison on the canonical store. The real service, real saved 13G/13D filings, a fake SEC proxy and
// an in-process fake of the store routes (the real server module, a temp file). Same classification from a full retrieval and from stored history
// plus an increment; stored history still answers when SEC is unreachable; nothing about the KRYL-1386 rules changes.
import fs from 'fs'; import os from 'os'; import path from 'path';
import * as store from './as-diff/canonicalstore.js';
import { configureStoreClient, installStoreSink } from './src/engine/canonicalstoreclient.js';
import { runRelationshipChange, getRelationshipChange } from './src/engine/relationshipchangeservice.js';
import { _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { describeRetrievalBasis } from './src/engine/relationshipchangetext.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const tmp = path.join(os.tmpdir(), `krylo-temporal-${process.pid}.jsonl`); try { fs.unlinkSync(tmp); } catch {}
store._useFileOnly(tmp);
const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const ISS = '0001652044';
const mkHit = (adsh, date, form, holderCik, holderName, file) => ({ _id: `${adsh}:${file}`, _source: { adsh, file_date: date, form, ciks: [ISS, holderCik], display_names: [`Alphabet Inc.  (GOOG, GOOGL)  (CIK ${ISS})`, `${holderName}  (CIK ${holderCik})`] } });
const HITS = [
  { fam: 'new', hit: mkHit('0000102909-26-000584', '2026-03-26', 'SCHEDULE 13G/A', '0000102909', 'VANGUARD GROUP INC', 'primary_doc.xml'), doc: 'new-vanguard-group-exit-2026-03-26.xml' },
  { fam: 'new', hit: mkHit('0002100119-26-000161', '2026-04-29', 'SCHEDULE 13G', '0002100119', 'VANGUARD CAPITAL MANAGEMENT LLC', 'primary_doc.xml'), doc: 'new-vanguard-capital-mgmt-2026-04-29.xml' },
  { fam: 'new', hit: mkHit('0001193125-26-055590', '2026-02-17', 'SCHEDULE 13G/A', '0001295032', 'Sergey Brin', 'primary_doc.xml'), doc: 'new-brin-2026-02-17.xml' },
  { fam: 'legacy', hit: mkHit('0001104659-24-020001', '2024-02-13', 'SC 13G/A', '0000102909', 'VANGUARD GROUP INC', 'tv0009-alphabetincclassc.htm'), doc: 'legacy-vanguard-classc-2024-02-13.htm' },
];
const docByKey = new Map(HITS.map(h => [`${h.hit._source.adsh.replace(/-/g, '')}:${h.hit._id.split(':')[1]}`, h.doc]));
const calls = { search: [], docs: 0 };
let secDown = false, storeDown = false;
const j = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) });
const fakeFetch = async (url, opts = {}) => {
  const u = new URL(url, 'http://x'); const body = opts.body ? JSON.parse(opts.body) : null;
  if (u.pathname === '/api/edgar') {
    calls.search.push({ forms: u.searchParams.get('forms'), startdt: u.searchParams.get('startdt'), enddt: u.searchParams.get('enddt') });
    if (secDown) return { ok: false, status: 503, json: async () => ({}), text: async () => '' };
    const fam = u.searchParams.get('forms').startsWith('SCHEDULE') ? 'new' : 'legacy'; const a = u.searchParams.get('startdt'), b = u.searchParams.get('enddt');
    return j({ hits: { hits: HITS.filter(h => h.fam === fam && h.hit._source.file_date >= a && h.hit._source.file_date <= b).map(h => h.hit) } });
  }
  if (u.pathname === '/api/edgar-document') {
    calls.docs++; if (secDown) return { ok: false, status: 503, text: async () => '' };
    const f = docByKey.get(`${u.searchParams.get('accession')}:${u.searchParams.get('file')}`); return f ? { ok: true, status: 200, text: async () => fx(f) } : { ok: false, status: 404, text: async () => '' };
  }
  if (u.pathname.startsWith('/v1/canonical-store')) {
    if (storeDown) throw new Error('ECONNREFUSED');
    if (u.pathname.endsWith('/admissions')) { const results = []; for (const it of body.items) results.push(await store.writeAdmission(it)); return j({ results }); }
    if (u.pathname.endsWith('/relationships')) return j({ relationships: await store.relationshipsForNodes(u.searchParams.getAll('node')) });
    if (u.pathname.endsWith('/kv') && opts.method === 'POST') return j(await store.writeKv(body.key, body.value));
    if (u.pathname.endsWith('/kv')) return j({ record: await store.readKv(u.searchParams.get('key')) });
    if (u.pathname.endsWith('/snapshot')) return j(await store.writeSnapshot(body.snapshot));
  }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};
configureStoreClient({ baseUrl: 'http://engine', fetchImpl: fakeFetch }); installStoreSink();
const run = async (T, id = 'alphabet') => { calls.search.length = 0; calls.docs = 0; await runRelationshipChange({ issuerCik: ISS, issuerName: 'Alphabet Inc.', canonicalId: id, T, baseUrl: '', fetchImpl: fakeFetch, sleep: async () => {}, searchGapMs: 0, docGapMs: 0 }); return getRelationshipChange(id); };
const sig = (e) => JSON.stringify((e.result?.relationships ?? []).map(r => [r.unit, r.existence.state, r.magnitude.state, r.configuration.state, r.existence.reason ?? null]).sort());

console.log('First analysis of an issuer: full retrieval, stored');
const e1 = await run('2026-10-09');
ok(e1.state === 'done' && e1.retrieval.store.incremental === false && e1.retrieval.store.storedFilings === 0 && e1.retrieval.store.newFilings === 4, 'no stored history: the full window is searched and 4 filings are retrieved');
ok(calls.docs === 4, 'four filing documents were read');
const rec = (await store.readKv('temporal:ownership:' + ISS))?.value;
ok(rec?.complete === true && rec.through === '2026-10-09' && rec.filings === 4, 'the retrieval record says SEC was searched completely through 2026-10-09 (4 filings)');
const recs = await store.relationshipsForNodes(['CIK:' + ISS]);
const vg = recs.find(r => r.part.some(p => p === 'CIK:0000102909'));
ok(vg && vg.versions.length === 2 && vg.versions.every(v => v.evidence.provenance.observation?.percent != null), 'the observations are versions of the canonical relationships: Vanguard Group has 2 versions, each with its parsed percent');
const sig1 = sig(e1);
console.log('   classification:', sig1);
ok(/"NEW"/.test(sig1) && /NO_CURRENT_OBSERVATION/.test(sig1), 'the classification: Vanguard Capital Management and Brin NEW; the Vanguard Group class C unit INDETERMINATE with its reason code (KRYL-1386 rules unchanged)');

console.log('A later analysis: stored history plus an increment, same classification');
_clearAdmittedForTests();                                     // a new page session
const e2 = await run('2026-10-10');
ok(e2.retrieval.store.incremental === true && e2.retrieval.store.storedFilings === 4 && e2.retrieval.store.previousThrough === '2026-10-09', 'the stored history (4 filings, searched through 2026-10-09) is used');
ok(calls.search.every(c => c.startdt >= '2026-10-06') && calls.docs === 0, 'SEC is searched only from 3 days before the stored boundary, and no document is read again');
ok(sig(e2) === sig1, 'the classification equals the one built from the full retrieval');
ok(e2.retrieval.coverage.complete === true, 'coverage is complete (the stored history was complete; the new window answered)');
ok(describeRetrievalBasis(e2.retrieval, e2.result.relationships.find(r => r.existence.state === 'NEW')).some(l => /History from the durable store: 4 filing observations/.test(l)), 'the guest-facing basis states that the history came from the store and what was searched');
const verCount = (await store.relationshipsForNodes(['CIK:' + ISS])).reduce((n, r) => n + r.versions.length, 0);
ok(verCount === recs.reduce((n, r) => n + r.versions.length, 0), 'no duplicate versions were written');

console.log('SEC unreachable: the stored history still answers, coverage says incomplete');
_clearAdmittedForTests(); secDown = true;
const e3 = await run('2026-10-11');
secDown = false;
ok(e3.state === 'done' && e3.retrieval.store.storedFilings === 4 && e3.retrieval.coverage.complete === false, 'the comparison is computed from the 4 stored filings with coverage incomplete (not obtained)');
ok(/COVERAGE_INCOMPLETE/.test(sig(e3)) && !/"NEW"/.test(sig(e3)) && /NO_PRIOR_OBSERVATION|NO_CURRENT_OBSERVATION/.test(sig(e3)), 'NEW becomes INDETERMINATE (COVERAGE_INCOMPLETE) and the other units keep their reasons: missing retrieval is never read as absence');
const rec3 = (await store.readKv('temporal:ownership:' + ISS))?.value;
ok(rec3.through === '2026-10-10', 'an incomplete retrieval does not advance the retrieval record');

console.log('Store unreachable: the comparison still works from the retrieval alone');
_clearAdmittedForTests(); storeDown = true;
const e4 = await run('2026-10-09', 'alphabet-2');
storeDown = false;
ok(e4.state === 'done' && sig(e4) === sig1 && /ECONNREFUSED|fetch|not reachable|HTTP|aborted/i.test(String(e4.retrieval.store.storeError ?? 'x')) === true && e4.retrieval.store.storeError, 'same classification as the full retrieval; the store problem is stated');
ok(describeRetrievalBasis(e4.retrieval, e4.result.relationships.find(r => r.existence.state === 'NEW')).some(l => /durable store was not reachable/.test(l)), 'and the guest-facing basis says so');

try { fs.unlinkSync(tmp); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
