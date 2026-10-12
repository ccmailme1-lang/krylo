// acquired-live-check.mjs -- KRYL-1409 end-to-end check through the real page (vite :5173, engine :4000): the producer reads the 8-K, the other principal is matched,
// the relationship is admitted and persisted, and it reaches the analytical snapshot, Analysis, MAP and History for the same subject. Not a benchmark run.
import { chromium } from 'playwright';
const CASES = [
  { name: 'Netflix', fcik: '0001065280', other: '0001437107', sentence: /entered an agreement to acquire Warner Bros\. Discovery, Inc\./i },
  { name: 'Boston Scientific', fcik: '0000885725', other: '0001321732', sentence: /entered an agreement to acquire Penumbra/i },
  { name: 'Oracle', fcik: '0001341439', expectNone: true }, { name: 'Sysco', fcik: '0000096021', expectNone: true }, { name: 'Tesla', fcik: '0001318605', expectNone: true }, { name: 'Costco', fcik: '0000909832', expectNone: true }, { name: 'Boeing', fcik: '0000012927', expectNone: true }, { name: 'Verizon', fcik: '0000732712', expectNone: true }, { name: 'Intel', fcik: '0000050863', expectNone: true }, { name: 'Broadcom', fcik: '0001730168', expectNone: true }, { name: 'Ford Motor Company', fcik: '0000037996', expectNone: true },
];
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const b = await chromium.launch(); let bad = 0;
for (const c of CASES.filter(x => !only || only.has(x.name))) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1150 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  const q = `What structural relationships are forming around ${c.name} across ownership, technology, and capital?`;
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('acq', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  let s = null;
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); s = await pg.evaluate(async (q) => { const m = await import('/src/engine/analyticalsnapshot.js'); const x = m.getSnapshotState(); return { ready: x.status === 'ready' && x.active?.query === q, cid: x.active?.canonicalId ?? null, id: x.active?.id ?? null }; }, q); if (s.ready) break; }
  await pg.waitForTimeout(6000);
  const info = await pg.evaluate(async (fcik) => {
    const p = await import('/src/engine/canonicalrelationshipprojection.js'); const probe = await import('/src/engine/benchmarkprobe.js');
    const acq = p.findAdmittedRelationshipsFor('CIK:' + fcik).filter(r => r.type === 'ACQUIRED').map(r => ({ id: r.id, part: r.part, status: r.nuState?.dealStatus ?? null, src: p.latestEvidenceFor(r.id)?.provenance?.source ?? null, acc: p.latestEvidenceFor(r.id)?.provenance?.accession ?? null }));
    const pr = await probe.probeActiveAnalysis(); return { byType: pr.byType, domains: pr.admittedDomains, links: pr.linkedDomains, acq, relationships: pr.relationships, formation: pr.analysisSentence, history: pr.historySentence, historyRels: pr.historyRelationships, syn: pr.synthesisValidation };
  }, c.fcik);
  const stored = await (await fetch('http://localhost:4000/v1/canonical-store/relationships?node=CIK:' + c.fcik.replace(/^0+/, '').padStart(10, '0'))).json().catch(() => ({}));
  const storedAcq = (stored.relationships ?? []).filter(r => r.type === 'ACQUIRED');
  const text = await pg.evaluate(() => document.body.innerText);
  for (const f of pg.frames().filter(f => /structure-field/.test(f.url()))) await f.evaluate(() => document.getElementById('rel-chip')?.click()).catch(() => {});   // open the MAP's relationship list
  await pg.waitForTimeout(800);
  const mapText = (await Promise.all(pg.frames().filter(f => /structure-field/.test(f.url())).map(f => f.evaluate(() => document.body.innerText).catch(() => '')))).join('\n');
  const mine = info.acq.filter(a => a.src === 'SEC_8K_ACQUISITION');
  let pass = s.ready && errs.length === 0 && info.syn.problems.length === 0;
  if (c.expectNone) { console.log(`${c.name}: relationships=${info.relationships} byType=${JSON.stringify(info.byType)} domains=${(info.domains ?? []).join('+')} linked=${(info.links ?? []).join('+') || 'none'} acquisitionsFrom8K=${mine.length}${mine.length ? ' [' + mine.map(a => a.status + ':' + a.part.join('>')).join('; ') + ']' : ''} historyAgrees=${info.historyRels === info.relationships}`); if (!(info.historyRels === info.relationships)) pass = false; }
  else {
    const hit = mine.find(a => a.part[0] === 'CIK:' + c.fcik && a.part[1] === 'CIK:' + c.other);
    pass = pass && !!hit && hit.status === 'PENDING' && storedAcq.some(r => r.relationship_id === hit.id) && c.sentence.test(text) && c.sentence.test(mapText) && info.historyRels === info.relationships && /acquire/i.test(info.history ?? '') === false;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${c.name}: ACQUIRED admitted=${!!hit} status=${hit?.status} persisted=${storedAcq.some(r => r.relationship_id === hit?.id)} analysisText=${c.sentence.test(text)} mapText=${c.sentence.test(mapText)} snapshotRelationships=${info.relationships} historyRelationships=${info.historyRels} errors=${errs.length}`);
    console.log('   formation:', String(info.formation).slice(0, 230));
    console.log('   history  :', String(info.history).slice(0, 230));
  }
  if (!pass) bad++;
  await pg.close();
}
await b.close(); console.log(bad ? `\n${bad} FAILED` : '\nall passed'); process.exit(bad ? 1 : 0);
