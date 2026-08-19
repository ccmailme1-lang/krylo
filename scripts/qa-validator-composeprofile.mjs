#!/usr/bin/env node
// QA — composeProfile() against the six-stage rule, SPEC-relationship-validator-validation-
// profile.md §1. Runs standalone, no test framework — matches this repo's existing QA harness
// pattern (see check-domain-ontology.mjs). Covers the behavioral tests from
// SPEC-relationship-validator-adapter-orchestration-design.md §6 that don't require a real
// operator: FAIL-from-CONFLICT, N/A-as-support, UNDETERMINED-as-support, Class-B-override.

import { composeProfile } from '../src/engine/validator/orchestrator.js';

const op = (operator, state) => ({ operator, state });

const CASES = [
  {
    name: 'All Class A PASS, no conflict → SUPPORTED',
    results: [op('TEMPORAL', 'PASS'), op('STRUCTURAL', 'PASS'), op('INDEPENDENCE', 'PASS'), op('STABILITY', 'PASS'), op('ALTERNATIVES', 'PASS')],
    expect: 'SUPPORTED',
  },
  {
    name: 'All Class A PASS, Alternatives CONFLICT → SUPPORTED_WITH_COMPETING_EXPLANATION (CONFLICT != FAIL)',
    results: [op('TEMPORAL', 'PASS'), op('STRUCTURAL', 'PASS'), op('INDEPENDENCE', 'PASS'), op('STABILITY', 'PASS'), op('ALTERNATIVES', 'CONFLICT')],
    expect: 'SUPPORTED_WITH_COMPETING_EXPLANATION',
  },
  {
    name: 'Any Class A FAIL, dominant even with CONFLICT present → CONTRADICTED',
    results: [op('TEMPORAL', 'FAIL'), op('STRUCTURAL', 'PASS'), op('INDEPENDENCE', 'PASS'), op('STABILITY', 'PASS'), op('ALTERNATIVES', 'CONFLICT')],
    expect: 'CONTRADICTED',
  },
  {
    name: 'All Class A N/A (nothing evaluable) → UNDETERMINED, never SUPPORTED',
    results: [op('TEMPORAL', 'N/A'), op('STRUCTURAL', 'N/A'), op('INDEPENDENCE', 'N/A'), op('STABILITY', 'N/A')],
    expect: 'UNDETERMINED',
  },
  {
    name: 'Class A UNDETERMINED present, Class B all PASS → UNDETERMINED (Class B cannot override)',
    results: [op('TEMPORAL', 'UNDETERMINED'), op('STRUCTURAL', 'PASS'), op('INDEPENDENCE', 'PASS'), op('STABILITY', 'PASS'), op('LAG', 'PASS'), op('RECURRENCE', 'PASS'), op('INFORMATION', 'PASS')],
    expect: 'UNDETERMINED',
  },
  {
    name: 'Class A all FAIL, Class B all PASS → CONTRADICTED (Class B cannot override contradiction)',
    results: [op('TEMPORAL', 'FAIL'), op('STRUCTURAL', 'FAIL'), op('INDEPENDENCE', 'FAIL'), op('STABILITY', 'FAIL'), op('LAG', 'PASS'), op('RECURRENCE', 'PASS'), op('INFORMATION', 'PASS')],
    expect: 'CONTRADICTED',
  },
  {
    name: 'Partial Class A coverage (some PASS, some N/A, none FAIL/UNDETERMINED) → PARTIALLY_SUPPORTED',
    results: [op('TEMPORAL', 'PASS'), op('STRUCTURAL', 'N/A'), op('INDEPENDENCE', 'PASS'), op('STABILITY', 'N/A')],
    expect: 'PARTIALLY_SUPPORTED',
  },
  {
    name: 'No Class A operators reported at all → UNDETERMINED, not SUPPORTED',
    results: [op('LAG', 'PASS'), op('RECURRENCE', 'PASS')],
    expect: 'UNDETERMINED',
  },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const actual = composeProfile(c.results);
  if (actual === c.expect) {
    pass++;
  } else {
    fail++;
    console.error(`✗ ${c.name}\n    expected ${c.expect}, got ${actual}`);
  }
}

console.log(`\ncomposeProfile: ${pass}/${CASES.length} passed`);
if (fail > 0) process.exit(1);
