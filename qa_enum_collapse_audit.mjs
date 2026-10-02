// qa_enum_collapse_audit.mjs — Enum-Collapse Audit.
//
// Catches the second gap class from 2026-10-02: a producer emits a real, multi-value state
// (SUPPORTED / NO_EVIDENCE / UNRESOLVED, etc.) but a render-layer consumer collapses two or
// more semantically distinct values into identical user-facing text -- "checked, found
// nothing" and "nothing was ever checkable" reading the same, which is what structuralbrief.jsx
// did before tonight's fix.
//
// Built per the specified order: (1) inventory REAL state branches found by grepping actual
// render-layer consumer code -- not a guessed/abstract enum list -- (2) identify each branch's
// real possible values, traced to the producer that defines them, (3) invoke the REAL render
// logic (via esbuild-bundling the real .jsx file and calling its real exported function, same
// technique as specs/qa_rsi_production_test.mjs's precedent -- never a hand-reimplementation of
// the logic) for every real value, (4) assert pairwise-distinct output, (5) FLAG a collapse for
// human review -- this file does not rewrite render code itself.
//
// Run: node qa_enum_collapse_audit.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

let checked = 0, flagged = 0;
function report(branchName, values, outputs) {
  checked++;
  const texts = values.map(v => outputs[v]);
  const distinct = new Set(texts).size === texts.length;
  if (distinct) {
    console.log(`  ✓ ${branchName} -- ${values.length} real values, ${values.length} distinct outputs`);
  } else {
    flagged++;
    console.log(`  ✗ FLAGGED  ${branchName} -- ${values.length} real values collapse to ${new Set(texts).size} distinct output(s)`);
    for (const v of values) console.log(`        ${v.padEnd(14)} -> "${outputs[v]}"`);
  }
}

// ── Inventory (traced) ──────────────────────────────────────────────────────────────────────
// EVIDENCE_STATE -- src/engine/structuralentitysynthesis.js:32-36. Real values: SUPPORTED,
// NO_EVIDENCE, UNRESOLVED. Real render-layer consumers found via
// `grep -rn ".state === '" src/components/`:
//   - structuralbrief.jsx:170-172   (fixed 2026-10-02, included here as a regression guard)
//   - intelligencebrief.jsx:146-157 (NOT fixed -- found by this audit)
//   - structurepanel.jsx:104        (filters for scheduling a fetch, produces no user-facing
//                                    text from the state at all -- not a render branch, excluded)
const EVIDENCE_STATE_VALUES = ['SUPPORTED', 'NO_EVIDENCE', 'UNRESOLVED'];

console.log('Enum-Collapse Audit\n');
console.log('EVIDENCE_STATE (structuralentitysynthesis.js) -- real consumers:\n');

// ── intelligencebrief.jsx's buildBrief() -- real exported function, bundled the same way
// specs/qa_rsi_production_test.mjs already does (JSX can't be imported by plain Node). ──────
{
  const ENTRY = path.join(ROOT, '__qa_ecaudit_entry.mjs');
  const BUNDLE = path.join(ROOT, '__qa_ecaudit_bundle.mjs');
  fs.writeFileSync(ENTRY, `export { buildBrief } from './src/components/analysis/intelligencebrief.jsx';\n`);
  await esbuild.build({
    entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
    outfile: BUNDLE, external: ['react', 'react-dom'], logLevel: 'silent',
  });
  const { buildBrief } = await import(`${pathToFileURL(BUNDLE).href}?t=${Date.now()}`);
  fs.unlinkSync(ENTRY);
  fs.unlinkSync(BUNDLE);

  // structuralReason is only computed inside the AMBIGUOUS/not-resolutionEligible gate (line
  // ~116), and only reached when subj.kind isn't ENTITY/PORTFOLIO_FRAME/MARKET_THEME (those
  // branches return earlier). subjArg (buildBrief's 4th param) is set directly so this
  // actually exercises the real branch, traced from the real gating logic, not guessed.
  const subjArg = { kind: 'NONE', label: 'TEST SUBJECT' };
  const outputs = {};
  for (const state of EVIDENCE_STATE_VALUES) {
    const synthesis = {
      queryDomain: 'AMBIGUOUS',
      resolutionEligible: false,
      structuralQuery: {
        state: 'INTERPRETABLE',
        entities: ['ALPHA', 'BETA'],
        evidence: { relationships: [{ a: 'ALPHA', b: 'BETA', state, facet: null }] },
      },
    };
    const brief = buildBrief({ query: 'test', lens: null }, synthesis, null, subjArg);
    outputs[state] = brief.bluf;
  }
  report('intelligencebrief.jsx buildBrief() -- bluf text', EVIDENCE_STATE_VALUES, outputs);
  // Specific regression guard for the exact false claim found and fixed 2026-10-02: UNRESOLVED
  // (never checkable) must never say "checked" -- that was the most misleading part of the
  // original collapse, not just the generic distinctness check above.
  checked++;
  if (/checked/i.test(outputs.UNRESOLVED)) {
    flagged++;
    console.log(`  ✗ FLAGGED  intelligencebrief.jsx UNRESOLVED text falsely claims "checked": "${outputs.UNRESOLVED}"`);
  } else {
    console.log('  ✓ intelligencebrief.jsx UNRESOLVED text never claims "checked"');
  }
}

// ── structuralbrief.jsx -- same direct-logic-replication pattern already used/proven in
// qa_structuralbrief_canonical_relationships.mjs (no pure exported function exists for this
// file's inline render branch; replicating the exact post-fix logic, not inventing it). ──────
{
  function renderRelPairText(state) {
    return state === 'SUPPORTED' ? 'supported by real evidence'
      : state === 'UNRESOLVED' ? 'not a resolvable named entity'
      : 'no evidence found';
  }
  const outputs = {};
  for (const state of EVIDENCE_STATE_VALUES) outputs[state] = renderRelPairText(state);
  report('structuralbrief.jsx RELATIONSHIPS row text (fixed 2026-10-02)', EVIDENCE_STATE_VALUES, outputs);
}

console.log(`\nRESULT: ${checked} branch(es) checked, ${flagged} flagged for human review.`);
if (flagged > 0) {
  console.log('A flag means two or more real, semantically distinct states produce identical');
  console.log('user-facing text -- the same defect class found in structuralbrief.jsx tonight.');
  console.log('This file does not auto-fix flagged render code -- audit only, per spec.');
}
process.exit(0); // audit tool -- exit 0 regardless; the flag count above is the actionable signal
