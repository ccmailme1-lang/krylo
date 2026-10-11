// qa_formation_live.mjs -- Step 5 live: the formation shown is built from admitted relationships only (Analysis brief and MAP), on two entities and one
// thematic query (no entity: no admitted relationships, so no formation, whatever the pool's co-presence says).
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const CASES = [
  ['registry', 'What structural relationships are forming around Sysco across ownership, technology, and capital?'],
  ['runtime-admitted', 'What structural relationships are forming around Intel across ownership, technology, and capital?'],
  ['no entity', 'How is merger review activity changing and what is it doing to deal completion?'],
];
const b = await chromium.launch(); let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
fs.mkdirSync('specs/benchmark/scratch', { recursive: true });
for (const [kind, q] of CASES) {
  console.log(`\n== ${kind}`);
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(async () => (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState().status === 'ready')) break; }
  await pg.waitForTimeout(12000);
  const text = (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const fr = pg.frames().find(f => /structure-field/.test(f.url())); const map = fr ? (await fr.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ') : '';
  const fm = (text.match(/FORMATION · FROM ADMITTED RELATIONSHIPS ONLY (.*?)(?: [A-Z]+ ↔ [A-Z]+ — |CROSS-DOMAIN|CANONICAL RELATIONSHIPS)/) ?? [])[1] ?? null;
  console.log('   brief formation:', (fm ?? '(block absent)').slice(0, 260));
  console.log('   MAP formation row:', (map.match(/FORMATION (.*?)(?: DOMAINS LINKED|STRUCTURAL RESOLUTION)/i) ?? [])[1]?.slice(0, 200) ?? '(none)');
  console.log('   MAP header:', (map.match(/DOMAINS LINKED.*?ADMITTED RELATIONSHIPS\s*\S+/) ?? [''])[0]);
  const hasCo = /co-present \(contextual leads/.test(text) || /CONTEXTUAL LEADS|contextual leads: not admitted/.test(text);
  if (kind !== 'no entity') {
    ok(/FORMATION · FROM ADMITTED RELATIONSHIPS ONLY/.test(text), 'the brief has a formation block built from admitted relationships');
    ok(/admitted relationships?\s*\(/.test(fm ?? '') || /No formation established/.test(fm ?? ''), 'it states what the admitted relationships establish, or why nothing is established');
    ok(/DOMAINS LINKED/.test(map) && /formation/i.test(map), 'the MAP shows the admitted-link labels and a Formation row');
    ok(hasCo, 'the pool co-presence is labelled as a contextual lead, not an admitted relationship or a formation');
  } else {
    ok(!/FORMATION · FROM ADMITTED RELATIONSHIPS ONLY/.test(text), 'no entity: no admitted-formation block');
    ok(/No formation established|fewer than two domains|no formation/i.test(map + text), 'no entity: the MAP states that no formation is established');
  }
  if (kind === 'registry') { const clip = await pg.evaluate(() => { const f = document.querySelector('iframe[title="Formation Map"]'); const r = f.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); await pg.screenshot({ path: 'specs/benchmark/scratch/map_admitted_formation.png', clip }); }
  ok(errs.length === 0, `no page errors (${errs[0] ?? 'none'})`);
  await pg.close();
}
await b.close(); process.exit(fail ? 1 : 0);
