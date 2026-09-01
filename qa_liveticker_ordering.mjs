// qa_liveticker_ordering.mjs — KRYL-1251.
// The live ticker's ordering must be deterministic and evidence-grounded:
// published_at DESC, then source ASC, title ASC, id ASC. No Math.random.
// No contamination of / by the analytical layer.
//
// Run: node qa_liveticker_ordering.mjs

import { readFileSync } from 'node:fs';
import { orderStories, MOCK_NEWS } from './src/hooks/usenewsfeed.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// ── 1. determinism ─────────────────────────────────────────────────────────
const fixture = [
  { id: 'c', title: 'Charlie', source: 'Zeta',  publishedAt: '2026-09-01T10:00:00Z' },
  { id: 'a', title: 'Alpha',   source: 'Alpha', publishedAt: '2026-09-01T12:00:00Z' },
  { id: 'b', title: 'Bravo',   source: 'Alpha', publishedAt: '2026-09-01T12:00:00Z' }, // tie with 'a' on time
  { id: 'd', title: 'Delta',   source: 'Alpha', publishedAt: null },                    // no timestamp → last
  { id: 'e', title: 'Echo',    source: 'Alpha', publishedAt: '2026-09-01T11:00:00Z' },
];
const shuffle = (arr, seed) => {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const first = orderStories(fixture).map(s => s.id).join(',');
let stable = true;
for (let k = 0; k < 100; k++) {
  if (orderStories(shuffle(fixture, k + 1)).map(s => s.id).join(',') !== first) { stable = false; break; }
}
ok('deterministic across 100 shuffled inputs', stable);

// ── 2. ordering contract ───────────────────────────────────────────────────
ok(`published_at DESC, then source/title/id ASC  (got ${first})`, first === 'a,b,e,c,d');
ok('null published_at sorts last', orderStories(fixture)[orderStories(fixture).length - 1].id === 'd');
ok('orderStories does not mutate its input', (() => { const c = [...fixture]; orderStories(fixture); return JSON.stringify(c) === JSON.stringify(fixture); })());

// ── 3. MOCK fallback is pre-ordered and every item has a timestamp ─────────
const mockOrder = orderStories(MOCK_NEWS).map(s => s.id).join(',');
ok('MOCK_NEWS already in deterministic order', MOCK_NEWS.map(s => s.id).join(',') === mockOrder);
ok('every MOCK item has a publishedAt', MOCK_NEWS.every(s => typeof s.publishedAt === 'string'));

// ── 4. no Math.random / no fabricated fidelity in the shared modules ───────
const hook = readFileSync(new URL('./src/hooks/usenewsfeed.js', import.meta.url), 'utf8');
const tick = readFileSync(new URL('./src/components/shared/liveticker.jsx', import.meta.url), 'utf8');
ok('usenewsfeed.js: no Math.random', !/Math\.random/.test(hook));
ok('liveticker.jsx: no Math.random', !/Math\.random/.test(tick));
ok('usenewsfeed.js: real articles get fs: null (no fabricated fidelity)', /fs:\s*null/.test(hook));

// ── 5. no contamination of / by the analytical layer ──────────────────────
const ENGINE = /formationinference|metricsengine|querysynthesis|domainintelligence|adsubject|resolveadjudication/;
ok('usenewsfeed.js imports nothing from the analytical engine', !ENGINE.test(hook));
ok('liveticker.jsx imports nothing from the analytical engine', !ENGINE.test(tick));

// ── 6. feeds bay migrated; app mounts the strip gated to NAV_SURFACE ───────
const feeds = readFileSync(new URL('./src/components/feeds/feedsbay.jsx', import.meta.url), 'utf8');
const app   = readFileSync(new URL('./src/app.jsx', import.meta.url), 'utf8');
ok('feedsbay.jsx uses the shared hook', /useNewsFeed\(/.test(feeds));
ok('feedsbay.jsx no longer generates a random fs', !/0\.70 \+ Math\.random/.test(feeds));
ok('feedsbay.jsx no longer re-sorts by fs', !/\.sort\(\(a, b\) => \(b\.fs/.test(feeds));
ok('app.jsx mounts <LiveTicker> gated to NAV_SURFACE',
   /viewportLens === 'NAV_SURFACE'[\s\S]{0,200}<LiveTicker/.test(app));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
