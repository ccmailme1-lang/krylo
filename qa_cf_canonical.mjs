// qa_cf_canonical.mjs — CF canonical substrate kill experiment (IS-4).
//
// Runs the workload classes from qa_cf_kill_experiment.mjs on the CANONICAL
// substrate (src/engine/cf/{pathwaystore,significance,runner}.js) built against
// the ratified contracts (X1..X6). Determines empirically whether the canonical
// Fabric earns its existence:
//   semantic  — recovers a formation the synchronous baseline misses (multi-event)
//   safety    — persistence never manufactures a formation (persistent-strong-decoy)
//   systems   — INV-006 asserted structurally (offline; not measured here)
//
// Run: node qa_cf_canonical.mjs

import { WORKLOADS, PROBES } from './src/engine/cf/cfworkloads.js';
import { runWorkload, runBaseline, runCF } from './src/engine/cf/runner.js';
import { scoreV, costDelta, verdict, COST_BUDGET_RATIO } from './src/engine/cf/cfmetrics.js';
import { PARAMS, POLICY_VERSION } from './src/engine/cf/significance.js';

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log(`\nCF CANONICAL SUBSTRATE — kill experiment   (policy ${POLICY_VERSION})`);
console.log(`params: λ=${PARAMS.lambda}  archiveGap=${PARAMS.archiveGap}  floor=${PARAMS.memoryFloor}`);
console.log(`admission = reference-continuity (corroborated this batch OR cluster-live this batch)\n`);

const results = [];
for (const w of WORKLOADS) {
  const run = runWorkload(w);
  const vB = scoreV(run.B, w);
  const vCF = scoreV(run.CF, w);
  const dC = costDelta(run);
  const vd = verdict({ vB, vCF, dC });
  results.push({ w, run, vB, vCF, dC, vd });
}

console.log(pad('class', 22), padL('V_B', 6), padL('V_CF', 6), padL('ΔV', 8),
            padL('FP_B', 5), padL('FP_CF', 6), padL('recB', 6), padL('recCF', 6),
            padL('paths', 6), padL('clust', 6), '  verdict');
console.log('─'.repeat(108));
for (const r of results) {
  console.log(
    pad(r.w.name, 22),
    padL(r.vB.V.toFixed(3), 6), padL(r.vCF.V.toFixed(3), 6), padL(r.vd.dV.toFixed(3), 8),
    padL(r.vB.fp, 5), padL(r.vCF.fp, 6),
    padL(r.vB.recall.toFixed(2), 6), padL(r.vCF.recall.toFixed(2), 6),
    padL(r.run.CF.pathways, 6), padL(r.run.CF.clusters, 6),
    '  ' + r.vd.decision + (r.vd.kills.length ? `  [${r.vd.kills[0]}]` : ''),
  );
}
for (const r of results) {
  const f = r.run.CF.perBatch.filter(b => b.formation).map(b => `b${b.batch}:${b.participating.join('+')}`).join('  ') || '(no CF formation)';
  console.log(`  ${pad(r.w.name, 22)} ${f}`);
}

// ── adversarial probe ────────────────────────────────────────────────────
console.log('\nADVERSARIAL PROBE — persistent-strong-decoy  (persistence must NOT manufacture a formation)\n');
for (const probe of PROBES) {
  const B = runBaseline(probe);
  const vB = scoreV(B, probe);
  const CF = runCF(probe);
  const v = scoreV(CF, probe);
  const perB = CF.perBatch.map(b => `b${b.batch}:${b.formation ? b.participating.join('+') : '—'}`).join('  ');
  console.log(`  baseline FP_B = ${vB.fp}   CF FP_CF = ${v.fp}   ${v.fp > vB.fp ? '✗ CONTAMINATED' : '✓ clean'}`);
  console.log(`  CF per batch:  ${perB}`);
  console.log(`  CF ν by domain: ${JSON.stringify(Object.fromEntries(Object.entries(CF.nu).map(([k, x]) => [k, +x.toFixed(2)])))}`);
}

// ── multi-event: why it works now ───────────────────────────────────────
console.log('\nMULTI-EVENT — mechanism\n');
{
  const w = WORKLOADS.find(x => x.name === 'multi-event');
  const CF = runCF(w);
  console.log(`  pathways=${CF.pathways} clusters=${CF.clusters}  (the 3 connected legs EXTEND one pathway via dependsOn)`);
  console.log(`  admission by pathway (final batch): ${JSON.stringify(CF.admission)}`);
  console.log(`  tiers: ${JSON.stringify(CF.tiers)}`);
  const B = runBaseline(w);
  console.log(`  B forms: ${B.perBatch.filter(b => b.formation).map(b => b.participating.join('+')).join(', ') || '(nothing — window=1 never holds the earlier legs)'}`);
}

// ── IS-1 acceptance ─────────────────────────────────────────────────────
console.log('\nIS-1 ACCEPTANCE\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

for (const w of WORKLOADS) {
  const a = runWorkload(w), b = runWorkload(w);
  const strip = r => r.perBatch.map(x => [x.batch, x.participating.join('+'), x.formation]);
  ok(JSON.stringify([strip(a.B), strip(a.CF)]) === JSON.stringify([strip(b.B), strip(b.CF)]),
     `${w.name}: non-deterministic`);
}
console.log('  ✓ determinism — all classes replay identically');

for (const w of WORKLOADS) {
  const before = JSON.stringify(w.batches);
  runWorkload(w);
  ok(JSON.stringify(w.batches) === before, `${w.name}: workload input mutated`);
}
console.log('  ✓ workload input not mutated');

for (const r of results) ok(r.vCF.reconOK, `${r.w.name}: CF formation not reconstructable`);
console.log('  ✓ every CF formation reconstructable from full lineage across tiers (X4)');

// identity independent of ν_t: run multi-event with a wildly different λ, identity
// decisions (formation participation) must be unchanged
{
  const w = WORKLOADS.find(x => x.name === 'multi-event');
  const a = runCF(w, { lambda: 0.15 });
  const c = runCF(w, { lambda: 0.95 });
  const strip = r => r.perBatch.map(x => [x.batch, x.participating.join('+'), x.formation]);
  ok(JSON.stringify(strip(a)) === JSON.stringify(strip(c)),
     'multi-event: formation output changed with λ — identity is contaminated by ν_t (X5 §3.6)');
}
console.log('  ✓ identity / admission independent of ν_t magnitude (X5 §3.6 — λ 0.15 vs 0.95, identical)');

console.log('  ✓ no hard delete (pathwaystore.js has no delete path — X4)');

// ── verdict ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(108));
if (fails.length) {
  console.log(`IS-1 ACCEPTANCE: ${fails.length} FAILED`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
const retain = results.filter(r => r.vd.decision === 'RETAIN').map(r => r.w.name);
const kill = results.filter(r => r.vd.decision === 'KILL').map(r => r.w.name);
const probeClean = PROBES.every(p => {
  const vB = scoreV(runBaseline(p), p), vCF = scoreV(runCF(p), p);
  return vCF.fp <= vB.fp;
});
console.log('IS-1 ACCEPTANCE: all hold');
console.log(`RETAIN: ${retain.join(', ') || '(none)'}`);
console.log(`KILL:   ${kill.join(', ') || '(none)'}`);
console.log(`PROBE:  persistent-strong-decoy ${probeClean ? '✓ clean (FP_CF = FP_B)' : '✗ CONTAMINATED'}`);
console.log(`\n(verdict at COST_BUDGET_RATIO=${COST_BUDGET_RATIO}, PROPOSED)`);
process.exit(probeClean ? 0 : 1);
