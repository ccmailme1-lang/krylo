use crossbeam_channel::{unbounded, Receiver, Sender};

/// Lock-free MPSC bus per domain. Single writer per origin. Multi-consumer allowed.
/// Zero mutation after emission — enforced by channel ownership.
pub struct TypedEventBus<T> {
    tx: Sender<T>,
    rx: Receiver<T>,
}

impl<T> TypedEventBus<T> {
    pub fn new() -> Self {
        let (tx, rx) = unbounded();
        Self { tx, rx }
    }

    pub fn sender(&self) -> Sender<T> {
        self.tx.clone()
    }

    pub fn receiver(&self) -> Receiver<T> {
        self.rx.clone()
    }
}

impl<T> Default for TypedEventBus<T> {
    fn default() -> Self {
        Self::new()
    }
}
