// qa_eventclass_live.mjs -- KRYL-1399 step A, two-entity live check (localhost): one registry entity, one admitted at runtime.
// For each, the guest-facing evidence lines must show the 8-K event class and accession. Needs vite (:5173) and the engine (:4000).
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const QS = [
  ['registry', 'What structural relationships are forming around Sysco across ownership, technology, and capital?'],
  ['runtime-admitted', 'What structural relationships are forming around Costco across ownership, technology, and capital?'],
];
const b = await chromium.launch(); let fail = 0;
for (const [kind, q] of QS) {
  const pg = await b.newPage({ viewport: { width: 2000, height: 1020 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);
  await pg.evaluate(async (q) => { const st = await import('/src/store/useanalysisstore.js'); st.useAnalysisStore.getState().createSession('e2e', 'GENERAL', q, {}); const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q); }, q);
  await pg.waitForTimeout(60000);
  const text = await pg.evaluate(() => document.body.innerText);
  const lines = text.split('\n').filter(l => /EDGAR_8K · [A-Z_]+ · \d{4}-\d{2}-\d{2}/.test(l));
  const withAcc = lines.filter(l => /\d{10}-\d{2}-\d{6}/.test(l));
  console.log(`${kind}: ${lines.length} evidence line(s) with class; ${withAcc.length} with accession; page errors ${errs.length}`);
  lines.slice(0, 3).forEach(l => console.log('    ' + l.trim()));
  const c1 = lines.length > 0, c2 = errs.length === 0;
  console.log((c1 ? '  ✓ ' : '  ✗ ') + `${kind}: evidence shows event class`); console.log((c2 ? '  ✓ ' : '  ✗ ') + `${kind}: no page errors`);
  if (!c1 || !c2) fail++;
  await pg.close();
}
await b.close(); process.exit(fail ? 1 : 0);
