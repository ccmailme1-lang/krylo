use crate::state::ObserverTrustVector;

/// Longitudinal continuity tracker.
/// Continuity increases with regular return visits — not raw session count.
pub struct ContinuityTracker {
    last_visit_ms: Option<u64>,
    pub session_count: u32,
}

impl ContinuityTracker {
    pub fn new() -> Self {
        Self { last_visit_ms: None, session_count: 0 }
    }

    /// Record a visit. Applies continuity delta to trust vector.
    /// Returns the delta applied.
    pub fn record_visit(&mut self, now_ms: u64, trust: &mut ObserverTrustVector) -> f64 {
        self.session_count += 1;
        let delta = match self.last_visit_ms {
            Some(last) => {
                let gap_hours = (now_ms.saturating_sub(last)) as f64 / 3_600_000.0;
                if gap_hours <= 24.0 {
                    0.05 // daily return — strong signal
                } else if gap_hours <= 168.0 {
                    0.02 // weekly return — moderate
                } else {
                    0.005 // long gap — minimal but still positive
                }
            }
            None => 0.01, // first visit baseline
        };
        self.last_visit_ms = Some(now_ms);
        trust.revisit_consistency = (trust.revisit_consistency + delta).min(1.0);
        delta
    }
}

impl Default for ContinuityTracker {
    fn default() -> Self {
        Self::new()
    }
}
