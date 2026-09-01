// src/engine/cf/cfmetrics.js — KRYL-1248 (CF Kill Experiment).
//
// Pure scoring. No engine calls. Turns a runWorkload() result + the workload's
// ground truth into V_structural, a comparable cost delta, and a per-class
// KILL / RETAIN verdict per CF spec §31–§33 / H5.
//
// Constants declared with basis (CLAUDE.md §1). All are PROPOSED pending the
// Founder rulings in SPEC-cf-kill-experiment.md §7 — none are load-bearing beyond
// the stated formula.
export const W = {
  recall:   0.50,   // primary — CF §31 makes recall the decisive axis
  reuse:    0.20,   // §32 FormationReuse
  revision: 0.30,   // §32 TimeToFormationRevision (only when a revision leg exists)
  fpCrater: 1.00,   // §31 Case 1 / §33.4 — any unsupported admission craters V
};
// How many × the baseline's compute the Fabric is permitted before the cost is
// scored as "maximal" (ΔC = 1). This is the compute↔structural-value exchange
// rate and is the single most consequential constant in the verdict — it is a
// Founder ruling, not an engineering choice (SPEC-cf-kill-experiment.md §7).
export const COST_BUDGET_RATIO = 4;   // PROPOSED — CF may cost up to 4× B.

const set = arr => [...new Set(arr)].sort();
const supersetOf = (have, need) => need.every(d => have.includes(d));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ── V_structural ────────────────────────────────────────────────────────────
export function scoreV(run, workload) {
  const truth = workload.truth;
  const batches = workload.batches;

  // recall — fraction of true continuations admitted at some batch
  const admittedSets = run.perBatch.filter(b => b.formation).map(b => b.participating);
  const cont = truth.continuations ?? [];
  const hit = cont.filter(c => admittedSets.some(a => supersetOf(a, c)));
  const recall = cont.length ? hit.length / cont.length : 0;

  // false positives — an admitted formation touching a decoy domain, OR (Case 3B)
  // claiming a continuation that is true-but-unreachable
  const decoys = new Set(truth.decoyDomains ?? []);
  const unreachable = truth.unreachableTruth ?? [];
  let fp = 0;
  for (const a of admittedSets) {
    if (a.some(d => decoys.has(d))) fp += 1;
    if (unreachable.some(u => supersetOf(a, u))) fp += 1;
  }

  // formation reuse — batches where the formation is carried by prior-batch pathway
  // state (current batch alone would not form it). Baseline B has no persistence,
  // so this is structurally 0 for B — that asymmetry is the point.
  let reuseNum = 0, reuseDen = 0;
  if (run.path === 'CF') {
    for (const b of run.perBatch) {
      if (!b.formation) continue;
      reuseDen += 1;
      const currentOnly = batches[b.batch] ?? [];
      const soloDomains = set(currentOnly
        .filter(p => (p.confidence ?? 0) / 100 >= 0.40)
        .map(p => String(p.domain).toUpperCase()));
      // if fewer than 2 strong domains this batch, the formation had to come from persistence
      if (soloDomains.length < 2) reuseNum += 1;
    }
  }
  const reuse = reuseDen ? reuseNum / reuseDen : 0;

  // time-to-revision — batches between the contradicting observation landing and
  // the record reflecting it (revision leg's net magnitude ≤ 0)
  let ttr = null, revisionScore = null;
  if (truth.revisionLeg) {
    const leg = truth.revisionLeg;
    const landed = truth.revisionBatch ?? 0;
    const revBatch = run.perBatch.find(b => b.batch >= landed && b.formation && (b.domainNet?.[leg] ?? 1) <= 0);
    ttr = revBatch ? revBatch.batch - landed : Infinity;
    revisionScore = ttr === Infinity ? 0 : 1 / (1 + ttr);
  }

  // path reconstruction — every admitted formation must replay to its observations
  const reconOK = run.perBatch.filter(b => b.formation).every(b => b.reconstructable === true);

  // compose
  let V;
  if (truth.revisionLeg) {
    const wsum = W.recall + W.reuse + W.revision;
    V = (W.recall * recall + W.reuse * reuse + W.revision * revisionScore) / wsum;
  } else {
    const wsum = W.recall + W.reuse;
    V = (W.recall * recall + W.reuse * reuse) / wsum;
  }
  if (fp > 0) V = Math.max(0, V - W.fpCrater);

  return { V: clamp(V, 0, 1), recall, fp, reuse, ttr, revisionScore, reconOK };
}

// ── ΔC — cost delta on the same [-1,1] scale as ΔV ─────────────────────────
// A cost increase equal to the full permitted budget (COST_BUDGET_RATIO − 1
// times the baseline) scores ΔC = 1. Under budget → < 1. Cheaper than B → < 0.
//
// Derived from the DETERMINISTIC compute proxy only. Wall-time at this offline
// experiment scale (µs, no real connector I/O) is noise and is excluded from the
// verdict — it is reported separately, informational. Production latency must be
// re-measured against real connector I/O before a production verdict (spec §4).
export function costDelta(run, _wall, budgetRatio = COST_BUDGET_RATIO) {
  const span = Math.max(budgetRatio - 1, 1e-6);
  const relCompute = (run.CF.compute - run.B.compute) / Math.max(run.B.compute, 1) / span;
  return clamp(relCompute, -1, 1);
}

// ── Verdict per class (CF §31–§33 / H5) ────────────────────────────────────
export function verdict({ vB, vCF, dC }) {
  const dV = vCF.V - vB.V;

  const kills = [];
  if (dV <= dC)                          kills.push('H5: ΔV ≤ ΔC (cost not justified)');
  if (vCF.fp > vB.fp)                    kills.push('§33.4: CF admits more unsupported structure');
  if (!vCF.reconOK)                      kills.push('§33.5: CF cannot preserve complete provenance');
  if (dV <= 0 && vCF.reuse === 0)        kills.push('§33.1/§33.8: no advantage over synchronous lineage');

  return {
    dV: +dV.toFixed(4),
    dC: +dC.toFixed(4),
    decision: kills.length ? 'KILL' : 'RETAIN',
    kills,
  };
}
