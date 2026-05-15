// WO-1082-D decode verifier
// Reads hex-encoded frames from stdin (one per line), decodes with Rust decoder.
// Outputs "OK" or "ERR:<kind>" per line — used by TS harness to verify
// that TS-encoded frames are accepted by the Rust reference decoder.

use std::io::{self, BufRead};
use krylo_codec::decode::decode;

fn from_hex(s: &str) -> Result<Vec<u8>, ()> {
    if s.len() % 2 != 0 { return Err(()); }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|_| ()))
        .collect()
}

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.expect("stdin read failed");
        let line = line.trim();
        // empty hex = zero-length buffer = InvalidLength by definition
        if line.is_empty() {
            println!("ERR:InvalidLength");
            continue;
        }
        match from_hex(line) {
            Err(_) => println!("ERR:InvalidHex"),
            Ok(bytes) => match decode(&bytes) {
                Ok(_)    => println!("OK"),
                Err(e)   => println!("ERR:{:?}", e),
            },
        }
    }
}
