import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

const QUERIES = [
  { id: '01', focus: 'Baseline Stress',        q: "Stress-test an 18mo co-living entry vs. my 15% freelance rev-vol. Factor in $45k student debt DTI. Output a P4 matrix." },
  { id: '02', focus: 'Opportunity Cost',        q: "Calculate the opportunity cost of delaying a co-living stake for 18mo while servicing 5.5% student debt. Assume 15% rev-vol." },
  { id: '03', focus: 'Liquidity/Risk',          q: "Model liquidity sufficiency for a co-living stake given 15% YoY rev-vol and 18mo timeline. Flag lender-DTI rejection triggers." },
  { id: '04', focus: 'Signal/Demand',           q: "Run signal correlation: Adaptive Co-living demand vs. my 15% freelance rev-vol. Identify private-lender DTI limits for 18mo entry." },
  { id: '05', focus: 'Capital ROI',             q: "Compare co-living equity entry vs. student debt acceleration over 18mo. Factor in 15% rev-vol. Which yields higher capital ROI?" },
  { id: '06', focus: 'Stress/Turbulence',       q: "Simulate an 18mo co-living entry strategy under 'Turbulent State Engine' settings (15% rev-vol). What is the confidence interval?" },
  { id: '07', focus: 'Cash-Flow/Liquidity',     q: "Determine if current freelance liquidity ($X) supports an 18mo co-living entry despite 15% rev-vol and high student debt DTI." },
  { id: '08', focus: 'Sentiment/Market',        q: "Analyze 18mo adaptive co-living entry signal. Correlate with 15% freelance revenue variance and lender-tightening sentiment." },
  { id: '09', focus: 'Lender Eligibility',      q: "Project lender DTI eligibility for a co-living equity stake in 18mo. Stress-test against 15% YoY freelance revenue regression." },
  { id: '10', focus: 'Asset Allocation',        q: "Assess opportunity cost of capital: Co-living stake (18mo) vs. clearing student debt. Factor in 15% revenue volatility." },
  { id: '11', focus: 'Accessibility/Demand',    q: "Evaluate co-living market demand vs. student debt servicing. Determine if 15% rev-vol makes private-lender terms inaccessible." },
  { id: '12', focus: 'Action/Matrix',           q: "Generate a P4 Action Matrix for an 18mo co-living entry. Constraints: 15% freelance rev-vol, $45k debt, market-demand signals." },
  { id: '13', focus: 'Confidence/Growth',       q: "Calculate the 18mo confidence interval for equity entry. Scenario: 15% rev-vol, debt-servicing prioritized, co-living demand growth." },
  { id: '14', focus: 'Blockers/Risk',           q: "Stress-test freelance revenue volatility (+15%) against co-living equity entry requirements. Is debt-servicing a blocker for lenders?" },
  { id: '15', focus: 'Sensitivity',             q: "Perform a sensitivity analysis: How does 15% freelance rev-vol change the lender-eligibility window for an 18mo co-living stake?" },
  { id: '16', focus: 'Forecast/Liquidity',      q: "Run signal analysis: Co-living demand demand-curve vs. freelance income variance (15%). Forecast 18mo liquidity for private lenders." },
  { id: '17', focus: 'DTI-Impact',              q: "Model the impact of debt-to-income (DTI) on co-living equity entry given 15% freelance rev-vol over an 18mo horizon." },
  { id: '18', focus: 'Preservation',            q: "What is the capital-preservation vs. equity-entry signal for co-living in 18mo? Factor in 15% freelance revenue churn." },
  { id: '19', focus: 'Bypass/Strategy',         q: "Cross-reference 18mo co-living entry feasibility with freelance income variance (+15%). Can I bypass private-lender DTI restrictions?" },
  { id: '20', focus: 'Accessibility/Demand',    q: "Assess the equity-stake viability for co-living within 18mo. Factor in freelance revenue churn (+15%) and debt-servicing overhead." },
];

mkdirSync('/tmp/batchtest', { recursive: true });

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
    writeFileSync(`/tmp/batchtest/${item.id}.txt`, `QUERY: ${item.q}\nFOCUS: ${item.focus}\n\n${fullText}`);

    const grab = (label) => {
      const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
      const m = fullText.match(re);
      return m ? m[1].trim() : null;
    };

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
    });
    console.log(`[${item.id}] done`);
  } catch (err) {
    results.push({ id: item.id, focus: item.focus, error: String(err.message || err) });
    console.log(`[${item.id}] ERROR: ${err.message || err}`);
  } finally {
    await page.close();
  }
}

writeFileSync('/tmp/batchtest/summary.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('ALL DONE');
console.table(results.map(r => ({
  id: r.id, focus: r.focus, anchor: r.anchor, domain: r.domain,
  conf: r.confidence, capCtx: r.capitalContext, deRatio: r.deRatio,
  tier: r.tier, score: r.score, fs: r.fs,
})));
