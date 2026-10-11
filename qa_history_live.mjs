// qa_history_live.mjs -- Step 8 live: History shows the analysis just run, rebuilt from the durable store, and it reads like the Analysis surface did;
// a fresh page session (a new browser load) still shows it.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const ENT = [['registry', 'Sysco'], ['runtime-admitted', 'Intel']];
const b = await chromium.launch(); let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const formationOf = (t) => (t.match(/FORMATION · FROM ADMITTED RELATIONSHIPS ONLY (.*?)(?: [A-Z]+ ↔ [A-Z]+ — |CROSS-DOMAIN|CANONICAL RELATIONSHIPS)/) ?? [])[1]?.trim() ?? null;
async function openHistory(pg) {
  await pg.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'history' }, '*')); await pg.waitForTimeout(2500);
}
for (const [kind, name] of ENT) {
  console.log(`\n== ${kind}: ${name}`);
  const q = `What structural relationships are forming around ${name} across ownership, technology, and capital?`;
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(async () => (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState().status === 'ready')) break; }
  await pg.waitForTimeout(12000);
  const live = norm(await pg.evaluate(() => document.body.innerText)); const liveFormation = formationOf(live);
  const snapId = await pg.evaluate(async () => (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState().active.id);
  const liveRelCount = (live.match(/— (HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE|CAPITAL_EVENT_INVOLVES|ACQUIRED|SHARED_PATENT_ASSIGNMENT)/g) ?? []).length;
  console.log('   analysis formation:', (liveFormation ?? '').slice(0, 150));
  for (const fresh of [false, true]) {
    let page = pg;
    if (fresh) { page = await b.newPage({ viewport: { width: 2000, height: 1100 } }); page.on('pageerror', e => errs.push(String(e).slice(0, 160))); await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(4000); }
    await openHistory(page);
    const has = await page.evaluate(() => !!document.querySelector('[data-analysis-history]'));
    ok(has, `${fresh ? 'a fresh page session' : 'the same session'}: the History bay shows the ANALYSIS HISTORY section`);
    if (!has) { if (fresh) await page.close(); continue; }
    await page.waitForTimeout(2500);
    // open the row whose query is this subject's (newest first)
    const clicked = await page.evaluate((nm) => { const root = document.querySelector('[data-analysis-history]'); const row = [...root.querySelectorAll('div')].find(d => d.style?.cursor === 'pointer' && d.textContent.includes(nm)); if (row) { row.click(); return true; } return false; }, name);
    ok(clicked, `${fresh ? 'fresh' : 'same'}: a saved analysis for ${name} is listed`);
    await page.waitForTimeout(3000);
    const hist = norm(await page.evaluate(() => document.querySelector('[data-analysis-history]')?.innerText ?? ''));
    const hf = (hist.match(/FORMATION \(admitted relationships only\): (.*?)(?: [A-Z][A-Za-z ,.&']+ (?:has disclosed|reported a capital event|acquired|and .* share)|Temporal result|No temporal result)/) ?? [])[1]?.trim() ?? null;
    ok(/Rebuilt from the durable store as of/.test(hist), `${fresh ? 'fresh' : 'same'}: the analysis is rebuilt from the durable store, as of its own time`);
    ok(!!hf && !!liveFormation && (liveFormation.startsWith(hf.slice(0, 60)) || hf.startsWith(liveFormation.slice(0, 60))), `${fresh ? 'fresh' : 'same'}: History's formation sentence equals the one Analysis showed`);
    ok(/accession \d{10}-\d{2}-\d{6}/.test(hist) && /instrument: |filed \d{4}/.test(hist), `${fresh ? 'fresh' : 'same'}: relationships are shown with their filings`);
    if (fresh) await page.close();
  }
  ok(errs.length === 0, `no page errors (${errs[0] ?? 'none'})`);
  await pg.close();
}
await b.close(); process.exit(fail ? 1 : 0);
