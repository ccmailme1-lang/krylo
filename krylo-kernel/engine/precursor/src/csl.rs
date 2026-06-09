// WO-1327 — Cognitive State Lattice (CSL)
// Orthogonal to the FSM. Governs which signals are eligible to influence Σ_slow and R(t).
//
// Rule: Awareness does not imply Engagement.
//       Engagement does not imply Trust.
//       Trust requires temporal validation — cannot be shortcut by signal intensity.
//
// CSL effect on kernel authority:
//   Awareness  → Φ emitted only. R(t) is PROVISIONAL. Σ_slow update ineligible.
//   Engagement → Σ_fast provisional tracking. R(t) PROVISIONAL. Σ_slow gated.
//   Trust      → Full manifold participation. R(t) CANONICAL.

const ENGAGEMENT_TICK_THRESHOLD: u64 = 3;   // observations required to leave Awareness
const TRUST_STABLE_TICK_THRESHOLD: u64 = 30; // consecutive stable ticks to reach Trust
const SIGMA_SLOW_STABILITY_TOL: f64 = 0.05; // max fractional drift for "stable"
const EPSILON: f64 = 1e-12;

#[derive(Debug, Clone, PartialEq)]
pub enum CslState {
    Awareness,
    Engagement,
    Trust,
}

pub struct CognitiveLattice {
    pub state: CslState,
    observation_count: u64,
    stable_tick_run: u64,
    sigma_slow_prev_trace: f64,
}

impl CognitiveLattice {
    pub fn new() -> Self {
        Self {
            state:                 CslState::Awareness,
            observation_count:     0,
            stable_tick_run:       0,
            sigma_slow_prev_trace: 0.0,
        }
    }

    /// Update CSL state after a kernel tick.
    /// sigma_slow_trace: current trace of Σ_slow from MathEngine.
    /// Returns whether Σ_slow update authority is granted (Trust only).
    pub fn tick(&mut self, sigma_slow_trace: f64) -> CslAuthority {
        self.observation_count += 1;

        let drift = if self.sigma_slow_prev_trace < EPSILON {
            0.0
        } else {
            (sigma_slow_trace - self.sigma_slow_prev_trace).abs()
                / (self.sigma_slow_prev_trace + EPSILON)
        };
        self.sigma_slow_prev_trace = sigma_slow_trace;

        match self.state {
            CslState::Awareness => {
                if self.observation_count >= ENGAGEMENT_TICK_THRESHOLD {
                    self.state = CslState::Engagement;
                    self.stable_tick_run = 0;
                }
                CslAuthority::Provisional
            }
            CslState::Engagement => {
                if drift <= SIGMA_SLOW_STABILITY_TOL {
                    self.stable_tick_run += 1;
                } else {
                    self.stable_tick_run = 0;
                }
                if self.stable_tick_run >= TRUST_STABLE_TICK_THRESHOLD {
                    self.state = CslState::Trust;
                }
                CslAuthority::Provisional
            }
            CslState::Trust => {
                // Trust only exits via PFC collapse — not via drift alone.
                CslAuthority::Canonical
            }
        }
    }

    /// PFC-driven demotion: Trust/Engagement → Awareness.
    /// Called by PfcEngine when phantom collapse is detected.
    pub fn demote(&mut self) {
        match self.state {
            CslState::Trust | CslState::Engagement => {
                self.state = CslState::Awareness;
                self.observation_count = 0;
                self.stable_tick_run = 0;
            }
            CslState::Awareness => {}
        }
    }
}

/// Authority granted by CSL state for kernel output.
#[derive(Debug, Clone, PartialEq)]
pub enum CslAuthority {
    /// R(t) output is provisional — not eligible for phase transition signaling.
    Provisional,
    /// R(t) output is canonical — eligible for phase transition signaling.
    Canonical,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_in_awareness() {
        let l = CognitiveLattice::new();
        assert_eq!(l.state, CslState::Awareness);
    }

    #[test]
    fn advances_to_engagement_after_threshold() {
        let mut l = CognitiveLattice::new();
        for _ in 0..ENGAGEMENT_TICK_THRESHOLD {
            l.tick(1.0);
        }
        assert_eq!(l.state, CslState::Engagement);
    }

    #[test]
    fn engagement_does_not_reach_trust_without_stability() {
        let mut l = CognitiveLattice::new();
        // reach Engagement
        for _ in 0..ENGAGEMENT_TICK_THRESHOLD { l.tick(1.0); }
        // Oscillate between 1.0 and 100.0 — absolute drift always ~99% each tick
        // This keeps fractional drift high regardless of magnitude.
        for i in 0..200u64 {
            let v = if i % 2 == 0 { 1.0 } else { 100.0 };
            l.tick(v);
        }
        assert_ne!(l.state, CslState::Trust);
    }

    #[test]
    fn reaches_trust_after_stable_engagement() {
        let mut l = CognitiveLattice::new();
        for _ in 0..ENGAGEMENT_TICK_THRESHOLD { l.tick(1.0); }
        assert_eq!(l.state, CslState::Engagement);
        // stable sigma_slow trace (same value → zero drift)
        for _ in 0..TRUST_STABLE_TICK_THRESHOLD { l.tick(1.0); }
        assert_eq!(l.state, CslState::Trust);
    }

    #[test]
    fn trust_canonical_authority() {
        let mut l = CognitiveLattice::new();
        for _ in 0..ENGAGEMENT_TICK_THRESHOLD { l.tick(1.0); }
        for _ in 0..TRUST_STABLE_TICK_THRESHOLD { l.tick(1.0); }
        let auth = l.tick(1.0);
        assert_eq!(auth, CslAuthority::Canonical);
    }

    #[test]
    fn demote_resets_trust_to_awareness() {
        let mut l = CognitiveLattice::new();
        for _ in 0..ENGAGEMENT_TICK_THRESHOLD { l.tick(1.0); }
        for _ in 0..TRUST_STABLE_TICK_THRESHOLD { l.tick(1.0); }
        assert_eq!(l.state, CslState::Trust);
        l.demote();
        assert_eq!(l.state, CslState::Awareness);
    }

    #[test]
    fn awareness_returns_provisional() {
        let mut l = CognitiveLattice::new();
        let auth = l.tick(1.0);
        assert_eq!(auth, CslAuthority::Provisional);
    }
}
