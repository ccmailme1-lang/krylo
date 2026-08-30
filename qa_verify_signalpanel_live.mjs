// Live verification — KRYL-1229 + all 12 WO-1 Class-E measures.
// Every domain tab's SIGNAL panel renders each AUTHORED measure as classified
// STRUCTURAL absence (no fabricated value), formula shown as reference.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173/';
const QUERY = 'our startup is deciding whether to pivot the product line or expand the current one';

// concept label (as rendered, upper-cased) + a formula token that must appear.
const EXPECT = {
  CAPITAL: [
    ['CAPITAL CONCENTRATION', 'HOLDER_CAPITAL'],
    ['DEPLOYMENT VELOCITY', 'COMMITTED_AT_WINDOW_START'],
    ['CAPITAL-INTENSITY CHANGE', 'CI_END'],
  ],
  OWNERSHIP: [
    ['OWNERSHIP CONCENTRATION', 'HOLDER_CONTROL'],
  ],
  TECHNOLOGY: [
    ['CAPABILITY CONCENTRATION', 'PROVIDER_CAPABILITY_SHARE'],
  ],
  KNOWLEDGE: [
    ['EXPERTISE CONCENTRATION', 'HOLDER_EXPERTISE'],
    ['DIFFUSION RATE', 'REACHABLE_POPULATION'],
  ],
  LABOR: [
    ['WORKFORCE-GEOGRAPHIC CONCENTRATION', 'LOCATION_HEADCOUNT'],
    ['GEOGRAPHIC REDISTRIBUTION', 'SHARE_END(LOC)'],
    ['SKILL-MIX SHIFT', 'SHARE_END(SKILL)'],
  ],
  MEDIA: [
    ['ATTENTION CONCENTRATION', 'SOURCE_ATTENTION'],
    ['NARRATIVE COHERENCE', 'FRAME_SHARE'],
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrs = [];
page.on('pageerror', e => pageErrs.push('PAGEERROR ' + e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*'));

const ta = page.locator('textarea[placeholder*="trying to accomplish"]');
await ta.waitFor({ state: 'visible', timeout: 15000 });
await ta.evaluate((el, q) => {
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, q);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, QUERY);
await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.querySelector('polyline[points="5 12 12 5 19 12"]'));
  if (b) b.click();
});
await page.waitForTimeout(7000);

async function signalPanel(tab) {
  return page.evaluate((tabName) => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const btn = [...document.querySelectorAll('button')].find(x => norm(x.textContent) === tabName);
    if (btn) btn.click();
    return new Promise(res => setTimeout(() => {
      const span = [...document.querySelectorAll('span')].find(s => norm(s.textContent) === 'SIGNAL');
      let txt = '(not found)';
      if (span) { const p = span.parentElement && span.parentElement.parentElement; if (p) txt = p.innerText; }
      res(txt);
    }, 650));
  }, tab);
}

const results = {};
for (const d of Object.keys(EXPECT)) results[d] = await signalPanel(d);
await browser.close();

let ok = true;
const check = (l, c) => { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) ok = false; };

for (const [d, measures] of Object.entries(EXPECT)) {
  const T = (results[d] || '').toUpperCase();
  console.log(`\n--- ${d} ---\n` + results[d]);
  check(`${d}: AUTHORED MEASURE block present`, T.includes('AUTHORED MEASURE'));
  const structuralCount = (T.match(/ABSENCECLASS:\s*STRUCTURAL/g) || []).length;
  check(`${d}: ${measures.length} STRUCTURAL-absence block(s) (got ${structuralCount})`, structuralCount === measures.length);
  check(`${d}: ${measures.length} DATA UNAVAILABLE line(s)`, (T.match(/DATA UNAVAILABLE/g) || []).length === measures.length);
  for (const [concept, formulaTok] of measures) {
    check(`${d}: "${concept}" rendered`, T.includes(concept));
    check(`${d}: "${concept}" formula token ${formulaTok}`, T.includes(formulaTok));
  }
  check(`${d}: "remaining measures UNAUTHORED" line still present`, /UNAUTHORED \(WO-1 CLASS E/.test(T));
  // no digit immediately after a concept label line (no fabricated value)
  check(`${d}: no fabricated numeric value on any measure`, !/CONCENTRATION\n\s*\d|VELOCITY\n\s*\d|CHANGE\n\s*\d|RATE\n\s*\d|SHIFT\n\s*\d|REDISTRIBUTION\n\s*\d|COHERENCE\n\s*\d/.test(T));
}
check('no uncaught page errors', pageErrs.length === 0);
if (pageErrs.length) console.log(pageErrs);

const totalStructural = Object.values(results).reduce((n, t) => n + ((t.toUpperCase().match(/ABSENCECLASS:\s*STRUCTURAL/g) || []).length), 0);
check(`12 STRUCTURAL-absence blocks across all six tabs (got ${totalStructural})`, totalStructural === 12);

console.log(ok ? '\nALL PASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
