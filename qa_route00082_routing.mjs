// qa_route00082_routing.mjs — Regression corpus for ROUTE-00082
// Canonical spec: routing_tests/health/ROUTE-00082.yaml
// Run: node qa_route00082_routing.mjs

import { detectDomain }          from './src/engine/querysynthesis.js';
import { detectProtectedDomain } from './src/engine/ingress.js';

const CASES = [
  {
    id:          'ROUTE-00082-A',
    description: 'Full hypotonia query — exact production failure',
    query:       '10 year old with severe hypotonia looking for mobility opportunities and support from programs like adaptive mobility programs physical therapy home & community access',
    lens:        'OPEN',
    expected:    'HEALTH',
  },
  {
    id:          'ROUTE-00082-B',
    description: 'Home purchase with explicit buy context — REAL_ESTATE must survive',
    query:       'looking to buy a home in chicago budget 400k need mortgage pre-approval',
    lens:        'OPEN',
    expected:    'REAL_ESTATE',
  },
  {
    id:          'ROUTE-00082-C',
    description: 'House hunting with bedroom/bath signals — REAL_ESTATE must survive',
    query:       'house hunting in austin 3bed 2bath under 350k',
    lens:        'OPEN',
    expected:    'REAL_ESTATE',
  },
  {
    id:          'ROUTE-00082-D',
    description: 'Plain PT query — protected entity fires on "physical therapy"',
    query:       'physical therapy options for my knee after surgery',
    lens:        'OPEN',
    expected:    'HEALTH',
  },
  {
    id:          'ROUTE-00082-E',
    description: 'Wheelchair + insurance funding — must not bleed to FINANCIAL',
    query:       'looking for wheelchair options and insurance funding for my son',
    lens:        'OPEN',
    expected:    'HEALTH',
  },
];

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const domain    = detectDomain(c.query, c.lens);
  const gateHit   = detectProtectedDomain(c.query) !== null;
  const ok        = domain === c.expected;

  const status = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;

  console.log(`[${status}] ${c.id} — ${c.description}`);
  console.log(`       expected=${c.expected}  got=${domain}  protected_gate=${gateHit}`);
  if (!ok) {
    console.log(`       *** INVARIANT VIOLATED: selected_domain "${domain}" !== "${c.expected}" ***`);
  }
}

console.log(`\n${pass}/${CASES.length} PASS`);
if (fail > 0) {
  console.error(`${fail} FAILURE(S) — routing regression detected`);
  process.exit(1);
}
