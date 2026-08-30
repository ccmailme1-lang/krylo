// Live verification — KRYL-1229.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173/';
const QUERY = 'our startup is deciding whether to pivot the product line or expand the current one';

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

async function tabDump(tab) {
  return page.evaluate((tabName) => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const btn = [...document.querySelectorAll('button')].find(x => norm(x.textContent) === tabName);
    if (btn) btn.click();
    return new Promise(res => setTimeout(() => {
      // SIGNAL panel = the panel div whose header span reads exactly "SIGNAL"
      const span = [...document.querySelectorAll('span')].find(s => norm(s.textContent) === 'SIGNAL');
      let txt = '(SIGNAL panel not found)';
      if (span) {
        const header = span.parentElement;      // the flex "02 SIGNAL" row
        const panel = header && header.parentElement; // the Panel div (header + children)
        if (panel) txt = panel.innerText;
      }
      const tabsPresent = ['CAPITAL','OWNERSHIP','TECHNOLOGY','KNOWLEDGE','LABOR','MEDIA']
        .filter(t => [...document.querySelectorAll('button')].some(b => norm(b.textContent) === t));
      const has01 = [...document.querySelectorAll('*')].some(e => e.children.length === 0 && norm(e.textContent) === 'ANALYSIS');
      res({ txt, tabsPresent, has01 });
    }, 700));
  }, tab);
}

const cap = await tabDump('CAPITAL');
console.log('01 ANALYSIS section present:', cap.has01);
console.log('domain tabs present:', JSON.stringify(cap.tabsPresent));
console.log('\n--- CAPITAL · SIGNAL panel ---\n' + cap.txt);
const own = await tabDump('OWNERSHIP');
console.log('\n--- OWNERSHIP · SIGNAL panel ---\n' + own.txt);
const tech = await tabDump('TECHNOLOGY');
console.log('\n--- TECHNOLOGY · SIGNAL panel ---\n' + tech.txt);
const know = await tabDump('KNOWLEDGE');
console.log('\n--- KNOWLEDGE · SIGNAL panel ---\n' + know.txt);

await browser.close();

const c = cap.txt.toUpperCase();
const o = own.txt.toUpperCase();
const t = tech.txt.toUpperCase();
const k = know.txt.toUpperCase();
const checks = [
  ['01 ANALYSIS section rendered', cap.has01],
  ['all six domain tabs present', cap.tabsPresent.length === 6],
  ['CAPITAL: AUTHORED MEASURE label', c.includes('AUTHORED MEASURE')],
  ['CAPITAL: CAPITAL CONCENTRATION', c.includes('CAPITAL CONCENTRATION')],
  ['CAPITAL: measure name "top-holder share"', c.includes('TOP-HOLDER SHARE')],
  ['CAPITAL: DATA UNAVAILABLE · SOURCE REQUIRED', c.includes('DATA UNAVAILABLE') && c.includes('SOURCE REQUIRED')],
  ['CAPITAL: absenceClass: STRUCTURAL', /ABSENCECLASS:\s*STRUCTURAL/.test(c)],
  ['CAPITAL: formula shown as reference', c.includes('HOLDER_CAPITAL')],
  ['CAPITAL: no fabricated numeric value on the measure line', !/TOP-HOLDER SHARE[^\n]*\n\s*\d/.test(c)],
  ['OWNERSHIP: AUTHORED MEASURE label', o.includes('AUTHORED MEASURE')],
  ['OWNERSHIP: OWNERSHIP CONCENTRATION', o.includes('OWNERSHIP CONCENTRATION')],
  ['OWNERSHIP: measure name "top-holder control share"', o.includes('TOP-HOLDER CONTROL SHARE')],
  ['OWNERSHIP: DATA UNAVAILABLE · SOURCE REQUIRED', o.includes('DATA UNAVAILABLE') && o.includes('SOURCE REQUIRED')],
  ['OWNERSHIP: absenceClass: STRUCTURAL', /ABSENCECLASS:\s*STRUCTURAL/.test(o)],
  ['OWNERSHIP: formula shown as reference', o.includes('HOLDER_CONTROL')],
  ['OWNERSHIP: boundary names capital exclusion', o.includes('NOT ECONOMIC CAPITAL')],
  ['OWNERSHIP: no fabricated numeric value on the measure line', !/TOP-HOLDER CONTROL SHARE[^\n]*\n\s*\d/.test(o)],
  ['TECHNOLOGY: AUTHORED MEASURE label', t.includes('AUTHORED MEASURE')],
  ['TECHNOLOGY: CAPABILITY CONCENTRATION', t.includes('CAPABILITY CONCENTRATION')],
  ['TECHNOLOGY: measure name "top-capability-provider share"', t.includes('TOP-CAPABILITY-PROVIDER SHARE')],
  ['TECHNOLOGY: DATA UNAVAILABLE · SOURCE REQUIRED', t.includes('DATA UNAVAILABLE') && t.includes('SOURCE REQUIRED')],
  ['TECHNOLOGY: absenceClass: STRUCTURAL', /ABSENCECLASS:\s*STRUCTURAL/.test(t)],
  ['TECHNOLOGY: boundary excludes adoption / displacement / activity', t.includes('ADOPTION') && t.includes('DISPLACEMENT') && t.includes('ACTIVITY')],
  ['TECHNOLOGY: no fabricated numeric value on the measure line', !/TOP-CAPABILITY-PROVIDER SHARE[^\n]*\n\s*\d/.test(t)],
  ['KNOWLEDGE: no AUTHORED MEASURE block (still pending)', !k.includes('AUTHORED MEASURE')],
  ['KNOWLEDGE: pending line still shown', /PENDING FOUNDER AUTHORSHIP/.test(k)],
  ['no uncaught page errors', pageErrs.length === 0],
];
let ok = true;
for (const [l, p] of checks) { console.log((p ? 'PASS ' : 'FAIL ') + l); if (!p) ok = false; }
if (pageErrs.length) console.log(pageErrs);
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
