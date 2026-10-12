// benchmark-capture.mjs -- captures the delivered analysis for each frozen benchmark case (specs/planning-pass-benchmark-matching-store-20261011.md, A6).
// One page session per subject (the subject's cases run in order; SEC documents and the pinned relationship-change result are reused
// within the session), a new analysis snapshot per case. Output: specs/benchmark/baseline/<case>.md and index.json. Needs vite (:5173) and the engine (:4000).
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const OUT = process.argv[2] ?? 'specs/benchmark/baseline';
const Q = {
  1: (s) => `What structural relationships are forming around ${s} across ownership, technology, and capital?`,
  2: (s) => `Which ownership relationships around ${s} changed in the last 12 months, and what is the coverage behind that?`,
  3: (s) => `What capital events involving named counterparties were reported for ${s} in the last 12 months?`,
  4: (s) => `How are the capital and ownership structures around ${s} connected?`,
  5: (s) => `What technology relationships connect ${s} to other participants?`,
  6: (s) => `What do labor and capital activity around ${s} show, and what connects them?`,
  7: (s) => `Which relationships around ${s} dissolved or are indeterminate, and why?`,
  8: (s) => `What structure is forming across knowledge, technology and capital around ${s}?`,
  9: (s) => `What relationships exist between media attention and capital events around ${s}?`,
  10: (s) => `What does the evidence not establish about the ownership and capital structure of ${s}?`,
  11: (s) => `Across all six domains, what formation exists around ${s}?`,
  12: (s) => `Where do domains diverge around ${s}, and on what evidence?`,
};
const CASES = [
  ['C01','Sysco',1],['C02','Sysco',3],['C03','Sysco',7],['C04','Oracle',1],['C05','Oracle',5],['C06','Oracle',8],['C07','Oracle',11],
  ['C08','Tesla',1],['C09','Tesla',6],['C10','Tesla',9],['C11','Tesla',11],['C12','Costco',6],['C13','Boeing',1],['C14','Boeing',3],
  ['C15','Boeing',4],['C16','Boeing',12],['C17','Verizon',1],['C18','Verizon',2],['C19','Verizon',10],['C20','Intel',1],['C21','Intel',3],
  ['C22','Intel',4],['C23','Costco',1],['C24','Costco',10],['C25','Broadcom',1],['C26','Broadcom',2],['C27','Broadcom',5],['C28','Broadcom',12],
  ['C29','Netflix',1],['C30','Netflix',8],['C31','Netflix',9],['C32','Boston Scientific',1],['C33','Boston Scientific',3],['C34','Boston Scientific',7],['C35','Boston Scientific',10],
];
const ROUTINE = process.env.ROUTINE ? JSON.parse(fs.readFileSync(process.env.ROUTINE, 'utf8')) : null;   // the frozen routine set: [{ id, subject, text }]
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const bySubject = new Map();
for (const c of (ROUTINE ? ROUTINE.map(r => [r.id, r.subject, r.id]) : CASES)) { if (only && !only.has(c[0])) continue; (bySubject.get(c[1]) ?? bySubject.set(c[1], []).get(c[1])).push(c); }
fs.mkdirSync(OUT, { recursive: true });
const index = [];
const b = await chromium.launch();
for (const [subject, cases] of bySubject) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  for (const [id, , qn] of cases) {
    const q = ROUTINE ? ROUTINE.find(r => r.id === id).text : Q[qn](subject); const t0 = Date.now(); errs.length = 0;
    await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('bench', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
    let state = null;
    for (let i = 0; i < 100; i++) {   // up to ~50 s for the snapshot, then up to ~45 s for the pinned relationship-change result
      await pg.waitForTimeout(500);
      state = await pg.evaluate(async (q) => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return { ready: s.status === 'ready' && s.active?.query === q, id: s.active?.id ?? null, cid: s.active?.canonicalId ?? null, lookups: s.active?.lookups ?? [] }; }, q);
      if (state.ready) break;
    }
    let change = 'n/a';
    if (state?.ready && state.cid) {
      for (let i = 0; i < 90; i++) {
        change = await pg.evaluate(async (cid) => { const m = await import('/src/engine/analyticalsnapshot.js'); const c = m.getPinnedChange(cid); return c?.state ?? 'none'; }, state.cid);
        if (change === 'done' || change === 'failed') break;
        await pg.waitForTimeout(500);
      }
      await pg.waitForTimeout(1500);
    }
    const text = await pg.evaluate(() => document.body.innerText);
    const mapText = (await Promise.all(pg.frames().filter(f => /structure-field/.test(f.url())).map(f => f.evaluate(() => document.body.innerText).catch(() => '')))).join('\n');
    const build = await pg.evaluate(() => window.__KRYLO_BUILD__ ?? null);
    // measurement of the same displayed snapshot: synthesis labels against evidence, admitted structure, Analysis vs History formation (src/engine/benchmarkprobe.js)
    const probe = state?.ready ? await pg.evaluate(async () => { const m = await import('/src/engine/benchmarkprobe.js'); return await m.probeActiveAnalysis(); }).catch(e => ({ error: String(e?.message ?? e) })) : null;
    const secs = Math.round((Date.now() - t0) / 100) / 10;
    const rec = { case: id, subject, question: qn, questionText: q, build: build?.commit ?? build ?? null, snapshotId: state?.id ?? null, snapshotReady: !!state?.ready, relationshipChange: change, lookups: (state?.lookups ?? []).map(l => `${l.kind}:${l.state}`), pageErrors: [...errs], seconds: secs, capturedAt: new Date().toISOString(), probe };
    index.push(rec);
    fs.writeFileSync(`${OUT}/${id}.md`, `# ${id} · ${subject} · Q${qn}\n\n${JSON.stringify(rec, null, 2)}\n\n## Delivered analysis (page text)\n\n${text}\n\n## MAP brief text\n\n${mapText}\n`);
    console.log(`${id} ${subject.padEnd(18)} Q${String(qn).padEnd(2)} snapshot ${state?.ready ? 'ready' : 'NOT READY'} change ${change} errors ${errs.length} ${secs}s`);
  }
  await pg.close();
}
await b.close();
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));
console.log(`done: ${index.length} cases`);
