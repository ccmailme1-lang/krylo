// qa_domainsignalresolution.mjs — WO-1A (KRYL-1230).
// The ordinary source→facet→provenance→normalized-signal seam:
//  - all 12 authored measures resolve to a DERIVED structural absence naming the
//    specific missing source class + required scope (no static label, no value);
//  - a wired producer round-trips a contract-compliant SignalFacet → value + provenance;
//  - a producer returning another domain's facet is REJECTED (no substitution);
//  - a facet without provenance / source_set_hash does not count as resolved.
// Run: node qa_domainsignalresolution.mjs

import {
  resolveClassEMeasure, resolveDomainMeasures, makeClassEFacet, classEValueUnit, WIRED_PRODUCERS,
} from './src/engine/domainsignalresolution.js';
import { DOMAIN_INTELLIGENCE } from './src/engine/domainintelligence.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const ALL = [];
for (const [d, di] of Object.entries(DOMAIN_INTELLIGENCE))
  for (const [k, def] of Object.entries(di.signalDefs || {}))
    if (def.maturity === 'AUTHORED') ALL.push([d, k]);

ok(`12 authored measures discovered (got ${ALL.length})`, ALL.length === 12);
ok('WIRED_PRODUCERS is empty at WO-1A', Object.keys(WIRED_PRODUCERS).length === 0);

// 1. Every measure → derived structural absence, field scope.
for (const [d, k] of ALL) {
  const r = resolveClassEMeasure({ domain: d, measureKey: k, scope: 'field' });
  ok(`${d}.${k}: STRUCTURAL_ABSENCE`, r.status === 'STRUCTURAL_ABSENCE');
  ok(`${d}.${k}: absenceClass structural`, r.absenceClass === 'structural');
  ok(`${d}.${k}: names a required source class`, typeof r.requiredSourceClass === 'string' && r.requiredSourceClass.length > 8);
  ok(`${d}.${k}: requiredScope subject`, r.requiredScope === 'subject');
  ok(`${d}.${k}: no value`, r.value === undefined);
  ok(`${d}.${k}: reason mentions the scope gap`, /subject-scoped|no wired source/.test(r.reason));
}

// 2. resolveDomainMeasures — CAPITAL has 3, all absent.
const cap = resolveDomainMeasures('CAPITAL', 'field');
ok('CAPITAL resolves 3 measures', cap.length === 3);
ok('CAPITAL all absent', cap.every(([, r]) => r.status === 'STRUCTURAL_ABSENCE'));

// 3. A wired producer → FACET round-trips value + provenance.
const prov = { producer: 'test-13f', source: 'SEC 13F Q3', field: 'capital' };
const good = {
  capital_concentration: () => ({
    facet: makeClassEFacet({
      domain: 'CAPITAL', measureKey: 'capital_concentration', value: 41,
      provenance: prov, source_set_hash: 'sec-13f-q3',
      repro: { config: { subject: 'X' }, source_refs: ['sec:13f'], producer_version: 't-1' },
    }),
  }),
};
const fr = resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'capital_concentration', scope: 'subject', producers: good });
ok('wired producer → FACET', fr.status === 'FACET');
ok('FACET value clamped/rounded to 41', fr.value === 41);
ok('FACET carries provenance', fr.provenance?.source === 'SEC 13F Q3');
ok('FACET carries source_set_hash', fr.source_set_hash === 'sec-13f-q3');
ok('FACET still names the source class', fr.requiredSourceClass?.includes('13F'));

// 4. Cross-domain substitution → REJECTED.
const wrongDomain = {
  capital_concentration: () => ({
    facet: makeClassEFacet({
      domain: 'MEDIA', measureKey: 'media_attention_concentration', value: 88,
      provenance: { source: 'x' }, source_set_hash: 'h',
      repro: { config: {}, source_refs: [], producer_version: 'v' },
    }),
  }),
};
const xr = resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'capital_concentration', producers: wrongDomain });
ok('cross-domain facet REJECTED → absence', xr.status === 'STRUCTURAL_ABSENCE' && xr.crossDomainRejected === true);
ok('rejected: no value leaked', xr.value === undefined);

// 5. Facet without provenance / source_set_hash → not resolved.
const noProv = {
  capital_concentration: () => ({ facet: { domain_id: 'CAPITAL', signal_unit: classEValueUnit(50) } }),
};
const nr = resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'capital_concentration', producers: noProv });
ok('facet missing provenance → STRUCTURAL_ABSENCE', nr.status === 'STRUCTURAL_ABSENCE');

// 6. Producer that withholds / errors → absence, never a throw.
const withhold = { capital_concentration: () => ({ absent: { reason: 'coverage below threshold' } }) };
ok('producer withhold → absence w/ reason', resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'capital_concentration', producers: withhold }).reason === 'coverage below threshold');
const thrower = { capital_concentration: () => { throw new Error('boom'); } };
ok('producer throw → derived absence, no crash', resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'capital_concentration', producers: thrower }).status === 'STRUCTURAL_ABSENCE');

// 7. Unknown / non-authored key.
ok('unknown measure → NOT_AUTHORED', resolveClassEMeasure({ domain: 'CAPITAL', measureKey: 'nope' }).status === 'NOT_AUTHORED');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
