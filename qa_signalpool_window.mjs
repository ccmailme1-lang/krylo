// qa_signalpool_window.mjs -- DEF-1375: pool refresh on a repeated id, retention and the MAP field window.
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { getAllSignals, getDomainSignals, DEFAULT_WINDOW_MS, MAP_FIELD_WINDOW_MS, POOL_RETENTION_MS } from './src/engine/domaingravity.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const min = 60_000;

console.log('Repeated id refreshes the entry (no duplicate)');
surfaceRouter.dispatchBatch([{ id: 'fred-T10Y2Y-2026-10-05', domain: 'capital', confidence: 50, ts: Date.now() - 4 * min, source: 'FRED' }]);
surfaceRouter.dispatchBatch([{ id: 'fred-T10Y2Y-2026-10-05', domain: 'capital', confidence: 60, ts: Date.now(), source: 'FRED' }]);
{ const e = getDomainSignals('CAPITAL').filter(s => s.id === 'fred-T10Y2Y-2026-10-05'); ok(e.length === 1 && e[0].confidence === 60, 'one entry, latest values'); }

console.log('An EDGAR-style entry 12 minutes old (15-minute poll)');
surfaceRouter.dispatchBatch([{ id: 'edgar-formd-1', domain: 'capital', confidence: 70, ts: Date.now() - 12 * min, source: 'EDGAR' }]);
{
  const inDefault = getAllSignals(DEFAULT_WINDOW_MS).some(s => s.id === 'edgar-formd-1');
  const inMap = getAllSignals(MAP_FIELD_WINDOW_MS).some(s => s.id === 'edgar-formd-1');
  ok(!inDefault, 'default 5-minute window does not see it (unchanged for every other reader)');
  ok(inMap, 'the map window (30 min) still sees it');
}

console.log('Retention covers the map window');
surfaceRouter.dispatchBatch([{ id: 'edgar-formd-2', domain: 'ownership', confidence: 70, ts: Date.now() - 29 * min, source: 'EDGAR' }]);
surfaceRouter.dispatchBatch([{ id: 'trigger', domain: 'media', confidence: 40, ts: Date.now(), source: 'x' }]); // a dispatch runs the prune
ok(getAllSignals(MAP_FIELD_WINDOW_MS).some(s => s.id === 'edgar-formd-2'), 'a 29-minute-old entry survives pruning and is in the map window');
surfaceRouter.dispatchBatch([{ id: 'edgar-formd-3', domain: 'ownership', confidence: 70, ts: Date.now() - 40 * min, source: 'EDGAR' }]);
ok(!getAllSignals(MAP_FIELD_WINDOW_MS).some(s => s.id === 'edgar-formd-3'), 'a 40-minute-old entry is outside the map window and pruned');
ok(POOL_RETENTION_MS > MAP_FIELD_WINDOW_MS && MAP_FIELD_WINDOW_MS >= 2 * 15 * min, 'constants: retention > map window >= 2x the 15-minute EDGAR poll');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
