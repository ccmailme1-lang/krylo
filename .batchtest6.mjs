import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

// Single-query check — does extractNumbers() silently drop the negative sign
// on "-$15,000" / "-18 months", per the prediction made from reading the regex
// (neither the currency nor duration pattern includes a leading "-").
const QUERY = "Entry horizon: -18 months. Capital: -$15,000. Debt: $45k. Vol: 15%.";

mkdirSync('/tmp/batchtest6', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto('http://localhost:5173/');
await page.waitForSelector('iframe[src*="krylo2-feed"]', { timeout: 15000 });
let frame = null;
for (let i = 0; i < 20; i++) {
  frame = page.frames().find(f => f.url().includes('krylo2-feed'));
  if (frame) break;
  await page.waitForTimeout(300);
}
await frame.waitForFunction(() => typeof window.setMode === 'function', { timeout: 10000 });
await frame.evaluate(() => window.setMode('analysis'));
await page.waitForTimeout(1000);

const textarea = page.locator('textarea[placeholder="build your signal query..."]');
await textarea.waitFor({ timeout: 10000 });
await textarea.click();
await textarea.fill(QUERY);
await page.waitForTimeout(300);
await textarea.press('Control+Enter');
await page.waitForTimeout(2500);

const fullText = await page.locator('body').innerText();
writeFileSync('/tmp/batchtest6/61.txt', `QUERY: ${QUERY}\n\n${fullText}`);

const grab = (label) => {
  const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
  const m = fullText.match(re);
  return m ? m[1].trim() : null;
};

console.log('Domain:', grab('Domain'));
console.log('Confidence:', grab('Confidence'));
console.log('Capital context:', grab('Capital context'));
console.log('D/E:', grab('D/E'));

await browser.close();
