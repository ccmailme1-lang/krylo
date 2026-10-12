// findings-live-check.mjs -- shows the findings the delivered analysis leads with, for the given subjects, through the real page; checks they validate and that History rebuilds the same ones.
import { chromium } from 'playwright';
const subjects = (process.env.SUBJECTS ?? 'Broadcom,Oracle,Netflix').split(',');
const q = (n) => `What structural relationships are forming around ${n} across ownership, technology, and capital?`;
const b = await chromium.launch(); let bad = 0;
for (const name of subjects) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1250 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('f', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q(name));
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); const r = await pg.evaluate(async (qq) => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return s.status === 'ready' && s.active?.query === qq; }, q(name)); if (r) break; }
  const cid = await pg.evaluate(async () => { const m = await import('/src/engine/analyticalsnapshot.js'); return m.getSnapshotState().active?.canonicalId ?? null; });
  for (let i = 0; i < 120 && cid; i++) { const st = await pg.evaluate(async (c) => { const m = await import('/src/engine/analyticalsnapshot.js'); return m.getPinnedChange(c)?.state ?? 'none'; }, cid); if (st === 'done' || st === 'failed') break; await pg.waitForTimeout(500); }
  await pg.waitForTimeout(6000);
  const pr = await pg.evaluate(async () => { const m = await import('/src/engine/benchmarkprobe.js'); const x = await m.probeActiveAnalysis(); return { findings: x.findings, fv: x.findingsValidation, hist: x.historyFindingsAgree, rels: x.relationships }; });
  const text = await pg.evaluate(() => document.body.innerText);
  const shown = /KEY FINDINGS/.test(text);
  const ok = errs.length === 0 && pr.fv.problems.length === 0 && pr.hist && shown && pr.findings.length > 0;
  if (!ok) bad++;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} ${name}: relationships=${pr.rels} findings=${pr.findings.length} validator problems=${pr.fv.problems.length} shownOnPage=${shown} historySame=${pr.hist} errors=${errs.length}`);
  for (const f of pr.findings) console.log(`   [${f.strength}] ${f.kind}: ${f.headline}`);
  if (pr.fv.problems.length) console.log('   problems:', pr.fv.problems.join(' | '));
  if (process.env.SHOT && name === subjects[0]) { await pg.evaluate(() => { for (const e of document.querySelectorAll('div')) if (/ENTER YOUR ACCESS CODE/.test(e.innerText || '') && getComputedStyle(e).position === 'fixed') e.style.display = 'none'; }); await pg.waitForTimeout(400); await pg.screenshot({ path: process.env.SHOT }); }
  await pg.close();
}
await b.close(); process.exit(bad ? 1 : 0);
