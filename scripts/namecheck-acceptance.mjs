// namecheck-acceptance.mjs -- KRYL-1407 / DEF-1406 focused live acceptance through the real page. Judges the RENDERED analysis (text + MAP + stored relationships), not the label.
import { chromium } from 'playwright';
const CASES = [
  ['A1', 'What structural relationships are forming around Ford Motor Company across ownership, technology, and capital?', 'bind:0000037996'],
  ['A1', 'What structural relationships are forming around Ford across ownership, technology, and capital?', 'bind:0000037996'],
  ['A2', 'What structural relationships are forming around Ford Motor Compnany across ownership, technology, and capital?', 'unbound:FORD MOTOR CO'],
  ['A2', 'What structural relationships are forming around Frod across ownership, technology, and capital?', 'unbound:FORD MOTOR CO'],
  ['A2', 'What structural relationships are forming around Fordd across ownership, technology, and capital?', 'unbound:FORD MOTOR CO'],
  ['A2', 'What structural relationships are forming around Tesle across ownership, technology, and capital?', 'unbound:Tesla, Inc.'],
  ['A3', 'What structural relationships are forming around Meta across ownership, technology, and capital?', 'registry:meta-platforms'],
  ['A4', 'Across all six domains, what formation exists around Oracle?', 'registry:oracle'],
];
const b = await chromium.launch(); let bad = 0;
for (const [id, q, expect] of CASES) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(3500);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('acc', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  let s = null;
  for (let i = 0; i < 80; i++) { await pg.waitForTimeout(500); s = await pg.evaluate(async (q) => { const m = await import('/src/engine/analyticalsnapshot.js'); const x = m.getSnapshotState(); return { ready: x.status === 'ready' && x.active?.query === q, cid: x.active?.canonicalId ?? null }; }, q); if (s.ready) break; }
  await pg.waitForTimeout(3000);
  const text = await pg.evaluate(() => document.body.innerText);
  const mapText = (await Promise.all(pg.frames().filter(f => /structure-field/.test(f.url())).map(f => f.evaluate(() => document.body.innerText).catch(() => '')))).join('\n');
  const probe = s.ready ? await pg.evaluate(async () => { const m = await import('/src/engine/benchmarkprobe.js'); return await m.probeActiveAnalysis(); }).catch(e => ({ error: String(e) })) : null;
  const rels = await pg.evaluate(async (cid) => { if (!cid) return []; const p = await import('/src/engine/canonicalrelationshipprojection.js'); const r = await import('/src/engine/entityresolution.js'); return p.findAdmittedRelationshipsFor(r.toTopologyNodeId(cid)).map(x => x.part.join('>')); }, s.cid);
  const subj = (text.match(/Subject selected:[^\n]*/) ?? [])[0] ?? null;
  const formationLine = (text.match(/FORMATION · FROM ADMITTED RELATIONSHIPS ONLY\n([^\n]*)/) ?? [])[1] ?? null;
  const [kind, val] = [expect.split(':')[0], expect.slice(expect.indexOf(':') + 1)];
  let pass = s.ready && errs.length === 0;
  if (kind === 'bind') pass = pass && s.cid === 'ford-motor' && rels.length === 2 && rels.every(r => r.includes('CIK:' + val)) && !subj && !!formationLine && (probe?.relationships === 2) && mapText.includes('2 admitted');
  if (kind === 'unbound') pass = pass && !s.cid && rels.length === 0 && !!subj && subj.includes(`Closest listed registrant: ${val}, not assumed.`) && !formationLine && (probe?.relationships ?? 0) === 0;
  if (kind === 'registry') pass = pass && s.cid === val && !subj && rels.length > 0 && !/Subject selected: Across/.test(text);
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} "${q.replace(/^What structural relationships are forming around /, '').replace(/ across ownership.*/, '')}" entity=${s.cid ?? 'none'} relationships=${rels.length} ${rels.length ? 'anchor=' + [...new Set(rels.map(r => r.split('>').find(p => p.startsWith('CIK:0000037996')) ?? '-'))].join(',') : ''} errors=${errs.length}`);
  console.log(`     formation: ${(formationLine ?? probe?.analysisSentence ?? '(none)').slice(0, 170)}`);
  if (subj) console.log(`     subject line: ${subj.slice(0, 260)}`);
  console.log(`     MAP: ${(mapText.match(/RELATIONSHIPS\n[^\n]*/) ?? ['(no relationships row)'])[0].replace(/\n/g, ' ').slice(0, 120)}`);
  await pg.close();
}
await b.close(); console.log(bad ? `\n${bad} FAILED` : '\nall passed'); process.exit(bad ? 1 : 0);
