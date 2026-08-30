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

// 1. Domains with an AUTHORED concentration measure — classified absence (no value),
//    reference fields present, dataState CLASS_D.
const AUTHORED_DOMAINS = {
  CAPITAL:    'capital_concentration',
  OWNERSHIP:  'ownership_concentration_top_holder_share',
  TECHNOLOGY: 'technology_capability_concentration',
};
for (const [d, expectedKey] of Object.entries(AUTHORED_DOMAINS)) {
  const di = domainIntelligence(d);
  const authored = authoredOf(di);
  ok(`${d} has exactly one AUTHORED measure`, authored.length === 1);
  const [k, def] = authored[0] || [];
  ok(`${d}: measure key is ${expectedKey}`, k === expectedKey);
  ok(`${d}: dataState CLASS_D (no wired source)`, def?.dataState === 'CLASS_D');
  ok(`${d}: no value field -> absence branch`, def?.value == null);
  ok(`${d}: measure / formula / boundary present as reference`, !!def?.measure && !!def?.formula && !!def?.boundary);
  ok(`${d}: signals still UNAUTHORED overall -> "remaining" line renders`, pendingOf(di) === true);
}

// 2. Each concentration measure's boundary keeps it distinct from the others'
//    latent variable and from its domain's non-concentration dimensions.
const capB = authoredOf(domainIntelligence('CAPITAL'))[0][1].boundary;
const ownB = authoredOf(domainIntelligence('OWNERSHIP'))[0][1].boundary;
const techB = authoredOf(domainIntelligence('TECHNOLOGY'))[0][1].boundary;
ok('CAPITAL boundary names economic capital, excludes control', /economic capital/i.test(capB) && /control/i.test(capB));
ok('OWNERSHIP boundary names control-rights, excludes capital', /control/i.test(ownB) && /capital/i.test(ownB));
ok('TECHNOLOGY boundary excludes adoption / displacement / activity / usage',
   /adoption/i.test(techB) && /displacement/i.test(techB) && /activity/i.test(techB) && /usage/i.test(techB));
ok('TECHNOLOGY capability concentration cannot collapse to adoption/activity — it is a supply-share measure',
   /capability[- ]supply/i.test(techB));

// 3. A still-pending domain renders NO authored-measure block.
for (const d of ['KNOWLEDGE', 'LABOR', 'MEDIA']) {
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
