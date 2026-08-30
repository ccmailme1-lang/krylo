// qa_signalpanel_render.mjs — KRYL-1229 + WO-1 Class-E concentration family.
// The SIGNAL panel's authored-measure contract: an AUTHORED I_d measure with no
// wired source renders as classified STRUCTURAL absence (formula/boundary as
// reference only, never a value); a domain with no AUTHORED measure renders no
// authored-measure block. The panel never fabricates, defaults, or zero-fills.
// This checks the data + derivation the panel keys on; the render itself is the
// live Playwright AC (qa_verify_signalpanel_live.mjs). Run: node qa_signalpanel_render.mjs

import { DOMAIN_INTELLIGENCE, domainIntelligence } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// derivation mirrors domainsubstratetabs.jsx DomainScroll
const authoredOf = (di) => Object.entries(di.signalDefs || {}).filter(([, d]) => d?.maturity === 'AUTHORED');
const pendingOf  = (di) => di.signals?.maturity === 'UNAUTHORED';

// The concentration family — one AUTHORED CR-1 measure per domain, all Class D.
const AUTHORED_DOMAINS = {
  CAPITAL:    'capital_concentration',
  OWNERSHIP:  'ownership_concentration_top_holder_share',
  TECHNOLOGY: 'technology_capability_concentration',
  KNOWLEDGE:  'knowledge_expertise_concentration',
  LABOR:      'labor_geographic_concentration',
  MEDIA:      'media_attention_concentration',
};

for (const [d, expectedKey] of Object.entries(AUTHORED_DOMAINS)) {
  const di = domainIntelligence(d);
  const authored = authoredOf(di);
  ok(`${d}: exactly one AUTHORED measure`, authored.length === 1);
  const [k, def] = authored[0] || [];
  ok(`${d}: measure key is ${expectedKey}`, k === expectedKey);
  ok(`${d}: dataState CLASS_D (no wired source)`, def?.dataState === 'CLASS_D');
  ok(`${d}: no value field -> classified-absence branch, not the value branch`, def?.value == null);
  ok(`${d}: concept / measure / formula / boundary / polarity present`,
     !!def?.concept && !!def?.measure && !!def?.formula && !!def?.boundary && !!def?.polarity);
  ok(`${d}: formula is CR-1 identity-normalized (×100 or max())`, /×\s*100|max\(/.test(def?.formula || ''));
  ok(`${d}: unit is 0–100 identity`, /0[–-]100/.test(def?.unit || ''));
  ok(`${d}: missing-data rule = structural absence + explicit anti-fabrication`,
     /absenceclass:\s*structural/i.test(def?.missingData || '') &&
     /never|not/i.test(def?.missingData || '') &&
     /estimat|infer|proxy|proxied|substitut|zero-fill|volume/i.test(def?.missingData || ''));
  ok(`${d}: signals still UNAUTHORED overall -> "remaining" line still renders`, pendingOf(di) === true);
}

// Boundaries keep each latent variable distinct from the others and from
// non-concentration dimensions of the same domain.
const B = Object.fromEntries(Object.keys(AUTHORED_DOMAINS).map(d => [d, authoredOf(domainIntelligence(d))[0][1].boundary]));
ok('CAPITAL boundary: economic capital, excludes control',        /economic capital/i.test(B.CAPITAL) && /control/i.test(B.CAPITAL));
ok('OWNERSHIP boundary: control-rights, excludes capital',        /control/i.test(B.OWNERSHIP) && /capital/i.test(B.OWNERSHIP));
ok('TECHNOLOGY boundary: excludes adoption/displacement/activity/usage',
   /adoption/i.test(B.TECHNOLOGY) && /displacement/i.test(B.TECHNOLOGY) && /activity/i.test(B.TECHNOLOGY) && /usage/i.test(B.TECHNOLOGY));
ok('KNOWLEDGE boundary: expertise stock, excludes publication/citation flow + diffusion',
   /expertise stock/i.test(B.KNOWLEDGE) && /(publication|citation)/i.test(B.KNOWLEDGE) && /diffusion/i.test(B.KNOWLEDGE));
ok('LABOR boundary: static concentration, excludes redistribution/skill-mix/hiring',
   /static/i.test(B.LABOR) && /redistribution/i.test(B.LABOR) && /skill-mix/i.test(B.LABOR));
ok('MEDIA boundary: source-base concentration, excludes velocity/coherence/tone/volume',
   /source[- ]base/i.test(B.MEDIA) && /velocity/i.test(B.MEDIA) && /coherence/i.test(B.MEDIA) && /(tone|volume)/i.test(B.MEDIA));

// Distinct names — six different latent variables, six different measure keys.
const keys = Object.values(AUTHORED_DOMAINS);
ok('six distinct measure keys', new Set(keys).size === 6);

// Fabrication guard — no authored measure anywhere carries a numeric value.
let withValue = 0;
for (const di of Object.values(DOMAIN_INTELLIGENCE))
  for (const [, def] of Object.entries(di.signalDefs || {}))
    if (def.value != null) withValue++;
ok('no authored measure carries a hardcoded value (source of truth is data, not a literal)', withValue === 0);

// A domain with no signalDefs at all -> derivation yields no block (defensive).
ok('empty-signalDefs derivation is safe', authoredOf({}).length === 0 && pendingOf({}) === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
