// WO-1327 Gate A — Event-Time Consistency Model
// Enforces monotonic event-time across all surface adapters.
// Wall-clock ingestion order is NOT a valid substitute for event-time.
// All PhiInput timestamps must pass through this gate before kernel update.

#[derive(Debug)]
pub struct EventClock {
    last_event_ms: u64,
    pub sequence: u64,
}

impl EventClock {
    pub fn new() -> Self {
        Self { last_event_ms: 0, sequence: 0 }
    }

    /// Advance the clock. Returns Ok(timestamp_ms) if monotonic.
    /// Returns Err if the event is out of order — caller must discard the event.
    pub fn advance(&mut self, timestamp_ms: u64) -> Result<u64, ClockError> {
        if timestamp_ms < self.last_event_ms {
            return Err(ClockError::OutOfOrder {
                received: timestamp_ms,
                last:     self.last_event_ms,
            });
        }
        self.last_event_ms = timestamp_ms;
        self.sequence += 1;
        Ok(timestamp_ms)
    }

    pub fn last_event_ms(&self) -> u64 { self.last_event_ms }
}

#[derive(Debug, PartialEq)]
pub enum ClockError {
    OutOfOrder { received: u64, last: u64 },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn monotonic_sequence_accepted() {
        let mut c = EventClock::new();
        assert!(c.advance(100).is_ok());
        assert!(c.advance(200).is_ok());
        assert!(c.advance(200).is_ok()); // equal timestamp allowed
        assert_eq!(c.sequence, 3);
    }

    #[test]
    fn out_of_order_rejected() {
        let mut c = EventClock::new();
        c.advance(500).unwrap();
        let err = c.advance(499);
        assert!(matches!(err, Err(ClockError::OutOfOrder { received: 499, last: 500 })));
    }

    #[test]
    fn sequence_increments_only_on_accept() {
        let mut c = EventClock::new();
        c.advance(100).unwrap();
        let _ = c.advance(50); // rejected
        assert_eq!(c.sequence, 1);
        c.advance(200).unwrap();
        assert_eq!(c.sequence, 2);
    }
}
