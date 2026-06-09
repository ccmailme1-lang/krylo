// WO-1304 — Guest Funnel / Forensic Panel
// Controlled awareness projection layer. Read-only from kernel.
//
// INVARIANTS (§7, §13):
//   ξ, Σ, raw R(t), sequence_id, entity_anchor, typed envelopes — NEVER exposed.
//   Projection noise REQUIRED. Repeated observation must not allow
//   reconstruction of kernel state.
//
// Throttle integration (§10): guest layer is sacrificial — kernel always wins.

pub mod projection;
pub mod transport;

pub use projection::{
    GuestState, PhaseHorizon, ProjectionAdapter, ProjectionFidelity,
    ResonanceField, MotionTrail, TrustGauge, VisualPressure,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use krylo_scl::FsmState;
    use krylo_watchdog::ThrottleState;

    fn adapter() -> ProjectionAdapter {
        ProjectionAdapter::new()
    }

    #[test]
    fn visual_pressure_fields_are_finite() {
        let mut a = adapter();
        let vp = a.project(2.5, &FsmState::S2_CoherenceConfirmation, &ProjectionFidelity::Full);
        assert!(vp.intensity.is_finite(), "intensity must be finite");
        assert!(vp.instability.is_finite(), "instability must be finite");
        assert!(vp.coherence_hint.is_finite(), "coherence_hint must be finite");
    }

    #[test]
    fn emergency_clamp_returns_static_projection() {
        let mut a = adapter();
        let vp = a.project(15.0, &FsmState::S4_ExecutionDispatch, &ProjectionFidelity::Static);
        // Static output is deliberately muted — not zero but clearly suppressed
        assert!(vp.intensity < 0.15, "static projection must be muted, got {}", vp.intensity);
        assert!(vp.instability < 0.15, "static instability must be muted");
        assert!(vp.coherence_hint < 0.15, "static coherence_hint must be muted");
    }

    #[test]
    fn noise_makes_consecutive_projections_differ() {
        let mut a = adapter();
        let vp1 = a.project(5.0, &FsmState::S2_CoherenceConfirmation, &ProjectionFidelity::Full);
        let vp2 = a.project(5.0, &FsmState::S2_CoherenceConfirmation, &ProjectionFidelity::Full);
        // Noise phase advances each call — outputs must not be identical
        assert!(
            (vp1.intensity - vp2.intensity).abs() > 1e-6,
            "noise required: consecutive projections must differ (§13)"
        );
    }

    #[test]
    fn higher_regime_produces_higher_intensity() {
        let mut a = adapter();
        let low  = a.project(3.0, &FsmState::S0_PassiveObservation,   &ProjectionFidelity::Full);
        let mut b = adapter();
        let high = b.project(3.0, &FsmState::S4_ExecutionDispatch,    &ProjectionFidelity::Full);
        assert!(
            high.intensity > low.intensity,
            "S4 must produce higher intensity than S0, got {} vs {}",
            high.intensity, low.intensity
        );
    }

    #[test]
    fn reduced_fidelity_lower_than_full() {
        let mut a = adapter();
        let full    = a.project(8.0, &FsmState::S3_ResonanceActive, &ProjectionFidelity::Full);
        let mut b = adapter();
        let reduced = b.project(8.0, &FsmState::S3_ResonanceActive, &ProjectionFidelity::Reduced);
        assert!(
            reduced.intensity < full.intensity,
            "Reduced fidelity must suppress intensity vs Full"
        );
    }

    #[test]
    fn projection_fidelity_maps_throttle_states() {
        assert_eq!(ProjectionFidelity::from_throttle(&ThrottleState::Normal),        ProjectionFidelity::Full);
        assert_eq!(ProjectionFidelity::from_throttle(&ThrottleState::Degraded),      ProjectionFidelity::Reduced);
        assert_eq!(ProjectionFidelity::from_throttle(&ThrottleState::Throttled),     ProjectionFidelity::ReplayOnly);
        assert_eq!(ProjectionFidelity::from_throttle(&ThrottleState::EmergencyClamp), ProjectionFidelity::Static);
    }

    #[test]
    fn guest_states_are_distinct() {
        assert_ne!(GuestState::G0, GuestState::G1);
        assert_ne!(GuestState::G1, GuestState::G2);
        assert_ne!(GuestState::G0, GuestState::G2);
    }

    #[test]
    fn resonance_field_stays_in_bounds() {
        let field = ResonanceField::from_normalized(0.85, &FsmState::S3_ResonanceActive);
        assert!(field.ambient_pressure <= 1.0);
        assert!(field.spatial_heat <= 1.0);
        assert!(field.pulse_gradient <= 1.0);
    }

    #[test]
    fn phase_horizon_dispatch_is_probable() {
        let h = PhaseHorizon::from_regime(&FsmState::S4_ExecutionDispatch, 0.9);
        assert!(h.transition_probable, "S4 + high resonance must be transition-probable");
        assert!(h.distance_to_transition < 0.35);
    }

    #[test]
    fn phase_horizon_passive_is_distant() {
        let h = PhaseHorizon::from_regime(&FsmState::S0_PassiveObservation, 0.0);
        assert!(!h.transition_probable, "S0 + zero resonance must NOT be transition-probable");
        assert!(h.distance_to_transition > 0.8);
    }

    #[test]
    fn trust_gauge_smooths_slowly() {
        let mut gauge = TrustGauge::new();
        // Even after 10 full-signal updates, score must not spike
        for _ in 0..10 {
            gauge.update(1.0);
        }
        assert!(
            gauge.longitudinal_score < 0.5,
            "trust must not spike: after 10 updates got {}",
            gauge.longitudinal_score
        );
    }

    #[test]
    fn motion_trail_from_projected_in_bounds() {
        let trail = MotionTrail::from_projected(0.6, 0.8);
        assert!(trail.emergence_acceleration >= -1.0 && trail.emergence_acceleration <= 1.0);
        assert!(trail.convergence_direction >= 0.0 && trail.convergence_direction <= 1.0);
        assert!(trail.motion_magnitude >= 0.0 && trail.motion_magnitude <= 1.0);
    }
}
