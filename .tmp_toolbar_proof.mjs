import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1200 } });

await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);

// The left nav (SURFACE / ANALYSIS / NEWS FEED / ...) lives inside the krylo2-feed.html iframe.
const frame = page.frames().find(f => f.url().includes('krylo2-feed'));
if (!frame) {
  console.log('NO_IFRAME_FOUND');
  console.log(page.frames().map(f => f.url()));
  await browser.close();
  process.exit(1);
}

const surfaceBtn = frame.locator(".lnav-item[onclick=\"setMode('surface')\"]");
await surfaceBtn.waitFor({ state: 'visible', timeout: 10000 });
await surfaceBtn.click();
await page.waitForTimeout(1500);

const toolbarPresent = await page.evaluate(() => {
  // FloatingToolbar renders a fixed div at top:64 containing 7 lens buttons with title attrs
  const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
    const s = d.getAttribute('style') || '';
    return s.includes('top: 64px') || s.includes('top:64px');
  });
  return {
    candidateCount: candidates.length,
    buttonTitles: candidates.flatMap(c => Array.from(c.querySelectorAll('button')).map(b => b.title)),
  };
});
console.log('TOOLBAR_CHECK', JSON.stringify(toolbarPresent));

await page.screenshot({ path: '/Users/concec/Documents/web apps/krylo/specs/proof-floatingtoolbar-surfaceexpanded.png' });
console.log('SCREENSHOT_SAVED');

await browser.close();
