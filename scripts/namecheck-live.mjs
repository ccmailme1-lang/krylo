// namecheck-live.mjs -- KRYL-1407 live check of the name-resolution cases through the real page (vite :5173, engine :4000). Not a benchmark run.
import { chromium } from 'playwright';
const names = ['Ford Motor Company', 'Ford', 'Ford Motor Compnany', 'Frod', 'Fordd', 'Tesle', 'Meta'];
const b = await chromium.launch();
for (const n of names) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  const q = `What structural relationships are forming around ${n} across ownership, technology, and capital?`;
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('nc', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  let s = null;
  for (let i = 0; i < 70; i++) { await pg.waitForTimeout(500); s = await pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); const x = m.getSnapshotState(); return { ready: x.status === 'ready', cid: x.active?.canonicalId ?? null }; }); if (s.ready) break; }
  await pg.waitForTimeout(2500);
  const text = await pg.evaluate(() => document.body.innerText);
  const sentence = (text.match(/Subject selected:[^\n]*/) ?? [])[0] ?? null;
  const info = await pg.evaluate(async () => { const m = await import('/src/engine/secfileradmission.js'); const log = m.getAdmissionLog(); return log.map(l => ({ reason: l.reason ?? (l.verified ? 'VERIFIED' : '?'), rule: l.rule ?? null, cik: l.cik ?? null })); });
  const rel = await pg.evaluate(async (cid) => { if (!cid) return null; const p = await import('/src/engine/canonicalrelationshipprojection.js'); const r = await import('/src/engine/entityresolution.js'); return p.findAdmittedRelationshipsFor(r.toTopologyNodeId(cid)).length; }, s?.cid);
  console.log(`${n.padEnd(20)} snapshot=${s?.ready} entity=${s?.cid ?? 'none'} admitted=${rel} admission=${JSON.stringify(info)} errors=${errs.length}`);
  console.log(`   ${sentence ? sentence.slice(0, 330) : '(resolved: no unresolved-subject sentence)'}`);
  await pg.close();
}
await b.close();
