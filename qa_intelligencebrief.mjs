// qa_intelligencebrief.mjs — verifies the 2026-09-20 fix: intelligencebrief.jsx's buildBrief()
// must never fall through to lensadapters.js's fabricated content for a real query, in any of
// its three real states (INSUFFICIENT_INPUT withheld, resolutionEligible:false withheld, genuine
// synthesis present). Real substrate throughout — synthesis objects come from the actual
// synthesizeQuery() run against real query text, not constructed/mocked.
//
// buildBrief() lives in a .jsx file, which plain Node can't import directly — this script
// transpiles it with esbuild (already a devDependency) into a temp bundle at run time, imports
// buildBrief from that, and cleans up after itself. No project files are modified by running this.
//   node qa_intelligencebrief.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as esbuild from 'esbuild';
import { synthesizeQuery } from './src/engine/querysynthesis.js';

const ENTRY = './__qa_ib_entry.mjs';
const BUNDLE = './__qa_ib_bundle.mjs';
fs.writeFileSync(ENTRY, `export { buildBrief } from './src/components/analysis/intelligencebrief.jsx';\n`);
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
  outfile: BUNDLE, external: ['react', 'react-dom'], logLevel: 'silent',
});
const { buildBrief } = await import(`./${BUNDLE}?t=${Date.now()}`);
fs.unlinkSync(ENTRY);
fs.unlinkSync(BUNDLE);

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

const FABRICATED_MARKERS = [
  '1.70', '71%', 'IMMEDIATE', 'Fracture acceleration', 'Cross-domain contagion',
  'Narrative deformation', '48–72h', '48-72h', 'Early-mover',
];

function assertNoFabrication(brief, label) {
  const haystack = JSON.stringify(brief);
  for (const marker of FABRICATED_MARKERS) {
    assert.ok(!haystack.includes(marker), `${label}: found fabricated marker "${marker}" in brief output`);
  }
}

console.log('intelligencebrief.jsx buildBrief() — fabrication-fix verification\n');

// ── 1. The exact real-estate specimen that surfaced the bug ────────────────────────────────
test('REAL_ESTATE / $102M (INSUFFICIENT_INPUT, resolutionEligible:true) — honest withhold, zero fabricated markers', () => {
  const query = '52 year old males from Arizona, looking to buy into the Philadelphia market for investment opportunities in commercial Real estate. My target budget is to spend no more than 102 million dollars.';
  const synthesis = synthesizeQuery({ query, lens: null, domain: undefined, tensor: { domainLock: null } });
  assert.equal(synthesis.mode, 'INSUFFICIENT_INPUT', 'precondition: this specimen must reproduce the real mode');
  assert.equal(synthesis.resolutionEligible, true, 'precondition: this is the tricky true/true case, not the already-handled false case');

  const session = { query, lens: null, tensor: { fields: {} } };
  const brief = buildBrief(session, synthesis);

  assert.equal(brief.insufficient, true);
  assert.ok(/required input/i.test(brief.assessment), `expected an honest missing-input message, got: ${brief.assessment}`);
  assert.deepEqual(brief.threats, []);
  assert.deepEqual(brief.opportunities, []);
  assert.deepEqual(brief.coas, []);
  assertNoFabrication(brief, 'REAL_ESTATE/$102M');
});

// ── 2. GENERAL-domain abstain (the already-fixed KRYL-1080/1089/1091 path) — must stay fixed ──
test('Nanopath / GENERAL abstain (resolutionEligible:false) — honest withhold, zero fabricated markers, regression-safe', () => {
  const query = "Is this a good investment for me at 50 years old? Healthtech | Series B. Nanopath turns a multi-day lab test into a 10-minute result.";
  const synthesis = synthesizeQuery({ query, lens: null, domain: undefined, tensor: { domainLock: null } });

  const session = { query, lens: null, tensor: { fields: {} } };
  const brief = buildBrief(session, synthesis);

  // Whichever honest branch it lands in (resolutionEligible:false, or a canonical withhold),
  // it must never reach the lensadapters.js fallback.
  assertNoFabrication(brief, 'Nanopath/GENERAL');
});

// ── 3. A domain with a genuine dedicated synthesizer — real content must NOT be suppressed ───
test('AUTO domain with a real price → genuine synthesis.assessment flows through unchanged', () => {
  const query = 'Should I buy a $28,000 Honda Civic with $3,000 down?';
  const synthesis = synthesizeQuery({ query, lens: null, domain: undefined, tensor: { domainLock: null } });
  assert.ok(synthesis?.assessment, 'precondition: AUTO must produce a real assessment for this qa to be meaningful');
  assert.notEqual(synthesis.resolutionEligible, false);
  assert.notEqual(synthesis.mode, 'INSUFFICIENT_INPUT');

  const session = { query, lens: null, tensor: { fields: {} } };
  const brief = buildBrief(session, synthesis);

  // The REAL synthesized assessment must pass through verbatim -- not replaced by the honest
  // empty-state default, and not by lensadapters.js.
  assert.equal(brief.assessment, synthesis.assessment);
  assertNoFabrication(brief, 'AUTO real synthesis');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
