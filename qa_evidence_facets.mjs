// qa_evidence_facets.mjs — WO-1B/C/D (KRYL-1231/1232/1233).
// The shared precedent: a connector contributes DISTINCT domain evidence facets
// with independent lineage + preserved provenance, and populates NONE of the 12
// authored Class-E measures. Enforced structurally (CLASS_E_ONTOLOGY guard).
// Run: node qa_evidence_facets.mjs

import { checkIndependence } from './src/engine/signalfacet.js';
import {
  patentsViewEvidenceFacets, setPatentsViewSignals, patentsViewEvidenceSource,
} from './src/engine/facetproducers/patentsviewfacets.js';
import {
  censusEvidenceFacets, setCensusSignals, censusEvidenceSource,
} from './src/engine/facetproducers/censusfacets.js';
import {
  fecEvidenceFacets, setFecSignals, fecEvidenceSource, mediaAdSpendFacet,
} from './src/engine/facetproducers/fecfacets.js';
import {
  resolveClassEMeasure, getDomainEvidenceFacets, registerEvidenceFacetSource, WIRED_PRODUCERS,
} from './src/engine/domainsignalresolution.js';
import { DOMAIN_INTELLIGENCE } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };
const now = Date.now();

const pv = [
  { id: 'v1', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'TECHNOLOGY_VELOCITY:AI',          confidence: 70, ts: now },
  { id: 'a1', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'ASSIGNEE_ACCELERATION:AI:ANDURIL', confidence: 62, ts: now },
  { id: 'm1', source: 'PATENTSVIEW', domain: 'KNOWLEDGE',  signal: 'INVENTOR_MIGRATION:a→b',           confidence: 51, ts: now },
];
const census = [
  { source: 'CENSUS', domain: 'LABOR',     signal: 94, confidence: 0.80, ts: now },
  { source: 'CENSUS', domain: 'OWNERSHIP', signal: 38, confidence: 0.75, ts: now },
];
const fec = [{ source: 'FEC', domain: 'CAPITAL', signal: 47, confidence: 0.70, ts: now }];

// ── WO-1C Census ────────────────────────────────────────────────────────────
const cf = censusEvidenceFacets(census);
ok('Census → LABOR + OWNERSHIP evidence facets', !!cf.LABOR && !!cf.OWNERSHIP);
ok('Census LABOR facet: DOMAIN_EVIDENCE, national scope, provenance',
   cf.LABOR[0].ontology === 'DOMAIN_EVIDENCE' && /national/i.test(cf.LABOR[0].provenance.scope) && !!cf.LABOR[0].source_set_hash);
ok('Census two facets independent (distinct lineage + source hash)', checkIndependence(cf.LABOR[0], cf.OWNERSHIP[0]) === null);
ok('Census signal_unit is evidence, not a measure', cf.LABOR[0].signal_unit.kind === 'evidence');

// ── WO-1D FEC ───────────────────────────────────────────────────────────────
const ff = fecEvidenceFacets(fec);
ok('FEC → CAPITAL evidence facet only', !!ff.CAPITAL && !ff.MEDIA);
ok('FEC CAPITAL facet: DOMAIN_EVIDENCE + provenance formula', ff.CAPITAL[0].ontology === 'DOMAIN_EVIDENCE' && !!ff.CAPITAL[0].provenance.formula);
ok('FEC MEDIA facet is NOT derived from the capital number (null until IE endpoint)', mediaAdSpendFacet(fec) === null);

// ── Cross-source independence — no two evidence facets share lineage/source ──
const allFacets = [
  ...Object.values(patentsViewEvidenceFacets(pv)).flat(),
  ...Object.values(cf).flat(),
  ...Object.values(ff).flat(),
];
ok(`${allFacets.length} evidence facets across 3 sources`, allFacets.length === 6);
let indepPairs = 0, total = 0;
for (let i = 0; i < allFacets.length; i++)
  for (let j = i + 1; j < allFacets.length; j++) {
    total++;
    if (checkIndependence(allFacets[i], allFacets[j]) === null) indepPairs++;
  }
ok(`all ${total} cross-source facet pairs are independent`, indepPairs === total);
ok('all source_set_hashes distinct', new Set(allFacets.map(f => f.source_set_hash)).size === 6);

// ── No Class-E leakage from any source ──────────────────────────────────────
setPatentsViewSignals(pv); setCensusSignals(census); setFecSignals(fec);
registerEvidenceFacetSource(patentsViewEvidenceSource);
registerEvidenceFacetSource(censusEvidenceSource);
registerEvidenceFacetSource(fecEvidenceSource);

let classEValues = 0;
for (const [d, di] of Object.entries(DOMAIN_INTELLIGENCE))
  for (const [k, def] of Object.entries(di.signalDefs || {}))
    if (def.maturity === 'AUTHORED' &&
        resolveClassEMeasure({ domain: d, measureKey: k, scope: 'field' }).status !== 'STRUCTURAL_ABSENCE') classEValues++;
ok('all 12 Class-E measures STRUCTURAL_ABSENCE with 3 evidence sources live', classEValues === 0);
ok('WIRED_PRODUCERS still empty', Object.keys(WIRED_PRODUCERS).length === 0);

// Each source's evidence facet rewired as a Class-E producer → rejected (ontology).
for (const [dom, key, facet] of [
  ['LABOR', 'labor_geographic_concentration', cf.LABOR[0]],
  ['OWNERSHIP', 'ownership_concentration_top_holder_share', cf.OWNERSHIP[0]],
  ['CAPITAL', 'capital_concentration', ff.CAPITAL[0]],
]) {
  const r = resolveClassEMeasure({ domain: dom, measureKey: key, producers: { [key]: () => ({ facet }) } });
  ok(`${dom}.${key}: evidence facet rejected as Class-E (evidenceNotMeasure)`, r.status === 'STRUCTURAL_ABSENCE' && r.evidenceNotMeasure === true);
}

// ── Registry accessor ──────────────────────────────────────────────────────
ok('getDomainEvidenceFacets(LABOR) → census employment facet', getDomainEvidenceFacets('LABOR').some(f => f.sourceId === 'census'));
ok('getDomainEvidenceFacets(CAPITAL) → fec capital-flow facet', getDomainEvidenceFacets('CAPITAL').some(f => f.sourceId === 'fec'));
ok('getDomainEvidenceFacets(TECHNOLOGY) → patentsview activity facet', getDomainEvidenceFacets('TECHNOLOGY').some(f => f.sourceId === 'patentsview'));
ok('getDomainEvidenceFacets(MEDIA) empty (no MEDIA evidence facet built)', getDomainEvidenceFacets('MEDIA').length === 0);
setPatentsViewSignals([]); setCensusSignals([]); setFecSignals([]);
ok('no signals → all domains empty (honest, no stale)',
   ['CAPITAL','OWNERSHIP','TECHNOLOGY','KNOWLEDGE','LABOR','MEDIA'].every(d => getDomainEvidenceFacets(d).length === 0));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
