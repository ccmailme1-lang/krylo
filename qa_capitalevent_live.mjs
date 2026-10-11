// qa_capitalevent_live.mjs -- KRYL-1401 live, two entities (registry and runtime-admitted): capital-event relationships on the real page.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const ENT = [['registry', 'Sysco'], ['runtime-admitted', 'Intel']];
const b = await chromium.launch(); let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
for (const [kind, name] of ENT) {
  const q = `What structural relationships are forming around ${name} across ownership, technology, and capital?`;
  console.log(`\n== ${kind}: ${name}`);
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); window.__t0 = Date.now(); tc.fireTopicConnectors(q); }, q);
  const state = async () => pg.evaluate(async () => { const s = (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState(); return { status: s.status, id: s.active?.id, lookups: (s.active?.lookups ?? []).map(l => `${l.kind}:${l.state}`).join(' '), refresh: s.refresh }; });
  const rels = async () => { const t = (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); return { n: (t.match(/reported a capital event involving/g) ?? []).length, unnamed: (t.match(/capital event involving an unnamed affiliate of/g) ?? []).length, text: t }; };
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if ((await state()).status === 'ready') break; }
  let s = await state(); let r = await rels();
  console.log(`   first snapshot ${s.id} lookups: ${s.lookups}; capital-event relationships on screen: ${r.n}`);
  if (r.n === 0) {                                        // matching continues live after a timeout; the next Refresh includes it
    await pg.waitForTimeout(90000);
    await pg.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent === 'Refresh analysis').click());
    for (let i = 0; i < 200; i++) { await pg.waitForTimeout(1000); if (!(await state()).refresh.running) break; }
    await pg.waitForTimeout(1500); s = await state(); r = await rels();
    console.log(`   after Refresh ${s.id} lookups: ${s.lookups}; capital-event relationships on screen: ${r.n}`);
  }
  ok(r.n > 0, `${name}: capital-event relationships appear on the Analysis surface`);
  const lines = r.text.match(/[A-Z0-9 .,&'-]+ reported a capital event involving [^—]+— CAPITAL_EVENT_INVOLVES[^"]{0,260}/g) ?? [];
  lines.slice(0, 2).forEach(l => console.log('    ' + l.slice(0, 330)));
  ok(/counterparty: (SAME_ENTITY_CONFIRMED|AFFILIATION_CONFIRMED|the filing names)/.test(r.text) && /instrument: /.test(r.text), `${name}: each shows the instrument and the confirmed matching outcome`);
  ok(!/counterparty: (UNRESOLVED|CANDIDATE_MATCH|LOOKUP_FAILED)/.test(r.text), `${name}: no unconfirmed counterparty is shown as a relationship`);
  ok(errs.length === 0, `${name}: no page errors (${errs[0] ?? 'none'})`);
  await pg.close();
}
await b.close(); process.exit(fail ? 1 : 0);
