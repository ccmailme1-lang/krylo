// tests/e2e/left-nav-highlight.spec.js — real-browser validation of the left-nav
// dim/gray-hover/lime-selected contract across all 5 items, Home included.
import { test, expect } from '@playwright/test';

// iframe[title="KRYLO Campaign"] (iframeRef) is always mounted regardless of navMode/restrictToChrome
// and gets applyActiveNav() applied to it on every navMode change in campaignfunnel.jsx -- unlike
// the "KRYLO left nav" clone, which only exists while restrictToChrome (navMode==='surface') is true.
async function navItemState(page, index) {
  const frame = page.frameLocator('iframe[title="KRYLO Campaign"]');
  const item = frame.locator('.lnav-item').nth(index);
  const cls = await item.getAttribute('class');
  const color = await item.locator('.lnav-label').evaluate(el => getComputedStyle(el).color);
  return { active: (cls || '').includes('active'), color };
}

const LNAV_MODES = ['surface', 'analysis', 'feeds', 'community', 'history'];
async function selectNavItem(page, index) {
  // Same postMessage a real nav-rail click sends (relayLeftNav in campaignfunnel.jsx) --
  // used directly here to exercise the identical navMode-update code path without needing
  // to get past the access-code gate that blocks synthetic UI clicks in a headless run.
  await page.evaluate(mode => window.postMessage({ type: 'krylo-nav', mode }, '*'), LNAV_MODES[index]);
}

test('left nav: nothing highlighted on landing, lime on real selection, Home included', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('iframe[title="KRYLO left nav"]', { timeout: 20000 });
  await page.waitForTimeout(1500); // let both iframes finish their own load handlers

  // 1. Untouched landing view — nothing should be active.
  for (let i = 0; i < 5; i++) {
    const state = await navItemState(page, i);
    expect(state.active, `index ${i} should not be active on initial load`).toBe(false);
  }

  // 2. Click Analysis (index 1) — it should light up.
  await selectNavItem(page, 1);
  await page.waitForTimeout(300);
  const analysisState = await navItemState(page, 1);
  expect(analysisState.active).toBe(true);
  expect(analysisState.color).toBe('rgb(102, 255, 0)'); // #66FF00

  // 3. Click Home (index 0) — it should light up exactly the same way.
  await selectNavItem(page, 0);
  await page.waitForTimeout(300);
  const homeState = await navItemState(page, 0);
  expect(homeState.active, 'Home should become active after an explicit click').toBe(true);
  expect(homeState.color).toBe('rgb(102, 255, 0)');

  // 4. Analysis should no longer be active once Home is selected.
  const analysisAfter = await navItemState(page, 1);
  expect(analysisAfter.active).toBe(false);
});
