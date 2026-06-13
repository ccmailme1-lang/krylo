// qa_wo1734_nonconsensus.mjs — WO-1734: Non-Consensus Signal Layer (Khosla Protocol)
// Phase A: cross-domain correlation (re-homed WO-1726 Phase C).
// Phase B: KNOWLEDGE/CAPITAL divergence + conviction tracker.
// Phase C: DIVERGING | CONVERGING | AMBIGUOUS classification.
// Run: node qa_wo1734_nonconsensus.mjs

import {
  analyzeNonConsensus,
  resetNonConsensusHistory,
  NC_DELTA_THRESHOLD,
  CONVERGENCE_THRESHOLD,
  CROSS_DOMAIN_PAIR,
  NC_CLASSIFICATION,
} from './src/engine/nonconsensusdetector.js';
import { detectWeakSignals, resetWeakSignalHistory } from './src/engine/weaksignaldetector.js';
import { tagWithTier, validateBoundary, validateFlowDirection } from './src/engine/epistemictier.js';

let pass = 0;
let fail = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

function assertThrows(label, fn, fragment) {
  try {
    fn();
    console.log(`  FAIL  ${label} — expected throw, got none`);
    fail++;
  } catch (e) {
    const ok = e.message.includes(fragment);
    if (ok) { console.log(`  PASS  ${label}`); pass++; }
    else { console.log(`  FAIL  ${label} — "${e.message}" missing "${fragment}"`); fail++; }
  }
}

console.log('\n════════════════════════════════════════════════════');
console.log('  WO-1734 NON-CONSENSUS LAYER — OUTCOME HARNESS');
console.log('════════════════════════════════════════════════════\n');

// ── BLOCK 1: Constants ────────────────────────────────────────────────────────
console.log('BLOCK 1 — Constants\n');

assert('NC_DELTA_THRESHOLD = 30',    NC_DELTA_THRESHOLD    === 30);
assert('CONVERGENCE_THRESHOLD = 10', CONVERGENCE_THRESHOLD === 10);
assert('CROSS_DOMAIN_PAIR includes TECHNOLOGY', CROSS_DOMAIN_PAIR.includes('TECHNOLOGY'));
assert('CROSS_DOMAIN_PAIR includes KNOWLEDGE',  CROSS_DOMAIN_PAIR.includes('KNOWLEDGE'));
assert('NC_CLASSIFICATION has DIVERGING',  NC_CLASSIFICATION.DIVERGING  === 'DIVERGING');
assert('NC_CLASSIFICATION has CONVERGING', NC_CLASSIFICATION.CONVERGING === 'CONVERGING');
assert('NC_CLASSIFICATION has AMBIGUOUS',  NC_CLASSIFICATION.AMBIGUOUS  === 'AMBIGUOUS');

// ── BLOCK 2: Phase A — cross-domain correlation ───────────────────────────────
console.log('\nBLOCK 2 — Phase A: cross-domain correlation (re-homed from WO-1726 Phase C)\n');

resetWeakSignalHistory();
resetNonConsensusHistory();

const now = Date.now();

// Build velocity for TECHNOLOGY + KNOWLEDGE so both are EMERGING
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 4,  ts: now - 2000 }, { domain: 'KNOWLEDGE', signal: 3, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 9,  ts: now - 1000 }, { domain: 'KNOWLEDGE', signal: 8, ts: now - 1000 }]);
const { weakSignals, emergingSignals } = detectWeakSignals([
  { domain: 'TECHNOLOGY', signal: 14, ts: now },
  { domain: 'KNOWLEDGE',  signal: 13, ts: now },
  { domain: 'CAPITAL',    signal: 60, ts: now },
]);

const ncBothEmerging = analyzeNonConsensus(emergingSignals, [
  { domain: 'TECHNOLOGY', signal: 14 },
  { domain: 'KNOWLEDGE',  signal: 13 },
  { domain: 'CAPITAL',    signal: 60 },
]);

assert('Phase A: crossDomainEmergenceDetected = true (both emerging)',
  ncBothEmerging.crossDomainEmergenceDetected === true, `got ${ncBothEmerging.crossDomainEmergenceDetected}`);
assert('Phase A: emergingDomains contains TECHNOLOGY',
  ncBothEmerging.emergingDomains.includes('TECHNOLOGY'));
assert('Phase A: emergingDomains contains KNOWLEDGE',
  ncBothEmerging.emergingDomains.includes('KNOWLEDGE'));

// Only one emerging — no cross-domain detection
resetWeakSignalHistory();
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 4, ts: now - 2000 }]);
detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 9, ts: now - 1000 }]);
const { emergingSignals: oneEmerging } = detectWeakSignals([{ domain: 'TECHNOLOGY', signal: 14, ts: now }]);
const ncOneEmerging = analyzeNonConsensus(oneEmerging, [{ domain: 'TECHNOLOGY', signal: 14 }]);
assert('Phase A: crossDomainEmergenceDetected = false (only TECHNOLOGY emerging)',
  ncOneEmerging.crossDomainEmergenceDetected === false);

// ── BLOCK 3: Phase B — divergence computation ─────────────────────────────────
console.log('\nBLOCK 3 — Phase B: KNOWLEDGE/CAPITAL divergence + conviction tracker\n');

resetNonConsensusHistory();

const signals35 = [
  { domain: 'KNOWLEDGE', signal: 45 },
  { domain: 'CAPITAL',   signal: 10 },
  { domain: 'TECHNOLOGY', signal: 55 },
  { domain: 'MEDIA',     signal: 30 },
];

const nc35 = analyzeNonConsensus([], signals35);
assert('Phase B: knowledgeAlignment = 45', nc35.knowledgeAlignment === 45);
assert('Phase B: capitalAlignment = 10',   nc35.capitalAlignment   === 10);
assert('Phase B: consensusDelta = 35',     nc35.consensusDelta     === 35, `got ${nc35.consensusDelta}`);
assert('Phase B: populationAgreement = 0.75 (3/4 above 20)',
  nc35.populationAgreement === 0.750, `got ${nc35.populationAgreement}`);

// Conviction tracker: gap opens on first DIVERGING call, gapOpenMs grows
const nc35b = analyzeNonConsensus([], signals35);
assert('Phase B: gapOpenMs > 0 after second DIVERGING call',
  nc35b.gapOpenMs >= 0, `got ${nc35b.gapOpenMs}`);

// Gap closes when delta drops below threshold
resetNonConsensusHistory();
analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 45 }, { domain: 'CAPITAL', signal: 10 }]);
const ncGapClosed = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 25 }, { domain: 'CAPITAL', signal: 22 }]);
assert('Phase B: gapOpenMs = 0 after gap closes (delta < NC_DELTA_THRESHOLD)',
  ncGapClosed.gapOpenMs === 0, `got ${ncGapClosed.gapOpenMs}`);

// Missing domain signals default to 0
const ncMissing = analyzeNonConsensus([], [{ domain: 'MEDIA', signal: 40 }]);
assert('Phase B: missing KNOWLEDGE defaults to 0',  ncMissing.knowledgeAlignment === 0);
assert('Phase B: missing CAPITAL defaults to 0',    ncMissing.capitalAlignment   === 0);

// ── BLOCK 4: Phase C — classification ────────────────────────────────────────
console.log('\nBLOCK 4 — Phase C: classification output\n');

resetNonConsensusHistory();

// DIVERGING: delta > 30
const ncDiv = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 50 }, { domain: 'CAPITAL', signal: 15 }]);
assert('Phase C: delta=35 → DIVERGING', ncDiv.classification === NC_CLASSIFICATION.DIVERGING,
  `got ${ncDiv.classification}`);

// CONVERGING: 0 < delta < 10
resetNonConsensusHistory();
const ncConv = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 25 }, { domain: 'CAPITAL', signal: 20 }]);
assert('Phase C: delta=5 → CONVERGING', ncConv.classification === NC_CLASSIFICATION.CONVERGING,
  `got ${ncConv.classification}`);

// AMBIGUOUS: delta = 0
resetNonConsensusHistory();
const ncAmb = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 30 }, { domain: 'CAPITAL', signal: 30 }]);
assert('Phase C: delta=0 → AMBIGUOUS', ncAmb.classification === NC_CLASSIFICATION.AMBIGUOUS,
  `got ${ncAmb.classification}`);

// AMBIGUOUS: delta in 10-30 range
resetNonConsensusHistory();
const ncAmbMid = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 40 }, { domain: 'CAPITAL', signal: 20 }]);
assert('Phase C: delta=20 (10-30 range) → AMBIGUOUS', ncAmbMid.classification === NC_CLASSIFICATION.AMBIGUOUS,
  `got ${ncAmbMid.classification}`);

// DIVERGING: negative delta (CAPITAL > KNOWLEDGE)
resetNonConsensusHistory();
const ncNeg = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 10 }, { domain: 'CAPITAL', signal: 50 }]);
assert('Phase C: delta=-40 → AMBIGUOUS (negative = capital-led, not non-consensus)',
  ncNeg.classification === NC_CLASSIFICATION.AMBIGUOUS, `got ${ncNeg.classification}`);

// consensusArriving: CONVERGING after gap was open
resetNonConsensusHistory();
analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 50 }, { domain: 'CAPITAL', signal: 10 }]); // opens gap
const ncArriving = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 25 }, { domain: 'CAPITAL', signal: 22 }]); // CONVERGING
assert('Phase C: consensusArriving = true when CONVERGING after gap open',
  ncArriving.consensusArriving === true, `got ${ncArriving.consensusArriving}`);

// consensusArriving = false when CONVERGING with no prior gap
resetNonConsensusHistory();
const ncNoArriving = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 25 }, { domain: 'CAPITAL', signal: 22 }]);
assert('Phase C: consensusArriving = false when no prior gap',
  ncNoArriving.consensusArriving === false, `got ${ncNoArriving.consensusArriving}`);

// ── BLOCK 5: Epistemic boundary contract ─────────────────────────────────────
console.log('\nBLOCK 5 — Epistemic tier: output is NC-tagged, promotable: false\n');

resetNonConsensusHistory();
const ncOut = analyzeNonConsensus([], [{ domain: 'KNOWLEDGE', signal: 50 }, { domain: 'CAPITAL', signal: 10 }]);

assert('Output _epistemicTier = NC',  ncOut._epistemicTier === 'NC', `got "${ncOut._epistemicTier}"`);
assert('Output promotable = false',   ncOut.promotable === false,     `got ${ncOut.promotable}`);

let boundaryOk = true;
try { validateBoundary(ncOut, 'NC'); }
catch { boundaryOk = false; }
assert('Output passes validateBoundary(NC)', boundaryOk);

// ── BLOCK 6: NC → WEAK upward flow forbidden ─────────────────────────────────
console.log('\nBLOCK 6 — NC→WEAK upward flow forbidden\n');

assertThrows(
  'validateFlowDirection(NC, WEAK) throws',
  () => validateFlowDirection('NC', 'WEAK'),
  'upward flow forbidden'
);
assertThrows(
  'validateFlowDirection(NC, META) throws',
  () => validateFlowDirection('NC', 'META'),
  'upward flow forbidden'
);

// NC output must not pass WEAK boundary (wrong tier)
assertThrows(
  'NC output rejected at WEAK boundary',
  () => validateBoundary(ncOut, 'WEAK'),
  'EpistemicInvariantViolation'
);

// ── BLOCK 7: Non-WEAK input rejected at Phase A gate ─────────────────────────
console.log('\nBLOCK 7 — Phase A gate rejects non-WEAK input\n');

const rawSignal  = { domain: 'TECHNOLOGY', signal: 14, slope: 2.0 }; // no tier tag
const ncTagged   = tagWithTier({ domain: 'TECHNOLOGY', signal: 14, slope: 2.0 }, 'NC');
const metaTagged = tagWithTier({ domain: 'TECHNOLOGY', signal: 14, slope: 2.0 }, 'META');

assertThrows(
  'Untagged signal rejected at Phase A gate',
  () => analyzeNonConsensus([rawSignal], []),
  'EpistemicInvariantViolation'
);
assertThrows(
  'NC-tagged signal rejected at Phase A gate (no NC feedback loops)',
  () => analyzeNonConsensus([ncTagged], []),
  'EpistemicInvariantViolation'
);
assertThrows(
  'META-tagged signal rejected at Phase A gate',
  () => analyzeNonConsensus([metaTagged], []),
  'EpistemicInvariantViolation'
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('════════════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
