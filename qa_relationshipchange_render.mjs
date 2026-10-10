// qa_relationshipchange_render.mjs -- KRYL-1386: what the guest-facing block says (server-render of the real component) and the stated-absence lines.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { join, resolve as presolve } from 'path';
import fs from 'fs';
import { classifyOwnershipChange } from './src/engine/relationshipchange.js';
import { parseSchedule13GXml } from './src/engine/ownershipposition.js';

const out = join(process.cwd(), 'node_modules', '.qa_relchange_block.mjs');
const keepEngineExternal = { name: 'engine-external', setup(b) { b.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (a) => { const abs = presolve(a.resolveDir, a.path); return abs.includes('/src/') ? { path: pathToFileURL(abs).href, external: true } : null; }); } };
await build({ entryPoints: ['src/components/analysis/relationshipchangeblock.jsx'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, jsx: 'automatic', logLevel: 'silent', external: ['react', 'react-dom', 'react/jsx-runtime'], plugins: [keepEngineExternal] });
const { default: Block, temporalStatement } = await import(pathToFileURL(out).href);
const { renderToStaticMarkup } = await import('react-dom/server');
const { createElement } = await import('react');

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const ISS = '0001652044';
const exit = parseSchedule13GXml(fx('new-vanguard-group-exit-2026-03-26.xml')), vcm = parseSchedule13GXml(fx('new-vanguard-capital-mgmt-2026-04-29.xml'));
const O = (o) => ({ issuerCik: ISS, family: 'new', dateBasis: 'event', form: 'SCHEDULE 13G/A', soleVote: 1, sharedVote: 0, soleDisp: 1, sharedDisp: 0, below5Flag: false, comments: null, releaseNumber: null, source: 'SEC', ...o });
const obs = [
  O({ accession: '0001104659-24-020000', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-13', eventDate: '2023-12-29', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 8.34 }),
  O({ accession: '0000102909-26-000584', filingDate: '2026-03-26', eventDate: '2026-03-13', holderCik: '0000102909', holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 0, shares: 0, below5Flag: true, comments: exit.person.comments, releaseNumber: exit.person.releaseNumber }),
  O({ accession: '0002100119-26-000161', form: 'SCHEDULE 13G', filingDate: '2026-04-29', eventDate: '2026-03-31', holderCik: '0002100119', holderName: 'VANGUARD CAPITAL MANAGEMENT LLC', cusip: '02079K305', percent: 7.48, comments: vcm.person.comments, releaseNumber: vcm.person.releaseNumber }),
  O({ accession: '0000950170-25-109161', filingDate: '2025-08-14', eventDate: '2025-06-30', holderCik: '0001242463', holderName: 'SCHMIDT ERIC E', cusip: '02079K305', percent: 0.83, below5Flag: true }),
];
const result = classifyOwnershipChange({ observations: obs, T: '2026-10-09', coverage: { complete: true } });
const html = renderToStaticMarkup(createElement(Block, { entry: { state: 'done', result }, ABSENCE: '#888', LBL: '#777', BRT: '#fff' }));
const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

console.log('Guest-facing block');
ok(/PRIOR 2024-10-09 TO 2025-10-09 · CURRENT 2025-10-09 TO 2026-10-09/.test(text) && /event dates, not retrieval dates/.test(text), 'states both periods and that dates are event dates');
ok(/VANGUARD GROUP INC · class CUSIP 02079K305 — DISSOLVED/.test(text), 'the Vanguard Group line states DISSOLVED for its class');
ok(/0000102909-26-000584/.test(text) && /0% in SCHEDULE 13G\/A 0000102909-26-000584 \(event date 2026-03-13\)/.test(text) && /8.34% in SC 13G\/A 0001104659-24-020000 \(event date 2023-12-29\)/.test(text), 'shows the prior and current filing, accession, reported percent and event date');
ok(/Configuration: RECONFIGURED \(participants\).*34-39538/.test(text), 'participants change: documented basis with the SEC release number');
ok(/VANGUARD CAPITAL MANAGEMENT LLC · class CUSIP 02079K305 — RECONFIGURED/.test(text) && /Existence: NEW/.test(text), 'Vanguard Capital Management: NEW and RECONFIGURED');
ok(/SCHMIDT ERIC E.*INDETERMINATE/.test(text) && /NO_CURRENT_OBSERVATION/.test(text) && /absence class a or b/.test(text), 'Schmidt: INDETERMINATE with reason code and absence class');
ok(/rule: EXIST-DISSOLVED:zero-percent-in-P1/.test(text), 'the rule id that triggered the classification is shown');
ok(/does not show the shares were sold, and a related filer may report them/.test(text), 'DISSOLVED carries the reading limit: zero reported is not evidence of a sale');
ok(/do not establish why a position changed/.test(text), 'the no-causation limitation is stated');
ok(!/\b(because|caused by|funded by|driven by|led to)\b/i.test(text), 'no causal wording in the generated text');
ok(html.indexOf('DISSOLVED') < html.indexOf('INDETERMINATE'), 'evidenced changes are listed before the indeterminate ones');

console.log('Stated absences');
ok(/checking/.test(temporalStatement({ state: 'running' })), 'running: says it is checking');
ok(/not evidence that nothing changed/.test(temporalStatement({ state: 'failed', error: 'timed out' })), 'failed: says failure is not evidence of no change');
ok(/incomplete retrieval/.test(temporalStatement({ state: 'done', result: { coverage: { complete: false, reasons: ['1 search window(s) not obtained'] } } })), 'incomplete coverage: stated');
ok(temporalStatement({ state: 'done', result: { coverage: { complete: true } } }) === null && temporalStatement(null) === null, 'complete or absent: no extra statement');
const empty = renderToStaticMarkup(createElement(Block, { entry: { state: 'done', result: { relationships: [], periods: result.periods, coverage: { complete: true } } }, ABSENCE: '#888', LBL: '#777', BRT: '#fff' }));
ok(/nothing to compare/.test(empty), 'no filings held or dated: says there is nothing to compare');
ok(renderToStaticMarkup(createElement(Block, { entry: null })) === '' && renderToStaticMarkup(createElement(Block, { entry: { state: 'running' } })) === '', 'nothing renders without a finished result');

console.log('DEF-1397: retrieval basis under NEW and DISSOLVED, from the stored run record');
{
  const { retrieveOwnershipObservations, retrievalWindow } = await import('./src/engine/connectors/ownershiphistory.js');
  const T = '2026-10-09';
  const mkHit = (adsh, date, form, holderCik, holderName, file) => ({ _id: `${adsh}:${file}`, _source: { adsh, file_date: date, form, ciks: [ISS, holderCik], display_names: [`Alphabet Inc.  (GOOG, GOOGL)  (CIK ${ISS})`, `${holderName}  (CIK ${holderCik})`] } });
  const H = [
    { fam: 'new', hit: mkHit('0000102909-26-000584', '2026-03-26', 'SCHEDULE 13G/A', '0000102909', 'VANGUARD GROUP INC', 'primary_doc.xml'), doc: 'new-vanguard-group-exit-2026-03-26.xml' },
    { fam: 'new', hit: mkHit('0002100119-26-000161', '2026-04-29', 'SCHEDULE 13G', '0002100119', 'VANGUARD CAPITAL MANAGEMENT LLC', 'primary_doc.xml'), doc: 'new-vanguard-capital-mgmt-2026-04-29.xml' },
    { fam: 'legacy', hit: mkHit('0001104659-24-020001', '2024-02-13', 'SC 13G/A', '0000102909', 'VANGUARD GROUP INC', 'tv0009-alphabetincclassc.htm'), doc: 'legacy-vanguard-classc-2024-02-13.htm' },
  ];
  const byKey = new Map(H.map(h => [`${h.hit._source.adsh}:${h.hit._id.split(':')[1]}`, h.doc]));
  const run = async (failDoc = null) => {
    const searchFn = async (pp) => ({ ok: true, status: 200, hits: H.filter(h => h.fam === (pp.forms.startsWith('SCHEDULE') ? 'new' : 'legacy') && h.hit._source.file_date >= pp.startdt && h.hit._source.file_date <= pp.enddt).map(h => h.hit) });
    const docFn = async ({ accession, file }) => { if (accession === failDoc) return { ok: false, status: 500, text: '' }; const f = byKey.get(`${accession}:${file}`); return f ? { ok: true, status: 200, text: fx(f) } : { ok: false, status: 404, text: '' }; };
    const fetched = await retrieveOwnershipObservations({ issuerCik: ISS, issuerName: 'Alphabet Inc.', ...retrievalWindow(T), searchFn, docFn, sleep: async () => {} });
    const res = classifyOwnershipChange({ observations: fetched.observations, T, coverage: fetched.coverage });
    return { res, retrieval: { excluded: fetched.excluded, coverage: fetched.coverage, observationCount: fetched.observations.length } };
  };
  const render = (res, retrieval) => renderToStaticMarkup(createElement(Block, { entry: { state: 'done', result: res, retrieval }, ABSENCE: '#888', LBL: '#777', BRT: '#fff' })).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

  const a = await run();
  const ta = render(a.res, a.retrieval);
  ok(a.retrieval.coverage.complete === true, 'real run (fake fetchers, saved filings): coverage complete');
  const nNewDiss = a.res.relationships.filter(r => ['NEW', 'DISSOLVED'].includes(r.existence.state)).length;
  ok(nNewDiss >= 1 && (ta.match(/Retrieval basis \(this browser run\): search complete/g) ?? []).length === nNewDiss, 'complete: the basis appears once under each NEW or DISSOLVED line and under no other state');
  const both = render(result, a.retrieval);
  ok((both.match(/Retrieval basis \(this browser run\)/g) ?? []).length === 2 && /— DISSOLVED[^]*?Retrieval basis[^]*?— RECONFIGURED[^]*?Retrieval basis/.test(both), 'with a DISSOLVED and a NEW record: each carries its own basis');
  ok(/SEC filings dated 2022-10-09 to 2026-10-09/.test(ta) && /SCHEDULE 13D\/13G \(filed from December 2024\) and SC 13D\/13G \(earlier\)/.test(ta), 'states the search window and both form families');
  ok(/Search windows answered 2 of 2 · filings returned 3 · observations built 3/.test(ta) && /Not obtained: 0 search windows, 0 documents\./.test(ta), 'states windows, filings returned, observations built and zero failures from the record');
  ok(/it is not proof that no other filing exists/.test(ta), 'states the coverage boundary');
  ok(/No filing by this holder for this class was returned dated on or before 2025-10-09/.test(ta), 'NEW: says what the complete search returned for the prior side');

  const b = await run('0000102909-26-000584');
  const tb = render(b.res, b.retrieval);
  ok(b.retrieval.coverage.complete === false && b.retrieval.coverage.failedDocs.length === 1, 'real run with one document failing: coverage incomplete');
  ok(!/Existence: NEW/.test(tb), 'incomplete coverage blocks NEW (KRYL-1386 rule unchanged)');

  const c = await run('0001104659-24-020001');
  const tc = render(c.res, c.retrieval);
  ok(/SEARCH INCOMPLETE/.test(tc) || !/Existence: (NEW|DISSOLVED)/.test(tc), 'a record left incomplete is never shown as a complete search');

  // shaped exactly as ownershiphistory.js records them
  const base = a.retrieval.coverage;
  const failedWin = { ...base, complete: false, windows: [...base.windows.slice(0, 1), { family: 'legacy', from: '2022-10-09', to: '2026-10-09', status: 'failed' }], failedWindows: [{ family: 'legacy', from: '2022-10-09', to: '2026-10-09', status: 500, reason: 'REQUEST_FAILED' }], reasons: ['1 search window(s) not obtained'] };
  const atCap = { ...base, complete: false, windows: [...base.windows.slice(0, 1), { family: 'new', from: '2026-01-01', to: '2026-01-31', status: 'at-cap' }], failedWindows: [{ family: 'new', from: '2026-01-01', to: '2026-01-31', status: 200, reason: 'AT_CAP' }], reasons: ['1 search window(s) not obtained'] };
  const dissolvedOnly = { ...result, relationships: result.relationships.filter(r => r.existence.state === 'DISSOLVED') };
  const tw = render(dissolvedOnly, { ...a.retrieval, coverage: failedWin });
  ok(/SEARCH INCOMPLETE/.test(tw) && /Not obtained: 1 search window\(s\), 0 window\(s\) at the 100-result cap, 0 document\(s\)/.test(tw) && /absence of a filing is not established/.test(tw) && !/not proof that no other filing exists/.test(tw), 'failed window: incomplete wording, count shown, no completeness claim');
  const tcap = render(dissolvedOnly, { ...a.retrieval, coverage: atCap });
  ok(/Not obtained: 0 search window\(s\), 1 window\(s\) at the 100-result cap/.test(tcap) && /SEARCH INCOMPLETE/.test(tcap), 'at-cap: shown as capped, distinct from a failed request, and incomplete');
  const tfd = render(dissolvedOnly, { ...a.retrieval, coverage: { ...base, complete: false, failedDocs: [{ accession: 'X', reason: 'DOCUMENT_FAILED' }], reasons: ['1 document(s) not obtained or not parseable'] } });
  ok(/SEARCH INCOMPLETE/.test(tfd) && /1 document\(s\)/.test(tfd), 'failed document: incomplete wording, count shown');
  const tnone = render(a.res, null);
  ok(/no retrieval record is available for this run/.test(tnone) && !/search complete/.test(tnone), 'no stored record: stated absence, never an assumed complete search');
  ok(!/Retrieval basis/.test(render({ ...a.res, relationships: a.res.relationships.filter(r => !['NEW', 'DISSOLVED'].includes(r.existence.state)) }, a.retrieval)), 'no basis under states other than NEW and DISSOLVED');
  ok(!/\b(because|caused by|funded by|driven by|led to)\b/i.test(ta + tw + tcap), 'no causal wording in the basis text');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
