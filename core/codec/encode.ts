// WO-1082-C canonical encoder — mirrors codec/src/encode.rs exactly.
// LE only. No padding. Exact payload reproduction.
// frame_length == 41 + Σ(20 + payload_len_i)

import { ABI_VERSION, DOMAIN_SEPARATOR, HEADER_SIZE, EVENT_HEADER_SIZE } from './constants.js';
import { Frame } from './types.js';

export function encode(frame: Frame): Uint8Array {
    // precompute total frame length
    let eventsSize = 0;
    for (const e of frame.events) {
        eventsSize += EVENT_HEADER_SIZE + e.payload.length;
    }
    const frameLength = HEADER_SIZE + eventsSize;

    const buf  = new Uint8Array(frameLength);
    const view = new DataView(buf.buffer);

    // emit exact 41-byte header
    view.setUint32(0, frameLength, true);        // [0..4]  frame_length
    view.setUint8(4, ABI_VERSION);               // [4]     version
    view.setUint8(5, DOMAIN_SEPARATOR);          // [5]     domain separator
    view.setUint8(6, frame.domainId);            // [6]     frame domain_id
    view.setUint32(7, frame.events.length, true);// [7..11] event_count
    // [11..41] reserved — zero-initialised by Uint8Array

    let cursor = HEADER_SIZE;

    // emit tightly packed event blocks — no padding, LE only
    for (const e of frame.events) {
        view.setUint8(cursor,      e.domainId);
        view.setUint8(cursor + 1,  e.typeId);
        view.setUint32(cursor + 2, e.commitIndex, true);
        view.setUint32(cursor + 6, e.sequenceId,  true);
        view.setBigUint64(cursor + 10, e.spatialKey, true);
        view.setUint16(cursor + 18, e.payload.length, true);
        cursor += EVENT_HEADER_SIZE;

        buf.set(e.payload, cursor);
        cursor += e.payload.length;
    }

    return buf;
}
