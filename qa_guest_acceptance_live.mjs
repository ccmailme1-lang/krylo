// qa_guest_acceptance_live.mjs — KRYL Guest Acceptance Harness (LIVE layer).
//
// Drives the DEPLOYED packet as a guest and records what the guest actually sees,
// then grades the GUEST EXPERIENCE (not backend seams) against each fixture.
// Scans the WHOLE packet — not just 01 ANALYSIS — because the legacy advisory
// shell (FORMATION proxy paths, BRIEF/RECON/IMPACT column, ACTION MATRIX,
// PROVENANCE "refine your query", fabricated Signal/Convergence/Action) is what
// contradicts the honest core.
//
//   node qa_guest_acceptance_live.mjs [--fixture entity|decisionFrame] [--baseline PATH] [--against PATH]

import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BASE = 'http://localhost:5173/';
const FIXTURES = {
  entity:        { query: 'Is Anduril a good acquisition target?', kind: 'ENTITY',        subjectId: 'anduril-industries' },
  decisionFrame: { query: 'Should I purchase an investment property in Las Vegas, and what is the market doing', kind: 'DECISION_FRAME' },
};
const args = process.argv.slice(2);
const only = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null;
const baselineOut = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null;
const against     = args.includes('--against')  ? args[args.indexOf('--against') + 1]  : null;
const DOMAINS = ['CAPITAL', 'OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA'];

// legacy advisory / fabrication signatures that must NOT appear as the answer
const LEGACY_SIGNATURES = [
  'REFINE YOUR QUERY', 'SELECT YOUR SITUATION TYPE', 'ADD A CAPITAL FLOOR',
  'DIRECTIONAL SIGNALS GENERATED', 'ADD DOLLAR AMOUNTS', 'ADD A SPECIFIC DECISION',
  'PROXY_UNTIL_WO1848', 'EVALUATE EXIT TIMING', 'PREMIUM EVAPORATES',
  'ACTION MATRIX', 'LEAD ACTION', 'ORACLE KERNEL', 'EXPORT BRIEF',
  'SPECIFICITY IS THE PRIMARY DRIVER', 'NEEDS INPUT',
];

async function runFixture(name) {
  const fx = FIXTURES[name];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*'));
  const ta = page.locator('textarea[placeholder*="trying to accomplish"]');
  await ta.waitFor({ state: 'visible', timeout: 15000 });
  await ta.evaluate((el, q) => {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, q); el.dispatchEvent(new Event('input', { bubbles: true }));
  }, fx.query);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.querySelector('polyline[points="5 12 12 5 19 12"]'));
    if (b) b.click();
  });
  await page.waitForTimeout(8000);
  // scroll every scrollable container so lazily-rendered sections (02 FORMATION,
  // the BRIEF/RECON/IMPACT column, ACTION MATRIX) are in the render tree
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight + 40) { el.scrollTop = el.scrollHeight; }
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 400));
    for (const tab of ['RECON', 'IMPACT', 'BRIEF']) {
      const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === tab);
      if (b) { b.click(); await new Promise(r => setTimeout(r, 250)); }
    }
  });
  await page.waitForTimeout(1500);

  const fullPacket = await page.evaluate(() =>
    (document.documentElement.innerText || document.body.innerText || '').replace(/\s+/g, ' ').trim());
  const header = await page.evaluate(() => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const c = [...document.querySelectorAll('div, p')].filter(e => {
      const t = norm(e.textContent);
      return /through each domain|is a decision frame|No resolvable subject/i.test(t) && t.length < 500 && !/font-face/i.test(t);
    });
    c.sort((a, b) => norm(a.textContent).length - norm(b.textContent).length);
    return c[0] ? norm(c[0].textContent).slice(0, 400) : '(none)';
  });
  const primarySignal = await page.evaluate(() => {
    const l = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'PRIMARY SIGNAL');
    return l ? (l.parentElement?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400) : '(none)';
  });
  async function domainSignal(d) {
    return page.evaluate((tab) => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const btn = [...document.querySelectorAll('button')].find(x => norm(x.textContent) === tab);
      if (btn) btn.click();
      return new Promise(res => setTimeout(() => {
        const span = [...document.querySelectorAll('span')].find(s => norm(s.textContent) === 'SIGNAL');
        const panel = span ? span.parentElement?.parentElement : null;
        res(panel ? norm(panel.innerText).slice(0, 1400) : '(none)');
      }, 550));
    }, d);
  }
  const perDomain = {};
  for (const d of DOMAINS) perDomain[d] = await domainSignal(d);
  await browser.close();

  return { fixture: name, query: fx.query, kind: fx.kind, header, primarySignal, perDomain, fullPacket, pageErrors: errs, capturedAt: new Date().toISOString() };
}

function grade(cap) {
  const P = cap.fullPacket.toUpperCase();
  const dom = JSON.stringify(cap.perDomain).toUpperCase();
  const g = [];
  const add = (stage, l, pass) => g.push({ stage, l, pass: !!pass });

  // 5B-1 SUBJECT
  if (cap.kind === 'ENTITY') {
    add('5B-1', 'subject identity visible (ANDURIL INDUSTRIES)', cap.header.toUpperCase().includes('ANDURIL INDUSTRIES'));
    add('5B-1', 'each domain SIGNAL panel is A(domain, subject)', DOMAINS.every(d => cap.perDomain[d].toUpperCase().includes(`A(${d}, ANDURIL-INDUSTRIES)`)));
  } else {
    add('5B-1', 'decision frame is named as such (not invented into a subject)', /DECISION FRAME/i.test(cap.header));
    add('5B-1', 'domains say NOT SCOPED TO A SUBJECT (no false answer)', DOMAINS.every(d => /NOT SCOPED TO A SUBJECT/i.test(cap.perDomain[d])));
  }

  // EVIDENCE / truth boundary in 01 ANALYSIS
  add('EVIDENCE', 'no fabricated Class-E measure value (all show DATA UNAVAILABLE)',
    DOMAINS.every(d => !/(SHARE|VELOCITY|CHANGE|RATE|SHIFT|REDISTRIBUTION|COHERENCE)\s*\n?\s*\d/.test(cap.perDomain[d].toUpperCase())));
  add('EVIDENCE', 'field pressure labelled context, not the subject answer',
    DOMAINS.some(d => /FIELD SCOPE — NOT .*ANSWER/i.test(cap.perDomain[d])) || cap.kind !== 'ENTITY');

  // RELATIONSHIP PERCEPTION — an admission list is not a perceived relationship
  const relObject = /RELATIONSHIP (OBJECT|SURFACE|EMERGING)|OBSERVED RELATIONSHIP|↕/.test(cap.fullPacket);
  add('RELATIONSHIP', 'a perceived relationship object exists (not just an admission list)', relObject);

  // FORMATION PERCEPTION — must not be legacy proxy paths
  add('FORMATION', '02 FORMATION is not legacy proxy paths', !/PROXY_UNTIL_WO1848|SELECT YOUR SITUATION TYPE|ADD A CAPITAL FLOOR/i.test(P));

  // LEGACY NARRATIVE ISOLATION — full packet
  const hits = LEGACY_SIGNATURES.filter(s => P.includes(s));
  add('LEGACY', `no legacy advisory / fabrication signatures in the packet (found: ${hits.length ? hits.join(', ') : 'none'})`, hits.length === 0);
  add('LEGACY', 'PRIMARY SIGNAL is not a predictive strategic narrative',
    !/EVALUATE EXIT TIMING|PREMIUM EVAPORATES|BECOMING CONSENSUS/i.test(cap.primarySignal.toUpperCase()));

  add('BOUNDARY', 'no page errors', cap.pageErrors.length === 0);
  return g;
}

// ── run ────────────────────────────────────────────────────────────────────
const names = only ? [only] : Object.keys(FIXTURES);
const verdicts = {};
for (const name of names) {
  const cap = await runFixture(name);
  const g = grade(cap);
  verdicts[name] = { cap, g };

  console.log(`\n=== GUEST ACCEPTANCE · LIVE · [${name}] "${cap.query.slice(0, 60)}…" ===`);
  console.log('HEADER: ' + cap.header + '\n');
  const byStage = {};
  for (const x of g) (byStage[x.stage] ??= []).push(x);
  for (const [stage, xs] of Object.entries(byStage)) {
    const stagePass = xs.every(x => x.pass);
    console.log(`[${stage}] ${stagePass ? 'PASS' : 'FAIL'}`);
    for (const x of xs) console.log(`   ${x.pass ? '✓' : '✗'} ${x.l}`);
  }
  const guestPass = g.filter(x => x.stage !== 'EVIDENCE' || true).every(x => x.pass);
  console.log(`\n[${name}] Overall guest experience: ${guestPass ? 'PASS' : 'FAIL'}`);

  if (baselineOut && names.length === 1) { writeFileSync(baselineOut, JSON.stringify(cap, null, 2)); console.log(`baseline frozen → ${baselineOut}`); }
  if (against && names.length === 1 && existsSync(against)) {
    const base = JSON.parse(readFileSync(against, 'utf8'));
    const changed = DOMAINS.filter(d => base.perDomain?.[d] !== cap.perDomain[d]);
    console.log(`diff vs ${against}: ${changed.length ? 'changed → ' + changed.join(', ') : 'no per-domain change'}`);
  }
}

const anyFail = Object.values(verdicts).some(v => !v.g.every(x => x.pass));
console.log(`\n${anyFail ? 'GUEST EXPERIENCE: FAIL' : 'GUEST EXPERIENCE: PASS'}`);
process.exit(anyFail ? 1 : 0);
