// tests/e2e/kryl1329-next-directions.spec.js — KRYL-1329 validation, one block per STATED GOAL.
// Real-browser (localhost) validation of the three-round PRE-SUBMIT next-question assistance.
// Each `describe` states the goal it must reach; each test is a line of the checklist (C1-C19) in
// specs/spec-kryl-1329-respec.md. Supersedes the KRYL-1326 spec (question-assistance-pre-submit).
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
  });
  await page.goto('/');
  await page.waitForSelector('iframe[title="KRYLO Campaign"]', { timeout: 20000 });
  await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*'));
  await page.locator('textarea').first().waitFor({ timeout: 20000 });
});

const MAX = 3;                                                    // C1: the single limit
const box      = page => page.locator('textarea').first();
const header   = page => page.getByText('ADD TO YOUR QUESTION', { exact: true });
const chips    = page => page.locator('button[data-chip]');
const labels   = async page => (await chips(page).allInnerTexts()).map(t => t.replace(/^\+\s*/, '').trim().toLowerCase());
const addedRow = page => page.getByText('+ ADDED', { exact: true });
const clearAll = page => page.getByText('clear all', { exact: true });
const settle   = page => page.waitForTimeout(450);
async function typeInto(page, text) {
  const b = box(page); await b.click(); await b.fill('');
  if (text) await b.pressSequentially(text, { delay: 8 });
  await settle(page);
}
async function pick(page, index = 0) { await chips(page).nth(index).click(); await settle(page); }

const T1 = 'technology / architecture changes';
const T2 = 'technology / vendor changes';
const T3 = 'technology / adoption changes';
const THREE = 'Digital Software Platform';                       // supports three grounded directions

const CORPUS = [
  'Lithium Battery Supply', 'Regional Bank Consolidation', 'Streaming Rights Deal', 'Hospital Staffing Costs',
  'Union Contract Renegotiation', 'Private Equity Roll-Up', 'Cloud Data Migration', 'Patent Portfolio Licensing',
  'Nuclear Fuel Enrichment', 'Urban Housing Zoning', 'Tesla', 'Goldman Sachs', 'Novo Nordisk', 'Anduril', 'Nvidia TSMC',
  'warehouse robotics', 'interest rate exposure', 'port congestion', 'cybersecurity insurance',
  'How exposed is our supply chain to a Taiwan disruption?', 'Is Anduril a good acquisition target?',
  'What is driving lithium prices this year?', 'AWS vs Azure', 'Toyota versus Ford EV strategy',
  "I'm 40 and considering a career change into data science", 'Housing market in Austin 2026',
  'Top 10 semiconductor suppliers', '???', 'asdf', 'Vendor Platform Decoupling', THREE, 'Private Equity Platform',
];

test.describe('GOAL 1 — never more than 3 chips, on any input, in any round (C1, C2)', () => {
  test('across the whole corpus the chip count is <= 3 and never the six-pressure list', async ({ page }) => {
    for (const q of CORPUS) {
      await typeInto(page, q);
      const l = await labels(page);
      console.log(`EVIDENCE | ${JSON.stringify(q)} -> ${JSON.stringify(l)}`);
      expect(l.length).toBeLessThanOrEqual(MAX);
      expect(l.filter(x => ['capital / financing changes', 'ownership / control changes', 'knowledge / research changes',
                            'labor / workforce changes', 'media / coverage changes'].includes(x))).toHaveLength(0);
    }
  });
});

test.describe('GOAL 2 — up to three rounds, at most one selection per round, hard stop after round 3 (C2, C3, C4)', () => {
  test('a supported input runs 3 -> 2 -> 1 -> stop, in catalog order, with exact appends', async ({ page }) => {
    await typeInto(page, THREE);
    expect(await labels(page)).toEqual([T1, T2, T3]);                       // round 1: three chips
    await pick(page, 0);
    await expect(box(page)).toHaveValue(`${THREE} + ${T1}`);                // exact append, one selection
    expect(await labels(page)).toEqual([T2, T3]);                           // round 2: fresh candidates, selected one gone
    await pick(page, 0);
    await expect(box(page)).toHaveValue(`${THREE} + ${T1} + ${T2}`);
    expect(await labels(page)).toEqual([T3]);                               // round 3
    await pick(page, 0);
    await expect(box(page)).toHaveValue(`${THREE} + ${T1} + ${T2} + ${T3}`);
    await expect(chips(page)).toHaveCount(0);                               // HARD STOP: no fourth round
    await expect(header(page)).toHaveCount(0);
    await box(page).pressSequentially(' more words', { delay: 8 });
    await settle(page);
    await expect(chips(page)).toHaveCount(0);                               // typing does not restart it
  });
  test('zero candidates ends assistance immediately', async ({ page }) => {
    await typeInto(page, 'Vendor Platform');
    expect(await labels(page)).toEqual([T1]);
    await pick(page, 0);
    await expect(chips(page)).toHaveCount(0);                               // round 2 has nothing: assistance ends
  });
});

test.describe('GOAL 3 — grounded only in the guest\'s own words; KRYLO text never grounds; no repeats (C8, C9, C6)', () => {
  test('misfire and ungrounded inputs give no chips (Thai Restaurant Chain, names, fragments)', async ({ page }) => {
    for (const q of ['Thai Restaurant Chain', 'Shareholder Voting Rights', 'Tesla', 'warehouse robotics', 'Regional Bank Consolidation']) {
      await typeInto(page, q);
      await expect(chips(page)).toHaveCount(0);
    }
  });
  test('the appended phrase is not evidence: KRYLO\'s own word "technology" does not create a candidate', async ({ page }) => {
    await typeInto(page, 'Vendor Platform');
    await pick(page, 0);                                                    // appends T1 (contains "technology")
    await expect(chips(page)).toHaveCount(0);                               // T2/T3 are not grounded by KRYLO's words
  });
  test('a phrase the guest already typed is never offered', async ({ page }) => {
    await typeInto(page, `${THREE} + ${T1}`);
    expect(await labels(page)).not.toContain(T1);
  });
  test('guest edits between rounds count: the next round evaluates the current text', async ({ page }) => {
    await typeInto(page, THREE);
    await pick(page, 0);
    await box(page).press('End');
    await box(page).pressSequentially(' cloud', { delay: 8 });
    await settle(page);
    expect(await labels(page)).toEqual([T2, T3]);
  });
});

test.describe('GOAL 4 — complete questions and cue-bearing inputs get zero by default (C7, C11)', () => {
  test('questions, decision / number / place cues, comparisons and noise give no chips', async ({ page }) => {
    for (const q of ['How exposed is our supply chain to a Taiwan disruption?', 'Is Anduril a good acquisition target?',
                     'Housing market in Austin 2026', "I'm 40 and considering a career change into data science",
                     'AWS vs Azure', '', '???']) {
      await typeInto(page, q);
      await expect(chips(page)).toHaveCount(0);
    }
  });
});

test.describe('GOAL 5 — form: exact append, never submits, ordinary text, no + ADDED, no clear all (C10)', () => {
  test('select appends exactly, does not submit, leaves no token and no clear-all', async ({ page }) => {
    await typeInto(page, THREE);
    await pick(page, 1);                                                    // second chip (T2)
    await expect(box(page)).toHaveValue(`${THREE} + ${T2}`);
    await expect(page.getByText('TARGET PACKET', { exact: false })).toHaveCount(0);
    await expect(addedRow(page)).toHaveCount(0);
    await expect(clearAll(page)).toHaveCount(0);
    await box(page).press('End');
    await box(page).press('Backspace');                                     // guest edits KRYLO's wording freely
    await settle(page);
    await expect(box(page)).toHaveValue(`${THREE} + ${T2.slice(0, -1)}`);
  });
});

test.describe('GOAL 6 — stop conditions and ownership: clear, submit end assistance; submit uses the exact text (C13, A4)', () => {
  test('clearing the text resets the sequence; a new input starts a fresh one', async ({ page }) => {
    await typeInto(page, THREE);
    await pick(page, 0);
    await typeInto(page, '');
    await expect(chips(page)).toHaveCount(0);
    await typeInto(page, THREE);
    expect(await labels(page)).toEqual([T1, T2, T3]);                       // fresh sequence
  });
  test('submit ends assistance and sends the exact box text as the QUESTION; structuralRefinements stays empty', async ({ page }) => {
    await typeInto(page, THREE);
    await pick(page, 0);
    const expected = `${THREE} + ${T1}`;
    await expect(box(page)).toHaveValue(expected);
    await box(page).press('Control+Enter');
    await expect(page.getByText('QUESTION AS ASKED', { exact: false }).first()).toBeVisible({ timeout: 30000 });
    const state = await page.evaluate(async () => {
      const m = await import('/src/store/useanalysisstore.js');
      const st = (m.default ?? m.useAnalysisStore).getState();
      const s = st.sessions[st.activeSessionId];
      return { query: s?.query, q: s?.tensor?.analysisIntent?.question?.value?.text, sr: s?.tensor?.structuralRefinements ?? [] };
    });
    expect(state.query).toBe(expected);
    expect(state.q).toBe(expected);
    expect(state.sr).toEqual([]);
    await expect(chips(page)).toHaveCount(0);                               // no further round after submit
  });
});
