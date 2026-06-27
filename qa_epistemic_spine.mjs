// Epistemic Spine Stress Harness
// Validates WO-2004 (Identity Kernel) + WO-2005A/B (Taxonomy + SCI) under adversarial pressure.
//
// Scenario: NVDA / AWS — power infrastructure build-out (structural) running concurrently
// with earnings-driven analyst cycle (narrative) on the same entity.
//
// Four assertion suites:
//   1. FALSE-MERGE PREVENTION  — structural ≠ narrative identity even at high semantic overlap
//   2. SCI ANCHORING           — structural SCI stays high; narrative SCI trends toward 0 under noise
//   3. IDENTITY STABILITY      — identityId invariant under graph mutation (versionHash may change)
//   4. CALIBRATION GATE        — independenceObserved never fires at N < 20 (no premature correction)
//
// Run: node qa_epistemic_spine.mjs

import {
  createEvidenceNode,
  createCanonicalEvent,
  addNode,
  shouldMerge,
  shouldSplit,
  resolveIdentity,
} from './src/engine/identitykernel.js';

import {
  computeSCI,
  computeStructuralDivergence,
  getCalibration,
  getAnchorStrength,
} from './src/engine/structuralconfirmation.js';

import {
  EPISTEMIC_CLASS,
  getDescriptor,
} from './src/engine/evidencetiers.js';

// ── Harness infrastructure ────────────────────────────────────────────────────

let pass = 0; let fail = 0; let warn = 0;

function check(label, cond, detail = '') {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else       { console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

function note(msg) { console.log(`  · ${msg}`); }

function section(title) { console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`); }

// ── Evidence node factories ───────────────────────────────────────────────────

function structuralNode(evidenceType, ts = new Date()) {
  return createEvidenceNode({ evidenceType, timestamp: ts, content: `${evidenceType} signal`, metadata: { entity: 'NVDA/AWS' } });
}

function narrativeNode(evidenceType, ts = new Date()) {
  return createEvidenceNode({ evidenceType, timestamp: ts, content: `${evidenceType} signal`, metadata: { entity: 'NVDA/AWS' } });
}

// Build an EvidenceGraph (Map<id, node>) from an array of nodes
function buildNodeMap(...nodes) {
  const m = new Map();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

// ── Suite 1: FALSE-MERGE PREVENTION ──────────────────────────────────────────
section('Suite 1 — False-Merge Prevention');

const t0    = new Date('2026-01-01T00:00:00Z');
const delta = 3 * 24 * 60 * 60 * 1000; // 3-day stagger

// Structural event: power + construction + freight (all T1)
const sNode1 = structuralNode('POWER_CONSUMPTION', new Date(t0.getTime()));
const sNode2 = structuralNode('CONSTRUCTION_PERMITS', new Date(t0.getTime() + delta));
const sNode3 = structuralNode('FREIGHT_LOGISTICS', new Date(t0.getTime() + delta * 2));
const structuralMap = buildNodeMap(sNode1, sNode2, sNode3);
const structuralEdges = [
  { from: sNode1.id, type: 'precedes', to: sNode2.id },
  { from: sNode2.id, type: 'precedes', to: sNode3.id },
];

const structuralEvent = createCanonicalEvent({
  nodes:     structuralMap,
  edges:     structuralEdges,
  rootSeeds: [sNode1.id],
  timeWindow: { start: t0, end: new Date(t0.getTime() + delta * 2) },
});

// Narrative event: earnings + analyst + press release (T3/T4)
// Same time window — high temporal overlap to stress the merge gate
const nNode1 = narrativeNode('EARNINGS_CALL', new Date(t0.getTime() + 86400000)); // t0 + 1 day
const nNode2 = narrativeNode('ANALYST_REPORT', new Date(t0.getTime() + delta));
const nNode3 = narrativeNode('NEWS_ARTICLE', new Date(t0.getTime() + delta * 2));
const narrativeMap = buildNodeMap(nNode1, nNode2, nNode3);
const narrativeEdges = [
  { from: nNode1.id, type: 'precedes', to: nNode2.id },
  { from: nNode2.id, type: 'precedes', to: nNode3.id },
];

const narrativeEvent = createCanonicalEvent({
  nodes:     narrativeMap,
  edges:     narrativeEdges,
  rootSeeds: [nNode1.id],
  timeWindow: { start: t0, end: new Date(t0.getTime() + delta * 2) },
});

check(
  'Structural event created with 3 T1 nodes',
  structuralEvent.evidenceGraph.nodes.size === 3,
);
check(
  'Narrative event created with 3 T3/T4 nodes',
  narrativeEvent.evidenceGraph.nodes.size === 3,
);

// Primary assertion: shouldMerge must return false
// Jaccard = 0 (no shared evidenceType) — merge must not fire even with full temporal overlap
const mergeDecision = shouldMerge(structuralEvent, narrativeEvent);
check(
  'shouldMerge → false (zero Jaccard, distinct evidence classes)',
  mergeDecision === false,
  `got ${mergeDecision}`,
);

// resolveIdentity must produce 2 distinct events with distinct identityIds
const { events: resolved, merges } = resolveIdentity([structuralEvent, narrativeEvent]);
check(
  'resolveIdentity → 2 distinct events (no collapse)',
  resolved.length === 2,
  `got ${resolved.length}`,
);
check(
  'No merges recorded in resolution pass',
  merges.length === 0,
  `got ${merges.length} merges`,
);
check(
  'Identity IDs remain distinct post-resolution',
  resolved[0].identityId !== resolved[1].identityId,
);

// Stress: add PRESS_RELEASE (narrative overlap) to the structural event — merge must still not fire
const sEvent_withNarrative = addNode(
  structuralEvent,
  narrativeNode('PRESS_RELEASE', new Date(t0.getTime() + delta)),
);
const mergeAfterNarrativeInjection = shouldMerge(sEvent_withNarrative, narrativeEvent);
check(
  'shouldMerge → false after narrative node injected into structural event',
  mergeAfterNarrativeInjection === false,
  `got ${mergeAfterNarrativeInjection}`,
);

// ── Suite 2: SCI ANCHORING ───────────────────────────────────────────────────
section('Suite 2 — SCI Anchoring');

const sciStructural = computeSCI(structuralEvent.evidenceGraph);
const sciNarrative  = computeSCI(narrativeEvent.evidenceGraph);

check(
  'SCI computed for structural event (not null)',
  sciStructural !== null,
);
check(
  'SCI computed for narrative event (not null)',
  sciNarrative !== null,
);
check(
  'Structural SCI > narrative SCI',
  sciStructural.score > sciNarrative.score,
  `structural=${sciStructural.score} narrative=${sciNarrative.score}`,
);
// Partial-coverage normalization: 3 types out of 16 theoretically possible → ~3/10 is correct.
// The invariant is not absolute value but ratio — structural truth density >> narrative truth density.
check(
  'Structural SCI > narrative SCI by ≥ 10× (truth density ratio)',
  sciNarrative.score === 0 || sciStructural.score / sciNarrative.score >= 10,
  `structural=${sciStructural.score} narrative=${sciNarrative.score}`,
);
check(
  'Narrative SCI < 1.0 (low anchor tier, 3 T3/T4 types)',
  sciNarrative.score < 1.0,
  `got ${sciNarrative.score}`,
);

note(`Structural SCI: ${sciStructural.score}/10 (3 types / 16 theoretical — partial coverage expected)`);
note(`Narrative SCI:  ${sciNarrative.score}/10 (groundedness ${sciNarrative.groundedness})`);

// Full-coverage demonstration: all 9 T1 structural types → SCI must reach ≥ 9.0
const allStructTypes = [
  'POWER_CONSUMPTION','POWER_LOAD','POWER_INFRA','POWER_DATACENTER_DEMAND','POWER_DISCONTINUITY',
  'WATER_USAGE','NETWORK_TRAFFIC','FREIGHT_LOGISTICS','CONSTRUCTION_PERMITS','COMPUTE_CAPACITY',
];
const fullMap = new Map();
for (const t of allStructTypes) {
  const n = structuralNode(t);
  fullMap.set(n.id, n);
}
const fullStructuralEvent = createCanonicalEvent({ nodes: fullMap, edges: [], rootSeeds: [], timeWindow: { start: t0, end: new Date() } });
const sciFullCoverage = computeSCI(fullStructuralEvent.evidenceGraph);
check(
  'Full T1 coverage (9 types) → SCI ≥ 9.0 (high epistemic saturation)',
  sciFullCoverage.score >= 9.0,
  `got ${sciFullCoverage.score}`,
);
note(`Full T1 coverage SCI: ${sciFullCoverage.score}/10`);

// Noise injection: add 3 more narrative types to narrative event — SCI must not rise significantly
let noisyNarrative = narrativeEvent;
const noiseTypes   = ['PRESS_RELEASE', 'SOCIAL_MEDIA', 'ANALYST_REPORT'];
for (const t of noiseTypes) {
  noisyNarrative = addNode(noisyNarrative, narrativeNode(t, new Date(t0.getTime() + delta)));
}
const sciNoisy = computeSCI(noisyNarrative.evidenceGraph);

check(
  'Narrative SCI stays < 3.0 after noise injection (stacking rule enforced)',
  sciNoisy.score < 3.0,
  `got ${sciNoisy.score} after noise`,
);
note(`Narrative SCI after noise injection: ${sciNoisy.score}/10`);

// Structural SCI unaffected by events in other graph
const sciStructuralAfterNoise = computeSCI(structuralEvent.evidenceGraph);
check(
  'Structural SCI unchanged by noise in separate event',
  sciStructuralAfterNoise.score === sciStructural.score,
  `before=${sciStructural.score} after=${sciStructuralAfterNoise.score}`,
);

// Structural Divergence: structural-leads expected (T1 weight >> narrative weight)
const div = computeStructuralDivergence(sEvent_withNarrative.evidenceGraph);
check(
  'Structural divergence direction = STRUCTURAL_LEADS',
  div.direction === 'STRUCTURAL_LEADS',
  `got ${div.direction}`,
);
// Divergence normalizes each axis against its own maximum.
// A 3-type structural event covers ~31% of the T1 max → normStruct ≈ 0.31.
// One narrative type (PRESS_RELEASE) covers ~10% of its axis → normNarr ≈ 0.10.
// Expected divergence ≈ 0.21. Threshold ≥ 0.10 confirms separation exists.
check(
  'Structural divergence > 0.10 (clear separation under partial coverage)',
  div.divergence > 0.10,
  `got ${div.divergence}`,
);
note(`Structural divergence: ${div.divergence} (${div.direction})`);

// ── Suite 3: IDENTITY STABILITY ───────────────────────────────────────────────
section('Suite 3 — Identity Stability Under Graph Mutation');

const idBefore = structuralEvent.identityId;
const hashBefore = structuralEvent.currentVersionHash;

// Mutate: add a new structural node
const mutatedEvent = addNode(
  structuralEvent,
  structuralNode('NETWORK_TRAFFIC', new Date(t0.getTime() + delta * 3)),
);

check(
  'identityId invariant after addNode (identity is stable)',
  mutatedEvent.identityId === idBefore,
  `before=${idBefore} after=${mutatedEvent.identityId}`,
);
check(
  'versionHash changes after addNode (content-addressed)',
  mutatedEvent.currentVersionHash !== hashBefore,
  `before=${hashBefore} after=${mutatedEvent.currentVersionHash}`,
);

// Multiple mutations — identity must remain stable throughout
let chained = mutatedEvent;
const chainTypes = ['WATER_USAGE', 'COMPUTE_CAPACITY'];
for (const t of chainTypes) {
  chained = addNode(chained, structuralNode(t));
}
check(
  'identityId invariant through 3 sequential addNode mutations',
  chained.identityId === idBefore,
);
note(`Final node count: ${chained.evidenceGraph.nodes.size} (started at 3)`);

// Split: create an artificially fragmented event (low stability floor)
// Inject 10 disconnected nodes with no edges → high fragmentationPoints → shouldSplit fires
const fragMap = new Map();
for (let i = 0; i < 10; i++) {
  const n = narrativeNode('SOCIAL_MEDIA');
  fragMap.set(n.id, n);
}
const fragmentedEvent = createCanonicalEvent({
  nodes:     fragMap,
  edges:     [],         // zero edges → all nodes are fragmentation points
  rootSeeds: [],
  timeWindow: { start: t0, end: new Date() },
});

check(
  'shouldSplit → true on zero-edge narrative cluster (fragmentation test)',
  shouldSplit(fragmentedEvent) === true,
  `stabilityScore=${fragmentedEvent.evidenceGraph.stabilityScore.toFixed(3)}`,
);
note(`Fragmented event stability: ${fragmentedEvent.evidenceGraph.stabilityScore.toFixed(3)}, ` +
     `fragmentationPoints: ${fragmentedEvent.evidenceGraph.fragmentationPoints.length}`);

// ── Suite 4: CALIBRATION GATE (No Premature Weight Correction) ───────────────
section('Suite 4 — Calibration Gate (N<20 Discipline)');

// Every entry in CALIBRATION_PRIORS must have independencePrior but NOT independenceObserved
// at this stage (no historical data yet → prior-only regime).
const calibTypes = [
  'POWER_CONSUMPTION', 'POWER_LOAD', 'POWER_INFRA', 'POWER_DATACENTER_DEMAND',
  'WATER_USAGE', 'NETWORK_TRAFFIC', 'FREIGHT_LOGISTICS', 'CONSTRUCTION_PERMITS',
  'COMPUTE_CAPACITY', 'SEC_FILING', 'EARNINGS_CALL', 'ANALYST_REPORT',
  'NEWS_ARTICLE', 'PRESS_RELEASE', 'SOCIAL_MEDIA',
];

let allPriorsPresent   = true;
let noObservedLeakage  = true;

for (const t of calibTypes) {
  const cal = getCalibration(t);
  if (!cal || typeof cal.independencePrior !== 'number') {
    allPriorsPresent = false;
    console.log(`    missing prior: ${t}`);
  }
  if (cal && typeof cal.independenceObserved !== 'undefined') {
    noObservedLeakage = false;
    console.log(`    premature observedValue leak: ${t} = ${cal.independenceObserved}`);
  }
}

check('All calibration types have independencePrior', allPriorsPresent);
check(
  'No independenceObserved values present (N<20 gate holds)',
  noObservedLeakage,
);

// Anchor strength API contract: must return a number for all calibrated types
const anchorsValid = calibTypes.every(t => {
  const a = getAnchorStrength(t);
  return typeof a === 'number' && a > 0 && a <= 1;
});
check('getAnchorStrength returns valid [0,1] for all calibrated types', anchorsValid);

// Structural floor: T1 anchors must be ≥ 0.80 (non-fabricability definition)
const structuralTypes = calibTypes.filter(t => {
  const d = getDescriptor(t);
  return d?.epistemicClass === EPISTEMIC_CLASS.STRUCTURAL;
});
const structuralFloor = structuralTypes.every(t => (getAnchorStrength(t) ?? 0) >= 0.80);
check(
  `Structural tier anchor floor ≥ 0.80 (${structuralTypes.length} types)`,
  structuralFloor,
);

// SOCIAL_MEDIA must be the lowest anchor (most fabricable)
const socialAnchor = getAnchorStrength('SOCIAL_MEDIA');
const allAnchors   = calibTypes.map(t => getAnchorStrength(t) ?? 1);
const minAnchor    = Math.min(...allAnchors);
check(
  'SOCIAL_MEDIA has the lowest anchor strength (most fabricable signal)',
  socialAnchor === minAnchor,
  `SOCIAL_MEDIA=${socialAnchor} min=${minAnchor}`,
);
note(`Anchor range: ${minAnchor} (SOCIAL_MEDIA) → ${Math.max(...allAnchors)} (POWER_INFRA)`);

// ── Final summary ─────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(64)}`);
const total = pass + fail;
console.log(`  ${pass}/${total} PASS  |  ${fail} FAIL`);
if (fail === 0) {
  console.log(`\n  SPINE VALIDATED — epistemic compression stack is adversarially stable.`);
  console.log(`  Identity kernel resists false-merge under full structural/narrative collision.`);
} else {
  console.log(`\n  SPINE UNSTABLE — ${fail} failure(s) above require resolution before production use.`);
}
console.log('');

process.exit(fail > 0 ? 1 : 0);
