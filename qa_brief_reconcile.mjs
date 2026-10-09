// qa_brief_reconcile.mjs -- DEF-1385: the left brief and the MAP brief are built from the same two formations
// (whole-field = ambient, subject-scoped = only the subject's own particles), same window, and a count is
// labeled for the scope that produced it. Real engine path: pool -> buildPerceptionField -> inferFormation ->
// computeBriefSummary, with the left column's and the MAP's own argument expressions.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { join, resolve as presolve, dirname } from 'path';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { MAP_FIELD_WINDOW_MS, getAllSignals } from './src/engine/domaingravity.js';
import { buildPerceptionField } from './src/engine/perceptionread.js';
import { inferFormation } from './src/engine/formationinference.js';
import { subjectScope } from './src/engine/subjectscope.js';
import { A as adSubject } from './src/engine/adsubject.js';

const out = join(process.cwd(), 'node_modules', '.qa_brief_reconcile.mjs');
// Engine modules stay EXTERNAL (absolute file URLs) so the bundle shares this process's one signal pool instead of bundling a second, empty copy.
const keepEngineExternal = { name: 'engine-external', setup(b) {
  b.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (a) => {
    const abs = presolve(a.resolveDir, a.path);
    return abs.includes('/src/') ? { path: pathToFileURL(abs).href, external: true } : null;
  });
} };
await build({ entryPoints: ['src/components/analysis/structuralbrief.jsx'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, jsx: 'automatic', logLevel: 'silent', external: ['react', 'react-dom', 'react/jsx-runtime'], plugins: [keepEngineExternal] });
const { computeBriefSummary, selectPairSupport, canonicalRelationshipSentence } = await import(pathToFileURL(out).href);

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };

// Pool: ambient signals in 6 domains (no subject) + Sysco-attributed signals in 4 domains.
const now = Date.now(), min = 60_000;
const D = ['capital', 'technology', 'labor', 'ownership', 'knowledge', 'media'];
D.forEach((d, i) => { for (let k = 0; k < 4; k++) surfaceRouter.dispatchBatch([{ id: `amb-${d}-${k}`, domain: d, confidence: 55 + i, ts: now - (k + 1) * min, source: 'FRED' }]); });
['capital', 'technology', 'labor', 'ownership'].forEach(d => { for (let k = 0; k < 3; k++) surfaceRouter.dispatchBatch([{ id: `sys-${d}-${k}`, domain: d, confidence: 70, ts: now - (k + 8) * min, source: 'EDGAR_8K', meta: { canonicalId: 'sysco', eventDate: '2026-09-0' + (k + 1) } }]); });

const q = 'What structural relationships are forming around Sysco across ownership and capital?';
const scope = subjectScope(q);
ok(scope.kind === 'ENTITY' && scope.canonicalId === 'sysco', 'query resolves to the Sysco entity');

const read = (subject) => { const f = buildPerceptionField({ now: Date.now(), subject, windowMs: MAP_FIELD_WINDOW_MS }); return f.particles.length ? inferFormation(f.particles) : null; };
const ambient = read(undefined), subjectF = read('sysco');
const pressures = D.map(d => ({ domain: d.toUpperCase(), signalCount: getAllSignals(MAP_FIELD_WINDOW_MS).filter(s => s.domain === d.toUpperCase()).length, magnitude: 60, polarity: 'constructive' })).filter(p => p.signalCount > 0);

// Left column's argument expressions (targetpacket.jsx) and the MAP's (structurepanel.jsx).
const left = computeBriefSummary({ subjScope: scope, activeDomainPressures: pressures, fieldFormation: subjectF, ambientFormation: ambient, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null });
const map  = computeBriefSummary({ subjScope: scope, activeDomainPressures: pressures, fieldFormation: scope.kind === 'ENTITY' ? subjectF : ambient, ambientFormation: ambient, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null });

const nAmb = ambient?.graph?.edges?.length ?? 0, nSub = subjectF?.graph?.edges?.length ?? 0;
console.log(`  (ambient edges ${nAmb}, subject edges ${nSub}, subject-bound ${['CAPITAL','TECHNOLOGY','LABOR','OWNERSHIP'].reduce((n, d) => n + adSubject(d, scope).formationObservations.length, 0)})`);
ok(left.briefSentence === map.briefSentence, 'left and MAP produce the identical brief sentence');
ok(JSON.stringify(left.rows) === JSON.stringify(map.rows), 'left and MAP produce identical rows');
ok(new RegExp(`with ${nAmb} domain pair`).test(left.briefSentence) && /a field-level reading, not bound to/.test(left.briefSentence), `field-level sentence uses the whole-field count (${nAmb})`);
console.log('  sentence:', left.briefSentence);
ok(nSub > 0 ? new RegExp(`with ${nSub} domain pair[s]? co-present among them`).test(left.briefSentence) : true, `subject level states its own count (${nSub}) and says "among them"`);
ok(subjectF && subjectF.graph.vertices.every(v => ['CAPITAL', 'TECHNOLOGY', 'LABOR', 'OWNERSHIP'].includes(String(v.domain).toUpperCase())), 'subject formation contains only domains where Sysco-attributed signals exist (no ambient-only domain)');
ok(ambient && ambient.graph.vertices.length >= subjectF.graph.vertices.length, 'whole-field formation covers at least the subject formation domains');

console.log('Pair support: both sides before any display limit (DEF-1387)');
{
  const ev = (d, src, dates) => dates.map(x => ({ domain: d, source: src, eventDate: x }));
  const crowd = { CAPITAL: ev('CAPITAL', 'EDGAR_8K', ['2026-10-06', '2026-09-25', '2026-09-24', '2026-09-16', '2026-09-14']), OWNERSHIP: ev('OWNERSHIP', 'EDGAR_13G', ['2026-03-26']) };
  const c = selectPairSupport(crowd, 'CAPITAL', 'OWNERSHIP');
  ok(c.complete && c.sideA.length === 2 && c.sideB.length === 1, 'crowd-out: five newer CAPITAL filings do not push out the single older OWNERSHIP filing');
  ok(c.sideA[0].eventDate === '2026-10-06' && c.sideB[0].domain === 'OWNERSHIP' && c.sideB[0].source === 'EDGAR_13G', 'each citation keeps its domain, source and date');
  const one = selectPairSupport({ CAPITAL: ev('CAPITAL', 'EDGAR_8K', ['2026-10-06']) }, 'CAPITAL', 'LABOR');
  ok(!one.complete && one.missing.join() === 'LABOR' && one.sideA.length === 1, 'one side without evidence: incomplete, names the missing domain, keeps the available side');
  const none = selectPairSupport({}, 'LABOR', 'OWNERSHIP');
  ok(!none.complete && none.missing.join() === 'LABOR,OWNERSHIP' && none.sideA.length === 0 && none.sideB.length === 0, 'neither side has evidence: incomplete lead naming both domains (selection cannot fix a data gap)');
  const undated = selectPairSupport({ CAPITAL: [{ domain: 'CAPITAL', source: 'X', eventDate: null }], LABOR: ev('LABOR', 'EDGAR_8K', ['2026-01-02']) }, 'CAPITAL', 'LABOR');
  ok(!undated.complete && undated.missing.join() === 'CAPITAL', 'an undated observation is not dated evidence');
}

console.log('Ownership direction in words (DEF-1391)');
{
  // parts are [issuer, filer]: the filer is the holder
  const asIssuer = canonicalRelationshipSentence('HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', 'NVIDIA CORP', 'VANGUARD GROUP INC');
  const asHolder = canonicalRelationshipSentence('HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', 'Nebius Group N.V.', 'NVIDIA CORP');
  ok(asIssuer === 'VANGUARD GROUP INC has disclosed beneficial ownership in NVIDIA CORP', 'NVIDIA as issuer: the holder is named first');
  ok(asHolder === 'NVIDIA CORP has disclosed beneficial ownership in Nebius Group N.V.', 'NVIDIA as holder: NVIDIA is the one that disclosed');
  ok(asIssuer !== asHolder, 'the two directions no longer read the same');
  ok(canonicalRelationshipSentence('ACQUIRED', 'Sysco', 'Restaurant Depot') === 'Sysco acquired Restaurant Depot', 'ACQUIRED reads as a sentence');
  ok(canonicalRelationshipSentence('SOMETHING_NEW', 'A', 'B') === 'A ↔ B', 'an unknown type falls back to the plain pair, never an invented direction');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
