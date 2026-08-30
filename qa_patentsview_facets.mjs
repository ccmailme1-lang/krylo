// qa_patentsview_facets.mjs — WO-1B (KRYL-1231).
// Founder ruling: PatentsView produces distinct DOMAIN EVIDENCE facets with
// preserved provenance — and populates NONE of the 12 authored Class-E measures.
// Evidence is not a measure. This is enforced structurally (ontology guard), not
// by convention. Run: node qa_patentsview_facets.mjs

import {
  technologyActivityFacet, assigneeActivityFacet, inventorMigrationFacet,
  patentsViewEvidenceFacets, patentsViewEvidenceSource, setPatentsViewSignals, DOMAIN_EVIDENCE,
} from './src/engine/facetproducers/patentsviewfacets.js';
import { checkIndependence } from './src/engine/signalfacet.js';
import {
  resolveClassEMeasure, getDomainEvidenceFacets, registerEvidenceFacetSource,
  WIRED_PRODUCERS, CLASS_E_ONTOLOGY,
} from './src/engine/domainsignalresolution.js';
import { DOMAIN_INTELLIGENCE } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const now = Date.now();
const batch = [
  { id: 'v1', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'TECHNOLOGY_VELOCITY:AI',           confidence: 72, ts: now, polarity: 'POSITIVE' },
  { id: 'v2', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'TECHNOLOGY_VELOCITY:SEMICONDUCTOR', confidence: 60, ts: now, polarity: 'POSITIVE' },
  { id: 'a1', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'ASSIGNEE_ACCELERATION:AI:ANDURIL',  confidence: 64, ts: now, polarity: 'POSITIVE' },
  { id: 'm1', source: 'PATENTSVIEW', domain: 'KNOWLEDGE',  signal: 'INVENTOR_MIGRATION:orgA→orgB',      confidence: 55, ts: now, polarity: 'POSITIVE' },
];

// 1. Three distinct evidence facets; CAPITAL not built ("no — not yet").
const facets = patentsViewEvidenceFacets(batch);
ok('facets produced for TECHNOLOGY / OWNERSHIP / KNOWLEDGE',
   !!facets.TECHNOLOGY && !!facets.OWNERSHIP && !!facets.KNOWLEDGE);
ok('no CAPITAL evidence facet (assignee-concentration / R&D-intensity = not yet)', !facets.CAPITAL);

const all = [facets.TECHNOLOGY[0], facets.OWNERSHIP[0], facets.KNOWLEDGE[0]];
for (const f of all) {
  ok(`${f.domain_id}: ontology is DOMAIN_EVIDENCE, not a Class-E ontology`,
     f.ontology === DOMAIN_EVIDENCE && f.ontology !== CLASS_E_ONTOLOGY);
  ok(`${f.domain_id}: provenance.source + source_set_hash + repro.producer_version present`,
     !!f.provenance?.source && !!f.source_set_hash && !!f.repro?.producer_version);
  ok(`${f.domain_id}: signal_unit is kind 'evidence', not a measure value`, f.signal_unit?.kind === 'evidence');
}

// 2. The three facets are genuinely distinct (independent lineage + source hash).
const pairs = [[all[0], all[1]], [all[0], all[2]], [all[1], all[2]]];
ok('all three facet pairs are independent (distinct lineage + source_set_hash)',
   pairs.every(([a, b]) => checkIndependence(a, b) === null));
ok('the three source_set_hashes are distinct',
   new Set(all.map(f => f.source_set_hash)).size === 3);

// 3. STRUCTURAL enforcement — an evidence facet cannot become a Class-E measure.
const evidenceAsProducer = { technology_capability_concentration: () => ({ facet: facets.TECHNOLOGY[0] }) };
const r = resolveClassEMeasure({
  domain: 'TECHNOLOGY', measureKey: 'technology_capability_concentration',
  scope: 'subject', producers: evidenceAsProducer,
});
ok('evidence facet wired as a Class-E producer → STRUCTURAL_ABSENCE', r.status === 'STRUCTURAL_ABSENCE');
ok('rejection reason: evidence, not a measure', r.evidenceNotMeasure === true && r.value === undefined);

// 4. PatentsView changes NOTHING about the 12 Class-E measures.
setPatentsViewSignals(batch);
registerEvidenceFacetSource(patentsViewEvidenceSource);
let classEValues = 0;
for (const [d, di] of Object.entries(DOMAIN_INTELLIGENCE))
  for (const [k, def] of Object.entries(di.signalDefs || {}))
    if (def.maturity === 'AUTHORED' &&
        resolveClassEMeasure({ domain: d, measureKey: k, scope: 'field' }).status !== 'STRUCTURAL_ABSENCE')
      classEValues++;
ok('all 12 Class-E measures still STRUCTURAL_ABSENCE', classEValues === 0);
ok('WIRED_PRODUCERS still has no Class-E producer', Object.keys(WIRED_PRODUCERS).length === 0);

// 5. Evidence facets ARE now available via the resolution module's evidence accessor.
const tech = getDomainEvidenceFacets('TECHNOLOGY');
ok('getDomainEvidenceFacets(TECHNOLOGY) returns the PatentsView evidence facet', tech.length === 1 && tech[0].sourceId === 'patentsview');
ok('getDomainEvidenceFacets(CAPITAL) empty (no CAPITAL facet built)', getDomainEvidenceFacets('CAPITAL').length === 0);
setPatentsViewSignals([]);
ok('no signals → getDomainEvidenceFacets(TECHNOLOGY) empty (honest, no stale)', getDomainEvidenceFacets('TECHNOLOGY').length === 0);

// 6. Empty / irrelevant input → null producers, no throw.
ok('empty batch → {} and null producers',
   Object.keys(patentsViewEvidenceFacets([])).length === 0 &&
   technologyActivityFacet([]) === null && assigneeActivityFacet([]) === null && inventorMigrationFacet([]) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
