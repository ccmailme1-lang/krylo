// WO-1382 — Integration Simulation (The Crucible)
// Adversarial harness for WO-1381 enforcement gate.
// Validates: violation detection, severity classification, containment, telemetry emission, replay determinism.

import { createHash }          from 'crypto';
import { validateCommand, validateKernelInput, validateInferenceOutput, Severity, ViolationType } from './src/engine/causalos/enforcement.js';

let pass = 0, fail = 0;
const runs = []; // trace log for determinism check

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else           { console.error(`  ✗ FAIL: ${label}`); fail++; }
}
function section(name) { console.log(`\n[${name}]`); }

// ── Trace hash ────────────────────────────────────────────────────────────────
// simulationTraceHash = SHA256(violationVector + enforcementDecision + telemetryOutput + systemStateDelta)
function traceHash(vector, result) {
  const content = JSON.stringify({
    vector,
    pass:          result.pass,
    violationType: result.telemetry?.violationType ?? null,
    severityLevel: result.telemetry?.severityLevel ?? null,
    kernelImpact:  result.telemetry?.kernelImpact  ?? null,
  });
  return createHash('sha256').update(content).digest('hex');
}

// ── VECTOR A — INGRESS CONTRACT BREACH ───────────────────────────────────────
section('VECTOR A — INGRESS SCHEMA FAILURE (Level 2 Containment)');

const vecA1 = {
  bayId: 'b01', coneId: 'cone02',
  intent: 'CROSS_BAY_QUERY',
  payload: { targetBay: 'b03', illegalAccess: true },
};
const vecA2 = { bayId: 'b02', intent: 'MALFORMED_SCHEMA', payload: null };

const rA1 = validateCommand(vecA1);
assert('A1: blocked',                        !rA1.pass);
assert('A1: Level 2 severity',               rA1.telemetry?.severityLevel === Severity.CONTAINMENT);
assert('A1: kernelImpact=false',             rA1.telemetry?.kernelImpact === false);
assert('A1: inferenceImpact=false',          rA1.telemetry?.inferenceImpact === false);
assert('A1: containmentStatus=true',         rA1.telemetry?.containmentStatus === true);
assert('A1: correlationId present',          !!rA1.telemetry?.correlationId);

const rA2 = validateCommand(vecA2);
assert('A2: blocked on null payload',        !rA2.pass);
assert('A2: INGRESS_SCHEMA_FAILURE type',    rA2.telemetry?.violationType === ViolationType.INGRESS_SCHEMA_FAILURE);
assert('A2: no kernel touch',                rA2.telemetry?.kernelImpact === false);

runs.push({ vector: 'A1', result: rA1 });
runs.push({ vector: 'A2', result: rA2 });

// ── VECTOR B — KERNEL STATE BREACH ───────────────────────────────────────────
section('VECTOR B — KERNEL DETERMINISM BREACH (Level 3 Hard Block)');

const vecB1 = {
  bayId: 'b01', coneId: 'cone01',
  stateSnapshot: { timestamp: 'HISTORICAL_OVERFLOW', mutationWindow: -999999 },
};
const vecB2 = {
  bayId: 'b03', coneId: 'cone03',
  stateSnapshot: { determinismOverride: true, hashCorruptionAttempt: 'inject' },
};

const rB1 = validateKernelInput(vecB1);
assert('B1: hard blocked',                   !rB1.pass);
assert('B1: Level 3 severity',               rB1.telemetry?.severityLevel === Severity.HARD_BLOCK);
assert('B1: kernelHalt=true',                rB1.kernelHalt === true);
assert('B1: KERNEL_DETERMINISM_BREACH type', rB1.telemetry?.violationType === ViolationType.KERNEL_DETERMINISM_BREACH);
assert('B1: inferenceImpact=false',          rB1.telemetry?.inferenceImpact === false);

const rB2 = validateKernelInput(vecB2);
assert('B2: determinism override blocked',   !rB2.pass);
assert('B2: Level 3 severity',               rB2.telemetry?.severityLevel === Severity.HARD_BLOCK);
assert('B2: kernelHalt=true',                rB2.kernelHalt === true);
assert('B2: hash validation failed signal',  rB2.telemetry?.detail?.includes('determinism'));

runs.push({ vector: 'B1', result: rB1 });
runs.push({ vector: 'B2', result: rB2 });

// ── VECTOR C — INFERENCE FEEDBACK LOOP BREACH ────────────────────────────────
section('VECTOR C — INFERENCE FEEDBACK LOOP (Level 4 System Halt)');

const vecC1 = {
  inferenceOutput: {
    causalGraph:    'SELF_REFERENTIAL_LOOP',
    targetMutation: 'WO-1327_STATE_PATCH',
  },
};
const vecC2 = {
  projection: { feedbackIntent: true, kernelWriteAttempt: true },
};

const rC1 = validateInferenceOutput(vecC1);
assert('C1: system halt triggered',              !rC1.pass);
assert('C1: Level 4 severity',                   rC1.telemetry?.severityLevel === Severity.SYSTEM_HALT);
assert('C1: quarantine=true',                    rC1.quarantine === true);
assert('C1: INFERENCE_FEEDBACK_LOOP type',       rC1.telemetry?.violationType === ViolationType.INFERENCE_FEEDBACK_LOOP_ATTEMPT);
assert('C1: kernelImpact=false',                 rC1.telemetry?.kernelImpact === false);
assert('C1: inferenceImpact=true',               rC1.telemetry?.inferenceImpact === true);

const rC2 = validateInferenceOutput(vecC2);
assert('C2: feedback intent blocked',            !rC2.pass);
assert('C2: Level 4 severity',                   rC2.telemetry?.severityLevel === Severity.SYSTEM_HALT);
assert('C2: quarantine=true',                    rC2.quarantine === true);
assert('C2: state mutation blocked (no kernel)', rC2.telemetry?.kernelImpact === false);

runs.push({ vector: 'C1', result: rC1 });
runs.push({ vector: 'C2', result: rC2 });

// ── Behavior matrix ───────────────────────────────────────────────────────────
section('BEHAVIOR MATRIX VALIDATION');

assert('Vector A: Contained (no kernel, no inference)', !rA1.pass && !rA1.telemetry?.kernelImpact && !rA1.telemetry?.inferenceImpact);
assert('Vector B: Halted  (kernel blocked)',            !rB1.pass && rB1.kernelHalt && !rB1.telemetry?.inferenceImpact);
assert('Vector C: Isolated (inference quarantined)',    !rC1.pass && rC1.quarantine  && !rC1.telemetry?.kernelImpact);

// ── Telemetry completeness ────────────────────────────────────────────────────
section('TELEMETRY COMPLETENESS');

for (const { vector, result } of runs) {
  const t = result.telemetry;
  assert(`${vector}: all required telemetry fields present`,
    t !== null &&
    typeof t.violationType     === 'string'  &&
    typeof t.severityLevel     === 'number'  &&
    typeof t.containmentStatus === 'boolean' &&
    typeof t.kernelImpact      === 'boolean' &&
    typeof t.inferenceImpact   === 'boolean' &&
    typeof t.timestamp         === 'number'  &&
    typeof t.correlationId     === 'string'
  );
}

// ── Deterministic replay ──────────────────────────────────────────────────────
section('DETERMINISTIC REPLAY');

// Run identical vectors a second time — structural fields must produce same hash
const replayHashes = runs.map(({ vector, result }) => traceHash(vector, result));
const replayHashes2 = runs.map(({ vector, result }) => {
  // Re-run the same gate with same input
  let r2;
  if (vector.startsWith('A')) r2 = validateCommand(vector === 'A1' ? vecA1 : vecA2);
  else if (vector.startsWith('B')) r2 = validateKernelInput(vector === 'B1' ? vecB1 : vecB2);
  else r2 = validateInferenceOutput(vector === 'C1' ? vecC1 : vecC2);
  return traceHash(vector, r2);
});

for (let i = 0; i < runs.length; i++) {
  assert(`${runs[i].vector}: replay hash identical`, replayHashes[i] === replayHashes2[i]);
}

// ── Trace hash output ─────────────────────────────────────────────────────────
section('SIMULATION TRACE HASHES');
for (let i = 0; i < runs.length; i++) {
  console.log(`  ${runs[i].vector}: ${replayHashes[i]}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1382 CRUCIBLE: ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(1);
