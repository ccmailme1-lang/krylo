// WO-1082-D parity fixture generator
// Encodes the canonical test frames and prints one hex-encoded frame per line.
// TS harness reads this output and compares byte-for-byte against TS encoder output.

use krylo_codec::encode::encode;
use krylo_codec::types::{Event, Frame};

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn fixtures() -> Vec<Frame> {
    vec![
        // fixture 0: sample frame — mirrors lib.rs test suite
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
        },
        // fixture 1: empty payload
        Frame {
            domain_id: 2,
            events: vec![Event {
                domain_id: 2, type_id: 1, commit_index: 0,
                sequence_id: 0, spatial_key: 0, payload: vec![],
            }],
        },
        // fixture 2: zero events
        Frame { domain_id: 1, events: vec![] },
    ]
}

fn main() {
    for frame in fixtures() {
        println!("{}", to_hex(&encode(&frame)));
    }
}
