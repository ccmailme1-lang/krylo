// private-baseline-capture.mjs -- captures the CURRENT outcome of each query in the private-company acceptance set (specs/benchmark/private-company-set-v1-FROZEN-20261012.md)
// through the real page, as the baseline. Records identity outcome and analytical outcome separately. Usage: node scripts/private-baseline-capture.mjs <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
const OUT = process.argv[2] ?? 'specs/benchmark/private-baseline';
const QUERIES = {
  A: (s) => `What structural relationships are forming around ${s} across technology, ownership, and labor?`,
  B: (s) => `Who has financed ${s}, who are its officers and directors, and what has changed recently?`,
};
const CASES = [['PC01', 'Databento', 'A'], ['PC02', 'Databento', 'B'], ['PC03', 'Integrated Biosciences', 'A'], ['PC04', 'Integrated Biosciences', 'B'], ['PC05', 'Daytona', 'A'], ['PC06', 'Daytona', 'B'], ['PC07', 'Anduril', 'A'], ['PC08', 'Anduril', 'B']];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const index = [];
for (const [id, subject, qk] of CASES) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1150 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  const q = QUERIES[qk](subject);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('pc', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  let st = null;
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); st = await pg.evaluate(async (qq) => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return { ready: s.status === 'ready' && s.active?.query === qq, cid: s.active?.canonicalId ?? null }; }, q); if (st.ready) break; }
  await pg.waitForTimeout(6000);
  const info = await pg.evaluate(async (q) => {
    const sc = (await import('/src/engine/subjectscope.js')).subjectScope(q);
    let probe = null; try { probe = await (await import('/src/engine/benchmarkprobe.js')).probeActiveAnalysis(); } catch (e) { probe = { error: String(e?.message ?? e).slice(0, 120) }; }
    return { kind: sc.kind, selected: sc.subject?.text ?? sc.entity?.name ?? null, rule: sc.contract?.selectionRule ?? null, canonicalId: sc.canonicalId ?? null, probe };
  }, q);
  const text = await pg.evaluate(() => document.body.innerText);
  const subjLine = (text.match(/Subject selected:[^\n]*/) ?? [])[0] ?? null;
  const resolved = info.kind === 'ENTITY';
  const rec = { case: id, subject, queryKey: qk, question: q, snapshotReady: !!st?.ready, selectedSubject: info.selected, selectionRule: info.rule, identity: resolved ? 'RESOLVED' : 'UNRESOLVED', canonicalId: info.canonicalId, unresolvedMessage: subjLine, admittedRelationships: resolved ? (info.probe?.relationships ?? 0) : 0, byType: resolved ? info.probe?.byType ?? {} : {}, formation: resolved ? info.probe?.analysisSentence ?? null : null, pageErrors: errs, rubricRaw: resolved ? 'to be scored' : 0 };
  fs.writeFileSync(`${OUT}/${id}.md`, `# ${id} · ${subject} · ${qk}\n\n${JSON.stringify(rec, null, 2)}\n\n## Delivered analysis (page text)\n\n${text}\n`);
  index.push(rec); console.log(`${id} ${subject.padEnd(24)} ${qk} identity=${rec.identity} relationships=${rec.admittedRelationships} errors=${errs.length}`);
  await pg.close();
}
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1)); await b.close();
