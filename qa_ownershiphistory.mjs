// qa_ownershiphistory.mjs -- KRYL-1386 retrieval logic (spec v1.1 section 4) with fake SEC fetchers built from saved filings.
import fs from 'fs';
import { retrieveOwnershipObservations, retrievalWindow, HIT_CAP } from './src/engine/connectors/ownershiphistory.js';
import { classifyOwnershipChange } from './src/engine/relationshipchange.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const ISS = '0001652044', T = '2026-10-09';

const mkHit = (adsh, date, form, holderCik, holderName, file) => ({
  _id: `${adsh}:${file}`,
  _source: { adsh, file_date: date, form, ciks: [ISS, holderCik], display_names: [`Alphabet Inc.  (GOOG, GOOGL)  (CIK ${ISS})`, `${holderName}  (CIK ${holderCik})`] },
});
const HITS = [
  { fam: 'new', hit: mkHit('0000102909-26-000584', '2026-03-26', 'SCHEDULE 13G/A', '0000102909', 'VANGUARD GROUP INC', 'primary_doc.xml'), doc: 'new-vanguard-group-exit-2026-03-26.xml' },
  { fam: 'new', hit: mkHit('0002100119-26-000161', '2026-04-29', 'SCHEDULE 13G', '0002100119', 'VANGUARD CAPITAL MANAGEMENT LLC', 'primary_doc.xml'), doc: 'new-vanguard-capital-mgmt-2026-04-29.xml' },
  { fam: 'new', hit: mkHit('0001193125-26-055590', '2026-02-17', 'SCHEDULE 13G/A', '0001295032', 'Sergey Brin', 'primary_doc.xml'), doc: 'new-brin-2026-02-17.xml' },
  { fam: 'legacy', hit: mkHit('0001104659-24-020001', '2024-02-13', 'SC 13G/A', '0000102909', 'VANGUARD GROUP INC', 'tv0009-alphabetincclassc.htm'), doc: 'legacy-vanguard-classc-2024-02-13.htm' },
];
const docByKey = new Map(HITS.map(h => [`${h.hit._source.adsh}:${h.hit._id.split(':')[1]}`, h.doc]));

function fakes({ failWindows = () => false, failDocs = () => false, hitsOverride = null } = {}) {
  const log = { search: [], docs: [] };
  const searchFn = async (p) => {
    log.search.push(p);
    if (failWindows(p, log.search.length)) return { ok: false, status: 500, hits: [] };
    const fam = p.forms.startsWith('SCHEDULE') ? 'new' : 'legacy';
    if (hitsOverride) return { ok: true, status: 200, hits: hitsOverride(p, fam) };
    return { ok: true, status: 200, hits: HITS.filter(h => h.fam === fam && h.hit._source.file_date >= p.startdt && h.hit._source.file_date <= p.enddt).map(h => h.hit) };
  };
  const docFn = async ({ accession, file }) => {
    log.docs.push(accession);
    if (failDocs(accession)) return { ok: false, status: 500, text: '' };
    const f = docByKey.get(`${accession}:${file}`);
    return f ? { ok: true, status: 200, text: fx(f) } : { ok: false, status: 404, text: '' };
  };
  return { searchFn, docFn, log };
}
const run = (f, extra = {}) => retrieveOwnershipObservations({ issuerCik: ISS, issuerName: 'Alphabet Inc.', ...retrievalWindow(T), searchFn: f.searchFn, docFn: f.docFn, sleep: async () => {}, ...extra });

console.log('Window and families (spec section 4)');
{
  const w = retrievalWindow(T);
  ok(w.from === '2022-10-09' && w.to === '2026-10-09', 'the retrieval window is 48 months before T');
  const f = fakes(); const r = await run(f);
  ok(f.log.search.some(p => p.forms.startsWith('SCHEDULE')) && f.log.search.some(p => p.forms.startsWith('SC 13')), 'both form-type families are always queried');
  ok(r.coverage.complete === true && r.coverage.windows.length === 2, 'complete coverage when both families answer');
  ok(r.observations.length === 4, 'four observations built from the four fake filings');
  const vg = r.observations.find(o => o.accession === '0000102909-26-000584');
  ok(vg.percent === 0 && vg.cusip === '02079K305' && vg.eventDate === '2026-03-13' && vg.releaseNumber === '34-39538' && vg.holderName === 'VANGUARD GROUP INC', 'a new-format observation carries percent, CUSIP, event date, release and holder');
  const lg = r.observations.find(o => o.accession === '0001104659-24-020001');
  ok(lg.percent === 7.18 && lg.family === 'legacy' && lg.cusip === '02079K107', 'a legacy observation carries percent and CUSIP read from the text');
}

console.log('Failures, caps and splitting never pass silently');
{
  const f = fakes({ failWindows: (p) => p.forms.startsWith('SC 13') });
  const r = await run(f);
  ok(r.coverage.complete === false && r.coverage.failedWindows.some(w => w.family === 'legacy' && w.reason === 'REQUEST_FAILED'), 'a failed legacy-family window marks coverage incomplete');
  ok(f.log.search.filter(p => p.forms.startsWith('SC 13')).length === 3, 'a failing request is retried (3 attempts)');
  const cl = classifyOwnershipChange({ observations: r.observations, T, coverage: r.coverage }).relationships;
  ok(cl.find(x => x.holderName === 'VANGUARD CAPITAL MANAGEMENT LLC').existence.reason === 'COVERAGE_INCOMPLETE', 'an incomplete retrieval turns NEW into INDETERMINATE (COVERAGE_INCOMPLETE) downstream');
}
{
  const f = fakes({ failDocs: (a) => a === '0002100119-26-000161' });
  const r = await run(f);
  ok(r.coverage.complete === false && r.coverage.failedDocs[0]?.accession === '0002100119-26-000161', 'a failed document fetch is recorded and coverage is incomplete');
  ok(!r.observations.some(o => o.accession === '0002100119-26-000161'), 'the failed filing is not invented');
}
{
  // a window answering at the cap must split; a month still at the cap is incomplete
  let calls = 0;
  const f = fakes({ hitsOverride: (p, fam) => { calls++; const span = (Date.parse(p.enddt) - Date.parse(p.startdt)) / 86400000; return span > 31 ? Array.from({ length: HIT_CAP }, (_, i) => mkHit('X-' + i, p.startdt, 'SCHEDULE 13G', '0009999999', 'FILLER', 'primary_doc.xml')) : []; } });
  const r = await run(f, { maxDocs: 0 });
  ok(f.log.search.length > 8, 'a response at the cap is split into halves (more requests than the two initial windows)');
  ok(r.coverage.complete === true || r.coverage.reasons.length > 0, 'splitting ends in a recorded outcome');
}
{
  const f = fakes({ hitsOverride: () => Array.from({ length: HIT_CAP }, (_, i) => mkHit('Y-' + i, '2026-01-01', 'SCHEDULE 13G', '0009999999', 'FILLER', 'primary_doc.xml')) });
  const r = await run(f, { maxDocs: 0 });
  ok(r.coverage.failedWindows.some(w => w.reason === 'AT_CAP'), 'a month window still at the cap is recorded AT_CAP and coverage is incomplete');
  ok(r.coverage.complete === false, 'AT_CAP is never treated as complete');
}

console.log('Subject direction and issuer checks');
{
  // NVIDIA as holder: the filing is in the search because the subject CIK is the filer; its issuerCik is not the subject
  const hit = mkHit('0000102909-26-000584', '2026-03-26', 'SCHEDULE 13G/A', '0000102909', 'VANGUARD GROUP INC', 'primary_doc.xml');
  const f = { searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms.startsWith('SCHEDULE') ? [hit] : [] }), docFn: async () => ({ ok: true, status: 200, text: fx('new-vanguard-group-exit-2026-03-26.xml') }) };
  const r = await retrieveOwnershipObservations({ issuerCik: '0001045810', issuerName: 'NVIDIA CORP', ...retrievalWindow(T), searchFn: async (p) => ({ ok: true, status: 200, hits: [{ ...hit, _source: { ...hit._source, ciks: ['0001045810', '0000102909'] } }].filter(() => p.forms.startsWith('SCHEDULE')) }), docFn: f.docFn, sleep: async () => {} });
  ok(r.observations.length === 0 && r.excluded[0]?.reason === 'SUBJECT_IS_NOT_THE_ISSUER', 'a filing whose issuer is not the subject is excluded (the subject as holder is a separate direction)');
}

{
  // legacy filing where the subject is the FILER (index 1), not the issuer: excluded
  const hit = { ...mkHit('0001104659-24-020001', '2024-02-13', 'SC 13G/A', '0000102909', 'VANGUARD GROUP INC', 'tv0009-alphabetincclassc.htm') };
  hit._source.ciks = ['0000102909', ISS];
  const r = await retrieveOwnershipObservations({ issuerCik: ISS, issuerName: 'Alphabet Inc.', ...retrievalWindow(T), searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms.startsWith('SC 13') ? [hit] : [] }), docFn: async () => ({ ok: true, status: 200, text: fx('legacy-vanguard-classc-2024-02-13.htm') }), sleep: async () => {} });
  ok(r.observations.length === 0 && r.excluded[0]?.reason === 'SUBJECT_IS_NOT_THE_ISSUER', 'a legacy filing where the subject is index 1 (the filer) is excluded');
  const blkHit = mkHit('0001086364-24-006965', '2024-02-12', 'SC 13G/A', '0001364742', 'BlackRock Inc.', 'us02079k1079_021224.txt');
  const r2 = await retrieveOwnershipObservations({ issuerCik: ISS, issuerName: 'Alphabet Inc.', ...retrievalWindow(T), searchFn: async (p) => ({ ok: true, status: 200, hits: p.forms.startsWith('SC 13') ? [blkHit] : [] }), docFn: async () => ({ ok: true, status: 200, text: fx('legacy-blackrock-2024-02-12.txt') }), sleep: async () => {} });
  ok(r2.observations.length === 1 && r2.observations[0].percent === 6.2 && r2.observations[0].holderCik === '0001364742' && r2.observations[0].dateBasis === 'filing', 'BlackRock legacy .txt (no issuer name, no event date recovered): included by the CIK-order convention, percent 6.2, date basis falls back to the filing date');
}

console.log('Spacing is applied and testable');
{
  const gaps = []; const f = fakes();
  await run(f, { sleep: async (ms) => { gaps.push(ms); } });
  ok(gaps.filter(g => g >= 1500).length >= 2 && gaps.some(g => g >= 400 && g < 1500), 'search requests are spaced 1.5 s and document requests 0.4 s');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
