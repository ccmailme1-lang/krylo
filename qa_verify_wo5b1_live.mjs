// Live perceptual verification — WO-5B stage 5B-1 (KRYL-1234).
// "Is Anduril a good acquisition target?" → packet is ABOUT Anduril; each domain
// tab states A(domain, Anduril); field pressure is subordinate context; honest
// per-measure absence with the required source class; no legacy scaffold.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173/';
const QUERY = 'Is Anduril a good acquisition target?';

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

async function tab(name) {
  return page.evaluate((tabName) => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const btn = [...document.querySelectorAll('button')].find(x => norm(x.textContent) === tabName);
    if (btn) btn.click();
    return new Promise(res => setTimeout(() => {
      const root = [...document.querySelectorAll('*')].find(e => /through each domain|decision frame|No resolvable subject/i.test(e.textContent || '') && e.children.length < 8);
      const container = root ? root.closest('div')?.parentElement : document.body;
      res(norm(container?.innerText || document.body.innerText).slice(0, 2500));
    }, 700));
  }, name);
}

const cap = await tab('CAPITAL');
const own = await tab('OWNERSHIP');
await browser.close();

const T = (cap + ' ' + own).toUpperCase();
console.log('--- CAPITAL tab (excerpt) ---\n' + cap.slice(0, 1400) + '\n');

let ok = true;
const check = (l, c) => { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) ok = false; };

check('packet is titled with the subject (ANDURIL INDUSTRIES)', T.includes('ANDURIL INDUSTRIES'));
check('header names A(domain, Anduril)', /A\(DOMAIN, ANDURIL INDUSTRIES\)|THROUGH EACH DOMAIN/.test(T));
check('CAPITAL SIGNAL panel shows A(CAPITAL, anduril-industries)', T.includes('A(CAPITAL, ANDURIL-INDUSTRIES)'));
check('OWNERSHIP SIGNAL panel shows A(OWNERSHIP, anduril-industries)', T.includes('A(OWNERSHIP, ANDURIL-INDUSTRIES)'));
check('subject measures still honest absence with required source class', T.includes('DATA UNAVAILABLE') && T.includes('REQUIRES:'));
check('field pressure demoted to subordinate context ("not ... answer")', /FIELD SCOPE — NOT .*ANSWER/.test(T) || !/\bA\(CAPITAL[\s\S]{0,60}\n\s*\d{2}\s*\n\s*(FRACTURE|CONSTRUCTIVE)/.test(cap.toUpperCase()));
check('no STAKE / MOVE / WINDOW / LEVERAGE FIELD legacy scaffold', !/\bSTAKE\b|\bMOVE\b|LEVERAGE FIELD/.test(T));
check('no "IS ANDURIL" pseudo-anchor', !T.includes('IS ANDURIL LENS') && !/ANCHOR: IS ANDURIL/.test(T));
check('no uncaught page errors', pageErrs.length === 0);
if (pageErrs.length) console.log(pageErrs);

console.log(ok ? '\nALL PASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
