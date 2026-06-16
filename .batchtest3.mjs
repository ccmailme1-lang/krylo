import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

// Diversity batch — testing WO-1761's hypothesis (domain coverage gap) across
// many UNRELATED personas, not just co-living/gig-income. 5 control queries
// (known domains, sanity check the fix didn't regress real routing) + 25 new
// scenarios chosen to span common real-world financial decisions outside the
// existing AUTO/REAL_ESTATE/CAREER/RETIREMENT/HEALTH keyword sets.
const QUERIES = [
  // ── Control — known domains, confirm baseline still routes correctly ──
  { id: 'C1', expect: 'AUTO',        q: "Should I lease or buy a 2026 Honda CR-V? I have $8,000 for a down payment and want to keep payments under $450/mo." },
  { id: 'C2', expect: 'REAL_ESTATE', q: "We're looking at a $420,000 home with 10% down. Is now a good time to buy given current 6.8% mortgage rates?" },
  { id: 'C3', expect: 'CAREER',      q: "I got a job offer at $135,000 base. My current salary is $118,000. Should I negotiate or accept?" },
  { id: 'C4', expect: 'RETIREMENT',  q: "I'm 58 with $640,000 in my 401k. Can I retire at 62?" },
  { id: 'C5', expect: 'HEALTH',      q: "My daughter has Down syndrome and needs an adaptive stroller. Does Medicaid's HCBS waiver cover this in our state?" },

  // ── New, diverse scenarios — testing for coverage gaps ──
  { id: '01', expect: '?', focus: 'Small Business',     q: "I want to open a food truck. Startup costs are $85,000 and I have $20,000 saved. What financing options make sense?" },
  { id: '02', expect: '?', focus: 'Creator Economy',    q: "I make $3,200/mo from YouTube ad revenue plus sponsorships. Should I form an LLC for tax purposes?" },
  { id: '03', expect: '?', focus: 'Divorce Finance',    q: "My spouse and I are divorcing. We have a $310,000 house with $190,000 left on the mortgage. How should we split the equity?" },
  { id: '04', expect: '?', focus: 'Inherited IRA',      q: "My father passed and left me a $250,000 inherited IRA. What are my RMD requirements?" },
  { id: '05', expect: '?', focus: 'Life Insurance',     q: "I'm 34 with two kids. Should I get term or whole life insurance, and how much coverage do I need?" },
  { id: '06', expect: '?', focus: '529 Plan',           q: "I have $40,000 in a 529 plan for my son but he's not going to college. What are my options?" },
  { id: '07', expect: '?', focus: 'Debt Consolidation', q: "I have $32,000 in credit card debt across 5 cards averaging 24% APR. Should I consolidate with a personal loan?" },
  { id: '08', expect: '?', focus: 'Landlord/Rental',    q: "I'm renting out my old condo for $2,200/mo. Mortgage plus HOA is $1,650/mo. Is this cash-flow positive enough to keep long-term?" },
  { id: '09', expect: '?', focus: 'Solar Investment',   q: "Solar installation quote is $28,000 for my house. Payback period is supposedly 9 years. Worth it?" },
  { id: '10', expect: '?', focus: 'Elder Care',         q: "My mother needs assisted living. It costs $6,500/mo and she has $180,000 in savings. How long will that last?" },
  { id: '11', expect: '?', focus: 'RSU Vesting',        q: "I have 2,000 RSUs vesting at $45/share over the next 2 years. How should I think about diversification?" },
  { id: '12', expect: '?', focus: 'Co-Signing',         q: "My son asked me to co-sign a $35,000 auto loan. What's my actual risk exposure?" },
  { id: '13', expect: '?', focus: 'Reverse Mortgage',   q: "I'm 68, own my home outright worth $480,000, and need $2,000/mo extra income. Is a reverse mortgage a good idea?" },
  { id: '14', expect: '?', focus: 'Crowdfunding',       q: "I'm raising $50,000 on Kickstarter for a product launch. What are the tax implications if I hit my goal?" },
  { id: '15', expect: '?', focus: 'Veteran Benefits',   q: "I'm separating from the military after 8 years. How should I use my GI Bill and what happens to my TSP?" },
  { id: '16', expect: '?', focus: 'HSA Optimization',   q: "I have $12,000 in my HSA and never use it for medical expenses. Should I be investing it instead of holding cash?" },
  { id: '17', expect: '?', focus: 'Alimony',            q: "My ex wants $2,800/mo in spousal support. I make $95,000/yr. Is that reasonable?" },
  { id: '18', expect: '?', focus: 'Franchise Purchase', q: "I'm considering a $150,000 franchise investment with $60,000 of that being a financing requirement. How do I evaluate if this is a good deal?" },
  { id: '19', expect: '?', focus: 'Precious Metals',    q: "I want to move $25,000 from my savings into gold as an inflation hedge. Good idea?" },
  { id: '20', expect: '?', focus: 'Timeshare Exit',     q: "I have a timeshare with $4,500/yr in maintenance fees and no resale value. How do I get out of it?" },
  { id: '21', expect: '?', focus: 'Adoption Costs',     q: "We're adopting a child privately and the agency fees are $35,000. What financial assistance exists?" },
  { id: '22', expect: '?', focus: 'Immigration Cost',   q: "I'm sponsoring my spouse's visa. Legal and filing fees are running about $7,500. Any way to reduce this?" },
  { id: '23', expect: '?', focus: 'P2P Lending',        q: "I'm considering putting $10,000 into peer-to-peer lending platforms for 9% returns. How risky is this compared to index funds?" },
  { id: '24', expect: '?', focus: 'Royalty Income',     q: "I get $1,800/mo in royalties from a book I wrote. How should this factor into my retirement planning?" },
  { id: '25', expect: '?', focus: 'Day Trading',        q: "I want to start day trading with $30,000. What account type and risk management approach makes sense?" },
];

mkdirSync('/tmp/batchtest3', { recursive: true });

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
    writeFileSync(`/tmp/batchtest3/${item.id}.txt`, `QUERY: ${item.q}\nFOCUS: ${item.focus || item.expect}\n\n${fullText}`);

    const grab = (label) => {
      const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
      const m = fullText.match(re);
      return m ? m[1].trim() : null;
    };

    const allDollarFigures = [...fullText.matchAll(/\$[\d,]+(?:\.\d+)?/g)].map(m => m[0]);

    results.push({
      id: item.id,
      focus: item.focus || `control:${item.expect}`,
      anchor: grab('Anchor'),
      domain: grab('Domain'),
      confidence: grab('Confidence'),
      capitalContext: grab('Capital context'),
      deRatio: grab('D/E'),
      tier: grab('TIER'),
      fs: (fullText.match(/Fs\s*(\d+)%/i) || [])[1],
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

writeFileSync('/tmp/batchtest3/summary.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('ALL DONE');
console.table(results.map(r => ({
  id: r.id, focus: r.focus, anchor: r.anchor, domain: r.domain,
  conf: r.confidence, capCtx: r.capitalContext, deRatio: r.deRatio,
  tier: r.tier, fs: r.fs,
})));
