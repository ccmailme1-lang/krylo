// WO-1082-B canonical decoder — header validation order is authoritative.
// Cursor traversal is strictly forward. Terminal invariant: cursor == frame_length.

use crate::constants::*;
use crate::errors::DecodeError;
use crate::types::{Event, Frame};

pub fn decode(buf: &[u8]) -> Result<Frame, DecodeError> {
    // 1. minimum frame length
    if buf.len() < HEADER_SIZE {
        return Err(DecodeError::InvalidLength);
    }

    // 2. maximum frame length
    if buf.len() > MAX_FRAME_SIZE {
        return Err(DecodeError::FrameSizeOutOfBounds);
    }

    // 3. frame_length equality — declared u32 LE at bytes [0..4]
    let frame_length = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;
    if frame_length != buf.len() {
        return Err(DecodeError::LengthMismatch);
    }

    // 4. version equality — byte [4]
    if buf[4] != ABI_VERSION {
        return Err(DecodeError::UnsupportedVersion);
    }

    // 5. domain separator equality — byte [5]
    if buf[5] != DOMAIN_SEPARATOR {
        return Err(DecodeError::DomainMismatch);
    }

    // frame domain_id — byte [6]
    let frame_domain_id = buf[6];

    // event_count — u32 LE at bytes [7..11]
    let event_count = u32::from_le_bytes([buf[7], buf[8], buf[9], buf[10]]) as usize;

    // 6. event count bounds
    if event_count > MAX_BATCH_SIZE {
        return Err(DecodeError::ExcessiveEventCount);
    }

    // bytes [11..41] are reserved — consumed but not validated in ABI v1.0

    let mut cursor = HEADER_SIZE;
    let mut events = Vec::with_capacity(event_count);

    for _ in 0..event_count {
        // 7. structural divisibility / 20-byte fixed header boundary
        if cursor + EVENT_HEADER_SIZE > frame_length {
            return Err(DecodeError::TruncatedEventHeader);
        }

        // decode deterministic LE primitives
        let domain_id   = buf[cursor];
        let type_id     = buf[cursor + 1];
        let commit_index = u32::from_le_bytes([
            buf[cursor + 2], buf[cursor + 3], buf[cursor + 4], buf[cursor + 5],
        ]);
        let sequence_id = u32::from_le_bytes([
            buf[cursor + 6], buf[cursor + 7], buf[cursor + 8], buf[cursor + 9],
        ]);
        let spatial_key = u64::from_le_bytes([
            buf[cursor + 10], buf[cursor + 11], buf[cursor + 12], buf[cursor + 13],
            buf[cursor + 14], buf[cursor + 15], buf[cursor + 16], buf[cursor + 17],
        ]);
        let payload_len = u16::from_le_bytes([buf[cursor + 18], buf[cursor + 19]]) as usize;

        cursor += EVENT_HEADER_SIZE;

        // validate domain_id — must be non-zero
        if domain_id == 0 {
            return Err(DecodeError::InvalidDomainId);
        }

        // validate payload bounds
        if cursor + payload_len > frame_length {
            return Err(DecodeError::TruncatedPayload);
        }

        // copy payload — advance cursor strictly
        let payload = buf[cursor..cursor + payload_len].to_vec();
        cursor += payload_len;

        events.push(Event { domain_id, type_id, commit_index, sequence_id, spatial_key, payload });
    }

    // terminal invariant: cursor must be exactly frame_length
    if cursor != frame_length {
        return Err(DecodeError::LengthInvariantViolation);
    }

    Ok(Frame { domain_id: frame_domain_id, events })
}
