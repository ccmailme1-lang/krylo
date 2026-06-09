// WO-1301 — Event Transport Layer (StateBus — legacy untyped path)
// WO-1306 — Typed Event Bus in typed/ (new canonical path)
// KernelStateDelta flows strictly downstream. No upstream reads.

pub mod typed;

use crossbeam_channel::{unbounded, Receiver, Sender};
use krylo_scl::KernelStateDelta;

pub struct StateBus {
    pub tx: Sender<KernelStateDelta>,
    pub rx: Receiver<KernelStateDelta>,
}

impl StateBus {
    pub fn new() -> Self {
        let (tx, rx) = unbounded();
        Self { tx, rx }
    }
}

impl Default for StateBus {
    fn default() -> Self {
        Self::new()
    }
}

pub trait DeltaEmitter {
    fn emit(&self, delta: KernelStateDelta);
}

pub trait DeltaConsumer {
    fn process_delta(&mut self, delta: &KernelStateDelta);
}
