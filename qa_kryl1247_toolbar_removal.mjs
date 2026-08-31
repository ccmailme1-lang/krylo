// qa_kryl1247_toolbar_removal.mjs — KRYL-1247.
// The FloatingToolbar (viewport-lens ribbon) is removed. surfaceActivated is owned
// only by krylo-submit / krylo-reset / krylo-nav; viewportLens stays at NAV_SURFACE.
//
// Run: node qa_kryl1247_toolbar_removal.mjs

import { readFileSync, existsSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };
const rd = p => readFileSync(new URL(p, import.meta.url), 'utf8');

ok('floatingtoolbar.jsx is deleted', !existsSync(new URL('./src/components/surface/floatingtoolbar.jsx', import.meta.url)));

const app = rd('./src/app.jsx');
ok('app.jsx no longer imports FloatingToolbar', !/import FloatingToolbar/.test(app));
ok('app.jsx no longer mounts <FloatingToolbar', !/<FloatingToolbar/.test(app));
ok('the dead viewportLens -> setSurfaceActivated useEffect is removed',
   !/if \(viewportLens !== 'OBSERVE' && viewportLens !== 'NAV_SURFACE'\) setSurfaceActivated\(true\)/.test(app));
ok('surfaceActivated is still set by the real signals (krylo-submit / reset / nav)',
   /if \(ev\.data\?\.type !== 'krylo-submit'\)[\s\S]{0,300}setSurfaceActivated\(true\)/.test(app) &&
   /krylo-reset[\s\S]{0,120}setSurfaceActivated\(false\)/.test(app));
ok('viewportLens is still derived + passed to ConeMap (now permanently NAV_SURFACE)',
   /const viewportLens = prismState\?\.activeLens \?\? 'NAV_SURFACE'/.test(app) && /viewportLens=\{viewportLens\}/.test(app));

const prism = rd('./src/context/PrismContext.jsx');
ok('PrismContext [TEMP-DEBUG] SET_LENS log removed', !/TEMP-DEBUG.*SET_LENS/.test(prism));
ok('PrismContext SET_LENS reducer kept (stable usePrism shape)', /case 'SET_LENS':/.test(prism) && /activeLens: action\.payload/.test(prism));

ok('no source file still references FloatingToolbar as code (comments ok)',
   !/import .*FloatingToolbar|<FloatingToolbar/.test(app + prism));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
