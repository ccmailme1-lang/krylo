use crate::state::{ObserverState, ObserverTrustVector, StateLock, evaluate_transition};

/// Observer annealing engine (§8).
/// Trust is earned through informational consistency and temporal persistence —
/// NOT clicks, signups, or account age alone.
pub struct ObserverAnnealingEngine {
    pub trust_vector:  ObserverTrustVector,
    pub current_state: ObserverState,
    pub state_lock:    Option<StateLock>,
}

impl ObserverAnnealingEngine {
    pub fn new() -> Self {
        Self {
            trust_vector:  ObserverTrustVector::new(),
            current_state: ObserverState::S0_Awareness,
            state_lock:    None,
        }
    }

    /// Record a sustained observation.
    /// duration_s: session length in seconds.
    /// consistency: behavioral consistency signal [0.0, 1.0].
    /// timestamp_ms: current event time — used to stamp StateLock.
    pub fn observe(&mut self, duration_s: f64, consistency: f64, timestamp_ms: u64) {
        let tv = &mut self.trust_vector;
        tv.observation_duration = (tv.observation_duration + duration_s).min(86_400.0);
        tv.continuity_score = (tv.continuity_score + consistency * 0.02).min(1.0);
        tv.revisit_consistency = (tv.revisit_consistency + consistency * 0.01).min(1.0);
        self.try_advance(timestamp_ms);
    }

    /// Apply volatility penalty — burst extraction, scraping, rapid surface traversal.
    pub fn penalize(&mut self, volatility: f64) {
        self.trust_vector.volatility_penalty =
            (self.trust_vector.volatility_penalty + volatility * 0.15).min(0.5);
    }

    /// Whether this observer holds a state lock (reached S3+).
    pub fn is_locked(&self) -> bool {
        self.state_lock.is_some()
    }

    fn try_advance(&mut self, timestamp_ms: u64) {
        // Cascade: loop until no further transition is possible this tick.
        // Ensures trust vectors that already satisfy multiple thresholds
        // advance to their correct state in one call.
        loop {
            let next = evaluate_transition(&self.current_state, &self.trust_vector);
            if next == self.current_state {
                break;
            }
            self.current_state = next.clone();
            if self.current_state == ObserverState::S3_Trust && self.state_lock.is_none() {
                self.state_lock = Some(StateLock {
                    locked_at_ms:   timestamp_ms,
                    observer_state: ObserverState::S3_Trust,
                });
            }
        }
    }
}

impl Default for ObserverAnnealingEngine {
    fn default() -> Self {
        Self::new()
    }
}
