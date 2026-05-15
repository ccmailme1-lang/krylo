// WO-1084-C Differential Fuzz Suite + WO-1084-E Telemetry
// Runs all mutation phases, emits fuzz-report.json via telemetry layer.

import { resolve } from 'node:path';
import { encode } from './encode.js';
import { Frame } from './types.js';
import { runPhase, writeReport, printReport } from './fuzz.telemetry.js';

function setU32LE(buf: Uint8Array, offset: number, val: number): Uint8Array {
    new DataView(buf.buffer).setUint32(offset, val, true); return buf;
}
function setU16LE(buf: Uint8Array, offset: number, val: number): Uint8Array {
    new DataView(buf.buffer).setUint16(offset, val, true); return buf;
}

const BASE_FRAME: Frame = {
    domainId: 1,
    events: [{
        domainId: 1, typeId: 2, commitIndex: 100, sequenceId: 42,
        spatialKey: 0xDEADBEEFCAFEBABEn, payload: new Uint8Array([0xAA, 0xBB, 0xCC]),
    }],
};
const BASE = encode(BASE_FRAME);
function mut(label: string, fn: (b: Uint8Array) => Uint8Array) {
    return { label, buf: fn(new Uint8Array(BASE)) };
}

// ── Phase 1 — Deterministic structural mutations ──────────────────────────────
const phase1 = [
    mut('frameLength=0',                 b => setU32LE(b, 0, 0)),
    mut('frameLength=HEADER_SIZE-1(40)', b => setU32LE(b, 0, 40)),
    mut('frameLength=buf.len+1',         b => setU32LE(b, 0, b.length + 1)),
    mut('frameLength=buf.len-1',         b => setU32LE(b, 0, b.length - 1)),
    mut('frameLength=0xFFFFFFFF',        b => setU32LE(b, 0, 0xFFFFFFFF)),
    mut('version=0x00',                  b => { b[4] = 0x00; return b; }),
    mut('version=0xFF',                  b => { b[4] = 0xFF; return b; }),
    mut('version=0x02',                  b => { b[4] = 0x02; return b; }),
    mut('separator=0x00',                b => { b[5] = 0x00; return b; }),
    mut('separator=0xFE',                b => { b[5] = 0xFE; return b; }),
    mut('eventCount=1000001(excessive)', b => setU32LE(b, 7, 1_000_001)),
    mut('eventCount=0xFFFFFFFF',         b => setU32LE(b, 7, 0xFFFFFFFF)),
    mut('event.domainId=0',              b => { b[41] = 0x00; return b; }),
    mut('payloadLen=0xFFFF',             b => setU16LE(b, 41 + 18, 0xFFFF)),
    mut('payloadLen=remaining+1',        b => setU16LE(b, 41 + 18, b.length - 41 - 20 + 1)),
    { label: 'truncate@0',              buf: new Uint8Array(0) },
    { label: 'truncate@10',             buf: BASE.slice(0, 10) },
    { label: 'truncate@40(HEADER-1)',   buf: BASE.slice(0, 40) },
    { label: 'truncate@midEventHeader', buf: (() => {
        const b = new Uint8Array(41 + 10);
        b.set(BASE.slice(0, 41 + 10));
        setU32LE(b, 0, b.length);
        return b;
    })() },
    mut('extraByteAppended', b => {
        const ext = new Uint8Array(b.length + 1);
        ext.set(b);
        setU32LE(ext, 0, ext.length);
        return ext;
    }),
    { label: 'allZeros(41bytes)', buf: new Uint8Array(41) },
];

// ── Phase 2 — Header byte sweep ───────────────────────────────────────────────
const phase2: { label: string; buf: Uint8Array }[] = [];
for (let pos = 0; pos < 11; pos++) {
    const original = BASE[pos];
    for (let val = 0; val <= 255; val++) {
        if (val === original) continue;
        const b = new Uint8Array(BASE);
        b[pos] = val;
        phase2.push({ label: `headerSweep[${pos}]=0x${val.toString(16).padStart(2,'0')}`, buf: b });
    }
}

// ── Phase 3 — Event header bit flips ─────────────────────────────────────────
const phase3: { label: string; buf: Uint8Array }[] = [];
for (let bytePos = 0; bytePos < 20; bytePos++) {
    for (let bit = 0; bit < 8; bit++) {
        const b = new Uint8Array(BASE);
        b[41 + bytePos] ^= (1 << bit);
        phase3.push({ label: `eventHeaderBitFlip[byte${bytePos},bit${bit}]`, buf: b });
    }
}

console.log(`\nrunning differential fuzz suite\n`);
console.log(`  phase 1: ${phase1.length} structural mutations`);
console.log(`  phase 2: ${phase2.length} header byte sweep`);
console.log(`  phase 3: ${phase3.length} event header bit-flips`);

const phases = [
    runPhase('Phase 1 — Structural',         phase1),
    runPhase('Phase 2 — Header Byte Sweep',  phase2),
    runPhase('Phase 3 — Event Bit Flips',    phase3),
];

const report = writeReport(phases);
printReport(report);

if (!report.clean) process.exitCode = 1;
