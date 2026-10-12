// labor-live-check.mjs -- KRYL-1411 end to end through the real page for the benchmark subjects: officers and directors admitted from SEC Forms 3, 4 and 5,
// persisted, in the analytical snapshot, on Analysis and in the MAP list, and the same in History. Not a benchmark run.
import { chromium } from 'playwright';
const subjects = (process.env.SUBJECTS ?? 'Sysco,Oracle,Tesla,Costco,Boeing,Verizon,Intel,Broadcom,Netflix,Boston Scientific').split(',');
const b = await chromium.launch(); let bad = 0;
for (const name of subjects) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1150 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  const q = `What structural relationships are forming around ${name} across ownership, technology, and capital?`;
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('l', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  for (let i = 0; i < 200; i++) { await pg.waitForTimeout(500); const r = await pg.evaluate(async (qq) => { const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); return s.status === 'ready' && s.active?.query === qq; }, q); if (r) break; }
  await pg.waitForTimeout(9000);
  const info = await pg.evaluate(async () => {
    const m = await import('/src/engine/analyticalsnapshot.js'); const s = m.getSnapshotState(); const p = await import('/src/engine/canonicalrelationshipprojection.js'); const r = await import('/src/engine/entityresolution.js'); const probe = await import('/src/engine/benchmarkprobe.js');
    const node = r.toTopologyNodeId(s.active.canonicalId); const lab = p.findAdmittedRelationshipsFor(node).filter(x => x.type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE');
    const pr = await probe.probeActiveAnalysis(); const labs = s.active.lookups.find(l => l.kind === 'labor');
    return { node, lab: lab.length, people: new Set(lab.map(x => x.part[1])).size, dir: lab.filter(x => x.nuId.role === 'DIRECTOR').length, off: lab.filter(x => x.nuId.role === 'OFFICER').length, ids: lab.slice(0, 3).map(x => x.id), rels: pr.relationships, byType: pr.byType, domains: pr.admittedDomains, linked: pr.linkedDomains, hist: pr.historyRelationships, histSentence: pr.historySentence, analysis: pr.analysisSentence, syn: pr.synthesisValidation, laborLookup: labs ? `${labs.state}${labs.error ? ' ' + labs.error : ''}` : 'none' };
  });
  const stored = await (await fetch('http://localhost:4000/v1/canonical-store/relationships?node=' + encodeURIComponent(info.node))).json().catch(() => ({}));
  const storedLab = (stored.relationships ?? []).filter(x => x.type === 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE').length;
  const text = await pg.evaluate(() => document.body.innerText);
  for (const f of pg.frames().filter(f => /structure-field/.test(f.url()))) await f.evaluate(() => document.getElementById('rel-chip')?.click()).catch(() => {});
  await pg.waitForTimeout(700);
  const mapText = (await Promise.all(pg.frames().filter(f => /structure-field/.test(f.url())).map(f => f.evaluate(() => document.body.innerText).catch(() => '')))).join('\n');
  const ok = errs.length === 0 && info.lab > 0 && storedLab === info.lab && /is disclosed as (a director|an officer) of/.test(text) && /is disclosed as (a director|an officer) of/.test(mapText) && info.hist === info.rels && info.syn.problems.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: lookup=${info.laborLookup} labor relationships=${info.lab} (${info.people} people, ${info.dir} director roles, ${info.off} officer roles) stored=${storedLab} snapshot relationships=${info.rels} historySame=${info.hist === info.rels} domains=${(info.domains ?? []).join('+')} linked=${(info.linked ?? []).join('+') || 'none'} synthesisProblems=${info.syn.problems.length} errors=${errs.length}`);
  await pg.close();
}
await b.close(); console.log(bad ? `\n${bad} FAILED` : '\nall passed'); process.exit(bad ? 1 : 0);
