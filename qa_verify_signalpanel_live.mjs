// Live verification — KRYL-1229 + WO-1 concentration family (6/12).
// Every domain's SIGNAL panel renders its AUTHORED concentration measure as
// classified STRUCTURAL absence (no fabricated value), formula + boundary shown.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173/';
const QUERY = 'our startup is deciding whether to pivot the product line or expand the current one';

const EXPECT = {
  CAPITAL:    { concept: 'CAPITAL CONCENTRATION',    measure: 'top-holder share',            formula: 'HOLDER_CAPITAL' },
  OWNERSHIP:  { concept: 'OWNERSHIP CONCENTRATION',  measure: 'top-holder control share',    formula: 'HOLDER_CONTROL' },
  TECHNOLOGY: { concept: 'CAPABILITY CONCENTRATION', measure: 'top-capability-provider share', formula: 'PROVIDER_CAPABILITY_SHARE' },
  KNOWLEDGE:  { concept: 'EXPERTISE CONCENTRATION',  measure: 'top-holder expertise share',  formula: 'HOLDER_EXPERTISE' },
  LABOR:      { concept: 'WORKFORCE-GEOGRAPHIC CONCENTRATION', measure: 'top-location workforce share', formula: 'LOCATION_HEADCOUNT' },
  MEDIA:      { concept: 'ATTENTION CONCENTRATION', measure: 'top-source attention share',   formula: 'SOURCE_ATTENTION' },
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

for (const [d, exp] of Object.entries(EXPECT)) {
  const T = (results[d] || '').toUpperCase();
  console.log(`\n--- ${d} ---\n` + results[d]);
  check(`${d}: AUTHORED MEASURE label`, T.includes('AUTHORED MEASURE'));
  check(`${d}: concept "${exp.concept}"`, T.includes(exp.concept));
  check(`${d}: measure name "${exp.measure}"`, T.includes(exp.measure.toUpperCase()));
  check(`${d}: DATA UNAVAILABLE · SOURCE REQUIRED`, T.includes('DATA UNAVAILABLE') && T.includes('SOURCE REQUIRED'));
  check(`${d}: absenceClass: STRUCTURAL`, /ABSENCECLASS:\s*STRUCTURAL/.test(T));
  check(`${d}: formula shown as reference (${exp.formula})`, T.includes(exp.formula));
  check(`${d}: no fabricated numeric value on the measure line`,
        !new RegExp(exp.measure.toUpperCase().replace(/[-]/g, '[- ]') + '[^\\n]*\\n\\s*\\d').test(T));
  check(`${d}: "remaining measures UNAUTHORED" line still present`, /UNAUTHORED \(WO-1 CLASS E/.test(T));
}
check('no uncaught page errors', pageErrs.length === 0);
if (pageErrs.length) console.log(pageErrs);
console.log(ok ? '\nALL PASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
