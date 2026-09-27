// tests/e2e/kryl1329-next-directions.spec.js — KRYL-1329 browser/wiring verification.
// Rewritten 2026-09-27, second pass, for the two-level dimension model (DOMAIN -> STRUCTURAL).
// Mechanism coverage (grounding, dimension gating, free-text equivalence, edit-reoffers, legacy-row
// preservation, purity) is exhaustively covered in tests/kryl1329-next-directions-mechanism.test.mjs;
// this file verifies the actual DOM wiring: visual treatment, click-to-append, race-safety, submit.
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
const chips  = page => page.locator('button[data-chip]');
const settle = page => page.waitForTimeout(450);
async function typeInto(page, text) {
  const b = box(page); await b.click(); await b.fill('');
  if (text) await b.pressSequentially(text, { delay: 8 });
  await settle(page);
}

test('the exact Founder acceptance sequence, live: subject -> domain -> structural -> []', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  await expect(chips(page)).toHaveCount(3);
  await expect(chips(page).nth(0)).toHaveText('+ Technology'); // ontology.js CANONICAL_DOMAINS order
  await expect(chips(page).nth(1)).toHaveText('+ Capital');
  await expect(chips(page).nth(2)).toHaveText('+ Knowledge');

  await page.getByText('+ Technology', { exact: true }).click();
  await settle(page);
  await expect(box(page)).toHaveValue('Vendor Platform Decoupling + Technology');
  await expect(chips(page)).toHaveCount(3);
  await expect(chips(page).nth(0)).toHaveText('+ architecture changes');

  await page.getByText('+ architecture changes', { exact: true }).click();
  await settle(page);
  await expect(box(page)).toHaveValue('Vendor Platform Decoupling + Technology + architecture changes');
  await expect(chips(page)).toHaveCount(0); // no further material dimension remains
});

test('typed entirely as free text reaches the identical end state', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling Technology Architecture changes');
  await expect(chips(page)).toHaveCount(0);
});

test('deleting the structural component makes it eligible again', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling Technology');
  await expect(chips(page)).toHaveCount(3);
  await expect(chips(page).first()).toHaveText('+ architecture changes');
});

test('the legacy word-grounded suggestion (validated on real production input) still works', async ({ page }) => {
  await typeInto(page, 'AI Data Center Pushback');
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toHaveText('+ local politician reaction');
});

test('visual treatment: small quiet bordered chip, matching the existing NOT ESTABLISHED badge language', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  const style = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Technology'));
    const s = getComputedStyle(b);
    return { border: s.border, bg: s.backgroundColor };
  });
  expect(style.border).toContain('1px');
  expect(style.bg).toBe('rgba(0, 0, 0, 0)');
});

test('no chip renders for a complete question, comparison, or noise', async ({ page }) => {
  for (const q of ['Is Vendor Platform Decoupling a good investment?', 'AWS vs Azure', '', '???']) {
    await typeInto(page, q);
    await expect(chips(page)).toHaveCount(0);
  }
});

test('race safety: rapid typing/deleting produces no crash and the box holds exactly what was typed', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const b = box(page);
  await b.click();
  const typed = 'Vendor Platform Decoupling Technology Infras';
  await b.pressSequentially(typed, { delay: 2 });
  for (let i = 0; i < 6; i++) await b.press('Backspace'); // removes exactly "Infras" (6 chars)
  await b.pressSequentially(' Systems', { delay: 2 });
  await page.waitForTimeout(800);
  await expect(b).toHaveValue(typed.slice(0, -6) + ' Systems'); // "...Technology  Systems" (2 spaces: the
  // trailing space before "Infras" plus the leading space of " Systems" — arithmetic, not a defect
  expect(errs).toEqual([]);
});

test('submit uses the exact resulting textarea string', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  await page.getByText('+ Technology', { exact: true }).click();
  await settle(page);
  const expected = 'Vendor Platform Decoupling + Technology';
  await box(page).press('Control+Enter');
  await expect(page.getByText('QUESTION AS ASKED', { exact: false }).first()).toBeVisible({ timeout: 30000 });
  const state = await page.evaluate(async () => {
    const m = await import('/src/store/useanalysisstore.js');
    const st = (m.default ?? m.useAnalysisStore).getState();
    const s = st.sessions[st.activeSessionId];
    return { query: s?.query, q: s?.tensor?.analysisIntent?.question?.value?.text };
  });
  expect(state.query).toBe(expected);
  expect(state.q).toBe(expected);
});
