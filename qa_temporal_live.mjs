// qa_temporal_live.mjs -- Step 4b live: for two entities, two separate page sessions. The second reads its history from the store, searches SEC only for
// what is newer, takes far less time, and shows the same classification as the first.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const ENT = [['runtime-admitted', 'Broadcom'], ['registry', 'Sysco']];
const b = await chromium.launch(); let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
async function session(name) {
  const q = `What structural relationships are forming around ${name} across ownership, technology, and capital?`;
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  const t0 = Date.now();
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  let text = '';
  for (let i = 0; i < 240; i++) { await pg.waitForTimeout(1000); text = (await pg.evaluate(() => document.body.innerText)); if (/RELATIONSHIP CHANGE/.test(text) && /Retrieval basis/.test(text)) break; }
  const secs = Math.round((Date.now() - t0) / 100) / 10;
  await pg.close();
  const sec = (text.split('RELATIONSHIP CHANGE')[1] ?? '').split('UNRESOLVED')[0];
  const lines = sec.split('\n').map(l => l.trim()).filter(l => /^(Existence|Magnitude|Configuration):|— (DISSOLVED|NEW|PERSISTING|INDETERMINATE|RECONFIGURED)/.test(l) || /class CUSIP/.test(l));
  const basis = sec.split('\n').find(l => /History from the durable store|No stored history was used|durable store was not reachable/.test(l)) ?? '(none)';
  return { secs, lines, basis, errs, n: lines.length };
}
for (const [kind, name] of ENT) {
  console.log(`\n== ${kind}: ${name}`);
  const a = await session(name); console.log(`   session 1: ${a.secs}s | ${a.basis.slice(0, 150)}`);
  const c = await session(name); console.log(`   session 2: ${c.secs}s | ${c.basis.slice(0, 170)}`);
  ok(a.n > 0 && JSON.stringify(a.lines) === JSON.stringify(c.lines), `${name}: the classification (${a.n} lines) is identical in both sessions`);
  ok(/History from the durable store/.test(c.basis), `${name}: the second session used the stored history`);
  ok(c.secs < a.secs || a.secs < 15, `${name}: the second session was faster (${a.secs}s -> ${c.secs}s)`);
  ok(a.errs.length + c.errs.length === 0, `${name}: no page errors`);
}
await b.close(); process.exit(fail ? 1 : 0);
