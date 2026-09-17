// tests/e2e/kryl1253-chrome-cutover.spec.js
// KRYL-1253 — Rectangular-Chrome Cut-Over smoke test.
// Gates: no shaped clip-path on a full-viewport feed iframe; chrome shows as rectangles;
// cone canvas receives pointer events outside the chrome rectangles; no new console errors.

import { test, expect } from '@playwright/test';

const TEST_QUERY = 'job offer negotiation software engineer NYC';

async function iframeFrame(page) {
  await page.waitForSelector('iframe[src*="krylo2-feed"]', { timeout: 15_000 });
  for (let i = 0; i < 20; i++) {
    const f = page.frames().find(fr => fr.url().includes('krylo2-feed'));
    if (f) return f;
    await page.waitForTimeout(500);
  }
  throw new Error('krylo2-feed iframe not found');
}

test('KRYL-1253 — no shaped clip; rectangular chrome; cones interactive', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // Bypass the two dev gates: GuestGate (sessionStorage) + ProfilePicker (localStorage, Founder 'xs')
  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
  });
  await page.goto('/');
  const f = await iframeFrame(page);
  await f.waitForFunction(() => typeof window.submitQuery === 'function', { timeout: 15_000 });
  await page.screenshot({ path: 'test-results/kryl1253-01-hero.png' });

  // engage the surface view: submit a query, then cross the Hero/Surface boundary
  // (krylo-nav mode:'surface' => navMode='surface' + surfaceExpanded=true => restrictToChrome)
  await f.evaluate((q) => window.submitQuery(q), TEST_QUERY);
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'surface' }, '*'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/kryl1253-02-engaged.png', fullPage: false });

  // 1) NO iframe carries a shaped (polygon/path/circle/ellipse) clip-path
  const clips = await page.$$eval('iframe', els => els.map(el => ({
    src: (el.getAttribute('src') || '').slice(0, 40),
    w: el.getBoundingClientRect().width,
    h: el.getBoundingClientRect().height,
    clip: getComputedStyle(el).clipPath,
    pe: getComputedStyle(el).pointerEvents,
  })));
  console.log('IFRAMES:', JSON.stringify(clips, null, 2));
  for (const c of clips) {
    expect(c.clip === 'none' || c.clip === '' || c.clip.startsWith('inset')).toBeTruthy();
    expect(/polygon|path\(|circle|ellipse/.test(c.clip)).toBeFalsy();
  }

  // 2) any pointer-interactive feed iframe must be visually confined to a rectangle
  //    (either a small box, or clipped with a rectangular inset()) — never full-bleed + interactive
  const feed = clips.filter(c => c.src.includes('krylo2-feed'));
  expect(feed.length).toBeGreaterThanOrEqual(1);
  const vpW = page.viewportSize().width, vpH = page.viewportSize().height;
  const rectClipped = (c) => c.clip.startsWith('inset');
  const smallBox   = (c) => c.h < vpH * 0.5 || (c.w > 0 && c.w < vpW * 0.5);
  const confined   = (c) => rectClipped(c) || smallBox(c);
  const fullBlocker = feed.find(c => c.pe === 'auto' && !confined(c) && c.w >= vpW - 2 && c.h >= vpH - 2);
  expect(fullBlocker, 'no full-bleed pointer-capturing feed iframe over the cones').toBeFalsy();
  // the engaged surface view has a confined chrome surface
  expect(feed.some(confined), 'chrome is a confined rectangular surface on the engaged view').toBeTruthy();

  // 3) a point in the cone area (center) is NOT the feed iframe (cones get the event)
  const elAtCenter = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return el ? (el.tagName + '#' + (el.id || '') + '.' + (el.className || '').toString().slice(0, 40)) : 'none';
  });
  console.log('element at viewport center:', elAtCenter);
  expect(elAtCenter.toLowerCase()).not.toContain('iframe');

  // 4) a point in the top chrome strip IS the chrome iframe
  const elAtTop = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, 20);
    return el ? el.tagName : 'none';
  });
  console.log('element at top strip:', elAtTop);
  expect(elAtTop).toBe('IFRAME');

  console.log('CONSOLE ERRORS (' + errors.length + '):', errors.slice(0, 20));
  // known pre-existing noise is tolerated; hard-fail only on React error boundaries / uncaught
  const fatal = errors.filter(e => /PAGEERROR|Minified React error|Rendered fewer hooks|is not a function/.test(e));
  expect(fatal, 'no fatal JS errors').toEqual([]);
});
