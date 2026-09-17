// tests/e2e/ac07-formation-placement.spec.js
// AC-07 verification — Formation section renders in the HAPPY PATH BRIEF panel between
// 01 BLUF and 02 BODY & KEY FINDINGS. specs/SPEC-analysis-result-formation-deep-dive-0.3.md

import { test, expect } from '@playwright/test';

test('AC-07 — Formation section sits between BLUF and Body & Key Findings', async ({ page }) => {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('krylo_auth_v1', '1'); } catch {}
    try { localStorage.setItem('krylo_active_tester_v1', 'xs'); } catch {}
  });
  await page.goto('/');
  await page.waitForSelector('iframe[src*="krylo2-feed"]', { timeout: 15_000 });
  await page.evaluate(() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*'));
  await page.waitForTimeout(1500);

  // AnalysisIdleField has its own real search box, separate from the iframe's submitQuery
  const box = page.getByPlaceholder("Describe what you're trying to accomplish...");
  await box.waitFor({ timeout: 10_000 });
  await box.fill('Deep Tech Fund thesis review');
  await box.press('Meta+Enter'); // handleExecute fires on Cmd/Ctrl+Enter, not plain Enter
  await page.waitForTimeout(6000);

  const order = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')];
    const marks = [];
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (t === '01 · BLUF · Introduction' || t === 'Formation' || t === '02 · Body & Key Findings') {
        // only leaf-ish stamps (short exact text), skip large containers
        if (el.children.length === 0 || t.length < 30) marks.push(t);
      }
    }
    return marks;
  });
  console.log('SECTION ORDER FOUND:', JSON.stringify(order));

  const bluf = order.indexOf('01 · BLUF · Introduction');
  const formation = order.indexOf('Formation');
  const body = order.indexOf('02 · Body & Key Findings');
  console.log('indices — BLUF:', bluf, 'Formation:', formation, 'Body:', body);

  expect(bluf, 'BLUF section found').toBeGreaterThanOrEqual(0);
  expect(formation, 'Formation section found').toBeGreaterThanOrEqual(0);
  expect(body, 'Body & Key Findings section found').toBeGreaterThanOrEqual(0);
  expect(formation > bluf && formation < body, 'AC-07: Formation sits between BLUF and Body').toBeTruthy();

  const svgCheck = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')].filter(s => {
      const box = s.getBoundingClientRect();
      return box.width > 100 && box.height > 50; // exclude tiny icon svgs
    });
    return svgs.map(s => {
      const r = s.getBoundingClientRect();
      return { width: r.width, height: r.height, top: r.top, left: r.left, circleCount: s.querySelectorAll('circle').length, lineCount: s.querySelectorAll('line').length };
    });
  });
  console.log('SVG CHECK:', JSON.stringify(svgCheck, null, 2));

  const visDiag = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')].filter(s => {
      const b = s.getBoundingClientRect();
      return b.width > 150 && b.width < 250 && b.height < 150;
    });
    if (svgs.length === 0) return { found: false };
    const svg = svgs[svgs.length - 1];
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    // walk ancestors, report any with overflow hidden/clip and their own rect
    const clippers = [];
    let node = svg.parentElement;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.overflow === 'clip') {
        const nr = node.getBoundingClientRect();
        clippers.push({ tag: node.tagName, cls: node.className?.toString().slice(0, 40), rect: { top: nr.top, bottom: nr.bottom, left: nr.left, right: nr.right } });
      }
      node = node.parentElement;
    }
    return {
      found: true,
      svgRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      elementAtCenter: topEl ? topEl.tagName + '.' + (topEl.className?.toString().slice(0, 40) || '') : 'none',
      isSvgOrChildAtCenter: topEl ? (topEl === svg || svg.contains(topEl)) : false,
      clippingAncestors: clippers,
      viewportHeight: window.innerHeight,
    };
  });
  console.log('VISIBILITY DIAGNOSTIC:', JSON.stringify(visDiag, null, 2));

  await page.screenshot({ path: 'test-results/AC07-formation-placement.png', fullPage: true });
});
