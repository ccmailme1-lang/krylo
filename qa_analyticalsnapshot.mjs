// qa_analyticalsnapshot.mjs -- KRYL-1398: the frozen analytical snapshot (spec validation 1, 3, 4, 5, 6 and the N=3 /
// refresh / late-result rulings). Pure engine level: the real pool, the real canonical rho and the real snapshot manager.
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { computeDomainPressure, getAllDomainPressures, getAllSignals, getDomainSignals, MAP_FIELD_WINDOW_MS } from './src/engine/domaingravity.js';
import { A } from './src/engine/adsubject.js';
import { buildPerceptionField } from './src/engine/perceptionread.js';
import { inferFormation } from './src/engine/formationinference.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor } from './src/engine/canonicalrelationshipprojection.js';
import { beginAnalysis, expectLookup, settleLookup, armSettlement, getSnapshotState, getPinnedChange, frozenLookup, refreshAvailable, _resetSnapshots } from './src/engine/analyticalsnapshot.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CID = 'qa-snap-co';
const scope = { kind: 'ENTITY', canonicalId: CID, entity: { name: 'QA Snap Co', identifiers: { edgar: '0000000002' } }, contract: 'ENTITY', attribution: 'IDENTIFIER' };
let n = 0;
const push = (domain, conf, canonicalId = CID, extra = {}) => surfaceRouter.dispatchBatch([{ id: `qa-snap-${++n}`, domain, confidence: conf, ts: Date.now(), source: 'EDGAR_8K', meta: { canonicalId, eventDate: '2026-09-0' + (1 + (n % 8)) }, ...extra }]);
const surfaces = () => ({
  pressures: JSON.stringify(getAllDomainPressures(MAP_FIELD_WINDOW_MS)),
  signals: getAllSignals(MAP_FIELD_WINDOW_MS).length,
  fieldCtx: JSON.stringify(['CAPITAL', 'OWNERSHIP', 'LABOR'].map(d => A(d, scope).fieldContext)),
  bound: JSON.stringify(['CAPITAL', 'OWNERSHIP', 'LABOR'].map(d => A(d, scope).formationObservations.length)),
  formation: (() => { const f = buildPerceptionField({ now: 1, subject: CID, windowMs: MAP_FIELD_WINDOW_MS }); const r = f.particles.length ? inferFormation(f.particles, { now: 1 }) : null; return r ? JSON.stringify([r.participatingDomains, r.graph.edges.length]) : 'null'; })(),
  rels: JSON.stringify(findAdmittedRelationshipsFor('CIK::0000000002').map(r => r.id).sort()),
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('Pre-freeze and the no-lookup case');
_resetSnapshots();
ok(getSnapshotState().status === 'idle', 'idle before any query');
beginAnalysis('market theme question'); armSettlement();
ok(getSnapshotState().status === 'ready' && getSnapshotState().active.lookups.length === 0, 'a query with no subject lookups freezes at submit');
_resetSnapshots();

console.log('Settlement: all OK freezes once; pool and rho changes afterwards change nothing (validation 1)');
for (const d of ['CAPITAL', 'CAPITAL', 'OWNERSHIP', 'LABOR', 'TECHNOLOGY']) push(d, 60);
beginAnalysis('q one');
ok(getSnapshotState().status === 'checking' && getSnapshotState().active === null, 'after submit: checking, no snapshot yet (no partial numbers)');
expectLookup('ownership', { canonicalId: CID }); expectLookup('8k', { canonicalId: CID }); expectLookup('capital', { canonicalId: CID });
armSettlement();
settleLookup('ownership'); settleLookup('8k');
ok(getSnapshotState().status === 'checking', 'two of three lookups terminal: still checking');
admitAndProject({ part: ['CIK::0000000002', 'CIK::0000000003'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: 'A-1', source: 'SEC_13D_13G_TARGETED', filingDate: '2026-04-29', form: 'SCHEDULE 13G' }, ts: Date.parse('2026-04-29') } }, { subjectCik: '0000000002', subjectName: 'QA Snap Co', filerCik: '0000000003', filerName: 'Holder A', source: 'SEC_13D_13G_TARGETED' });
settleLookup('capital');
const s1 = getSnapshotState();
ok(s1.status === 'ready' && s1.active.id && s1.active.generatedAt, 'all terminal: one snapshot with an id and a timestamp');
const base = surfaces();
ok(JSON.parse(base.rels).length === 1, 'the relationship admitted before the freeze is in the snapshot');
push('CAPITAL', 99); push('MEDIA', 80); push('OWNERSHIP', 5, CID); push('LABOR', 95, 'someone-else');
admitAndProject({ part: ['CIK::0000000002', 'CIK::0000000004'], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { provenance: { accession: 'A-2', source: 'SEC_13D_13G_TARGETED', filingDate: '2026-05-01', form: 'SCHEDULE 13G' }, ts: Date.parse('2026-05-01') } }, { subjectCik: '0000000002', subjectName: 'QA Snap Co', filerCik: '0000000004', filerName: 'Holder B', source: 'SEC_13D_13G_TARGETED' });
await sleep(30);
ok(same(base, surfaces()), 'after new signals AND a late admission: pressures, signal count, fieldContext, bound counts, formation and relationships are identical');
ok(latestEvidenceFor(findAdmittedRelationshipsFor('CIK::0000000002')[0].id)?.provenance?.accession === 'A-1', 'evidence reads the frozen copy');
const idBefore = getSnapshotState().active.id;
ok(settleLookup('ownership') === false && getSnapshotState().active.id === idBefore, 'a late lookup result is ignored by a frozen snapshot');

console.log('N = 3 identical runs without refresh');
const r1 = surfaces(); await sleep(15); const r2 = surfaces(); await sleep(15); const r3 = surfaces();
ok(same(r1, r2) && same(r2, r3) && same(r3, base), 'three consecutive reads match on counts, polarities, pairs and relationships');
ok(getSnapshotState().active.id === idBefore, 'snapshot identity unchanged across the three reads');

console.log('Failure and timeout are recorded, never read as absence');
_resetSnapshots();
beginAnalysis('q two'); expectLookup('ownership', { canonicalId: CID }); expectLookup('8k', { canonicalId: CID }); armSettlement();
settleLookup('ownership', 'EDGAR ownership search HTTP 503'); settleLookup('8k');
const f1 = getSnapshotState().active;
ok(f1 && frozenLookup(CID, 'ownership').state === 'FAILED' && frozenLookup(CID, 'ownership').error.includes('503') && frozenLookup(CID, '8k').state === 'OK', 'one FAILED lookup: frozen with that lookup FAILED and its text, the other OK');
_resetSnapshots();
beginAnalysis('q three', { timeoutMs: 60 }); expectLookup('ownership', { canonicalId: CID }); armSettlement();
await sleep(120);
ok(getSnapshotState().status === 'ready' && frozenLookup(CID, 'ownership').state === 'TIMEOUT', 'a hanging lookup freezes at the timeout as TIMEOUT');
ok(settleLookup('ownership') === false && frozenLookup(CID, 'ownership').state === 'TIMEOUT', 'its late result changes nothing');

console.log('Refresh: atomic swap, failure keeps the last valid snapshot (validation 4)');
_resetSnapshots();
push('CAPITAL', 50);
beginAnalysis('q four'); expectLookup('ownership', { canonicalId: CID }); armSettlement(); settleLookup('ownership');
const first = getSnapshotState().active; const firstSurf = surfaces();
ok(refreshAvailable(), 'refresh is available once ready');
push('CAPITAL', 90); push('OWNERSHIP', 70);
const rid = beginAnalysis('q four', { refresh: true }); expectLookup('ownership', { canonicalId: CID }); armSettlement();
ok(getSnapshotState().refresh.running && getSnapshotState().active.id === first.id && same(firstSurf, surfaces()), 'during refresh the previous snapshot stays displayed and unchanged');
settleLookup('ownership');
const second = getSnapshotState().active;
ok(second.id === rid && second.id !== first.id && !same(firstSurf, surfaces()), 'on settlement one swap: new id, and every surface now reads the new data');
ok(getSnapshotState().history.length === 2 && getSnapshotState().history[0].id === first.id, 'the previous run stays identifiable in the session history');
const keep = surfaces();
beginAnalysis('q four', { refresh: true }); expectLookup('ownership', { canonicalId: CID }); armSettlement(); settleLookup('ownership', 'HTTP 500');
ok(getSnapshotState().active.id === second.id && same(keep, surfaces()) && /obtained nothing new/.test(getSnapshotState().refresh.error ?? ''), 'a refresh in which every lookup fails keeps the last valid snapshot and states why');

console.log('Pinned relationship-change result');
_resetSnapshots();
beginAnalysis('q five'); expectLookup('ownership', { canonicalId: CID }); armSettlement(); settleLookup('ownership');
ok(getPinnedChange(CID) === null || getPinnedChange(CID).state !== 'done', 'no result yet: nothing pinned');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
