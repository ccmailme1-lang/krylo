// tests/e2e/kryl1329-next-directions.spec.js — KRYL-1329 browser/wiring verification.
// The PRODUCT catalog (NEXT_DIRECTION_CATALOG) is frozen empty pending Founder ratification of D4
// (phrase wording) and D6 (adjacent-direction license) — see src/engine/inquirygeneration.js. So
// no chip can ever render in the shipped app right now. That is what this file verifies: the freeze
// is real in the running app (not just in source), and the surrounding UI wiring (textarea, submit,
// debounce/effect timers) is race-safe under fast typing regardless of catalog content.
// Mechanism coverage (round progression, grounding, no-bootstrap, contamination matrix, concurrency
// purity of the pure function) is in tests/kryl1329-next-directions-mechanism.test.mjs, run against
// the catalog explicitly so it stays valid once the Founder ratifies rows into the real catalog.
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

const box    = page => page.locator('textarea').first();
const header = page => page.getByText('ADD TO YOUR QUESTION', { exact: true });
const chips  = page => page.locator('button[data-chip]');
const settle = page => page.waitForTimeout(450);
async function typeInto(page, text) {
  const b = box(page); await b.click(); await b.fill('');
  if (text) await b.pressSequentially(text, { delay: 8 });
  await settle(page);
}

const CORPUS = [
  'Digital Software Platform', 'Vendor Platform Decoupling', 'Private Equity Roll-Up', 'Lithium Battery Supply',
  'Regional Bank Consolidation', 'Streaming Rights Deal', 'Hospital Staffing Costs', 'Union Contract Renegotiation',
  'Cloud Data Migration', 'Patent Portfolio Licensing', 'Tesla', 'Goldman Sachs', 'warehouse robotics',
  'Is Anduril a good acquisition target?', 'AWS vs Azure', "I'm 40 and considering a career change into data science",
  'Housing market in Austin 2026', '', '???',
];

test('deploy gate: the shipped catalog is frozen — no chip renders for any corpus input (D4/D6 unratified)', async ({ page }) => {
  for (const q of CORPUS) {
    await typeInto(page, q);
    await expect(header(page)).toHaveCount(0);
    await expect(chips(page)).toHaveCount(0);
  }
});

test('the assistance row leaves no artifact even if the guest types a phrase from the draft catalog verbatim', async ({ page }) => {
  // If the freeze were only cosmetic (e.g. hidden by CSS instead of an empty data source), typing
  // the phrase text itself might still trigger some latent render. It must not.
  await typeInto(page, 'Digital Software Platform + technology / architecture changes');
  await expect(header(page)).toHaveCount(0);
  await expect(chips(page)).toHaveCount(0);
});

test('race safety: rapid typing/deleting produces no crash, no console error, and the box always holds exactly what was typed', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const b = box(page);
  await b.click();
  // Fast, low-delay keystrokes across a multi-word phrase, interleaved with deletions, to stress the
  // 150ms seedQuery debounce and the assist-reset effects without waiting between actions.
  const text = 'Digital Software Platform Technology Infrastructure';
  await b.pressSequentially(text, { delay: 2 });
  for (let i = 0; i < 8; i++) await b.press('Backspace');
  await b.pressSequentially(' Systems', { delay: 2 });
  await page.waitForTimeout(800); // let every in-flight debounce/effect settle
  const expected = text.slice(0, -8) + ' Systems';
  await expect(b).toHaveValue(expected);
  expect(errs).toEqual([]);
  await expect(chips(page)).toHaveCount(0); // still frozen throughout
});

test('submit still works with the assistance feature present but inert: exact text, no page errors', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await typeInto(page, 'Digital Software Platform');
  await box(page).press('Control+Enter');
  await expect(page.getByText('QUESTION AS ASKED', { exact: false }).first()).toBeVisible({ timeout: 30000 });
  const state = await page.evaluate(async () => {
    const m = await import('/src/store/useanalysisstore.js');
    const st = (m.default ?? m.useAnalysisStore).getState();
    const s = st.sessions[st.activeSessionId];
    return { query: s?.query, q: s?.tensor?.analysisIntent?.question?.value?.text };
  });
  expect(state.query).toBe('Digital Software Platform');
  expect(state.q).toBe('Digital Software Platform');
  expect(errs).toEqual([]);
});
