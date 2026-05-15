// WO-1082-B canonical encoder — LE only, no padding, exact payload reproduction.
// frame_length == 41 + Σ(20 + payload_len_i)

use crate::constants::*;
use crate::types::Frame;

pub fn encode(frame: &Frame) -> Vec<u8> {
    // precompute total frame length
    let events_size: usize = frame.events.iter()
        .map(|e| EVENT_HEADER_SIZE + e.payload.len())
        .sum();
    let frame_length = HEADER_SIZE + events_size;

    let mut buf = Vec::with_capacity(frame_length);

    // emit exact 41-byte header
    buf.extend_from_slice(&(frame_length as u32).to_le_bytes()); // [0..4]  frame_length
    buf.push(ABI_VERSION);                                        // [4]     version
    buf.push(DOMAIN_SEPARATOR);                                   // [5]     domain separator
    buf.push(frame.domain_id);                                    // [6]     frame domain_id
    buf.extend_from_slice(&(frame.events.len() as u32).to_le_bytes()); // [7..11] event_count
    buf.extend_from_slice(&[0u8; 30]);                            // [11..41] reserved

    // emit tightly packed event blocks — no padding, LE encoding only
    for event in &frame.events {
        buf.push(event.domain_id);
        buf.push(event.type_id);
        buf.extend_from_slice(&event.commit_index.to_le_bytes());
        buf.extend_from_slice(&event.sequence_id.to_le_bytes());
        buf.extend_from_slice(&event.spatial_key.to_le_bytes());
        buf.extend_from_slice(&(event.payload.len() as u16).to_le_bytes());
        buf.extend_from_slice(&event.payload);
    }

    buf
}
