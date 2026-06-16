import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

// Stress-test BUG-001C across more month-duration values (6/9/12/15/18/24/30/36mo)
// in varying positions relative to dollar amounts, plus continued confirmation of
// the WO-1757/WO-1761/WO-1762 findings (domain label, hardcoded confidence).
const QUERIES = [
  { id: '01', q: "Execute P4 matrix for 12mo co-living entry with $25k capital. Revenue vol: 15%." },
  { id: '02', q: "Calculate DTI impact of $45k debt on 24mo co-living stake. Vol: 10% YoY." },
  { id: '03', q: "Model 6mo liquidity stress test: $10k stake vs $50k student loan. Rev-vol: 20%." },
  { id: '04', q: "Run signal correlation: 18mo entry horizon. $15k stake, 15% rev-vol, 0% growth scenario." },
  { id: '05', q: "Validate private-lender DTI for 36mo co-living equity stake with $20k budget." },
  { id: '06', q: "Stress-test 12mo horizon equity entry. Input: $5k stake, 15% volatility." },
  { id: '07', q: "Compare 9mo debt payoff vs $30k co-living entry. Scenario: 15% revenue churn." },
  { id: '08', q: "Analyze 24mo adaptive co-living signal. Factor: $15k stake, 15% revenue vol." },
  { id: '09', q: "Project lender eligibility: 18mo timeline, $45k debt, $15k equity stake." },
  { id: '10', q: "Force P4 action matrix for 12mo horizon with 15% revenue flux." },
  { id: '11', q: "Evaluate 30mo co-living viability. Input: $25k down-payment, 15% vol." },
  { id: '12', q: "Model 24mo opportunity cost: $20k co-living stake vs $45k debt servicing." },
  { id: '13', q: "Run signal analysis on 18mo co-living demand. Factor in 15% revenue vol." },
  { id: '14', q: "Stress-test 15mo entry horizon. Input: $12k stake, 15% rev-vol, $45k debt." },
  { id: '15', q: "Calculate 18mo confidence interval for $15k co-living entry. Revenue: 15% vol." },
  { id: '16', q: "Compare $50k debt reduction vs 24mo co-living stake. Volatility: 15%." },
  { id: '17', q: "Assess 18mo lender appetite for $15k equity stake given 15% rev-vol." },
  { id: '18', q: "Validate 12mo liquidity for $20k stake under 15% revenue churn." },
  { id: '19', q: "Cross-reference 18mo co-living signals with 15% revenue variance ($45k debt)." },
  { id: '20', q: "Final P4 check: 36mo co-living equity, $15k stake, $45k debt, 15% rev-vol." },
];

mkdirSync('/tmp/batchtest5', { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const item of QUERIES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
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
    await textarea.fill(item.q);
    await page.waitForTimeout(300);
    await textarea.press('Control+Enter');
    await page.waitForTimeout(2500);

    const fullText = await page.locator('body').innerText();
    writeFileSync(`/tmp/batchtest5/${item.id}.txt`, `QUERY: ${item.q}\n\n${fullText}`);

    const grab = (label) => {
      const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
      const m = fullText.match(re);
      return m ? m[1].trim() : null;
    };

    const allDollarFigures = [...fullText.matchAll(/\$[\d,]+(?:\.\d+)?/g)].map(m => m[0]);

    results.push({
      id: item.id,
      anchor: grab('Anchor'),
      domain: grab('Domain'),
      confidence: grab('Confidence'),
      capitalContext: grab('Capital context'),
      deRatio: grab('D/E'),
      dollarFigures: allDollarFigures,
    });
    console.log(`[${item.id}] done`);
  } catch (err) {
    results.push({ id: item.id, error: String(err.message || err) });
    console.log(`[${item.id}] ERROR: ${err.message || err}`);
  } finally {
    await page.close();
  }
}

writeFileSync('/tmp/batchtest5/summary.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('ALL DONE');
console.table(results.map(r => ({
  id: r.id, anchor: r.anchor, domain: r.domain, conf: r.confidence,
  capCtx: r.capitalContext, deRatio: r.deRatio,
})));
console.log('--- DOLLAR FIGURES PER QUERY ---');
for (const r of results) console.log(r.id, r.dollarFigures);
