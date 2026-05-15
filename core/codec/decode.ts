// WO-1082-C canonical decoder — validation order mirrors codec/src/decode.rs exactly.
// Uses DataView for explicit LE reads. No implicit coercions. No float arithmetic.
// Terminal invariant: cursor === frame_length.

import { ABI_VERSION, DOMAIN_SEPARATOR, HEADER_SIZE, EVENT_HEADER_SIZE, MAX_BATCH_SIZE, MAX_FRAME_SIZE } from './constants.js';
import { CodecError, DecodeError } from './errors.js';
import { Event, Frame } from './types.js';

export function decode(buf: Uint8Array): Frame {
    const len  = buf.length;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    // 1. minimum frame length
    if (len < HEADER_SIZE) {
        throw new CodecError(DecodeError.InvalidLength);
    }

    // 2. maximum frame length
    if (len > MAX_FRAME_SIZE) {
        throw new CodecError(DecodeError.FrameSizeOutOfBounds);
    }

    // 3. frame_length equality — u32 LE at bytes [0..4]
    const frameLength = view.getUint32(0, true);
    if (frameLength !== len) {
        throw new CodecError(DecodeError.LengthMismatch);
    }

    // 4. version equality — byte [4]
    if (view.getUint8(4) !== ABI_VERSION) {
        throw new CodecError(DecodeError.UnsupportedVersion);
    }

    // 5. domain separator equality — byte [5]
    if (view.getUint8(5) !== DOMAIN_SEPARATOR) {
        throw new CodecError(DecodeError.DomainMismatch);
    }

    // frame domain_id — byte [6]
    const frameDomainId = view.getUint8(6);

    // event_count — u32 LE at bytes [7..11]
    const eventCount = view.getUint32(7, true);

    // 6. event count bounds
    if (eventCount > MAX_BATCH_SIZE) {
        throw new CodecError(DecodeError.ExcessiveEventCount);
    }

    // bytes [11..41] reserved — consumed, not validated in ABI v1.0

    let cursor = HEADER_SIZE;
    const events: Event[] = [];

    for (let i = 0; i < eventCount; i++) {
        // 7. 20-byte fixed event header boundary
        if (cursor + EVENT_HEADER_SIZE > frameLength) {
            throw new CodecError(DecodeError.TruncatedEventHeader);
        }

        // decode deterministic LE primitives
        const domainId    = view.getUint8(cursor);
        const typeId      = view.getUint8(cursor + 1);
        const commitIndex = view.getUint32(cursor + 2, true);
        const sequenceId  = view.getUint32(cursor + 6, true);
        const spatialKey  = view.getBigUint64(cursor + 10, true);
        const payloadLen  = view.getUint16(cursor + 18, true);

        cursor += EVENT_HEADER_SIZE;

        // validate domain_id — must be non-zero
        if (domainId === 0) {
            throw new CodecError(DecodeError.InvalidDomainId);
        }

        // validate payload bounds
        if (cursor + payloadLen > frameLength) {
            throw new CodecError(DecodeError.TruncatedPayload);
        }

        // copy payload — advance cursor strictly
        const payload = buf.slice(cursor, cursor + payloadLen);
        cursor += payloadLen;

        events.push({ domainId, typeId, commitIndex, sequenceId, spatialKey, payload });
    }

    // terminal invariant: cursor must equal frame_length exactly
    if (cursor !== frameLength) {
        throw new CodecError(DecodeError.LengthInvariantViolation);
    }

    return { domainId: frameDomainId, events };
}
