// src/engine/structuralrecognition.js
// EXPERIMENTAL PROTOTYPE — implements the recognition-engine core of
// specs/SPEC-structure-map-formation-gap-factual-reference.md's companion proposal (v0.2,
// "Structural Configuration Recognition / Structure Map Contract"). NOT Founder-ratified, NOT a
// KRYL ticket, NOT wired into any live surface. Pure, additive-only, injectable-input — same
// pattern as formationinference.js/perceptionread.js: built and tested standalone before any live
// wiring decision is made. Do not import this from app.jsx, analysisfield.jsx, or any live
// component without an explicit separate authorization.
//
// PURE over a RelationshipSet — no runtime coupling, no dependency on KRYL-1133's admission
// machinery. The engine accepts whatever relationship-shaped objects it's given (test fixtures
// today; a real admitted-relationship stream if/when one exists). It does not fabricate that
// stream, and it does not claim the stream is real.
//
// Three fixes applied per the review pass on the v0.2 proposal (recorded here, not restated
// in prose elsewhere):
//   1. Stability's "ephemeral" exception is an EXPLICIT input flag (opts.allowEphemeral), never
//      an implicit default — closes the v0.2 §4.1/§5 contradiction (a required gate cannot be
//      silently waived by unstated "domain policy").
//   2. Temporal's "inapplicable" status is coded to mean exactly: contributes zero evidence
//      either direction, never blocks STRUCTURE. No implicit interpretation needed.
//   3. Formation recursion requires the parent Structure's `id` to already exist (returned from
//      a prior call) before it can appear inside a new RelationshipSet — enforced structurally by
//      function composition, not by convention. This closes the self-validation risk: a
//      Structure cannot be used to generate the evidence that proves its own Formation in the
//      same pass, because its id doesn't exist until the call that produces it returns.
//
// NOT implemented: the v0.2 "OR is explicitly treated as a unit by external evidence-grounded
// assertion" Formation path. No authority/evidence contract exists for who can make that
// assertion or what qualifies — the review flagged this correctly. Only the well-defined
// participation path (Structure's id appears as subjectId/objectId in a new relationship) ships.

// ── Determinism: seeded PRNG for Monte Carlo null-model comparison (mulberry32) ─────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DETERMINATION = Object.freeze({
  COLLECTION: 'COLLECTION',
  STRUCTURE: 'STRUCTURE',
  FORMATION: 'FORMATION',
});

export const EVIDENCE_STATUS = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  INCONCLUSIVE: 'inconclusive',
  INAPPLICABLE: 'inapplicable',
});

// Calibration constants — PROPOSED, not Founder-locked. Flagged exactly like
// formationinference.js's CO_PRESENCE_FLOOR pattern: real numbers, real defaults, open to ruling.
export const NULL_MODEL_TRIALS   = 500;  // Monte Carlo sample size for organization/dependence tests
export const ORGANIZATION_Z_MIN  = 1.65; // one-tailed z >= this ~ p<0.05 vs null (PROPOSED)
export const DEPENDENCE_Z_MIN    = 1.65; // same threshold, same status (PROPOSED)
export const MIN_NODES           = 3;    // below this, "organization" is not a meaningful question

// ── Graph construction from a RelationshipSet ────────────────────────────────────────────────────
// A relationship: { id, subjectId, objectId, type, evidenceRefs: [...] , ts? }
// Deduplicates by unordered (subjectId, objectId) pair. This matters specifically for the
// multi-window path (recognizeStructure with windows[]): the same real-world edge legitimately
// recurs across windows (that recurrence is what Stability tests), but Organization/Dependence
// operate on the STRUCTURAL graph, not a raw event log — without dedup, a 3-window relationship
// set inflates E to 3x its real value, which corrupts the null-model comparison for both tests
// (found via QA case 4, corrected same session).
function toGraph(relationships) {
  const nodes = new Set();
  const seen = new Map(); // pairKey -> edge (first occurrence kept; evidenceRefs unioned)
  for (const r of relationships) {
    if (!r || !r.subjectId || !r.objectId || r.subjectId === r.objectId) continue;
    nodes.add(r.subjectId);
    nodes.add(r.objectId);
    const key = [r.subjectId, r.objectId].sort().join('||');
    if (seen.has(key)) {
      const existing = seen.get(key);
      for (const ev of (r.evidenceRefs ?? [])) if (!existing.evidenceRefs.includes(ev)) existing.evidenceRefs.push(ev);
      continue;
    }
    seen.set(key, { a: r.subjectId, b: r.objectId, type: r.type, evidenceRefs: [...(r.evidenceRefs ?? [])], id: r.id });
  }
  return { nodes: [...nodes], edges: [...seen.values()] };
}

function adjacency(nodes, edges) {
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const N = nodes.length;
  const adj = Array.from({ length: N }, () => new Set());
  for (const e of edges) {
    const i = idx.get(e.a), j = idx.get(e.b);
    if (i === undefined || j === undefined || i === j) continue;
    adj[i].add(j); adj[j].add(i);
  }
  return { adj, idx, N };
}

// Degree-variance (heterogeneity). Real complex/organized networks concentrate connectivity
// unevenly (hubs/bridges); Erdős–Rényi random graphs at the same N,E have near-Poisson (low-
// variance) degree distributions. Unlike largest-component-fraction, this doesn't saturate near a
// ceiling once E is comfortably above the connectivity threshold, so it keeps discriminating power
// at realistic relationship-set densities.
function degreeVariance(adj, N) {
  if (N === 0) return 0;
  const degrees = adj.map(s => s.size);
  const { std } = meanStd(degrees);
  return std;
}

// Global clustering coefficient: (3 * triangles) / (connected triples), standard definition.
function globalClustering(adj, N) {
  let triangles = 0, triples = 0;
  for (let u = 0; u < N; u++) {
    const neigh = [...adj[u]];
    const k = neigh.length;
    if (k < 2) continue;
    triples += (k * (k - 1)) / 2;
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++)
        if (adj[neigh[i]].has(neigh[j])) triangles++;
  }
  return triples > 0 ? triangles / triples : 0;
}

// Erdős–Rényi G(N,E) random graph over the same N nodes / E edge count as the observed graph.
function randomGraphSameNE(N, E, rand) {
  const adj = Array.from({ length: N }, () => new Set());
  if (N < 2 || E <= 0) return adj;
  const maxE = (N * (N - 1)) / 2;
  const target = Math.min(E, maxE);
  let placed = 0;
  let guard = 0;
  while (placed < target && guard < target * 50 + 1000) {
    guard++;
    const i = Math.floor(rand() * N);
    const j = Math.floor(rand() * N);
    if (i === j || adj[i].has(j)) continue;
    adj[i].add(j); adj[j].add(i);
    placed++;
  }
  return adj;
}

function meanStd(values) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

// ── Organization Evidence — observed degree-variance vs G(N,E) null (§4.1) ──────────────────────
// Degree-variance (heterogeneity), not largest-component-fraction: the latter saturates near 1.0
// for both observed and null once E is comfortably above the random-graph connectivity threshold,
// masking real signal (found via QA case 2/4 failures, corrected same session). Note: this is one
// valid Organization statistic, not the complete Organization criterion — high degree-variance
// alone (e.g. a bare star graph) does not by itself prove the kind of organized configuration this
// gate is meant to detect. It is a discriminating null-model test, evaluated independently
// alongside Dependence — this file does not fold it into any composite score.
export function organizationEvidence(nodes, edges, opts = {}) {
  const N = nodes.length, E = edges.length;
  if (N < MIN_NODES) {
    return { status: EVIDENCE_STATUS.INAPPLICABLE, reason: `N=${N} < MIN_NODES=${MIN_NODES}`, z: null };
  }
  const { adj } = adjacency(nodes, edges);
  const observed = degreeVariance(adj, N);

  const trials = opts.trials ?? NULL_MODEL_TRIALS;
  const rand = mulberry32(opts.seed ?? 1);
  const samples = [];
  for (let t = 0; t < trials; t++) {
    const nullAdj = randomGraphSameNE(N, E, rand);
    samples.push(degreeVariance(nullAdj, N));
  }
  const { mean, std } = meanStd(samples);
  const z = std > 0 ? (observed - mean) / std : (observed > mean ? Infinity : 0);
  const status = z >= (opts.zMin ?? ORGANIZATION_Z_MIN) ? EVIDENCE_STATUS.PASS : EVIDENCE_STATUS.FAIL;
  return { status, z, observed, nullMean: mean, nullStd: std, trials };
}

// ── Dependence Evidence — observed clustering vs G(N,E) null (§4.1) ─────────────────────────────
export function dependenceEvidence(nodes, edges, opts = {}) {
  const N = nodes.length, E = edges.length;
  if (N < MIN_NODES) {
    return { status: EVIDENCE_STATUS.INAPPLICABLE, reason: `N=${N} < MIN_NODES=${MIN_NODES}`, z: null };
  }
  const { adj } = adjacency(nodes, edges);
  const observed = globalClustering(adj, N);

  const trials = opts.trials ?? NULL_MODEL_TRIALS;
  const rand = mulberry32((opts.seed ?? 1) + 1); // distinct stream from organization test
  const samples = [];
  for (let t = 0; t < trials; t++) {
    const nullAdj = randomGraphSameNE(N, E, rand);
    samples.push(globalClustering(nullAdj, N));
  }
  const { mean, std } = meanStd(samples);
  const z = std > 0 ? (observed - mean) / std : (observed > mean ? Infinity : 0);
  const status = z >= (opts.zMin ?? DEPENDENCE_Z_MIN) ? EVIDENCE_STATUS.PASS : EVIDENCE_STATUS.FAIL;
  return { status, z, observed, nullMean: mean, nullStd: std, trials };
}

// ── Stability Evidence — organization persists across ≥2 supplied windows (§4.1) ────────────────
// windows: RelationshipSet[] — each element is itself an array of relationships for that window.
// Fix #1: the "ephemeral" exception is an explicit opts.allowEphemeral flag, never implicit.
export function stabilityEvidence(windows, opts = {}) {
  if (!Array.isArray(windows) || windows.length < 2) {
    if (opts.allowEphemeral) {
      return { status: EVIDENCE_STATUS.INAPPLICABLE, reason: 'single window; ephemeral exception explicitly requested', windowCount: windows?.length ?? 0 };
    }
    return { status: EVIDENCE_STATUS.FAIL, reason: 'fewer than 2 windows and allowEphemeral not set', windowCount: windows?.length ?? 0 };
  }
  // Persistence signal: does the SAME edge (unordered subject/object pair) recur across windows,
  // beyond what independent random redraws at each window's own N/E would produce?
  const pairKey = (r) => [r.subjectId, r.objectId].sort().join('||');
  const perWindowPairs = windows.map(w => new Set(w.filter(r => r?.subjectId && r?.objectId).map(pairKey)));
  const allPairs = new Set(perWindowPairs.flatMap(s => [...s]));
  let recurring = 0;
  for (const p of allPairs) {
    const count = perWindowPairs.filter(s => s.has(p)).length;
    if (count >= windows.length) recurring++; // present in EVERY window — full persistence
  }
  const observedFraction = allPairs.size > 0 ? recurring / allPairs.size : 0;

  // Null: for each window, redraw the SAME number of pairs uniformly from the union's node pool,
  // then measure the same "present in every window" fraction under independence.
  const trials = opts.trials ?? NULL_MODEL_TRIALS;
  const rand = mulberry32((opts.seed ?? 1) + 2);
  const nodePool = [...new Set(windows.flatMap(w => w.flatMap(r => [r?.subjectId, r?.objectId].filter(Boolean))))];
  const samples = [];
  for (let t = 0; t < trials; t++) {
    const nullWindowPairs = windows.map(w => {
      const s = new Set();
      let guard = 0;
      while (s.size < perWindowPairs[windows.indexOf(w)]?.size && guard < 2000) {
        guard++;
        const i = Math.floor(rand() * nodePool.length);
        const j = Math.floor(rand() * nodePool.length);
        if (i === j) continue;
        s.add([nodePool[i], nodePool[j]].sort().join('||'));
      }
      return s;
    });
    const union = new Set(nullWindowPairs.flatMap(s => [...s]));
    let rec = 0;
    for (const p of union) if (nullWindowPairs.every(s => s.has(p))) rec++;
    samples.push(union.size > 0 ? rec / union.size : 0);
  }
  const { mean, std } = meanStd(samples);
  const z = std > 0 ? (observedFraction - mean) / std : (observedFraction > mean ? Infinity : 0);
  const status = z >= (opts.zMin ?? 1.65) ? EVIDENCE_STATUS.PASS : EVIDENCE_STATUS.FAIL;
  return { status, z, observed: observedFraction, nullMean: mean, nullStd: std, trials, windowCount: windows.length };
}

// ── Temporal Evidence — optional, never a hard gate (Fix #2) ────────────────────────────────────
// Fix #2: status = INAPPLICABLE means exactly "contributes no evidence either direction; does not
// block STRUCTURE." Coded here, not left to interpretation elsewhere.
export function temporalEvidence(relationships, opts = {}) {
  const withTs = relationships.filter(r => typeof r?.ts === 'number');
  if (withTs.length < relationships.length || withTs.length < 2) {
    return { status: EVIDENCE_STATUS.INAPPLICABLE, reason: 'insufficient timestamped relationships', blocksStructure: false };
  }
  // Minimal real test: are timestamps NOT uniformly scattered (i.e., some temporal clustering)?
  // Compare observed inter-arrival variance against a shuffled-order null.
  const sorted = [...withTs].sort((a, b) => a.ts - b.ts);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].ts - sorted[i - 1].ts);
  const { std: observedStd } = meanStd(gaps);
  const rand = mulberry32((opts.seed ?? 1) + 3);
  const trials = opts.trials ?? NULL_MODEL_TRIALS;
  const samples = [];
  for (let t = 0; t < trials; t++) {
    const shuffled = [...gaps];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    samples.push(meanStd(shuffled).std);
  }
  const { mean: nullMean } = meanStd(samples);
  // Lower variance than shuffled-null ~ temporal clustering/coherence signal.
  const status = observedStd < nullMean ? EVIDENCE_STATUS.PASS : EVIDENCE_STATUS.INCONCLUSIVE;
  return { status, observedStd, nullMean, blocksStructure: false };
}

// ── Determination (§5, with Fix #1 made explicit) ────────────────────────────────────────────────
export function determine({ organization, dependence, stability, temporal }, opts = {}) {
  const orgPass   = organization.status === EVIDENCE_STATUS.PASS;
  const depPass   = dependence.status === EVIDENCE_STATUS.PASS;
  const stabPass  = stability.status === EVIDENCE_STATUS.PASS;
  const stabEphemeralExempt = stability.status === EVIDENCE_STATUS.INAPPLICABLE && !!opts.allowEphemeral;
  const tempBlocks = temporal.status === EVIDENCE_STATUS.FAIL; // FAIL only — INAPPLICABLE/INCONCLUSIVE never block (Fix #2)

  if (!orgPass || !depPass) return { determination: DETERMINATION.COLLECTION, reason: 'organization or dependence gate failed' };
  if (!stabPass && !stabEphemeralExempt) return { determination: DETERMINATION.COLLECTION, reason: 'stability gate failed and ephemeral exception not requested' };
  if (tempBlocks) return { determination: DETERMINATION.COLLECTION, reason: 'temporal evidence positively contradicts organization' };

  return {
    determination: DETERMINATION.STRUCTURE,
    ephemeral: stabEphemeralExempt,
    reason: stabEphemeralExempt ? 'organization+dependence strong; stability inapplicable, ephemeral exception explicit' : 'all required gates passed',
  };
}

// ── Public: recognizeStructure — RelationshipSet(s) → StructureCandidate ────────────────────────
// singleWindowOrWindows: a RelationshipSet (array) for a single-window candidate, OR an array of
// RelationshipSet arrays (windows) when stability across time is being tested.
export function recognizeStructure(singleWindowOrWindows, opts = {}) {
  const isMultiWindow = Array.isArray(singleWindowOrWindows[0]);
  const windows = isMultiWindow ? singleWindowOrWindows : null;
  const relationships = isMultiWindow ? singleWindowOrWindows.flat() : singleWindowOrWindows;

  const { nodes, edges } = toGraph(relationships);
  const organization = organizationEvidence(nodes, edges, opts);
  const dependence   = dependenceEvidence(nodes, edges, opts);
  const stability     = windows
    ? stabilityEvidence(windows, opts)
    : (opts.allowEphemeral
        ? { status: EVIDENCE_STATUS.INAPPLICABLE, reason: 'single window; ephemeral exception explicitly requested', windowCount: 1 }
        : { status: EVIDENCE_STATUS.FAIL, reason: 'single window supplied and allowEphemeral not set', windowCount: 1 });
  const temporal = temporalEvidence(relationships, opts);

  const { determination, ephemeral, reason } = determine({ organization, dependence, stability, temporal }, opts);

  const insufficientEvidence = [];
  if (organization.status !== EVIDENCE_STATUS.PASS) insufficientEvidence.push('organization');
  if (dependence.status   !== EVIDENCE_STATUS.PASS) insufficientEvidence.push('dependence');
  if (stability.status === EVIDENCE_STATUS.FAIL)    insufficientEvidence.push('stability');
  if (temporal.status === EVIDENCE_STATUS.INAPPLICABLE) insufficientEvidence.push('temporal (no usable timestamps)');

  return Object.freeze({
    id: `SCR-${nodes.slice().sort().join(',')}|${edges.length}`.length > 0
      ? `SCR-${Math.abs([...nodes].sort().join(',').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)).toString(16)}`
      : 'SCR-empty',
    scope: Object.freeze({ nodeCount: nodes.length, edgeCount: edges.length, windowCount: windows?.length ?? 1 }),
    relationships: Object.freeze(relationships.map(r => Object.freeze({ ...r }))),
    organizationEvidence: Object.freeze(organization),
    dependenceEvidence:   Object.freeze(dependence),
    stabilityEvidence:    Object.freeze(stability),
    temporalEvidence:     Object.freeze(temporal),
    determination,
    ephemeral: !!ephemeral,
    determination_rationale: reason,
    insufficient_evidence: Object.freeze(insufficientEvidence),
    generatedAt: opts.now ?? Date.now(),
    generatedBy: 'structural-recognition-engine (EXPERIMENTAL, non-authoritative)',
  });
}

// ── Public: recognizeFormation — a prior STRUCTURE's durable id participates in a NEW set (§6, Fix #3) ──
// parentStructure: the frozen output of a PRIOR recognizeStructure() call, already returned (so its
// `id` already exists before this call — closes the self-validation risk structurally, not by
// convention: you cannot pass an id that hasn't been produced by a completed prior call).
export function recognizeFormation(parentStructure, newWindowOrWindows, opts = {}) {
  if (!parentStructure || parentStructure.determination !== DETERMINATION.STRUCTURE) {
    return { determination: DETERMINATION.COLLECTION, reason: 'parent is not a recognized STRUCTURE', parentId: parentStructure?.id ?? null };
  }
  const isMultiWindow = Array.isArray(newWindowOrWindows[0]);
  const flatNew = isMultiWindow ? newWindowOrWindows.flat() : newWindowOrWindows;
  const participates = flatNew.some(r => r?.subjectId === parentStructure.id || r?.objectId === parentStructure.id);
  if (!participates) {
    return { determination: DETERMINATION.STRUCTURE, reason: 'parent Structure not referenced in supplied relationship set — remains STRUCTURE, not FORMATION', parentId: parentStructure.id };
  }
  const candidate = recognizeStructure(newWindowOrWindows, opts);
  if (candidate.determination !== DETERMINATION.STRUCTURE) {
    return { ...candidate, reason: `higher-order set including parent ${parentStructure.id} did not itself pass Structure recognition`, determination: DETERMINATION.COLLECTION };
  }
  return Object.freeze({ ...candidate, determination: DETERMINATION.FORMATION, parentStructureId: parentStructure.id });
}
