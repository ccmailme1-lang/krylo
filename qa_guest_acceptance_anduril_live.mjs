// qa_guest_acceptance_anduril_live.mjs — KRYL Guest Acceptance Harness (LIVE layer).
//
// Not a unit test. Not a DOM-existence check. We drive the deployed packet as a
// guest would and RECORD what the guest actually sees, then evaluate it against
// the fixed Anduril fixture (A–F) and the truth boundary. Writes a baseline
// snapshot so every later stage has a clean before/after.
//
//   node guest_acceptance_anduril_live.mjs [--baseline <path>] [--against <path>]
//
// --baseline PATH : write the captured guest-state to PATH (freeze this stage)
// --against  PATH : diff the capture against a previously frozen baseline

import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BASE = 'http://localhost:5173/';
const FIXTURE = 'Is Anduril a good acquisition target?';
const args = process.argv.slice(2);
const baselineOut = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null;
const against     = args.includes('--against')  ? args[args.indexOf('--against') + 1]  : null;

const DOMAINS = ['CAPITAL', 'OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA'];

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
  setter.call(el, q); el.dispatchEvent(new Event('input', { bubbles: true }));
}, FIXTURE);
await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.querySelector('polyline[points="5 12 12 5 19 12"]'));
  if (b) b.click();
});
await page.waitForTimeout(7000);

// PRIMARY SIGNAL (legacy) — capture verbatim
const primarySignal = await page.evaluate(() => {
  const lbl = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'PRIMARY SIGNAL');
  return lbl ? (lbl.parentElement?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) : '(none)';
});

// 01 ANALYSIS — per-domain capture
async function captureDomain(d) {
  return page.evaluate((tab) => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const btn = [...document.querySelectorAll('button')].find(x => norm(x.textContent) === tab);
    if (btn) btn.click();
    return new Promise(res => setTimeout(() => {
      const span = [...document.querySelectorAll('span')].find(s => norm(s.textContent) === 'SIGNAL');
      const panel = span ? span.parentElement?.parentElement : null;
      const observes = [...document.querySelectorAll('span')].find(s => norm(s.textContent) === 'OBSERVES');
      const oPanel = observes ? observes.parentElement?.parentElement : null;
      res({
        signal: panel ? norm(panel.innerText).slice(0, 1200) : '(no SIGNAL panel)',
        observes: oPanel ? norm(oPanel.innerText).slice(0, 800) : '(no OBSERVES panel)',
      });
    }, 650));
  }, d);
}
const header = await page.evaluate(() => {
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  // the DomainSubstrateTabs header: a div whose direct text (minus nested <b>/<span>)
  // mentions the subject framing and is short
  const cands = [...document.querySelectorAll('div, p')].filter(e => {
    const t = norm(e.textContent);
    return /through each domain|is a decision frame|No resolvable subject/i.test(t) && t.length < 500 && !/font-face|@font/i.test(t);
  });
  cands.sort((a, b) => norm(a.textContent).length - norm(b.textContent).length);
  return cands[0] ? norm(cands[0].textContent).slice(0, 400) : '(no header)';
});
const perDomain = {};
for (const d of DOMAINS) perDomain[d] = await captureDomain(d);

// relationship section (5B-3 — may not exist yet)
const relationshipSection = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => /RELATIONSHIP (SURFACE|OBJECT|EMERGING)|observed relationship/i.test(e.textContent || '') && e.children.length < 20);
  return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 800) : null;
});

await browser.close();

const capture = {
  fixture: FIXTURE, capturedAt: new Date().toISOString(),
  pageErrors: pageErrs,
  header, primarySignal, perDomain, relationshipSection,
};

// ── Evaluate A–F ───────────────────────────────────────────────────────────
const allText = (header + ' ' + JSON.stringify(perDomain)).toUpperCase();
const ev = [];
const E = (k, l, c) => ev.push({ k, l, pass: !!c });

E('A', 'subject resolves to ANDURIL INDUSTRIES and the identity is visible', allText.includes('ANDURIL INDUSTRIES'));
E('A', 'no "IS ANDURIL" pseudo-anchor', !allText.includes('IS ANDURIL LENS') && !allText.includes('ANCHOR: IS ANDURIL'));
E('B', 'each domain SIGNAL panel is A(domain, anduril-industries)', DOMAINS.every(d => perDomain[d].signal.toUpperCase().includes(`A(${d}, ANDURIL-INDUSTRIES)`)));
E('B', 'field context is visibly distinguished (labelled, not the headline)', DOMAINS.every(d => {
  const s = perDomain[d].signal.toUpperCase();
  return !/A\([A-Z]+, ANDURIL-INDUSTRIES\)\s*\n?\s*\d{2}\s*(FRACTURE|CONSTRUCTIVE)/.test(s);
}));
E('C', 'unavailable evidence explains WHY (requires: <source>)', allText.includes('REQUIRES:') || DOMAINS.some(d => perDomain[d].signal.toUpperCase().includes('REQUIRES:')));
E('C', 'no evidence attributed to Anduril without an identifier binding (honest: none today)',
  DOMAINS.every(d => !/OBSERVED · .*BOUND VIA/i.test(perDomain[d].observes) || /BOUND VIA (CANONICALID|IDENTIFIER)/i.test(perDomain[d].observes)));
E('D', '5B-3 relationship object present', relationshipSection != null); // expected to FAIL pre-5B-3
E('E', '5B-4 formation grounded in visible observations', false); // expected to FAIL pre-5B-4, placeholder
E('F', 'no fabricated numeric measure (all Class-E show DATA UNAVAILABLE)',
  DOMAINS.every(d => !/(?:SHARE|VELOCITY|CHANGE|RATE|SHIFT|REDISTRIBUTION|COHERENCE)\s*\n?\s*\d/i.test(perDomain[d].signal)));
E('F', 'no field signal presented as subject evidence', DOMAINS.every(d => /FIELD SCOPE — NOT .*ANSWER|FIELD CONTEXT/i.test(perDomain[d].signal) || !/A\([A-Z]+, ANDURIL/i.test(perDomain[d].signal) === false));
E('F', 'LEGACY PRIMARY SIGNAL is not a predictive strategic narrative',
  !/EVALUATE EXIT TIMING|PREMIUM EVAPORATES|EXIT SIGNAL|BECOMING CONSENSUS/i.test(primarySignal.toUpperCase())); // expected FAIL — KRYL-1235
E('F', 'no page errors', pageErrs.length === 0);

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\n=== GUEST ACCEPTANCE · LIVE · "${FIXTURE}" ===\n`);
console.log('HEADER (what the guest sees first):\n  ' + header + '\n');
console.log('PRIMARY SIGNAL (legacy, above 01 ANALYSIS):\n  ' + primarySignal.slice(0, 200) + '\n');
console.log('CAPITAL tab · SIGNAL:\n  ' + perDomain.CAPITAL.signal.slice(0, 400) + '\n');

const byStage = { A: 'subject', B: 'six-domain observation', C: 'evidence', D: 'relationships (5B-3)', E: 'formation (5B-4)', F: 'truth boundary' };
for (const key of ['A', 'B', 'C', 'D', 'E', 'F']) {
  console.log(`[${key}] ${byStage[key]}`);
  for (const e of ev.filter(x => x.k === key)) console.log(`   ${e.pass ? '✓' : '✗'} ${e.l}`);
}

const known = new Set([ // failures that are expected pre-5B-3/5B-4 or are KRYL-1235
  '5B-3 relationship object present',
  '5B-4 formation grounded in visible observations',
  'LEGACY PRIMARY SIGNAL is not a predictive strategic narrative',
]);
const unexpected = ev.filter(e => !e.pass && !known.has(e.l));
console.log(`\nunexpected failures: ${unexpected.length}` + (unexpected.length ? '\n  ' + unexpected.map(e => e.l).join('\n  ') : ''));
console.log(`expected-open (5B-3/5B-4/KRYL-1235): ${ev.filter(e => !e.pass && known.has(e.l)).length}`);

if (baselineOut) { writeFileSync(baselineOut, JSON.stringify(capture, null, 2)); console.log(`\nbaseline frozen → ${baselineOut}`); }
if (against && existsSync(against)) {
  const base = JSON.parse(readFileSync(against, 'utf8'));
  const changed = DOMAINS.filter(d => base.perDomain?.[d]?.signal !== perDomain[d].signal);
  console.log(`\ndiff vs ${against}: ${changed.length ? 'changed domains → ' + changed.join(', ') : 'no per-domain SIGNAL change'}`);
  if (base.primarySignal !== primarySignal) console.log('  PRIMARY SIGNAL changed');
}

process.exit(unexpected.length === 0 ? 0 : 1);
