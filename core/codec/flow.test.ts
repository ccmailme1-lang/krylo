// WO-1093 — Flow control + codec correctness under pressure
// Simulates burst ingestion through a bounded queue.
// Verifies: drop policy fires, accepted frames all decode clean, no corruption.

import { encode } from './encode.js';
import { decode } from './decode.js';
import { Frame }  from './types.js';

// ── Inline pressure model (mirrors flowcontroller.cjs logic) ─────────────────

const MAX_DEPTH      = 20;
const THROTTLE_AT    = 0.60;
const BACKPRESSURE_AT = 0.85;
const DROP_AT        = 0.95;

const FlowState = { OPEN: 'OPEN', THROTTLED: 'THROTTLED', BACKPRESSURE: 'BACKPRESSURE', DROPPING: 'DROPPING' };

interface QueueEntry { frame: Uint8Array; seq: number; }
const queue: QueueEntry[] = [];
const log: Array<{ seq: number; action: string; state: string }> = [];
let enqueued = 0, dropped = 0, emitted = 0;

function flowState(): string {
    const fill = queue.length / MAX_DEPTH;
    if (fill >= DROP_AT)         return FlowState.DROPPING;
    if (fill >= BACKPRESSURE_AT) return FlowState.BACKPRESSURE;
    if (fill >= THROTTLE_AT)     return FlowState.THROTTLED;
    return FlowState.OPEN;
}

function enqueue(frame: Uint8Array, seq: number): string {
    const state = flowState();
    if (state === FlowState.DROPPING) { dropped++; log.push({ seq, action: 'drop', state }); return 'drop'; }
    queue.push({ frame, seq });
    enqueued++;
    const action = state === FlowState.BACKPRESSURE ? 'delay' : 'accept';
    log.push({ seq, action, state });
    return action;
}

function drain(n = 1): QueueEntry[] {
    const out = queue.splice(0, n);
    emitted += out.length;
    return out;
}

// ── Build a realistic frame (1 event, variable payload) ──────────────────────

function makeFrame(seq: number): Uint8Array {
    const payload = new TextEncoder().encode(`signal-${seq}-${Math.random().toFixed(6)}`);
    const f: Frame = {
        domainId: 1,
        events: [{
            domainId:    1,
            typeId:      1,
            commitIndex: 0,
            sequenceId:  seq,
            spatialKey:  BigInt(seq) * 0x100n,
            payload,
        }],
    };
    return encode(f);
}

// ── Phase 1: Burst ingestion — 100 frames into depth-20 queue ────────────────

console.log('\nWO-1093 Flow Control + Codec Correctness\n');
console.log(`  queue max depth: ${MAX_DEPTH}`);
console.log(`  burst size: 100 frames\n`);

for (let i = 0; i < 100; i++) enqueue(makeFrame(i), i);

const accepts  = log.filter(e => e.action === 'accept').length;
const delays   = log.filter(e => e.action === 'delay').length;
const drops    = log.filter(e => e.action === 'drop').length;
const throttled = log.filter(e => e.state === FlowState.THROTTLED).length;
const bp       = log.filter(e => e.state === FlowState.BACKPRESSURE).length;

console.log(`  phase 1 — burst ingestion:`);
console.log(`    accept:      ${accepts}`);
console.log(`    delay:       ${delays}`);
console.log(`    drop:        ${drops}`);
console.log(`    throttled:   ${throttled}`);
console.log(`    backpressure: ${bp}`);

// Drop policy must have fired (100 frames into depth-20 queue)
// Queue fills to floor(20*0.95)=19, remaining 81 dropped
if (drops > 0 && queue.length <= MAX_DEPTH) {
    console.log(`\n  ✓ drop policy fired: ${drops} dropped, queue capped at ${queue.length}/${MAX_DEPTH}`);
} else {
    console.error(`  ✗ drop policy check failed — drops=${drops} queueDepth=${queue.length} max=${MAX_DEPTH}`);
    process.exitCode = 1;
}

// ── Phase 2: Decode all accepted frames — zero corruption permitted ───────────

console.log(`\n  phase 2 — decode accepted frames (queue depth=${queue.length}):`);
const drained = drain(queue.length);
let decodeErrors = 0;
for (const { frame, seq } of drained) {
    try {
        const decoded = decode(frame);
        if (decoded.events[0].sequenceId !== seq) {
            console.error(`  ✗ seq mismatch: expected ${seq}, got ${decoded.events[0].sequenceId}`);
            decodeErrors++;
        }
    } catch (e) {
        console.error(`  ✗ decode error seq=${seq}: ${e}`);
        decodeErrors++;
    }
}

if (decodeErrors === 0) {
    console.log(`  ✓ all ${drained.length} accepted frames decoded clean — zero corruption`);
} else {
    console.error(`  ✗ ${decodeErrors} decode errors detected`);
    process.exitCode = 1;
}

// ── Phase 3: Drain + re-enqueue — pressure recovery ─────────────────────────

console.log(`\n  phase 3 — pressure recovery:`);
// Queue is now empty after drain — enqueue 5 more, all should be OPEN
for (let i = 100; i < 105; i++) {
    const action = enqueue(makeFrame(i), i);
    if (action === 'drop') {
        console.error(`  ✗ unexpected drop after recovery at seq=${i}`);
        process.exitCode = 1;
    }
}
const recoveredState = flowState();
console.log(`  ✓ flow state after recovery: ${recoveredState}`);
if (recoveredState !== FlowState.OPEN && recoveredState !== FlowState.THROTTLED) {
    console.error(`  ✗ expected OPEN or THROTTLED after drain, got ${recoveredState}`);
    process.exitCode = 1;
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ─────────────────────────────────────────`);
console.log(`  total enqueued: ${enqueued}  dropped: ${dropped}  emitted: ${emitted}`);
console.log(`  result: ${process.exitCode ? 'FAIL' : 'PASS'}\n`);
