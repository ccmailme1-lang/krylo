// WO-1700 — BAU Harness: Lineage Reconstruction Engine
// Tests pure functions only. No IndexedDB. No network.
// Run: node qa_wo1700_lineage.mjs

import { buildEnvelope }         from './src/engine/lineage.js';
import { validateReplay, replay, ReplayCorruption, CORRUPTION_CODES }
                                  from './src/engine/replayengine.js';
import { isEnvelopeV1, SCHEMA_VERSION_V1 } from './core/event-envelope/v1.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

function assertThrows(label, fn, expectedCode) {
  try {
    fn();
    console.error(`  ✗  ${label} — expected throw but none`);
    failed++;
  } catch (err) {
    if (expectedCode && err.code !== expectedCode) {
      console.error(`  ✗  ${label} — wrong code: got "${err.code}", expected "${expectedCode}"`);
      failed++;
    } else {
      console.log(`  ✓  ${label}`);
      passed++;
    }
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TENSOR = {
  seedQuery: 'Test query',
  lens:      'STUDENT',
  domain:    'AUTO',
  horizon:   'NOW',
  floor:     5000,
  domains:   ['FINANCIAL'],
  arbitration: {
    requestId:       'req-abc-123',
    modelVersion:    '1.0.0',
    generatedAt:     '2026-06-06T00:00:00.000Z',
    topCandidateId:  'cand-001',
    topK:            [{ id: 'cand-001', score: 0.94, type: 'action', rationale: 'Initiate licensing protocol.' }],
    survivors:       [
      { id: 'cand-001', score: 0.94, type: 'action',   rationale: 'Initiate licensing protocol.' },
      { id: 'cand-002', score: 0.91, type: 'risk',     rationale: 'European compact maintenance trap.' },
      { id: 'cand-003', score: 0.88, type: 'action',   rationale: 'Pivot to Japanese B-segment.' },
    ],
    featureVectorHash: 'a1b2c3d4',
    scoreVector:       [0.94, 0.91, 0.88],
  },
};

const MOCK_COMMIT = {
  type:        'CommitEvent',
  requestId:   'req-abc-123',
  candidateId: 'cand-001',
  score:       0.94,
  nextBest:    0.91,
  timestamp:   '2026-06-06T00:00:00.000Z',
};

// ── Test Suite ────────────────────────────────────────────────────────────────

console.log('\nWO-1700 BAU — Lineage Reconstruction Engine\n');

// 1. buildEnvelope: produces frozen object with schemaVersion
console.log('1. buildEnvelope()');
const env = buildEnvelope(MOCK_TENSOR, MOCK_COMMIT);
assert('returns object', typeof env === 'object' && env !== null);
assert('schemaVersion === 1.0.0', env.schemaVersion === '1.0.0');
assert('eventId === requestId', env.eventId === 'req-abc-123');
assert('commitEvent.candidateId correct', env.commitEvent.candidateId === 'cand-001');
assert('survivors count preserved', env.recommendationPayloadSnapshot.survivors.length === 3);
assert('context.query preserved', env.context.query === 'Test query');
assert('envelope is frozen', Object.isFrozen(env));

// 2. isEnvelopeV1: type guard
console.log('\n2. isEnvelopeV1()');
assert('identifies v1 envelope', isEnvelopeV1(env));
assert('rejects null', !isEnvelopeV1(null));
assert('rejects wrong version', !isEnvelopeV1({ schemaVersion: '2.0.0', eventId: 'x', commitEvent: {} }));
assert('SCHEMA_VERSION_V1 constant', SCHEMA_VERSION_V1 === '1.0.0');

// 3. validateReplay: passes on valid envelope
console.log('\n3. validateReplay() — valid envelope');
let threw = false;
try { validateReplay(env); } catch { threw = true; }
assert('no throw on valid envelope', !threw);

// 4. validateReplay: throws on missing schemaVersion
console.log('\n4. validateReplay() — corruption detection');
assertThrows(
  'throws MISSING_SCHEMA_VERSION',
  () => validateReplay({ ...env, schemaVersion: undefined }),
  CORRUPTION_CODES.MISSING_SCHEMA_VERSION
);
assertThrows(
  'throws MISSING_EVENT_ID',
  () => validateReplay({ ...env, eventId: undefined }),
  CORRUPTION_CODES.MISSING_EVENT_ID
);
assertThrows(
  'throws MISSING_COMMIT_EVENT',
  () => validateReplay({ ...env, commitEvent: null }),
  CORRUPTION_CODES.MISSING_COMMIT_EVENT
);
assertThrows(
  'throws MISSING_SURVIVORS',
  () => validateReplay({ ...env, recommendationPayloadSnapshot: { survivors: [] } }),
  CORRUPTION_CODES.MISSING_SURVIVORS
);
assertThrows(
  'throws CANDIDATE_NOT_IN_SURVIVORS (OAI)',
  () => validateReplay({
    ...env,
    commitEvent: { ...env.commitEvent, candidateId: 'ghost-id' },
  }),
  CORRUPTION_CODES.CANDIDATE_NOT_IN_SURVIVORS
);

// 5. replay(): returns UISnapshot with correct structure
console.log('\n5. replay() — UISnapshot');
const snapshot = replay(env);
assert('__type === UISnapshot', snapshot.__type === 'UISnapshot');
assert('schemaVersion preserved', snapshot.schemaVersion === '1.0.0');
assert('requestId === eventId', snapshot.requestId === env.eventId);
assert('happyPath is first survivor', snapshot.happyPath?.id === 'cand-001');
assert('alternatives length === 2', snapshot.alternatives.length === 2);
assert('alternatives[0] is rank 2', snapshot.alternatives[0]?.id === 'cand-002');
assert('commit.candidateId correct', snapshot.commit.candidateId === 'cand-001');
assert('context.query preserved', snapshot.context.query === 'Test query');
assert('snapshot is frozen', Object.isFrozen(snapshot));

// 6. ReplayCorruption is identifiable
console.log('\n6. ReplayCorruption class');
const err = new ReplayCorruption('TEST_CODE', 'test detail');
assert('instanceof ReplayCorruption', err instanceof ReplayCorruption);
assert('instanceof Error', err instanceof Error);
assert('code property set', err.code === 'TEST_CODE');
assert('message contains code and detail', err.message.includes('TEST_CODE') && err.message.includes('test detail'));

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(48)}`);
console.log(`WO-1700: ${passed}/${passed + failed} PASS`);
if (failed > 0) {
  console.error(`${failed} FAILED`);
  process.exit(1);
} else {
  console.log('ALL PASS');
}
