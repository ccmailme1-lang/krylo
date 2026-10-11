// qa_refresh_failure_live.mjs -- KRYL-1398: a Refresh during which the SEC lookups fail must keep the last valid analysis, say why,
// and leave every surface unchanged. Real app; the SEC proxy requests are aborted after the first snapshot is ready.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const q = 'What structural relationships are forming around Sysco across ownership, technology, and capital?';
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
const snap = async () => pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return { status: s.status, id: s.active?.id ?? null, at: s.active?.generatedAt ?? null, refresh: s.refresh, lookups: s.active?.lookups?.map(l => `${l.kind}:${l.state}`) ?? [] }; });
const text = async () => (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const sig = (t) => JSON.stringify({ stamp: (t.match(/Analysis snapshot: (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [A-Z]{2,4})/) ?? [])[1], field: (t.match(/\((\d+) signals?\), with/) ?? [])[1], cap: (t.match(/CAPITAL — (\d+) observations?, \w+ polarity, magnitude (\d+)\/100/) ?? []).slice(1, 3).join('/'), tab: (t.match(/field context — CAPITAL pressure (\d+) \((\w+)\), (\d+) signals/) ?? []).slice(1, 4).join('/'), rel: (t.match(/Separately, (\d+) canonical relationship/) ?? [])[1] });
for (let i = 0; i < 120; i++) { await pg.waitForTimeout(500); const s = await snap(); if (s.status === 'ready') break; }
await pg.waitForTimeout(25000);                                     // let the pinned relationship-change result arrive
const s0 = await snap(); const t0 = await text();
ok(s0.status === 'ready', `first snapshot ${s0.id} ready (${s0.lookups.join(' ')})`);
await pg.route(/\/api\/(edgar|edgar-document|usaspending-entity)/, r => r.abort());   // the SEC lookups now fail
await pg.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent === 'Refresh analysis').click());
let end = null;
for (let i = 0; i < 160; i++) { await pg.waitForTimeout(1000); const s = await snap(); if (!s.refresh.running) { end = s; break; } }
await pg.waitForTimeout(1500);
const s1 = await snap(); const t1 = await text();
ok(end != null, 'the refresh ended (did not hang)');
ok(s1.id === s0.id, `the previous snapshot stays active (${s0.id} -> ${s1.id})`);
ok(sig(t0) === sig(t1), 'every figure on screen is unchanged: snapshot time, field signals, CAPITAL line, By Domain panel, relationships');
ok(!!s1.refresh.error, `the failure is stated: ${String(s1.refresh.error).slice(0, 140)}`);
ok(/Refresh did not replace the analysis/.test(t1), 'the page says the refresh did not replace the analysis');
ok(errs.length === 0, `no page errors (${errs[0] ?? 'none'})`);
await b.close(); process.exit(fail ? 1 : 0);
