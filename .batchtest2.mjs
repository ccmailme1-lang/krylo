import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

const QUERIES = [
  { id: '01', focus: 'Financial Constraint', q: "Evaluate 18mo co-living equity entry. Revenue: 15% YoY variance. Debt: $45k student loan. Can I secure private lender terms?" },
  { id: '02', focus: 'ROI/Debt Split',       q: "Compare co-living equity entry ROI vs. debt payoff speed over an 18mo horizon. Input: 15% freelance rev-vol." },
  { id: '03', focus: 'Liquidity/DTI',        q: "Model liquidity for 18mo co-living investment. Factor in 15% revenue volatility and $45k debt. Identify DTI bottlenecks." },
  { id: '04', focus: 'Signal Correlation',   q: "Run signal correlation: Adaptive co-living demand vs. 15% freelance rev-vol. Calculate 18mo entry feasibility." },
  { id: '05', focus: 'Capital Stress',       q: "Stress-test a $15k co-living stake entry. Constraints: 18mo window, 15% revenue churn, $45k debt DTI limit." },
  { id: '06', focus: 'Lender Criteria',      q: "Analyze 18mo adaptive co-living viability. Input: 15% revenue variance. Does student debt ($45k) breach lender criteria?" },
  { id: '07', focus: 'Timeline/Equity',      q: "Is 18mo timeline enough to enter co-living equity? Input: 15% YoY freelance revenue vol, $45k debt, high liquidity targets." },
  { id: '08', focus: 'Forecast/Threshold',   q: "Forecast 18mo co-living entry success. Inputs: 15% freelance churn, $45k debt, prime-lender DTI thresholds." },
  { id: '09', focus: 'Volatility/Lender',    q: "How does 15% freelance revenue volatility affect private-lender eligibility for a co-living stake over 18mo?" },
  { id: '10', focus: 'Cost Benefit',         q: "Evaluate opportunity cost: 18mo co-living stake vs. aggressive $45k debt reduction. Input: 15% rev-vol." },
  { id: '11', focus: 'Bypass Strategy',      q: "Can I bypass restrictive private lender DTI rules for a co-living stake in 18mo? Input: 15% revenue variance, $45k debt." },
  { id: '12', focus: 'Matrix Execution',     q: "Generate P4 action matrix for 18mo co-living stake. Constraint: 15% freelance rev-vol, $45k debt, prime-lender DTI caps." },
  { id: '13', focus: 'Confidence Interval',  q: "Calculate confidence interval for 18mo co-living equity entry. Factor in 15% revenue volatility and $45k student debt." },
  { id: '14', focus: 'Risk Sensitivity',     q: "Stress-test 18mo co-living entry against 15% freelance revenue dip. Does current DTI support equity stakes?" },
  { id: '15', focus: 'Capital Threshold',    q: "Determine 18mo entry threshold for co-living equity. Input: $15k capital, 15% freelance revenue volatility, $45k debt." },
  { id: '16', focus: 'Asset vs Liability',   q: "Model co-living equity stake vs. $45k debt servicing over 18mo. Constraint: 15% YoY freelance revenue volatility." },
  { id: '17', focus: 'Lender Appetite',      q: "Assess private lender appetite for gig-income (15% vol) vs. co-living equity entry in 18mo. Factor in $45k debt." },
  { id: '18', focus: 'Sensitivity Test',     q: "Run sensitivity analysis: 18mo co-living entry feasibility with $15k down-payment, 15% rev-vol, and $45k student debt." },
  { id: '19', focus: 'Risk-Adjusted',        q: "Cross-reference 18mo co-living growth signals with $45k debt servicing. How does 15% revenue churn alter risk?" },
  { id: '20', focus: 'Viability/Go-NoGo',    q: "Final viability check: 18mo co-living equity entry, $15k stake, $45k debt, 15% freelance revenue volatility. Clear to proceed?" },
];

mkdirSync('/tmp/batchtest2', { recursive: true });

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
    writeFileSync(`/tmp/batchtest2/${item.id}.txt`, `QUERY: ${item.q}\nFOCUS: ${item.focus}\n\n${fullText}`);

    const grab = (label) => {
      const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
      const m = fullText.match(re);
      return m ? m[1].trim() : null;
    };

    // Scan every dollar figure anywhere on the page, not just labeled fields —
    // catches inflation that surfaces outside the known label set.
    const allDollarFigures = [...fullText.matchAll(/\$[\d,]+(?:\.\d+)?/g)].map(m => m[0]);

    results.push({
      id: item.id,
      focus: item.focus,
      anchor: grab('Anchor'),
      domain: grab('Domain'),
      confidence: grab('Confidence'),
      capitalContext: grab('Capital context'),
      deRatio: grab('D/E'),
      tier: grab('TIER'),
      score: grab('SCORE'),
      fs: (fullText.match(/Fs\s*(\d+)%/i) || [])[1],
      leadAction: grab('LEAD ACTION'),
      dollarFigures: allDollarFigures,
    });
    console.log(`[${item.id}] done`);
  } catch (err) {
    results.push({ id: item.id, focus: item.focus, error: String(err.message || err) });
    console.log(`[${item.id}] ERROR: ${err.message || err}`);
  } finally {
    await page.close();
  }
}

writeFileSync('/tmp/batchtest2/summary.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('ALL DONE');
console.table(results.map(r => ({
  id: r.id, focus: r.focus, anchor: r.anchor, domain: r.domain,
  conf: r.confidence, capCtx: r.capitalContext, deRatio: r.deRatio,
  tier: r.tier, score: r.score, fs: r.fs,
})));
console.log('--- DOLLAR FIGURES PER QUERY ---');
for (const r of results) {
  console.log(r.id, r.dollarFigures);
}
