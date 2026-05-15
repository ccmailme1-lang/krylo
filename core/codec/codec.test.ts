// WO-1082-C acceptance gate — parity tests mirror codec/src/lib.rs test suite exactly
import assert from 'node:assert/strict';
import { decode } from './decode.js';
import { encode } from './encode.js';
import { DecodeError, CodecError } from './errors.js';
import { Frame } from './types.js';

function sampleFrame(): Frame {
    return {
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
    };
}

function framesEqual(a: Frame, b: Frame): boolean {
    if (a.domainId !== b.domainId) return false;
    if (a.events.length !== b.events.length) return false;
    for (let i = 0; i < a.events.length; i++) {
        const ea = a.events[i], eb = b.events[i];
        if (ea.domainId    !== eb.domainId)    return false;
        if (ea.typeId      !== eb.typeId)      return false;
        if (ea.commitIndex !== eb.commitIndex) return false;
        if (ea.sequenceId  !== eb.sequenceId)  return false;
        if (ea.spatialKey  !== eb.spatialKey)  return false;
        if (ea.payload.length !== eb.payload.length) return false;
        for (let j = 0; j < ea.payload.length; j++) {
            if (ea.payload[j] !== eb.payload[j]) return false;
        }
    }
    return true;
}

function rejectsWithKind(buf: Uint8Array, kind: string): void {
    try {
        decode(buf);
        assert.fail(`expected CodecError(${kind}) but decode succeeded`);
    } catch (e) {
        assert.ok(e instanceof CodecError, `expected CodecError, got ${e}`);
        assert.equal(e.kind, kind);
    }
}

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

console.log('\nrunning codec parity tests\n');

test('round_trip', () => {
    const original = sampleFrame();
    const encoded  = encode(original);
    const decoded  = decode(encoded);
    assert.ok(framesEqual(original, decoded));
});

test('empty_payload_round_trip', () => {
    const frame: Frame = {
        domainId: 2,
        events: [{ domainId: 2, typeId: 1, commitIndex: 0, sequenceId: 0, spatialKey: 0n, payload: new Uint8Array(0) }],
    };
    assert.ok(framesEqual(frame, decode(encode(frame))));
});

test('zero_events_round_trip', () => {
    const frame: Frame = { domainId: 1, events: [] };
    assert.ok(framesEqual(frame, decode(encode(frame))));
});

test('rejects_invalid_length', () => {
    rejectsWithKind(new Uint8Array(10), DecodeError.InvalidLength);
});

test('rejects_length_mismatch', () => {
    const buf = encode(sampleFrame());
    const bad = new Uint8Array(buf);
    new DataView(bad.buffer).setUint32(0, buf.length + 1, true);
    rejectsWithKind(bad, DecodeError.LengthMismatch);
});

test('rejects_unsupported_version', () => {
    const buf = encode(sampleFrame());
    const bad = new Uint8Array(buf);
    bad[4] = 0xFF;
    rejectsWithKind(bad, DecodeError.UnsupportedVersion);
});

test('rejects_domain_separator_mismatch', () => {
    const buf = encode(sampleFrame());
    const bad = new Uint8Array(buf);
    bad[5] = 0x00;
    rejectsWithKind(bad, DecodeError.DomainMismatch);
});

test('rejects_zero_domain_id_in_event', () => {
    const frame = sampleFrame();
    frame.events[0].domainId = 0;
    const buf = encode(frame);
    rejectsWithKind(buf, DecodeError.InvalidDomainId);
});

console.log(`\ntest result: ${passed === 8 ? 'ok' : 'FAILED'}. ${passed} passed; ${8 - passed} failed\n`);
