// qa_signalpanel_render.mjs — KRYL-1229.
// The SIGNAL panel's authored-measure contract: an AUTHORED I_d measure with no
// wired source renders as classified STRUCTURAL absence (formula/boundary as
// reference only, never a value); a still-UNAUTHORED domain renders no authored
// measure block. The panel never fabricates, defaults, or zero-fills a value.
// This checks the data + derivation the panel keys on; the render itself is the
// live Playwright AC. Run: node qa_signalpanel_render.mjs

import { DOMAIN_INTELLIGENCE, domainIntelligence } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// derivation mirrors domainsubstratetabs.jsx DomainScroll
const authoredOf = (di) => Object.entries(di.signalDefs || {}).filter(([, d]) => d?.maturity === 'AUTHORED');
const pendingOf  = (di) => di.signals?.maturity === 'UNAUTHORED';

// 1. CAPITAL — one AUTHORED measure, classified absence (no value), reference fields present.
const cap = domainIntelligence('CAPITAL');
const capAuthored = authoredOf(cap);
ok('CAPITAL has exactly one AUTHORED measure', capAuthored.length === 1);
const [ck, cdef] = capAuthored[0] || [];
ok('the measure is capital_concentration', ck === 'capital_concentration');
ok('dataState is CLASS_D (no wired source)', cdef?.dataState === 'CLASS_D');
ok('no value field -> absence branch, not the value branch', cdef?.value == null);
ok('measure / formula / boundary present as reference', !!cdef?.measure && !!cdef?.formula && !!cdef?.boundary);

// 2. CAPITAL still shows a "remaining measures pending" line (only 1 of many authored).
ok('CAPITAL signals still UNAUTHORED overall -> pending line renders', pendingOf(cap) === true);

// 3. A still-pending domain renders NO authored-measure block.
for (const d of ['OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA']) {
  const di = domainIntelligence(d);
  ok(`${d}: no AUTHORED measure block`, authoredOf(di).length === 0);
  ok(`${d}: pending line renders`, pendingOf(di) === true);
}

// 4. Fabrication guard — no authored measure anywhere carries a numeric value.
let withValue = 0;
for (const di of Object.values(DOMAIN_INTELLIGENCE))
  for (const [, def] of Object.entries(di.signalDefs || {}))
    if (def.value != null) withValue++;
ok('no authored measure carries a hardcoded value (source-of-truth is data, not a literal)', withValue === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
