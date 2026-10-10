// qa_journeys.mjs -- guest-journey harness (systemic plan item 2). Drives the REAL app in headless Chrome for a fixed set of
// queries: creates an Analysis session and fires the real connectors (the same two calls a submitted query makes), waits for
// the lookups to settle, then asserts the invariants a guest relies on. Needs the dev server (KRYLO_URL, default :5173) and the
// engine on :4000; slow (about 1 minute per journey, SEC requests are spaced). Usage: node qa_journeys.mjs [name ...]
import { chromium } from 'playwright';
const URL = process.env.KRYLO_URL ?? 'http://localhost:5173/';
const Q = (subject) => `What structural relationships are forming around ${subject} across ownership, technology, and capital?`;

// expect.resolved: true = the brief names the resolved entity; false = "entity is not resolved"; null = no subject at all.
const JOURNEYS = [
  { name: 'broadcom', query: Q('Broadcom'), expect: { resolved: true, entity: /BROADCOM/i, change: true } },
  { name: 'costco', query: Q('Costco'), expect: { resolved: true, entity: /COSTCO/i, change: true } },
  { name: 'sysco', query: Q('Sysco'), expect: { resolved: true, entity: /SYSCO/i, change: true } },
  { name: 'daytona', query: 'Is this a good investment? Daytona Daytona gives every AI agent its own sandbox. Backed by Meta.', expect: { resolved: false, entity: /Daytona/i, change: false } },
  { name: 'markdown-target', query: '**Question:** Is this a good investment? **Target:** ## Integrated Biosciences\nIntegrated Biosciences is using AI to discover drugs for age-related diseases.', expect: { resolved: false, entity: /Integrated Biosciences/i, change: false } },
  { name: 'theme', query: 'How is merger review activity changing and what is it doing to deal completion?', expect: { resolved: null, change: false } },
];
const want = process.argv.slice(2);
const run = JOURNEYS.filter(j => !want.length || want.includes(j.name));

const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2000, height: 1020 } });
const pageErrs = []; pg.on('pageerror', e => pageErrs.push(String(e).slice(0, 220)));
await pg.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForTimeout(4000);

let fail = 0, n = 0;
for (const j of run) {
  const errsBefore = pageErrs.length; n++;
  console.log(`\n── ${j.name}: ${j.query.slice(0, 80)}`);
  await pg.evaluate(async ({ q, id }) => {
    const st = await import('/src/store/useanalysisstore.js');
    st.useAnalysisStore.getState().createSession(id, 'GENERAL', q, {});
    const tc = await import('/src/engine/topicconnectors.js'); tc.fireTopicConnectors(q);
  }, { q: j.query, id: `journey-${n}` });
  let text = '', kids = 0;
  for (let i = 0; i < 45; i++) {     // up to ~2 minutes
    await pg.waitForTimeout(3000);
    ({ kids, text } = await pg.evaluate(() => ({ kids: document.getElementById('root')?.children.length ?? 0, text: document.body.innerText })));
    if (kids === 0) break;
    const settled = /STRUCTURAL BRIEF/.test(text) && !/Checking SEC (ownership )?filings|checking SEC filings/.test(text) && (!j.expect.change || /RELATIONSHIP CHANGE|Temporal change could not|incomplete retrieval|nothing to compare/.test(text));
    if (settled) break;
  }
  const checks = [];
  const brief = text.slice(text.indexOf('STRUCTURAL BRIEF'));
  checks.push([kids > 0 && /STRUCTURAL BRIEF/.test(text), 'page mounted with a brief (no blank screen)']);
  checks.push([pageErrs.length === errsBefore, `no page errors${pageErrs.length > errsBefore ? ': ' + pageErrs[pageErrs.length - 1] : ''}`]);
  if (j.expect.resolved === true) {
    checks.push([j.expect.entity.test(brief.slice(0, 400)) && !/Its entity is not resolved/.test(brief), 'subject resolved to the entity (not "entity is not resolved")']);
    checks.push([/\d+ observations? bound to/.test(brief) || /No observations bound/.test(brief), 'subject-level evidence stated (bound count or stated absence)']);
    checks.push([/RELATIONSHIP CHANGE/.test(text) || /Temporal change could not|incomplete retrieval|nothing to compare/.test(text), 'temporal comparison reached the brief (result or stated limitation)']);
  } else if (j.expect.resolved === false) {
    checks.push([/Its entity is not resolved|not bound to/.test(brief) && j.expect.entity.test(brief.slice(0, 600)), 'subject selected and stated as unresolved']);
    checks.push([!/RELATIONSHIP CHANGE/.test(text), 'no relationship-change claims for an unresolved subject']);
  } else {
    checks.push([/NO SUBJECT RESOLVED|No subject resolved/.test(brief), 'no subject: stated, field level only']);
  }
  checks.push([!/(TECHNOLOGY|OWNERSHIP|CAPITAL) ↔ (TECHNOLOGY|OWNERSHIP|CAPITAL) — not a resolvable named entity/.test(text), 'no domain-word participant pair (DEF-1393)']);
  checks.push([!/Failed to fetch/.test(text), 'no "Failed to fetch" in the guest-facing text']);
  for (const [c, l] of checks) { console.log((c ? '  ✓ ' : '  ✗ ') + l); if (!c) fail++; }
}
console.log(`\n${n - 0} journey(s) run, ${fail} failed check(s)`);
await b.close(); process.exit(fail ? 1 : 0);
