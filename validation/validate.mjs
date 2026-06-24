// KRYLO Platform Validation Suite v1.0
// Regression truth set — JSON = ground truth, runner = evaluator only.
// No heuristics. No fallback reasoning. Fail fast on first contract violation per group.
//
// Exit codes:
//   0 — all non-defect cases pass
//   1 — one or more contract violations (non-defect failures)
//
// Defect cases (annotated with "defect" field) encode DESIRED behavior.
// They FAIL until the defect is fixed. Runner marks them DEFECT-OPEN — no exit 1.
// When a defect case PASSES: runner marks DEFECT-RESOLVED — prompt to update JSON.
//
// Usage: node validation/validate.mjs

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { detectDomain } from '../src/engine/querysynthesis.js';

const __dir = dirname(fileURLToPath(import.meta.url));

const FILES = [
  'A_boundary.json',
  'B_semantic_near_miss.json',
  'C_structured_input.json',
  'D_adversarial.json',
  'E_determinism.json',
];

function loadSuite(file) {
  return JSON.parse(readFileSync(join(__dir, file), 'utf8'));
}

function evalCase(c) {
  const { id, input, lens = null, expect: exp, repeat } = c;

  // Consistency check — run N times, assert all results identical
  if (exp.consistent) {
    const n = repeat ?? 10;
    const results = Array.from({ length: n }, () => detectDomain(input, lens).primary);
    const allSame = results.every(r => r === results[0]);
    if (allSame) {
      return { pass: true, got: results[0], label: `consistent(${n}×)=${results[0]}` };
    }
    const unique = [...new Set(results)];
    return { pass: false, got: unique.join('/'), label: `inconsistent: [${unique.join(', ')}]` };
  }

  const result = detectDomain(input, lens);
  const got = result.primary;

  if ('primary' in exp) {
    return { pass: got === exp.primary, got, expected: exp.primary };
  }

  if ('notPrimary' in exp) {
    return { pass: got !== exp.notPrimary, got, expected: `NOT ${exp.notPrimary}` };
  }

  return { pass: false, got: '?', expected: '?', label: 'malformed expect — no primary or notPrimary' };
}

let totalViolations = 0;
let totalDefectsOpen = 0;
let totalDefectsResolved = 0;

for (const file of FILES) {
  const suite = loadSuite(file);
  const { group, description, cases } = suite;

  let groupViolations = 0;
  let groupPass = 0;
  let groupDefectsOpen = 0;
  let groupDefectsResolved = 0;

  console.log(`\n── ${group}: ${description}`);

  for (const c of cases) {
    const { id, input, defect } = c;
    const { pass, got, expected, label } = evalCase(c);
    const shortInput = input.length > 60 ? input.slice(0, 57) + '...' : input;

    if (pass) {
      if (defect) {
        // Known defect now passes — defect was fixed
        groupDefectsResolved++;
        console.log(`  ⚡ DEFECT-RESOLVED  [${id}] "${shortInput}" → ${got}  (${defect} — update JSON)`);
      } else {
        groupPass++;
        const detail = label ?? `→ ${got}`;
        console.log(`  ✓  PASS             [${id}] "${shortInput}"  ${detail}`);
      }
    } else {
      if (defect) {
        // Known defect — expected to fail until fixed
        groupDefectsOpen++;
        const exp = label ?? expected;
        console.log(`  ○  DEFECT-OPEN      [${id}] "${shortInput}" → ${got}  (expected ${exp})  [${defect}]`);
      } else {
        // Contract violation — fail fast within this group
        groupViolations++;
        const exp = label ?? expected;
        console.log(`  ✗  VIOLATION        [${id}] "${shortInput}" → ${got}  (expected ${exp})`);
        console.log(`     ↳ FAIL FAST — stopping group ${group} on first contract violation`);
        break;
      }
    }
  }

  const status = groupViolations > 0 ? 'FAIL' : 'PASS';
  console.log(`  ── ${group} ${status}: ${groupPass} pass, ${groupViolations} violation(s), ${groupDefectsOpen} defect-open, ${groupDefectsResolved} defect-resolved`);

  totalViolations    += groupViolations;
  totalDefectsOpen   += groupDefectsOpen;
  totalDefectsResolved += groupDefectsResolved;
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`PLATFORM VALIDATION SUITE v1.0`);
console.log(`violations: ${totalViolations} | defects-open: ${totalDefectsOpen} | defects-resolved: ${totalDefectsResolved}`);

if (totalViolations > 0) {
  console.log(`STATUS: FAIL — ${totalViolations} contract violation(s)\n`);
  process.exit(1);
} else {
  console.log(`STATUS: PASS — all non-defect cases hold\n`);
  process.exit(0);
}
