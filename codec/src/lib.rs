pub mod constants;
pub mod errors;
pub mod types;
pub mod decode;
pub mod encode;

#[cfg(test)]
mod tests {
    use super::*;
    use types::{Event, Frame};

    fn sample_frame() -> Frame {
        Frame {
            domain_id: 1,
            events: vec![
                Event {
                    domain_id:    1,
                    type_id:      2,
                    commit_index: 100,
                    sequence_id:  42,
                    spatial_key:  0xDEADBEEFCAFEBABE,
                    payload:      vec![0x01, 0x02, 0x03],
                },
                Event {
                    domain_id:    1,
                    type_id:      5,
                    commit_index: 101,
                    sequence_id:  43,
                    spatial_key:  0,
                    payload:      vec![],
                },
            ],
        }
    }

    // Acceptance gate: encode(decode(x)) == x for all valid frames
    #[test]
    fn round_trip() {
        let original = sample_frame();
        let encoded  = encode::encode(&original);
        let decoded  = decode::decode(&encoded).expect("decode failed");
        assert_eq!(original, decoded);
    }

    #[test]
    fn empty_payload_round_trip() {
        let frame = Frame {
            domain_id: 2,
            events: vec![Event {
                domain_id: 2, type_id: 1, commit_index: 0,
                sequence_id: 0, spatial_key: 0, payload: vec![],
            }],
        };
        let encoded = encode::encode(&frame);
        let decoded = decode::decode(&encoded).expect("decode failed");
        assert_eq!(frame, decoded);
    }

    #[test]
    fn zero_events_round_trip() {
        let frame = Frame { domain_id: 1, events: vec![] };
        let encoded = encode::encode(&frame);
        let decoded = decode::decode(&encoded).expect("decode failed");
        assert_eq!(frame, decoded);
    }

    #[test]
    fn rejects_invalid_length() {
        use errors::DecodeError;
        let result = decode::decode(&[0u8; 10]);
        assert_eq!(result, Err(DecodeError::InvalidLength));
    }

    #[test]
    fn rejects_length_mismatch() {
        use errors::DecodeError;
        let frame   = sample_frame();
        let mut buf = encode::encode(&frame);
        // declare wrong frame_length
        let wrong = (buf.len() as u32 + 1).to_le_bytes();
        buf[0..4].copy_from_slice(&wrong);
        assert_eq!(decode::decode(&buf), Err(DecodeError::LengthMismatch));
    }

    #[test]
    fn rejects_unsupported_version() {
        use errors::DecodeError;
        let frame   = sample_frame();
        let mut buf = encode::encode(&frame);
        buf[4] = 0xFF;
        assert_eq!(decode::decode(&buf), Err(DecodeError::UnsupportedVersion));
    }

    #[test]
    fn rejects_domain_separator_mismatch() {
        use errors::DecodeError;
        let frame   = sample_frame();
        let mut buf = encode::encode(&frame);
        buf[5] = 0x00;
        assert_eq!(decode::decode(&buf), Err(DecodeError::DomainMismatch));
    }

    #[test]
    fn rejects_zero_domain_id_in_event() {
        use errors::DecodeError;
        let mut frame = sample_frame();
        frame.events[0].domain_id = 0;
        let buf = encode::encode(&frame);
        assert_eq!(decode::decode(&buf), Err(DecodeError::InvalidDomainId));
    }
}
