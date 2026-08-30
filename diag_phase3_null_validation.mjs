// diag_phase3_null_validation.mjs — Phase 3 narrow null-model validation gate.
// Validates the null declared in specs/SPEC-phase3-hierarchy-evidence-specification.md §3B against
// the real 28-node / 24-edge TYPED_EDGES dataset. Standalone diagnostic — imports nothing from
// structuralrecognition.js, modifies nothing. No new metrics: only the pre-registered H1 (depth
// concentration) and H2 (path concentration), plus constraint checks.
// Run: node diag_phase3_null_validation.mjs

import { registerChokepointEdges } from './src/engine/chokepointedges.js';
import { TYPED_EDGES } from './src/engine/entitytopologyregistry.js';

registerChokepointEdges();

const SAMPLES = 500;
const SEED = 1;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── graph helpers (directed) ────────────────────────────────────────────────────────────────────
function buildAdj(nodes, edges) {
  const out = new Map(nodes.map(n => [n, []]));
  const inn = new Map(nodes.map(n => [n, []]));
  for (const [a, b] of edges) { out.get(a).push(b); inn.get(b).push(a); }
  return { out, inn };
}

function isDAG(nodes, edges) {
  const { out } = buildAdj(nodes, edges);
  const color = new Map(nodes.map(n => [n, 0]));
  let cyclic = false;
  const dfs = (n) => {
    color.set(n, 1);
    for (const m of out.get(n)) {
      if (color.get(m) === 1) { cyclic = true; return; }
      if (color.get(m) === 0) { dfs(m); if (cyclic) return; }
    }
    color.set(n, 2);
  };
  for (const n of nodes) { if (color.get(n) === 0) dfs(n); if (cyclic) break; }
  return !cyclic;
}

// longest directed path from each node (memoized; graph is a DAG)
function depths(nodes, edges) {
  const { out } = buildAdj(nodes, edges);
  const memo = new Map();
  const d = (n) => {
    if (memo.has(n)) return memo.get(n);
    let best = 0;
    for (const m of out.get(n)) best = Math.max(best, 1 + d(m));
    memo.set(n, best);
    return best;
  };
  return nodes.map(d);
}

function meanStd(v) {
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const variance = v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length;
  return { mean, std: Math.sqrt(variance) };
}

// H1 — Depth Concentration: std-dev of node depth (pre-registered §3C.1)
function H1(nodes, edges) {
  return meanStd(depths(nodes, edges)).std;
}

// H2 — Path Concentration: fraction of all source→sink paths through the single
// highest-betweenness interior node (pre-registered §3C.2)
function H2(nodes, edges) {
  const { out, inn } = buildAdj(nodes, edges);
  const sources = nodes.filter(n => inn.get(n).length === 0);
  const sinks = new Set(nodes.filter(n => out.get(n).length === 0));
  const through = new Map(nodes.map(n => [n, 0]));
  let total = 0;
  const walk = (n, visited) => {
    if (sinks.has(n)) {
      total++;
      for (const v of visited) if (v !== n) through.set(v, through.get(v) + 1);
      return;
    }
    for (const m of out.get(n)) { visited.push(m); walk(m, visited); visited.pop(); }
  };
  for (const s of sources) walk(s, [s]);
  if (total === 0) return 0;
  const interior = nodes.filter(n => inn.get(n).length > 0 && out.get(n).length > 0);
  if (!interior.length) return 0;
  const maxThrough = Math.max(...interior.map(n => through.get(n)));
  return maxThrough / total;
}

// Level histogram — the level-assignment procedure the spec's H1 depends on is longest-path rank
// (§3C.1 "longest directed path from that node"). Histogram = count of nodes at each depth.
function levelHistogram(nodes, edges) {
  const d = depths(nodes, edges);
  const h = {};
  for (const v of d) h[v] = (h[v] ?? 0) + 1;
  return h;
}

// ── declared null: degree-sequence-preserving directed rewiring, acyclicity preserved (§3B.2) ───
function rewire(nodes, edges, rand, maxAttempts = 20000) {
  const e = edges.map(([a, b]) => [a, b]);
  const has = (a, b) => e.some(([x, y]) => x === a && y === b);
  let swaps = 0;
  const target = e.length * 10; // standard: ~10x edge count for mixing
  for (let attempt = 0; attempt < maxAttempts && swaps < target; attempt++) {
    const i = Math.floor(rand() * e.length);
    const j = Math.floor(rand() * e.length);
    if (i === j) continue;
    const [a, b] = e[i], [c, d] = e[j];
    if (a === d || c === b) continue;          // would create self-loop
    if (has(a, d) || has(c, b)) continue;      // would duplicate an edge
    const trial = e.map((pair, k) => (k === i ? [a, d] : k === j ? [c, b] : pair));
    if (!isDAG(nodes, trial)) continue;        // acyclicity preserved (declared constraint)
    e[i] = [a, d]; e[j] = [c, b];
    swaps++;
  }
  return { edges: e, swaps };
}

// ── observed graph ──────────────────────────────────────────────────────────────────────────────
const obsEdges = TYPED_EDGES.map(x => [x.from, x.to]);
const nodes = [...new Set(obsEdges.flat())];
const obsH1 = H1(nodes, obsEdges);
const obsH2 = H2(nodes, obsEdges);
const obsHist = levelHistogram(nodes, obsEdges);
const { out: obsOut, inn: obsInn } = buildAdj(nodes, obsEdges);
const obsOutSeq = nodes.map(n => obsOut.get(n).length).sort((a, b) => a - b).join(',');
const obsInSeq = nodes.map(n => obsInn.get(n).length).sort((a, b) => a - b).join(',');

console.log('════ OBSERVED (real TYPED_EDGES) ════');
console.log(`nodes ${nodes.length} | edges ${obsEdges.length} | DAG ${isDAG(nodes, obsEdges)}`);
console.log(`H1 depth-concentration (std of depth) = ${obsH1.toFixed(4)}`);
console.log(`H2 path-concentration                 = ${obsH2.toFixed(4)}`);
console.log(`level histogram (depth: count)        = ${JSON.stringify(obsHist)}`);

// ── null ensemble ───────────────────────────────────────────────────────────────────────────────
const rand = mulberry32(SEED);
const h1s = [], h2s = [], hists = [];
let violations = { degreeOut: 0, degreeIn: 0, nodeCount: 0, edgeCount: 0, notDag: 0 };
let generated = 0, failedMix = 0;

for (let s = 0; s < SAMPLES; s++) {
  const { edges: nullEdges, swaps } = rewire(nodes, obsEdges, rand);
  if (swaps === 0) { failedMix++; continue; }
  generated++;

  // CHECK 4 — constraint preservation, every sample
  const { out: no, inn: ni } = buildAdj(nodes, nullEdges);
  if (nodes.map(n => no.get(n).length).sort((a, b) => a - b).join(',') !== obsOutSeq) violations.degreeOut++;
  if (nodes.map(n => ni.get(n).length).sort((a, b) => a - b).join(',') !== obsInSeq) violations.degreeIn++;
  if ([...new Set(nullEdges.flat())].length > nodes.length) violations.nodeCount++;
  if (nullEdges.length !== obsEdges.length) violations.edgeCount++;
  if (!isDAG(nodes, nullEdges)) violations.notDag++;

  h1s.push(H1(nodes, nullEdges));
  h2s.push(H2(nodes, nullEdges));
  if (hists.length < 5) hists.push(levelHistogram(nodes, nullEdges));
}

const s1 = meanStd(h1s), s2 = meanStd(h2s);
const z1 = s1.std > 0 ? (obsH1 - s1.mean) / s1.std : (obsH1 > s1.mean ? Infinity : 0);
const z2 = s2.std > 0 ? (obsH2 - s2.mean) / s2.std : (obsH2 > s2.mean ? Infinity : 0);
const eff1 = s1.mean !== 0 ? Math.abs(obsH1 - s1.mean) / s1.mean : 0;
const eff2 = s2.mean !== 0 ? Math.abs(obsH2 - s2.mean) / s2.mean : 0;

console.log(`\n════ NULL ENSEMBLE (${generated} valid samples, ${failedMix} failed to mix) ════`);
console.log(`CHECK 1 — depth concentration H1: null mean ${s1.mean.toFixed(4)} sd ${s1.std.toFixed(4)} | observed ${obsH1.toFixed(4)} | z=${z1.toFixed(3)} | effect=${(eff1 * 100).toFixed(1)}%`);
console.log(`CHECK 2 — path concentration  H2: null mean ${s2.mean.toFixed(4)} sd ${s2.std.toFixed(4)} | observed ${obsH2.toFixed(4)} | z=${z2.toFixed(3)} | effect=${(eff2 * 100).toFixed(1)}%`);
console.log(`CHECK 3 — level histograms (first 5 nulls vs observed):`);
console.log(`          observed: ${JSON.stringify(obsHist)}`);
hists.forEach((h, i) => console.log(`          null[${i}]:  ${JSON.stringify(h)}`));
console.log(`CHECK 4 — constraint preservation across ${generated} samples:`);
console.log(`          out-degree sequence violations: ${violations.degreeOut}`);
console.log(`          in-degree  sequence violations: ${violations.degreeIn}`);
console.log(`          node-count violations:          ${violations.nodeCount}`);
console.log(`          edge-count violations:          ${violations.edgeCount}`);
console.log(`          DAG-property violations:        ${violations.notDag}`);

const constraintsOk = Object.values(violations).every(v => v === 0);
const enoughSamples = generated >= SAMPLES;
const separates = (Math.abs(z1) >= 1.65 && eff1 >= 0.20) || (Math.abs(z2) >= 1.65 && eff2 >= 0.20);

console.log(`\n════ GATE ════`);
console.log(`constraints preserved on every sample: ${constraintsOk}`);
console.log(`>=500 valid null samples generated:    ${enoughSamples} (${generated})`);
console.log(`distributional separation on >=1 pre-registered metric: ${separates}`);
// Label discipline: "null invalid" would be wrong when Check 4 shows 0 constraint violations —
// the null is a mechanically valid counterfactual. Report the null's validity and the separation
// outcome as two distinct facts, since they can and did diverge.
const nullValid = constraintsOk && enoughSamples;
if (nullValid && separates)      console.log(`\nNULL VALIDATED — SEPARATION DEMONSTRATED — PHASE 3 ACCEPTED`);
else if (nullValid && !separates) console.log(`\nOBSERVED STRUCTURE NOT SEPARATED — NULL MODEL VALID — PHASE 3 GATE FAILED`);
else                              console.log(`\nNULL MODEL INVALID (constraints or sampling failed) — PHASE 3 REMAINS OPEN`);
