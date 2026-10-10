// qa_brief_done_state_e2e.mjs -- regression for the 2026-10-09 blank screen: the app crashed (ReferenceError: BRT is not
// defined) ~15-45 s after a query, exactly when the relationship-change result arrived, and React unmounted everything.
// Drives the REAL app in headless Chrome: creates an Analysis session and fires the real connectors for a registry entity,
// then asserts the page stays mounted with no page errors after the RELATIONSHIP CHANGE section appears.
// Needs the dev server (default http://localhost:5173) and the engine on :4000. Slow (about 60 s). Run on demand.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const q = process.argv[2] ?? 'What structural relationships are forming around Sysco across ownership, technology, and capital?';
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2000, height: 1020 } });
const pageErrs = []; pg.on('pageerror', e => pageErrs.push(String(e).slice(0, 200)));
const tg = Date.now(); await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000); console.log('  (domcontentloaded in ' + Math.round((Date.now() - tg) / 1000) + ' s)');
await pg.evaluate(async (q) => {
  const st = await import('/src/store/useanalysisstore.js');
  st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {});
  const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q);
}, q);
let appeared = false, mountedAfter = false, snapshot = null;
for (let i = 0; i < 40; i++) {
  await pg.waitForTimeout(3000);
  snapshot = await pg.evaluate(() => ({ kids: document.getElementById('root')?.children.length ?? 0, text: document.body.innerText }));
  if (!appeared && /RELATIONSHIP CHANGE/.test(snapshot.text)) { appeared = true; await pg.waitForTimeout(8000); snapshot = await pg.evaluate(() => ({ kids: document.getElementById('root')?.children.length ?? 0, text: document.body.innerText })); mountedAfter = snapshot.kids > 0 && /STRUCTURAL BRIEF/.test(snapshot.text); break; }
  if (snapshot.kids === 0) break;
}
const checks = [
  [appeared, 'the RELATIONSHIP CHANGE section appeared after the query'],
  [mountedAfter, 'the page is still mounted 8 s after it appeared (no blank screen)'],
  [pageErrs.length === 0, `no page errors (${pageErrs[0] ?? 'none'})`],
  [/Vanguard|VANGUARD/.test(snapshot?.text ?? '') && /accession|\d{10}-\d{2}-\d{6}/.test(snapshot?.text ?? ''), 'the section shows holder names and filing accession numbers'],
];
let fail = 0; for (const [c, l] of checks) { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; }
await b.close(); process.exit(fail ? 1 : 0);
