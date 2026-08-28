// qa_extractnumbers.mjs — numeric normalization at the shared extractNumbers boundary.
// Bug: "$2.5 million" was read as 2.5, not 2,500,000 — every downstream consumer
// (CAPITAL metric, leverage, capital-floor prompts) got the wrong magnitude.
// Fix: recognise spelled/spaced scale words (million/billion/thousand, "M"/"K", "bn"/"tn").
// Run: node qa_extractnumbers.mjs

import { extractNumbers } from './src/engine/querysynthesis.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else    { fail++; console.log(`  ✗ ${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
};

// ── Required behaviour (Founder spec) ─────────────────────────────────────────
eq('$2.5 million → 2500000',   extractNumbers('budget is $2.5 million'),        [2_500_000]);
eq('$2.5M → 2500000',          extractNumbers('budget is $2.5M'),               [2_500_000]);
eq('$2 million → 2000000',     extractNumbers('a $2 million line'),             [2_000_000]);
eq('$750k → 750000',           extractNumbers('need $750k'),                    [750_000]);
eq('$750 K → 750000',          extractNumbers('need $750 K'),                   [750_000]);
eq('$1.2 billion → 1200000000', extractNumbers('a $1.2 billion fund'),          [1_200_000_000]);

// ── Plain numbers unchanged ──────────────────────────────────────────────────
eq('plain integer',           extractNumbers('offer of $850000'),              [850_000]);
eq('comma-grouped',           extractNumbers('offer of $2,500,000'),           [2_500_000]);
eq('bare decimal',            extractNumbers('a 3.5 multiple'),                [3.5]);

// ── Multiple monetary values in one query ────────────────────────────────────
eq('two values, mixed forms', extractNumbers('$2.5 million now, $500k reserve'), [2_500_000, 500_000]);
eq('three values',            extractNumbers('$1 billion AUM, $50M ticket, $250,000 fee'),
   [1_000_000_000, 50_000_000, 250_000]);

// ── Existing callers' numeric shape preserved (regressions guarded elsewhere) ─
eq('strips "18 months" (not $18M)', extractNumbers('close within 18 months for $4M'), [4_000_000]);
eq('strips "81 year old"',     extractNumbers('an 81 year old with $600k saved'),  [600_000]);
eq('strips percentage',        extractNumbers('a 7.5% coupon on $10M notes'),      [10_000_000]);
eq('ignores "P4" label',       extractNumbers('deliverable P4, budget $2M'),       [2_000_000]);

// ── Scale words must NOT be minted from ordinary words ────────────────────────
eq('"5 blue cars" not 5e9',    extractNumbers('5 blue cars'),                    [5]);
eq('"2 million people" IS 2e6 (heuristic, acceptable)', extractNumbers('2 million people'), [2_000_000]);
eq('no false "b" from "5 buildings"', extractNumbers('5 buildings'),             [5]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
