// tests/e2e/kryl1329-next-directions.spec.js — KRYL-1329 browser/wiring verification.
// Rewritten 2026-09-27 alongside the engine rewrite (no chip-sequence memory; recompute from the
// current query text every time). Mechanism coverage (grounding, ceiling, free-text equivalence,
// edit-reoffers, purity) is exhaustively covered in tests/kryl1329-next-directions-mechanism.test.mjs;
// this file verifies the actual DOM wiring: visual treatment, click-to-append, race-safety under
// fast typing, and submit.
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
const T_ARCH = 'technology / architecture changes';
const T_VEND = 'technology / vendor changes';

test('Vendor Platform Decoupling offers both grounded directions together (the fixed bug, live)', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  const labels = await chips(page).allInnerTexts();
  expect(labels.map(t => t.replace(/^\+\s*/, ''))).toEqual([T_ARCH, T_VEND]);
});

test('selecting one leaves the other available; selecting that one reaches the ceiling', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  await page.getByText(`+ ${T_ARCH}`, { exact: true }).click();
  await settle(page);
  await expect(box(page)).toHaveValue(`Vendor Platform Decoupling + ${T_ARCH}`);
  await expect(chips(page)).toHaveCount(1);
  await page.getByText(`+ ${T_VEND}`, { exact: true }).click();
  await settle(page);
  await expect(box(page)).toHaveValue(`Vendor Platform Decoupling + ${T_ARCH} + ${T_VEND}`);
  await expect(chips(page)).toHaveCount(0); // 2 established, nothing further grounded: a valid stop
});

test('a guest who types the full 2-component query by hand sees no further suggestion (free text == chip selection)', async ({ page }) => {
  await typeInto(page, `Vendor Platform Decoupling + ${T_ARCH} + ${T_VEND}`);
  await expect(chips(page)).toHaveCount(0);
});

test('deleting an established segment makes that direction eligible again', async ({ page }) => {
  await typeInto(page, `Vendor Platform Decoupling + ${T_VEND}`);
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toHaveText(`+ ${T_ARCH}`);
});

test('visual treatment: small quiet bordered chip, matching the existing NOT ESTABLISHED badge language', async ({ page }) => {
  await typeInto(page, 'AI Data Center Pushback');
  const style = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('local politician'));
    const s = getComputedStyle(b);
    return { border: s.border, radius: s.borderRadius, bg: s.backgroundColor, fontSize: s.fontSize };
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
  const text = 'Vendor Platform Decoupling Technology Infrastructure';
  await b.pressSequentially(text, { delay: 2 });
  for (let i = 0; i < 8; i++) await b.press('Backspace');
  await b.pressSequentially(' Systems', { delay: 2 });
  await page.waitForTimeout(800);
  await expect(b).toHaveValue(text.slice(0, -8) + ' Systems');
  expect(errs).toEqual([]);
});

test('submit uses the exact resulting textarea string', async ({ page }) => {
  await typeInto(page, 'Vendor Platform Decoupling');
  await page.getByText(`+ ${T_ARCH}`, { exact: true }).click();
  await settle(page);
  const expected = `Vendor Platform Decoupling + ${T_ARCH}`;
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
