// qa_scoutingreport.mjs
// THE SCOUTING REPORT — sell-layer rollup of the five reporting lenses.
// Proves: grounded lens read → cited takeaway → drill receipt (the sell-to-proof hinge),
// §22 absence handling, and the multiplicative composite leverage score.

import {
  buildScoutingReport, computeLeverage,
  signalRead, flowRead, pressureRead, convergenceRead, driftRead,
  groundedRead, withheldRead,
} from './src/engine/scoutingreport.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

// fixtures — exact shape of computeDivergence('DRIFT', …) output
const grounded = (direction, margin) => ({
  lens: 'DRIFT', withheld: false, withholding_reason: null,
  relationship: 'STRUCTURAL_VS_NARRATIVE_DIVERGENCE', direction, margin,
  facetA: 'structural:MEDIA:1', facetB: 'narrative:MEDIA:1', ontology: 'DOMAIN_ACTIVITY_INTENSITY',
});
const withheldDivergence = {
  lens: 'DRIFT', withheld: true, withholding_reason: 'FACET_UNAVAILABLE',
  invariant: 'AVAILABILITY', stage: 'ARCHITECTURAL', direction: null, margin: null,
};

console.log('Scouting Report — five-lens rollup\n');

// ── grounded DRIFT → one cited takeaway + drill receipt (raw divergence still accepted) ──
console.log('grounded read → cited takeaway:');
const r = buildScoutingReport('MEDIA', { drift: grounded('STRUCTURE_LEADS', 0.26) }, { now: 1000 });
assert('one takeaway',                 r.takeaways.length === 1);
assert('takeaway from DRIFT',          r.takeaways[0].lens === 'DRIFT');
assert('state GROUNDED',               r.takeaways[0].state === 'GROUNDED');
assert('citation resolves to DRIFT',   r.takeaways[0].citation === 'DRIFT');
assert('prose matches direction',      /pulling ahead/.test(r.takeaways[0].text));
assert('drill carries direction',      r.takeaways[0].drill.direction === 'STRUCTURE_LEADS');
assert('drill carries margin (receipt)', r.takeaways[0].drill.margin === 0.26);
assert('drill carries facets',         r.takeaways[0].drill.facetA === 'structural:MEDIA:1');
assert('provenance timestamped',       r.generatedAt === 1000);
assert('provenance attributed',        r.generatedBy === 'scouting-report-agent');
assert('declares the SELL layer',      r.layer === 'SELL');
assert('report frozen',                Object.isFrozen(r) && Object.isFrozen(r.takeaways));

// ── direction → prose mapping ──
console.log('\ndirection → prose:');
assert('NARRATIVE_LEADS → attention outpacing',
  /running ahead/.test(buildScoutingReport('MEDIA', { drift: grounded('NARRATIVE_LEADS', 0.1) }).takeaways[0].text));
assert('ALIGNED → nothing to exploit',
  /aligned/.test(buildScoutingReport('MEDIA', { drift: grounded('ALIGNED', 0) }).takeaways[0].text));

// ── §22 absence: withheld read → explicit absence, never fabricated ──
console.log('\n§22 withheld read → explicit absence:');
const w = buildScoutingReport('MEDIA', { drift: withheldDivergence });
assert('takeaway state WITHHELD',      w.takeaways[0].state === 'WITHHELD');
assert('absence stated, not faked',    /No drift read/.test(w.takeaways[0].text));
assert('drill carries the reason',     w.takeaways[0].drill.reason === 'FACET_UNAVAILABLE');
assert('drill flags withheld',         w.takeaways[0].drill.withheld === true);
assert('no fabricated margin',         w.takeaways[0].drill.margin === undefined);
assert('absence is classified',        w.takeaways[0].absence === 'FILTERED');
assert('withheld leg excluded, not zeroed', w.leverage.state === 'ABSENT' && w.leverage.value === null);

// ── no read supplied → no takeaway (not a fabricated one) ──
console.log('\nno read → no takeaway:');
const e = buildScoutingReport('MEDIA', {});
assert('empty takeaways',              e.takeaways.length === 0);
assert('still a valid report',         e.domain === 'MEDIA' && typeof e.generatedAt === 'number');
assert('all five lenses unsupplied',   e.unsupplied.length === 5);

// ── adapters: each lens normalizes its own producer output ──
console.log('\nlens adapters:');
assert('signalRead rescales 0-100 → 0..1', signalRead({ pressure: 72 }).value === 0.72);
assert('signal label is the cone read',    signalRead({ pressure: 72 }).label === 'P72');
assert('signal without pressure withholds', signalRead({}).withheld === true);
assert('pressureRead takes the gauge',     pressureRead({ gauge: 0.55 }).value === 0.55);
assert('pressure without gauge withholds', pressureRead({}).withheld === true);
assert('convergenceRead carries state',    convergenceRead({ convergence: 0.81, stateLabel: 'HIGH CONVERGENCE' }).label === 'HIGH CONVERGENCE');
assert('flow needs a direction',           flowRead({ magnitude: 0.6 }).withheld === true);
assert('flow with direction is grounded',  flowRead({ direction: 'INFLOW', magnitude: 0.64 }).value === 0.64);
assert('flow absence is classified',       flowRead({}).absence === 'TEMPORAL');
assert('driftRead maps a raw divergence',  driftRead(grounded('STRUCTURE_LEADS', 0.26)).value === 0.26);
assert('driftRead withholds on withheld',  driftRead(withheldDivergence).withheld === true);
assert('grounded read rejects non-numeric', (() => { try { groundedRead('SIGNAL', { value: null }); return false; } catch { return true; } })());

// ── composite leverage: multiplicative, weak leg craters it (§18) ──
console.log('\ncomposite leverage (multiplicative, §18):');
const five = [
  signalRead({ pressure: 72, groundedness: 0.8 }),
  flowRead({ direction: 'INFLOW', magnitude: 0.64, groundedness: 0.8 }),
  pressureRead({ gauge: 0.55, groundedness: 0.8 }),
  convergenceRead({ convergence: 0.81, groundedness: 0.8 }),
  driftRead(grounded('STRUCTURE_LEADS', 0.26), { groundedness: 0.8 }),
];
const lev = computeLeverage(five);
// geometricMean(.72,.64,.55,.81,.26) = 0.5565 ; × avgGroundedness 0.80 = 0.4452 → 0.45
assert('geometric mean re-derivable',  lev.geometricMean === 0.56);
assert('avgGroundedness carried',      lev.avgGroundedness === 0.8);
assert('composite = geo × grounded',   lev.value === 0.45);
assert('5/5 coverage',                 lev.groundedCount === 5 && lev.coverage === 1);
assert('components always visible',    lev.components.length === 5);
assert('formula published',            /geometricMean/.test(lev.formula));

// weak leg cannot be masked — an average would hide it, the product cannot
const strongOnly = [signalRead({ pressure: 90 }), convergenceRead({ convergence: 0.9 })];
const withWeakLeg = [...strongOnly, driftRead(grounded('ALIGNED', 0.05))];
assert('weak leg drags the composite down', computeLeverage(withWeakLeg).value < computeLeverage(strongOnly).value);
assert('a zero read craters it',       computeLeverage([...strongOnly, signalRead({ pressure: 0 })]).value === 0);

// withheld legs are excluded from the score AND reported (§22)
const partial = computeLeverage([signalRead({ pressure: 72 }), flowRead({}), pressureRead({})]);
assert('withheld legs excluded',       partial.groundedCount === 1);
assert('withheld legs named',          partial.withheldLenses.includes('FLOW') && partial.withheldLenses.includes('PRESSURE'));
assert('coverage exposes the gap',     partial.coverage === 0.2);
assert('score is not zeroed by absence', partial.value === 0.72);
assert('no grounded legs → ABSENT, not 0',
  computeLeverage([withheldRead('SIGNAL', 'X')]).state === 'ABSENT');

// ── full report: five lenses, rollup order, prose, detail rows ──
console.log('\nfull five-lens report:');
const full = buildScoutingReport('TECHNOLOGY', {
  signal:      signalRead({ pressure: 72, groundedness: 0.8 }),
  flow:        flowRead({ direction: 'INFLOW', magnitude: 0.64, counterparty: 'CAPITAL', groundedness: 0.8 }),
  pressure:    pressureRead({ gauge: 0.55, groundedness: 0.8 }),
  convergence: convergenceRead({ convergence: 0.81, stateLabel: 'HIGH CONVERGENCE', groundedness: 0.8 }),
  drift:       driftRead(grounded('STRUCTURE_LEADS', 0.26), { groundedness: 0.8 }),
}, { now: 2000, vitals: { pressure: 72, volatility: 0.41 } });

assert('five takeaways',               full.takeaways.length === 5);
assert('rollup order is the lens order',
  full.takeaways.map(t => t.lens).join(',') === 'SIGNAL,FLOW,PRESSURE,CONVERGENCE,DRIFT');
assert('every takeaway is cited',      full.takeaways.every(t => t.citation === t.lens));
assert('every takeaway has a receipt', full.takeaways.every(t => t.drill && typeof t.drill === 'object'));
assert('composite present',            full.leverage.value === 0.45);
assert('prose names the coverage',     /5 of 5 lenses/.test(full.summary));
assert('vitals carried',               full.vitals.pressure === 72);
assert('detail row per lens',          full.detail.length === 5);
assert('detail carries receipts',      full.detail.find(d => d.lens === 'DRIFT').receipt.facetA === 'structural:MEDIA:1');
assert('nothing unsupplied',           full.unsupplied.length === 0);
assert('report frozen deep enough',    Object.isFrozen(full.detail) && Object.isFrozen(full.leverage));

// mixed grounded + withheld — the honest middle case
const mixed = buildScoutingReport('CAPITAL', {
  signal: signalRead({ pressure: 44 }),
  flow:   flowRead({}),
  drift:  withheldDivergence,
});
assert('mixed report keeps both kinds', mixed.takeaways.filter(t => t.state === 'GROUNDED').length === 1
                                      && mixed.takeaways.filter(t => t.state === 'WITHHELD').length === 2);
assert('mixed prose names withheld lenses', /withheld/.test(mixed.summary));
assert('unsupplied lenses still listed', mixed.unsupplied.length === 2);

// ── contract guard ──
console.log('\ncontract:');
let threw = false; try { buildScoutingReport(); } catch { threw = true; }
assert('domain required',              threw);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
