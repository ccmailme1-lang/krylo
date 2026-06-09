// WO-1305 — Session Acquisition / State Lock
// Longitudinal observer continuity. Trust accumulation. Perceptual fidelity escalation.
//
// INVARIANT: Never touches kernel math. Reads only from WO-1304 projection layer.
// Trust is earned through informational consistency and temporal persistence,
// NOT clicks, signups, or account age.
//
// Observer states (S0–S4) are NOT the kernel FSM — they are observer-state evolution.

pub mod state;
pub mod transport;
pub mod trust;

pub use state::{ObserverState, ObserverTrustVector, StateLock, evaluate_transition};
pub use trust::{
    ContinuityTracker, ObserverAnnealingEngine,
    apply_volatility_penalty, decay_volatility_penalty, is_volatile,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn engine() -> ObserverAnnealingEngine {
        ObserverAnnealingEngine::new()
    }

    #[test]
    fn new_observer_starts_at_s0() {
        let e = engine();
        assert_eq!(e.current_state, ObserverState::S0_Awareness);
        assert!(!e.is_locked());
    }

    #[test]
    fn trust_accumulates_with_repeated_observations() {
        let mut e = engine();
        let initial = e.trust_vector.net_trust();
        e.observe(300.0, 0.8, 1000);
        e.observe(300.0, 0.8, 2000);
        assert!(e.trust_vector.net_trust() > initial, "trust must accumulate with observation");
    }

    #[test]
    fn volatility_penalty_reduces_net_trust() {
        let mut e = engine();
        e.observe(600.0, 1.0, 1000);
        let before = e.trust_vector.net_trust();
        e.penalize(1.0);
        let after = e.trust_vector.net_trust();
        assert!(after < before, "volatility penalty must reduce net trust");
    }

    #[test]
    fn s0_to_s1_transition_requires_continuity() {
        let mut e = engine();
        // Should stay at S0 with zero observations
        assert_eq!(e.current_state, ObserverState::S0_Awareness);
        // Drive past S0→S1 threshold (0.10 net_trust)
        for _ in 0..30 {
            e.observe(120.0, 1.0, 1000);
        }
        assert_ne!(
            e.current_state, ObserverState::S0_Awareness,
            "sustained observation must advance past S0"
        );
    }

    #[test]
    fn state_lock_created_at_s3() {
        let mut e = engine();
        assert!(e.state_lock.is_none(), "no lock before S3");
        // Force net_trust to S3 threshold by directly setting vector
        e.trust_vector.continuity_score     = 0.85;
        e.trust_vector.observation_duration = 3600.0;
        e.trust_vector.revisit_consistency  = 0.85;
        e.trust_vector.interaction_entropy  = 0.1;
        e.observe(0.0, 0.0, 99_000); // trigger try_advance
        assert!(e.is_locked(), "StateLock must be created at S3");
    }

    #[test]
    fn state_lock_not_created_below_s3() {
        let mut e = engine();
        // Minimal signal — stays below S3
        e.observe(10.0, 0.1, 1000);
        assert!(!e.is_locked(), "no lock below S3");
    }

    #[test]
    fn volatility_penalty_suppresses_transition() {
        let mut e = engine();
        // Raise trust near S1 threshold
        e.trust_vector.continuity_score = 0.25;
        e.trust_vector.observation_duration = 1800.0;
        e.trust_vector.revisit_consistency = 0.20;
        e.trust_vector.interaction_entropy = 0.2;
        // Apply heavy penalty — should keep net_trust below S0→S1 threshold
        e.trust_vector.volatility_penalty = 0.5;
        let next = evaluate_transition(&e.current_state, &e.trust_vector);
        assert_eq!(next, ObserverState::S0_Awareness, "heavy penalty must suppress S0→S1");
    }

    #[test]
    fn decay_reduces_volatility_penalty() {
        let mut trust = ObserverTrustVector::new();
        trust.volatility_penalty = 0.3;
        decay_volatility_penalty(&mut trust, 0.05);
        assert!((trust.volatility_penalty - 0.25).abs() < 1e-9);
    }

    #[test]
    fn is_volatile_detects_burst_pattern() {
        assert!(is_volatile(11.0, 5), "high access rate is volatile");
        assert!(is_volatile(1.0, 25), "many surface switches are volatile");
        assert!(!is_volatile(1.0, 5), "normal access is not volatile");
    }

    #[test]
    fn continuity_tracker_awards_delta_for_daily_return() {
        let mut tracker = ContinuityTracker::new();
        let mut trust = ObserverTrustVector::new();
        tracker.record_visit(0, &mut trust);                  // first visit
        let delta = tracker.record_visit(3_600_000, &mut trust); // 1hr later
        assert!(delta >= 0.05, "daily return must award max delta, got {}", delta);
    }

    #[test]
    fn observer_states_are_distinct() {
        use ObserverState::*;
        assert_ne!(S0_Awareness, S1_Familiarity);
        assert_ne!(S1_Familiarity, S2_Continuity);
        assert_ne!(S2_Continuity, S3_Trust);
        assert_ne!(S3_Trust, S4_StructuralAccess);
    }
}
