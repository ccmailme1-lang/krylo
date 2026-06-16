import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

// Minimal-pair batch — for each known synthesizer, a CONTROL query (numbers in
// the order the code expects) and a PERTURBED query stating the exact same
// facts with the two numbers reordered. Isolates the positional numbers[0]/
// numbers[1] binding as the sole variable. Built from reading the actual
// extraction logic in querysynthesis.js (synthAuto/synthRealEstate/
// synthCareer/synthRetirement/synthExpenseReduction), not guessed.
const QUERIES = [
  { id: 'AUTO-control',   pair: 'AUTO',              variant: 'control',
    q: "I'm buying a car for $32,000 with $5,000 down." },
  { id: 'AUTO-perturbed',  pair: 'AUTO',              variant: 'perturbed',
    q: "I have $5,000 for a down payment on a $32,000 car." },

  { id: 'RE-control',     pair: 'REAL_ESTATE',       variant: 'control',
    q: "We're buying a $450,000 house with $45,000 down." },
  { id: 'RE-perturbed',    pair: 'REAL_ESTATE',       variant: 'perturbed',
    q: "We have $45,000 saved for a down payment on a $450,000 house." },

  { id: 'CAREER-control',  pair: 'CAREER',            variant: 'control',
    q: "I got offered $95,000 for a new role. My current salary is $70,000." },
  { id: 'CAREER-perturbed', pair: 'CAREER',           variant: 'perturbed',
    q: "My current salary is $70,000. I got offered $95,000 for a new role." },

  { id: 'RET-control',     pair: 'RETIREMENT',        variant: 'control',
    q: "I have $500,000 saved, I'm 60 years old, and I want $80,000 per year in retirement." },
  { id: 'RET-perturbed',   pair: 'RETIREMENT',         variant: 'perturbed',
    q: "I'm 60 years old with $500,000 saved, and I want $80,000 per year in retirement." },

  { id: 'EXP-control',     pair: 'EXPENSE_REDUCTION',  variant: 'control',
    q: "I'm retired, living on a fixed income. I have $45,000 saved and spend $3,000 a month. How can I reduce my expenses?" },
  { id: 'EXP-perturbed',   pair: 'EXPENSE_REDUCTION',   variant: 'perturbed',
    q: "I'm retired, living on a fixed income. I spend $3,000 a month and have $45,000 saved. How can I reduce my expenses?" },
];

mkdirSync('/tmp/batchtest4', { recursive: true });

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
    writeFileSync(`/tmp/batchtest4/${item.id}.txt`, `QUERY: ${item.q}\nPAIR: ${item.pair} (${item.variant})\n\n${fullText}`);

    const grab = (label) => {
      const re = new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i');
      const m = fullText.match(re);
      return m ? m[1].trim() : null;
    };
    const grabLine = (re) => {
      const m = fullText.match(re);
      return m ? m[0].trim() : null;
    };

    results.push({
      id: item.id,
      pair: item.pair,
      variant: item.variant,
      confidence: grab('Confidence'),
      deRatio: grab('D/E'),
      capitalContext: grab('Capital context'),
      what: grabLine(/WHAT\s+[^\n]+/i),
      bluf: grabLine(/BLUF\s*\n?\s*[^\n]+/i) || grabLine(/[A-Z][a-z][^\n]{0,30}(?:purchase|loan|saved|spend|savings|gap)[^\n]{0,200}/i),
    });
    console.log(`[${item.id}] done`);
  } catch (err) {
    results.push({ id: item.id, pair: item.pair, variant: item.variant, error: String(err.message || err) });
    console.log(`[${item.id}] ERROR: ${err.message || err}`);
  } finally {
    await page.close();
  }
}

writeFileSync('/tmp/batchtest4/summary.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('ALL DONE');
console.table(results.map(r => ({
  id: r.id, pair: r.pair, variant: r.variant,
  conf: r.confidence, deRatio: r.deRatio, capCtx: r.capitalContext,
})));
console.log('--- WHAT / BLUF LINES ---');
for (const r of results) {
  console.log(`\n[${r.id}]`);
  console.log('WHAT:', r.what);
  console.log('BLUF:', r.bluf);
}
