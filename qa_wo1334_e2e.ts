// qa_wo1334_e2e.ts — WO-1334: krylo-submit E2E Happy Path
// SAB CONSENSUS: ACTIVE | QUORUM: MET | SCOPE: E2E Traversal Specification
//
// Traversal: session_open → ingestion_start → ingestion_complete [WO-1329 BYPASS]
//            → projection_generated → action_dispatched ×3 → action_resolved [TERMINAL]
//
// Run: node --loader ts-node/esm qa_wo1334_e2e.ts
// Reads: getTelemetryLog() directly. UI layer is quarantined.
// Writes: ActiveWorkOrder ledger to stdout.

import { emitTelemetry, getTelemetryLog }           from './src/engine/telemetry.js';
import { getDriftLog }                               from './src/engine/driftmonitor.js';
import { emitResolutionEvent, computeFinalOutcome }  from './src/engine/resolver.js';

// ── Schema (spec §2 output contract) ─────────────────────────────────────────

interface TelemetryTraversalNode {
  step: string;
  timestamp: number;
  drift_coefficient: number;
}

interface ActiveWorkOrder {
  wo_id: 'WO-1334';
  target_manifold: 'krylo-submit-e2e';
  execution_ms: number;
  status: 'INTEGRATION_VERIFIED' | 'FAILED' | 'BLOCKED';
  bau_validation: boolean;
  architectural_drift: number; // FAILS IF > 0.0
  traversal_chain: TelemetryTraversalNode[];
  metadata: {
    origin: string;      // must be lowercase
    session_id: string;  // must be lowercase
    wo_1329_bypass: boolean;
  };
}

// ── WO-1329 bypass — hardcoded synthetic payload (spec §1 step 03) ───────────
// Represents the expected output of the normalizer when it is unblocked.
// DO NOT use useAnalysisStore or any UI-layer state here.

const WO1329_BYPASS_PAYLOAD = {
  domain:     'monetary',
  confidence: 0.87,
  entities:   { subject: 'federal reserve', signal_type: 'policy', region: 'us' },
  normalized: true,
  bypass:     'WO-1329-SUSPENDED',
};

// ── Canonical lifecycle order (mirrors driftmonitor.js TEMPORAL_ORDER) ────────

const CANONICAL_ORDER = [
  'session_open',
  'ingestion_start',
  'ingestion_complete',
  'projection_generated',
  'action_dispatched',
  'action_resolved',   // exempt from strict ordering — multi-source allowed
];

// ── Harness ───────────────────────────────────────────────────────────────────

async function runHarness(): Promise<void> {
  const startMs   = performance.now();
  const sessionId = `qa_harness_v1_${Date.now()}`;
  const actionIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const actionTypes = ['primary', 'secondary', 'structural']; // lowercase constraint (spec §1 steps 05–07)

  console.log('[WO-1334] krylo-submit E2E Happy Path');
  console.log(`[WO-1334] session: ${sessionId}\n`);

  // ── Step 01 — session_open ────────────────────────────────────────────────
  emitTelemetry({
    type: 'session_open', sessionId,
    source: 'krylo-submit',
    query:  'federal reserve rate policy',
    timestamp: Date.now(),
  });
  console.log('[01] session_open           ✓');

  // ── Step 02 — ingestion_start ─────────────────────────────────────────────
  emitTelemetry({ type: 'ingestion_start', sessionId, timestamp: Date.now() });
  console.log('[02] ingestion_start        ✓');

  // ── Step 03 — ingestion_complete [WO-1329 BYPASS] ─────────────────────────
  // WO-1329 (Ingress Normalizer) is SUSPENDED. Inject synthetic normalized payload
  // to re-ignite the state machine. This node is a MOCKED BINDING per spec §1.
  emitTelemetry({
    type: 'ingestion_complete', sessionId,
    payload:        WO1329_BYPASS_PAYLOAD,
    wo_1329_bypass: true,
    timestamp:      Date.now(),
  });
  console.log('[03] ingestion_complete     ✓  [WO-1329-BYPASS: synthetic payload injected]');

  // ── Step 04 — projection_generated ───────────────────────────────────────
  emitTelemetry({
    type: 'projection_generated', sessionId,
    actionCount: actionIds.length,
    timestamp:   Date.now(),
  });
  console.log('[04] projection_generated   ✓');

  // ── Steps 05–07 — action_dispatched ×3 ───────────────────────────────────
  // Spec constraint: actionType metadata must be strictly lowercase.
  for (let i = 0; i < actionIds.length; i++) {
    emitTelemetry({
      type:       'action_dispatched',
      sessionId,
      actionId:   actionIds[i],
      actionType: actionTypes[i],
      timestamp:  Date.now(),
    });
    console.log(`[0${5 + i}] action_dispatched      ✓  [iterator ${i + 1} — "${actionTypes[i]}"]`);
  }

  // ── Step 08 — action_resolved [TERMINAL] ─────────────────────────────────
  // Emit one resolution signal per action via the resolver.
  // emitResolutionEvent internally calls emitTelemetry('action_resolved').
  for (let i = 0; i < actionIds.length; i++) {
    emitResolutionEvent({
      sessionId,
      actionId:        actionIds[i],
      result:          'success',
      source:          'ingestion',
      confidenceWeight: 0.6,
    });
  }
  console.log('[08] action_resolved        ✓  [terminal — 3 resolution events via resolver]');

  const executionMs = performance.now() - startMs;

  // ── Traversal validation ──────────────────────────────────────────────────

  const sessionLog  = getTelemetryLog().filter(e => e.sessionId === sessionId);
  const driftEvents = getDriftLog(sessionId);
  const architecturalDrift = driftEvents.length;

  // Build traversal chain (one node per telemetry event)
  const traversalChain: TelemetryTraversalNode[] = sessionLog.map(e => ({
    step:              e.type as string,
    timestamp:         (e.timestamp ?? e._emittedAt) as number,
    drift_coefficient: 0.0,
  }));

  // Validate ordering: each event's canonical index must advance.
  // action_resolved and action_dispatched are multi-occurrence — exempt from strict advance check.
  let orderValid    = true;
  let lastOrderIdx  = -1;
  for (const ev of sessionLog) {
    const idx = CANONICAL_ORDER.indexOf(ev.type);
    if (idx === -1 || ev.type === 'action_resolved' || ev.type === 'action_dispatched') continue;
    if (idx <= lastOrderIdx) { orderValid = false; break; }
    lastOrderIdx = idx;
  }

  // Validate lowercase metadata on action_dispatched events
  const dispatched = sessionLog.filter(e => e.type === 'action_dispatched');
  const metaValid  = dispatched.every(e =>
    typeof e.actionType === 'string' && e.actionType === e.actionType.toLowerCase()
  );

  // Compute final arbitrated outcomes
  const outcomes    = actionIds.map(id => computeFinalOutcome(id));
  const allResolved = outcomes.every(o => o?.finalOutcome === 'success');

  const bauValidation =
    orderValid &&
    metaValid  &&
    allResolved &&
    architecturalDrift === 0;

  const status: ActiveWorkOrder['status'] =
    architecturalDrift > 0 ? 'FAILED' :
    !bauValidation         ? 'BLOCKED' :
                             'INTEGRATION_VERIFIED';

  // ── Ledger ────────────────────────────────────────────────────────────────

  const ledger: ActiveWorkOrder = {
    wo_id:               'WO-1334',
    target_manifold:     'krylo-submit-e2e',
    execution_ms:        Math.round(executionMs * 100) / 100,
    status,
    bau_validation:      bauValidation,
    architectural_drift: architecturalDrift,
    traversal_chain:     traversalChain,
    metadata: {
      origin:         'qa_harness_v1',
      session_id:     sessionId.toLowerCase(),
      wo_1329_bypass: true,
    },
  };

  // ── Output ────────────────────────────────────────────────────────────────

  console.log('\n======== [WO-1334 LEDGER OUTPUT] ========');
  console.log(JSON.stringify(ledger, null, 2));
  console.log('=========================================');
  console.log(`\nBAU:   ${bauValidation ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`STATUS: ${status}`);
  console.log(`NODES:  ${sessionLog.length} / 8 expected`);
  console.log(`DRIFT:  ${architecturalDrift}`);
  console.log(`TIME:   ${ledger.execution_ms}ms`);

  if (driftEvents.length > 0) {
    console.log('\n[DRIFT LOG — architectural violations]');
    console.log(JSON.stringify(driftEvents, null, 2));
  }

  if (!bauValidation) {
    console.log('\n[VALIDATION FAILURES]');
    if (!orderValid)    console.log('  ✗ Temporal ordering violated');
    if (!metaValid)     console.log('  ✗ action_dispatched metadata contains uppercase');
    if (!allResolved)   console.log('  ✗ One or more actions did not resolve to success');
    if (architecturalDrift > 0) console.log(`  ✗ ${architecturalDrift} drift event(s) recorded`);
    process.exit(1);
  }
}

runHarness().catch(err => {
  console.error('[WO-1334] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
