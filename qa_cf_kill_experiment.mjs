// qa_cf_kill_experiment.mjs — KRYL-1248 (CF Kill Experiment).
//
// Operationalizes SPEC-cf-kill-experiment.md. Runs each workload class through the
// synchronous baseline B and the persistent-pathway candidate CF under equated
// budgets, N=5 deterministic runs, and prints a per-class KILL / RETAIN verdict
// from measured ΔV_structural vs ΔC_compute+latency.
//
// Exit 0 iff the HARNESS INVARIANTS hold — a per-class KILL is a valid result, not
// a harness failure. Exit 1 iff an invariant fails (the experiment is not sound).
//
// Run: node qa_cf_kill_experiment.mjs

import { performance } from 'node:perf_hooks';
import { WORKLOADS, WORKLOAD_BY_NAME } from './src/engine/cf/cfworkloads.js';
import { runWorkload, runBaseline, runCF } from './src/engine/cf/cfrunner.js';
import { scoreV, costDelta, verdict, COST_BUDGET_RATIO } from './src/engine/cf/cfmetrics.js';

const N = 5;
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// ── run every class ─────────────────────────────────────────────────────────
const results = [];
for (const w of WORKLOADS) {
  const wallB = [], wallCF = [];
  let run = null;
  for (let k = 0; k < N; k++) {
    let t = performance.now(); const B  = runBaseline(w); wallB.push(performance.now() - t);
    t = performance.now();     const CF = runCF(w);       wallCF.push(performance.now() - t);
    run = { name: w.name, B, CF };
  }
  const wall = { B: median(wallB), CF: median(wallCF) };
  const vB  = scoreV(run.B, w);
  const vCF = scoreV(run.CF, w);
  const dC  = costDelta(run, wall);
  const vd  = verdict({ vB, vCF, dC });
  results.push({ w, run, wall, vB, vCF, dC, vd });
}

// ── table ───────────────────────────────────────────────────────────────────
console.log('\nCF KILL EXPERIMENT — per workload class\n');
console.log(pad('class', 22), padL('V_B', 6), padL('V_CF', 6), padL('ΔV', 8),
            padL('cmpB', 6), padL('cmpCF', 6), padL('ΔC', 8),
            padL('FP_B', 5), padL('FP_CF', 6), padL('wallΔ%', 8), '  verdict');
console.log('─'.repeat(112));
for (const r of results) {
  const wallPct = r.wall.B > 0 ? ((r.wall.CF - r.wall.B) / r.wall.B * 100) : 0;
  console.log(
    pad(r.w.name, 22),
    padL(r.vB.V.toFixed(3), 6), padL(r.vCF.V.toFixed(3), 6), padL(r.vd.dV.toFixed(3), 8),
    padL(r.run.B.compute, 6), padL(r.run.CF.compute, 6), padL(r.vd.dC.toFixed(3), 8),
    padL(r.vB.fp, 5), padL(r.vCF.fp, 6), padL(wallPct.toFixed(0) + '%', 8),
    '  ' + r.vd.decision + (r.vd.kills.length ? `  [${r.vd.kills[0]}]` : ''),
  );
}
console.log('  (wallΔ% informational only — µs scale, no real connector I/O; excluded from ΔC / verdict)');
console.log(`\n  (verdict above computed at COST_BUDGET_RATIO = ${COST_BUDGET_RATIO}, PROPOSED — the compute↔value exchange rate is a Founder ruling)\n`);
for (const r of results) {
  const rc = r.run.CF.releases.map(x => x.leg).join(',') || '—';
  console.log(`  ${pad(r.w.name, 22)} recall B/CF ${r.vB.recall.toFixed(2)}/${r.vCF.recall.toFixed(2)}` +
              `  reuse_CF ${r.vCF.reuse.toFixed(2)}  ttr_CF ${r.vCF.ttr ?? 'n/a'}  released ${rc}` +
              `  ν ${JSON.stringify(Object.fromEntries(Object.entries(r.run.CF.nu ?? {}).map(([k, v]) => [k, +v.toFixed(2)])))}`);
}

// ── sensitivity: verdict vs the compute↔value exchange rate ─────────────────
console.log('\nSENSITIVITY — verdict per class at COST_BUDGET_RATIO ∈ {2, 4, 8, 16}:\n');
console.log(pad('class', 22) + ['2×', '4×', '8×', '16×'].map(s => padL(s, 8)).join(''));
for (const r of results) {
  const row = [2, 4, 8, 16].map(ratio => {
    const dC = costDelta(r.run, r.wall, ratio);
    return padL(verdict({ vB: r.vB, vCF: r.vCF, dC }).decision, 8);
  });
  console.log(pad(r.w.name, 22) + row.join(''));
}

// ── harness invariants (NOT the verdicts) ───────────────────────────────────
const fails = [];
const ok = (cond, label) => { if (!cond) fails.push(label); };

// 1. single-shot must KILL — proves the discriminator works
ok(results.find(r => r.w.name === 'single-shot').vd.decision === 'KILL',
   'single-shot did not KILL — ΔV>ΔC discriminator is broken');

// 2. every admitted formation reconstructable, both paths
for (const r of results) {
  ok(r.vB.reconOK,  `${r.w.name}: a baseline formation was not reconstructable`);
  ok(r.vCF.reconOK, `${r.w.name}: a CF formation was not reconstructable (§33.5)`);
}

// 3. no decoy / non-true-continuation observation ever released by the stub C_r
for (const r of results) {
  for (const rel of r.run.CF.releases) {
    const hb = (r.w.heldBack ?? []).find(h => String(h.leg).toUpperCase() === rel.leg);
    ok(hb && hb.reachable === true && hb.trueContinuation === true,
       `${r.w.name}: C_r released ${rel.leg} which is not a reachable true continuation (§31 Case 1)`);
  }
}

// 4. Case-3B — true continuation out of reach: CF must not gain recall or hallucinate
{
  const r = results.find(x => x.w.name === 'frontier-inaccessible');
  ok(r.vCF.recall === r.vB.recall, 'frontier-inaccessible: CF recall diverged from B on an unreachable frontier');
  ok(r.vCF.fp === 0, 'frontier-inaccessible: CF fabricated an unreachable continuation (§31 Case 3B)');
  ok(r.run.CF.releases.length === 0, 'frontier-inaccessible: CF released an unreachable observation');
}

// 5. B and CF consume identical batches (the runner must not mutate workload input)
for (const r of results) {
  const before = JSON.stringify(r.w.batches);
  runBaseline(r.w); runCF(r.w);
  ok(JSON.stringify(r.w.batches) === before, `${r.w.name}: workload batches mutated by a run`);
}

// 6. determinism — a re-run of every class yields identical structural output AND
//    an identical verdict (ΔC is compute-proxy only, no wall-time in the verdict)
for (const w of WORKLOADS) {
  const a = runWorkload(w), b = runWorkload(w);
  const strip = run => run.perBatch.map(x => [x.batch, x.participating.join('+'), x.formation, x.releasedLegs.join(',')]);
  ok(JSON.stringify([strip(a.B), strip(a.CF)]) === JSON.stringify([strip(b.B), strip(b.CF)]),
     `${w.name}: non-deterministic structural output across runs`);
  const vdOf = run => verdict({ vB: scoreV(run.B, w), vCF: scoreV(run.CF, w), dC: costDelta(run) }).decision;
  ok(vdOf(a) === vdOf(b), `${w.name}: non-deterministic verdict across runs`);
}

console.log('\n' + '─'.repeat(104));
if (fails.length) {
  console.log(`HARNESS INVARIANTS: ${fails.length} FAILED`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
const retained = results.filter(r => r.vd.decision === 'RETAIN').map(r => r.w.name);
const killed   = results.filter(r => r.vd.decision === 'KILL').map(r => r.w.name);
console.log('HARNESS INVARIANTS: all hold');
console.log(`RETAIN: ${retained.join(', ') || '(none)'}`);
console.log(`KILL:   ${killed.join(', ') || '(none)'}`);
process.exit(0);
