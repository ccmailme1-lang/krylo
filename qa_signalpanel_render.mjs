// qa_signalpanel_render.mjs — KRYL-1229 + the 12 WO-1 Class-E measures.
// Contract: every AUTHORED I_d measure with no wired source renders as classified
// STRUCTURAL absence (formula/boundary as reference only, never a value); a domain
// with no AUTHORED measure renders no authored-measure block. Never fabricates,
// defaults, zero-fills, or volume-proxies. Checks the data + derivation the panel
// keys on; the render is the live Playwright AC (qa_verify_signalpanel_live.mjs).
// Run: node qa_signalpanel_render.mjs

import { DOMAIN_INTELLIGENCE, domainIntelligence, DI_VERSION } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// derivation mirrors domainsubstratetabs.jsx DomainScroll
const authoredOf = (di) => Object.entries(di.signalDefs || {}).filter(([, d]) => d?.maturity === 'AUTHORED');
const pendingOf  = (di) => di.signals?.maturity === 'UNAUTHORED';

// The 12 Class-E measures, by domain.
const EXPECTED = {
  CAPITAL:    ['capital_concentration', 'capital_deployment_velocity', 'capital_intensity_change'],
  OWNERSHIP:  ['ownership_concentration_top_holder_share'],
  TECHNOLOGY: ['technology_capability_concentration'],
  KNOWLEDGE:  ['knowledge_expertise_concentration', 'knowledge_diffusion_rate'],
  LABOR:      ['labor_geographic_concentration', 'labor_geographic_redistribution', 'labor_skill_mix_shift'],
  MEDIA:      ['media_attention_concentration', 'media_narrative_coherence'],
};

ok(`DI_VERSION bumped past 0.1 (now ${DI_VERSION})`, DI_VERSION !== '0.1');

let total = 0;
for (const [d, keys] of Object.entries(EXPECTED)) {
  const di = domainIntelligence(d);
  const authored = authoredOf(di);
  const got = authored.map(([k]) => k).sort();
  ok(`${d}: authored measures = [${keys.join(', ')}]`, JSON.stringify(got) === JSON.stringify([...keys].sort()));
  ok(`${d}: legacy signals field still UNAUTHORED -> "remaining" line still renders`, pendingOf(di) === true);
  for (const [k, def] of authored) {
    total++;
    ok(`${d}.${k}: dataState CLASS_D`, def.dataState === 'CLASS_D');
    ok(`${d}.${k}: no value -> classified-absence branch`, def.value == null);
    ok(`${d}.${k}: concept / measure / formula / unit / polarity / boundary / missingData all present`,
       !!def.concept && !!def.measure && !!def.formula && !!def.unit && !!def.polarity && !!def.boundary && !!def.missingData);
    ok(`${d}.${k}: missing-data rule = structural absence + explicit anti-fabrication`,
       /absenceclass:\s*structural/i.test(def.missingData) &&
       /never|no measure/i.test(def.missingData) &&
       /estimat|infer|proxy|proxied|substitut|zero-fill|volume|extrapolat|assumed|ad hoc/i.test(def.missingData));
    ok(`${d}.${k}: formula normalizes to 0–100 (×100, max(), or /2 ×100)`, /×\s*100|max\(/.test(def.formula));
  }
}
ok(`12 Class-E measures authored in total (got ${total})`, total === 12);

// Boundaries keep each measure distinct from its siblings and neighbours.
const B = {};
for (const d of Object.keys(EXPECTED)) for (const [k, def] of authoredOf(domainIntelligence(d))) B[k] = def.boundary;
ok('CAPITAL concentration ≠ control',            /economic capital/i.test(B.capital_concentration) && /control/i.test(B.capital_concentration));
ok('OWNERSHIP concentration ≠ capital',          /control/i.test(B.ownership_concentration_top_holder_share) && /capital/i.test(B.ownership_concentration_top_holder_share));
ok('TECHNOLOGY capability ≠ adoption/activity',  /adoption/i.test(B.technology_capability_concentration) && /activity/i.test(B.technology_capability_concentration));
ok('KNOWLEDGE expertise-stock ≠ diffusion',      /diffusion/i.test(B.knowledge_expertise_concentration));
ok('CAPITAL deployment-velocity ≠ amount/concentration', /rate of state change/i.test(B.capital_deployment_velocity) && /amount/i.test(B.capital_deployment_velocity));
ok('CAPITAL intensity-change ≠ deployment velocity', /deployment velocity/i.test(B.capital_intensity_change));
ok('KNOWLEDGE diffusion ≠ concentration/activity', /concentration/i.test(B.knowledge_diffusion_rate) && /activity/i.test(B.knowledge_diffusion_rate));
ok('LABOR redistribution ≠ static concentration', /static concentration/i.test(B.labor_geographic_redistribution));
ok('LABOR skill-mix ≠ geographic',               /geographic/i.test(B.labor_skill_mix_shift) && /composition/i.test(B.labor_skill_mix_shift));
ok('MEDIA narrative-coherence ≠ concentration + never a truth signal',
   /attention concentration/i.test(B.media_narrative_coherence) && /truth/i.test(B.media_narrative_coherence));

// Six of the twelve carry a direction-explicit polarity; the composition/frame
// measures are magnitude-only.
for (const k of ['capital_deployment_velocity', 'capital_intensity_change', 'knowledge_diffusion_rate'])
  ok(`${k}: polarity is direction-explicit`, /direction-explicit/i.test(
     Object.values(DOMAIN_INTELLIGENCE).flatMap(di => Object.entries(di.signalDefs || {})).find(([kk]) => kk === k)[1].polarity));
for (const k of ['labor_geographic_redistribution', 'labor_skill_mix_shift', 'media_narrative_coherence'])
  ok(`${k}: polarity is magnitude-only`, /magnitude only/i.test(
     Object.values(DOMAIN_INTELLIGENCE).flatMap(di => Object.entries(di.signalDefs || {})).find(([kk]) => kk === k)[1].polarity));

// Fabrication guard — no authored measure anywhere carries a numeric value.
let withValue = 0;
for (const di of Object.values(DOMAIN_INTELLIGENCE))
  for (const [, def] of Object.entries(di.signalDefs || {}))
    if (def.value != null) withValue++;
ok('no authored measure carries a hardcoded value', withValue === 0);

// Distinct names across all 12.
const allKeys = Object.values(EXPECTED).flat();
ok('12 distinct measure keys', new Set(allKeys).size === 12);

// Defensive: a domain with no signalDefs yields no block, no crash.
ok('empty-signalDefs derivation is safe', authoredOf({}).length === 0 && pendingOf({}) === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
