// WO-1082-D cross-runtime parity harness
// Proves: TS.encode == Rust.encode (byte equality)
//         TS.decode(Rust.encode(x)) == x (cross-decode)
//         Rust.decode(TS.encode(x)) == OK (Rust verify)

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { decode } from './decode.js';
import { encode } from './encode.js';
import { Frame } from './types.js';

const REPO_ROOT   = resolve(import.meta.dirname, '..', '..');
const PARITY_BIN  = resolve(REPO_ROOT, 'codec', 'target', 'debug', 'parity');
const VERIFY_BIN  = resolve(REPO_ROOT, 'codec', 'target', 'debug', 'verify');

function toHex(buf: Uint8Array): string {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return out;
}

function framesEqual(a: Frame, b: Frame): boolean {
    if (a.domainId !== b.domainId || a.events.length !== b.events.length) return false;
    for (let i = 0; i < a.events.length; i++) {
        const ea = a.events[i], eb = b.events[i];
        if (ea.domainId !== eb.domainId || ea.typeId !== eb.typeId) return false;
        if (ea.commitIndex !== eb.commitIndex || ea.sequenceId !== eb.sequenceId) return false;
        if (ea.spatialKey !== eb.spatialKey) return false;
        if (ea.payload.length !== eb.payload.length) return false;
        for (let j = 0; j < ea.payload.length; j++) {
            if (ea.payload[j] !== eb.payload[j]) return false;
        }
    }
    return true;
}

// Canonical fixtures — must mirror codec/src/bin/parity.rs exactly
const FIXTURES: Frame[] = [
    {
        domainId: 1,
        events: [
            {
                domainId:    1,
                typeId:      2,
                commitIndex: 100,
                sequenceId:  42,
                spatialKey:  0xDEADBEEFCAFEBABEn,
                payload:     new Uint8Array([0x01, 0x02, 0x03]),
            },
            {
                domainId:    1,
                typeId:      5,
                commitIndex: 101,
                sequenceId:  43,
                spatialKey:  0n,
                payload:     new Uint8Array(0),
            },
        ],
    },
    {
        domainId: 2,
        events: [{ domainId: 2, typeId: 1, commitIndex: 0, sequenceId: 0, spatialKey: 0n, payload: new Uint8Array(0) }],
    },
    { domainId: 1, events: [] },
];

// Capture Rust parity binary output — spawnSync avoids shell path splitting
const parityResult = spawnSync(PARITY_BIN, [], { encoding: 'utf8' });
if (parityResult.error) throw parityResult.error;
const rustHexLines = (parityResult.stdout as string)
    .trim().split('\n').map(l => l.trim()).filter(Boolean);

assert.equal(rustHexLines.length, FIXTURES.length, 'fixture count mismatch between Rust and TS');

let passed = 0;

function test(name: string, fn: () => void): void {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e}`);
        process.exitCode = 1;
    }
}

const TOTAL = FIXTURES.length * 3;

console.log('\nrunning cross-runtime parity tests\n');

for (let i = 0; i < FIXTURES.length; i++) {
    const fixture    = FIXTURES[i];
    const tsHex      = toHex(encode(fixture));
    const rustHex    = rustHexLines[i];
    const rustBytes  = fromHex(rustHex);

    // 1. byte equality: TS.encode == Rust.encode
    test(`fixture[${i}] byte equality: TS.encode === Rust.encode`, () => {
        assert.equal(tsHex, rustHex, `byte mismatch at fixture ${i}`);
    });

    // 2. cross-decode: TS.decode(Rust.encode(x)) == x
    test(`fixture[${i}] cross-decode: TS.decode(Rust.encode(x)) == x`, () => {
        const decoded = decode(rustBytes);
        assert.ok(framesEqual(fixture, decoded), `frame mismatch after TS.decode(Rust.encode(x))`);
    });

    // 3. Rust verify: Rust.decode(TS.encode(x)) == OK
    test(`fixture[${i}] Rust verify: Rust.decode(TS.encode(x)) == OK`, () => {
        const result = spawnSync(VERIFY_BIN, { input: tsHex + '\n', encoding: 'utf8' });
        const line   = (result.stdout as string).trim();
        assert.equal(line, 'OK', `Rust verify rejected TS-encoded frame ${i}: ${line}`);
    });
}

console.log(`\ntest result: ${passed === TOTAL ? 'ok' : 'FAILED'}. ${passed} passed; ${TOTAL - passed} failed\n`);
