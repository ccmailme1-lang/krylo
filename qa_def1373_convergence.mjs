// qa_def1373_convergence.mjs -- DEF-1373 v0.5: T, V', magnitude scale, and the five-state mapping.
import { computeT, computeVPrime, toUnitMagnitude, assertMagnitudeScaleConfigured, TEMPORAL_HORIZON_DAYS } from './src/engine/convergenceinputs.js';
import { classifyConvergenceStateMeasured as C } from './src/engine/convergenceclassifier.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
const W = TEMPORAL_HORIZON_DAYS, DAY = 86_400_000;
const at = (d) => new Date(Date.UTC(2026, 0, 1) + d * DAY).toISOString().slice(0, 10);
const label = (v, conf = 0.8) => C(v, conf).label;

console.log('T reference tests (v0.3.4-M tables)');
{
  const t1 = computeT([at(0), at(W / 2), at(W)]);   ok(near(t1.T, 0, 0.02), `{0, W/2, W}: T ~ 0 (got ${t1.T.toFixed(3)})`);
  const t2 = computeT([at(0), at(W / 2), at(W / 2)]); ok(near(t2.T, 0.1835, 0.02), `{0, W/2, W/2}: T ~ 0.1835 (got ${t2.T.toFixed(4)})`);
  ok(computeT([at(10), at(10), at(10)]).T === 1, 'identical dates: T = 1');
  ok(computeT([at(10)]).T === null && computeT([]).T === null, 'fewer than two valid dates: T = null');
  ok(computeT([at(10), 'not a date', null, undefined]).T === null, 'invalid entries are skipped, leaving fewer than two: null');
  ok(computeT([at(10)]).reason === 'insufficient temporal evidence', 'null carries the reason');
}

console.log("V' reference tests");
ok(computeVPrime([0, 1]) === 1, "{0,1}: V' = 1");
ok(computeVPrime([0.5, 0.5, 0.5]) === 0, "identical confidences: V' = 0");
ok(computeVPrime([0.7]) === 0, "single reading: V' = 0 (observed, as in analysisfield.jsx)");
ok(computeVPrime([]) === null && computeVPrime([0.5, NaN]) === null && computeVPrime([0.5, 1.5]) === null, "no readings or an invalid reading: null, not a score");

console.log('Magnitude scale');
ok(toUnitMagnitude(75, '0-100') === 0.75 && toUnitMagnitude(0.75, '0-1') === 0.75, 'fixed mapping for both supported scales');
ok(toUnitMagnitude('x') === null && toUnitMagnitude(NaN) === null && toUnitMagnitude(Infinity) === null, 'non-numeric / non-finite -> null');
{ let code = null; try { assertMagnitudeScaleConfigured(undefined); } catch (e) { code = e.code; } ok(code === 'CONFIGURATION_ERROR', 'missing scale -> CONFIGURATION_ERROR');
  code = null; try { assertMagnitudeScaleConfigured('0-10'); } catch (e) { code = e.code; } ok(code === 'CONFIGURATION_ERROR', 'unsupported scale -> CONFIGURATION_ERROR'); }

console.log('Five-state mapping, precedence and boundaries');
const base = { D: 0.8, A: 0.8, V: 0.3, T: 0.8 };
ok(label(base) === 'HIGH CONVERGENCE', 'strong, aligned, low dispersion: HIGH');
ok(label({ ...base, T: 0.65 }) === 'HIGH CONVERGENCE', 'T = 0.65 exactly: HIGH');
ok(label({ ...base, T: 0.6499 }) === 'BUILDING CONVERGENCE', 'T just below 0.65: BUILDING');
ok(label({ ...base, V: 0.60 }) === 'HIGH CONVERGENCE', "V' = 0.60 exactly: HIGH");
ok(label({ ...base, V: 0.6001 }) === 'BUILDING CONVERGENCE', "V' just above 0.60: BUILDING");
ok(label({ ...base, D: 0.75, A: 0.75 }) === 'HIGH CONVERGENCE', 'D = A = 0.75 exactly: HIGH');
ok(label({ ...base, D: 0.7499, A: 0.7499 }) === 'BUILDING CONVERGENCE', 'D, A just below 0.75: BUILDING');
ok(label({ D: 0.6, A: 0.6, V: 0.8, T: 0.2 }) === 'TURBULENT CONVERGENCE', "V' = 0.80 and T < 0.50: TURBULENT (reachable)");
ok(label({ D: 0.6, A: 0.6, V: 0.7999, T: 0.2 }) === 'BUILDING CONVERGENCE', "V' just below 0.80: BUILDING");
ok(label({ D: 0.6, A: 0.6, V: 0.9, T: 0.50 }) === 'BUILDING CONVERGENCE', 'T = 0.50 exactly: not TURBULENT');
ok(label({ D: 0.6, A: 0.6, V: 0.9, T: 0.4999 }) === 'TURBULENT CONVERGENCE', 'T just below 0.50: TURBULENT');
ok(label({ D: 0.95, A: 0.95, V: 0.9, T: 0.2 }) === 'TURBULENT CONVERGENCE', 'no magnitude gate on TURBULENT (ruling 4)');
ok(label({ D: 0.5, A: 0.5, V: 0.9, T: 0.55 }) === 'BUILDING CONVERGENCE', '0.50 <= T < 0.65 with dispersion: BUILDING');
ok(label({ D: 0.39, A: 0.39, V: 0.9, T: 0.1 }) === 'LOW SIGNAL YIELD' && label({ D: 0.4, A: 0.4, V: 0.3, T: 0.8 }) !== 'LOW SIGNAL YIELD', 'LOW below 0.4 (precedes TURBULENT); 0.4 is not LOW');
ok(label({ D: 0.09, A: 0.09, V: 0.5, T: 0.5 }) === 'INSUFFICIENT SIGNAL' && label({ D: 0.1, A: 0.1, V: 0.5, T: 0.5 }) === 'LOW SIGNAL YIELD', 'INSUFFICIENT below 0.1; 0.1 is not');
ok(label(base, 0.49) === 'INSUFFICIENT SIGNAL' && label(base, 0.5) === 'HIGH CONVERGENCE', 'telemetry confidence < 0.50: INSUFFICIENT; 0.50 is not');

console.log('T = null and invalid evidence (rulings 1 and spec section 7)');
ok(label({ ...base, T: null }) === 'BUILDING CONVERGENCE', 'T = null with valid D, A, V\': BUILDING, never HIGH');
ok(label({ D: 0.6, A: 0.6, V: 0.95, T: null }) === 'BUILDING CONVERGENCE', 'T = null with high dispersion: BUILDING, never TURBULENT');
ok(label({ D: 0.2, A: 0.2, V: 0.5, T: null }) === 'LOW SIGNAL YIELD', 'T = null with low magnitude: LOW (T does not gate LOW)');
for (const bad of [null, undefined, NaN, Infinity, -0.1, 1.1, 'x']) {
  ok(label({ ...base, D: bad }) === 'INSUFFICIENT SIGNAL' && label({ ...base, A: bad }) === 'INSUFFICIENT SIGNAL' && label({ ...base, V: bad }) === 'INSUFFICIENT SIGNAL', `invalid D / A / V' (${String(bad)}): INSUFFICIENT SIGNAL`);
}
for (const bad of [NaN, Infinity, -0.1, 1.1, 'x']) ok(label({ ...base, T: bad }) === 'INSUFFICIENT SIGNAL', `invalid non-null T (${String(bad)}): INSUFFICIENT SIGNAL`);

console.log('Colors and themes are the locked ones');
ok(C({ ...base }, 0.8).theme === 'unicorn_purple' && C({ D: 0.6, A: 0.6, V: 0.9, T: 0.2 }, 0.8).theme === 'signal_blue' && C({ D: 0.6, A: 0.6, V: 0.3, T: 0.8 }, 0.8).theme === 'signal_lime' && C({ D: 0.2, A: 0.2, V: 0.3, T: 0.8 }, 0.8).theme === 'muted_slate' && C({ D: 0, A: 0, V: 0, T: 0 }, 0.8).theme === 'void_gray', 'HIGH purple, TURBULENT blue, BUILDING lime, LOW slate, INSUFFICIENT gray (theme tokens unchanged)');

console.log('Real path: pool signals with event dates -> measured inputs -> classifier');
{
  const { surfaceRouter } = await import('./src/engine/surfacerouter.js');
  const { getDomainSignals, getDomainPressure } = await import('./src/engine/domaingravity.js');
  const { measuredInputsFromSignals } = await import('./src/engine/convergenceinputs.js');
  const now = Date.now();
  // CAPITAL: strong confidences, dated events close together (EDGAR-style, with meta.eventDate)
  ['2026-09-24', '2026-09-25', '2026-09-25', '2026-09-24'].forEach((d, i) => surfaceRouter.dispatchBatch([{ id: 'rp-cap-' + i, domain: 'capital', confidence: 80, ts: now - i * 1000, source: 'EDGAR_8K', meta: { canonicalId: 'sysco', eventDate: d } }]));
  // LABOR: undated ambient feed
  [60, 70].forEach((c, i) => surfaceRouter.dispatchBatch([{ id: 'rp-lab-' + i, domain: 'labor', confidence: c, ts: now - i * 1000, source: 'USAJOBS' }]));
  // OWNERSHIP: dated events spread over the year with split confidences (high dispersion, poor alignment)
  [[ '2025-10-10', 5 ], ['2026-04-10', 95], ['2026-10-01', 5], ['2025-12-15', 95]].forEach(([d, c], i) => surfaceRouter.dispatchBatch([{ id: 'rp-own-' + i, domain: 'ownership', confidence: c, ts: now - i * 1000, source: 'EDGAR_13G', meta: { eventDate: d } }]));
  const run = (dom) => { const sigs = getDomainSignals(dom); const m = getDomainPressure(dom).magnitude; const v = measuredInputsFromSignals(sigs, m); return { v, label: C(v, 0.8).label }; };
  const cap = run('CAPITAL'), lab = run('LABOR'), own = run('OWNERSHIP');
  console.log('  (capital', JSON.stringify(cap.v), cap.label, '| labor T', lab.v.T, lab.label, '| ownership', JSON.stringify(own.v), own.label, ')');
  ok(cap.v.T !== null && cap.v.T > 0.9, 'dated, tightly clustered events: T computed and high');
  ok(cap.label === 'HIGH CONVERGENCE', 'strong, aligned, low-dispersion domain reaches HIGH from real pool entries');
  ok(lab.v.T === null && lab.label === 'BUILDING CONVERGENCE', 'undated domain: T null, state BUILDING (ruling 1), not grayed out');
  ok(own.v.T !== null && own.v.T < 0.5 && own.v.V >= 0.8 && own.label === 'TURBULENT CONVERGENCE', 'dated, dispersed events with split confidences reach TURBULENT from real pool entries');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
