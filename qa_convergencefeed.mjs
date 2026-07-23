// qa_convergencefeed.mjs
// Convergence lens producer — step/perceived/observed feed for "Shade between lines".
// Guards: correct trailing MA (detect-not-predict), convergence vs divergence via the gap,
// §22 absence (null, never 0), explicit-perceived override, exact CSV format.

import { computeConvergenceBands, toFlourishCSV, DEFAULT_MA_WINDOW } from './src/engine/convergencefeed.js';

let pass = 0, fail = 0;
const eq = (a, b, t = 1e-9) => Math.abs(a - b) < t;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('Convergence feed — Shade between lines producer\n');

// ── trailing moving average (window 2) ──
console.log('perceived = trailing MA (detect-not-predict):');
const b = computeConvergenceBands([10, 20, 30, 40], { window: 2 });
assert('perceived[0] = 10 (only itself)',      eq(b[0].perceived, 10));
assert('perceived[1] = 15 (mean 10,20)',       eq(b[1].perceived, 15));
assert('perceived[2] = 25 (mean 20,30)',       eq(b[2].perceived, 25));
assert('observed passed through',              eq(b[3].observed, 40) && eq(b[3].perceived, 35));
assert('dispersion = |observed - perceived|',  eq(b[1].dispersion, 5) && eq(b[3].dispersion, 5));

// ── convergence (aligned → tiny gap) vs divergence (jump → wide gap) ──
console.log('\nconvergence vs divergence (the gap):');
const flat  = computeConvergenceBands([50, 50, 50, 50], { window: 3 });
assert('aligned series → ~0 dispersion (convergence)', flat.every(x => eq(x.dispersion, 0)));
const spike = computeConvergenceBands([50, 50, 50, 90], { window: 3 });
assert('spike → dispersion jumps (divergence)', spike[3].dispersion > flat[3].dispersion);

// ── §22 absence: null in → null out, never 0 ──
console.log('\nabsence is absence (§22):');
const withGap = computeConvergenceBands([10, null, 30], { window: 2 });
assert('missing observed → observed null (not 0)',  withGap[1].observed === null);
assert('missing observed → perceived null',         withGap[1].perceived === null);
assert('missing observed → dispersion null',        withGap[1].dispersion === null);

// ── explicit perceived override (two distinct fields) ──
console.log('\nexplicit perceived override:');
const two = computeConvergenceBands([10, 20, 30], { perceived: [12, 18, 33] });
assert('uses explicit perceived, not MA', eq(two[0].perceived, 12) && eq(two[2].perceived, 33));
assert('dispersion vs explicit perceived', eq(two[0].dispersion, 2) && eq(two[2].dispersion, 3));

// ── CSV format ──
console.log('\nFlourish CSV:');
const csv = toFlourishCSV(computeConvergenceBands([10, null, 30], { window: 2 }));
const lines = csv.split('\n');
assert('header = step,perceived,observed', lines[0] === 'step,perceived,observed');
assert('absent step → empty cells (not 0)', lines[2] === '1,,');
assert('default MA window exported', DEFAULT_MA_WINDOW === 5);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
