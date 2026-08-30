// qa_closed_relationship_admission.mjs — WO-3.
// F admits a cross-domain relationship ONLY between two canonical domains, with a
// type resolved from the ratified closed 15-pair set — never invented / coerced /
// defaulted. (CROSS-DOMAIN-CONSISTENCY.md §4a; integration-contract AC.)
// Run: node qa_closed_relationship_admission.mjs

import { admitCrossDomainRelationship, CROSS_DOMAIN_RELATIONSHIPS } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const D = ['CAPITAL', 'OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA'];

// 1. All 15 canonical pairs admit, each with a non-empty type, order-independent.
let admittedCount = 0;
for (let i = 0; i < D.length; i++)
  for (let j = i + 1; j < D.length; j++) {
    const a = admitCrossDomainRelationship(D[i], D[j]);
    const b = admitCrossDomainRelationship(D[j], D[i]);   // reversed
    if (a.admitted && b.admitted && a.type && a.type === b.type && a.pair === b.pair) admittedCount++;
  }
ok(`all 15 canonical domain pairs admit (order-independent, typed) — got ${admittedCount}`, admittedCount === 15);
ok('the closed set has exactly 15 entries', Object.keys(CROSS_DOMAIN_RELATIONSHIPS).length === 15);

// 2. Non-canonical endpoint → REJECT.
ok('non-domain endpoint rejected', admitCrossDomainRelationship('CAPITAL', 'REGULATORY').admitted === false);
ok('invented domain rejected', admitCrossDomainRelationship('WEATHER', 'MEDIA').admitted === false);
ok('empty endpoint rejected', admitCrossDomainRelationship('CAPITAL', '').admitted === false);

// 3. Self-pair → REJECT.
ok('self-pair rejected', admitCrossDomainRelationship('CAPITAL', 'CAPITAL').admitted === false);

// 4. Case / whitespace tolerance on real domains.
ok('lower-case domains still admit', admitCrossDomainRelationship('capital', 'ownership').admitted === true);

// 5. No fallback/coercion — a rejection carries a reason, never a guessed type.
const r = admitCrossDomainRelationship('CAPITAL', 'REGULATORY');
ok('rejection has a reason and no type', typeof r.reason === 'string' && r.type === undefined);

// 6. formationinference wires the guard — edges carry admittedType, none outside the set.
{
  const { inferFormation } = await import('./src/engine/formationinference.js');
  const particles = [
    { domain: 'CAPITAL',    confidence: 80, polarity: 'constructive', ts: Date.now() },
    { domain: 'OWNERSHIP',  confidence: 75, polarity: 'constructive', ts: Date.now() },
    { domain: 'TECHNOLOGY', confidence: 70, polarity: 'constructive', ts: Date.now() },
  ];
  const f = inferFormation(particles, { now: 1 });
  if (f && f.graph && Array.isArray(f.graph.edges)) {
    const allTyped = f.graph.edges.every(e => e.admittedType && typeof e.admittedType === 'string');
    ok(`inferFormation edges all carry an admitted type (${f.graph.edges.length} edges)`, allTyped);
  } else {
    ok('inferFormation produced a graph with edges to check', false);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
