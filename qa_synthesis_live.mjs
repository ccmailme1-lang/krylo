// qa_synthesis_live.mjs -- Step 6 live: the SYNTHESIS row on the real page for two entities; every statement carries a status and expandable evidence.
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const ENT = [['registry', 'Sysco'], ['runtime-admitted', 'Intel']];
const b = await chromium.launch(); let fail = 0; const ok = (c, l) => { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; };
for (const [kind, name] of ENT) {
  console.log(`\n== ${kind}: ${name}`);
  const q = `What structural relationships are forming around ${name} across ownership, technology, and capital?`;
  const pg = await b.newPage({ viewport: { width: 2000, height: 1100 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(async () => (await import('/src/engine/analyticalsnapshot.js')).getSnapshotState().status === 'ready')) break; }
  await pg.waitForTimeout(12000);
  await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await pg.waitForTimeout(500);
  const text = await pg.evaluate(() => document.body.innerText);
  const sec = (text.split('SYNTHESIS')[1] ?? '').split('WHAT THE STRUCTURE SHOWS')[0];
  const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
  const counts = {}; for (const l of lines) { const m = l.match(/^(DOCUMENTED|SUPPORTED|INFERRED|UNRESOLVED)(?=\s|\d)/); if (m) counts[m[1]] = (counts[m[1]] ?? 0) + 1; }
  console.log('   statements by status:', JSON.stringify(counts));
  lines.filter(l => /^(DOCUMENTED|SUPPORTED|INFERRED|UNRESOLVED)(?=\s|\d)/.test(l)).slice(0, 4).forEach(l => console.log('    ' + l.slice(0, 200)));
  ok(lines.length > 0, `${name}: a SYNTHESIS row is shown`);
  ok((counts.DOCUMENTED ?? 0) + (counts.SUPPORTED ?? 0) > 0 && (counts.UNRESOLVED ?? 0) > 0, `${name}: documented/supported statements and unresolved statements are both present`);
  ok(/accession \d{10}-\d{2}-\d{6}/.test(sec), `${name}: expanded evidence shows accessions`);
  ok(/DOCUMENTED[^\n]*\n?[^\n]*capital event \(/.test(sec) || /reported a capital event/.test(sec) || kind !== 'registry', `${name}: capital events are DOCUMENTED from the filings`);
  ok((counts.INFERRED ?? 0) === 0 || /rests on:/.test(sec), `${name}: any INFERRED statement names what it rests on`);
  // Step 7: the MAP's relationship list expands to the same evidence
  const fr = pg.frames().find(f => /structure-field/.test(f.url()));
  const exp = fr ? await fr.evaluate(async () => { document.getElementById('rel-chip')?.click(); await new Promise(r => setTimeout(r, 600)); return (document.getElementById('rel-expand') ?? document.querySelector('.rel-expand'))?.innerText ?? ''; }) : '';
  ok(/instrument: /.test(exp) && /counterparty: /.test(exp) && /accession \d{10}-\d{2}-\d{6}/.test(exp), `${name}: the MAP relationship list expands to the instrument, the matching outcome and the accession`);
  ok(errs.length === 0, `${name}: no page errors (${errs[0] ?? 'none'})`);
  await pg.close();
}
await b.close(); process.exit(fail ? 1 : 0);
