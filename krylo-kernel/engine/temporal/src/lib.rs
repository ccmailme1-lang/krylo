// WO-1328 — Unified Temporal Replay / Simulation Harness
// The layer that decides what "now" means.
//
// Everything else only answers: "given now, what state are we in?"
//
// SINGULARITY RULE (§11): Only one timeline is active at a time per context.
// ISOLATION RULE (§11):   Projection cannot mutate history.
// DETERMINISM RULE (§11): Replay = exact reconstruction via same decode path.

pub mod authority;
pub mod divergence;
pub mod frame;
pub mod mode;
pub mod resolver;
pub mod scrubber;

pub use authority::TemporalAuthority;
pub use divergence::TemporalDivergence;
pub use frame::TemporalFrame;
pub use mode::TemporalMode;
pub use resolver::{active_mode, is_historical, is_projecting, resolve_time};
pub use scrubber::Scrubber;

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use krylo_scl::FsmState;
    use krylo_webgl_tx::{MotionClass, WebGlKinematics};

    fn s0_kinematics() -> WebGlKinematics {
        WebGlKinematics {
            color_hex:  "#3A3D4A",
            color_rgb:  [0.227, 0.239, 0.290],
            motion:     MotionClass::Static,
            intensity:  0.05,
            bloom:      false,
            glow:       false,
            emissive:   0.0,
            regime:     FsmState::S0_PassiveObservation,
        }
    }

    fn test_frame(mode: TemporalMode, resonance: f64) -> TemporalFrame {
        TemporalFrame::new(
            1_000,
            mode,
            FsmState::S0_PassiveObservation,
            resonance,
            0.5,
            0.1,
            1,
            s0_kinematics(),
        )
    }

    // ── Authority ─────────────────────────────────────────────────────────────

    #[test]
    fn authority_starts_in_live_mode() {
        let a = TemporalAuthority::new();
        assert_eq!(a.mode, TemporalMode::Live);
        assert_eq!(a.playback_rate, 1.0);
        assert!(!a.paused);
        assert!(a.replay_cursor.is_none());
    }

    #[test]
    fn enter_replay_sets_cursor() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(5_000);
        assert_eq!(a.mode, TemporalMode::Replay);
        assert_eq!(a.replay_cursor, Some(5_000));
    }

    #[test]
    fn enter_projection_sets_origin_and_canonical_time() {
        let mut a = TemporalAuthority::new();
        a.enter_projection(10_000);
        assert_eq!(a.mode, TemporalMode::Projection);
        assert_eq!(a.projection_origin, Some(10_000));
        assert_eq!(a.canonical_time_ms, 10_000);
    }

    #[test]
    fn enter_hybrid_sets_replay_cursor_and_canonical_time() {
        let mut a = TemporalAuthority::new();
        a.enter_hybrid(7_000);
        assert_eq!(a.mode, TemporalMode::Hybrid);
        assert_eq!(a.replay_cursor, Some(7_000));
        assert_eq!(a.canonical_time_ms, 7_000);
    }

    #[test]
    fn return_to_live_restores_live_mode() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(1_000);
        a.return_to_live();
        assert_eq!(a.mode, TemporalMode::Live);
        // cursor retained for re-entry
        assert_eq!(a.replay_cursor, Some(1_000));
    }

    #[test]
    fn advance_is_noop_when_paused() {
        let mut a = TemporalAuthority::new();
        a.enter_projection(1_000);
        a.paused = true;
        a.advance(500);
        assert_eq!(a.canonical_time_ms, 1_000, "paused authority must not advance");
    }

    #[test]
    fn advance_moves_replay_cursor() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(1_000);
        a.advance(500);
        assert_eq!(a.replay_cursor, Some(1_500));
    }

    // ── Resolver ─────────────────────────────────────────────────────────────

    #[test]
    fn resolve_time_live_returns_system_time() {
        let a = TemporalAuthority::new();
        assert_eq!(resolve_time(&a, 99_000), 99_000);
    }

    #[test]
    fn resolve_time_replay_returns_cursor() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(5_000);
        assert_eq!(resolve_time(&a, 99_000), 5_000);
    }

    #[test]
    fn resolve_time_replay_no_cursor_falls_back_to_canonical() {
        let mut a = TemporalAuthority::new();
        a.mode = TemporalMode::Replay;
        a.canonical_time_ms = 3_000;
        // replay_cursor is None — graceful fallback per §12
        assert_eq!(resolve_time(&a, 99_000), 3_000);
    }

    #[test]
    fn resolve_time_projection_returns_canonical() {
        let mut a = TemporalAuthority::new();
        a.enter_projection(8_000);
        assert_eq!(resolve_time(&a, 99_000), 8_000);
    }

    #[test]
    fn resolve_time_hybrid_returns_canonical() {
        let mut a = TemporalAuthority::new();
        a.enter_hybrid(6_000);
        assert_eq!(resolve_time(&a, 99_000), 6_000);
    }

    #[test]
    fn is_historical_true_for_replay_and_hybrid() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(1_000);
        assert!(is_historical(&a));
        a.enter_hybrid(1_000);
        assert!(is_historical(&a));
        a.return_to_live();
        assert!(!is_historical(&a));
    }

    #[test]
    fn is_projecting_true_for_projection_and_hybrid() {
        let mut a = TemporalAuthority::new();
        a.enter_projection(1_000);
        assert!(is_projecting(&a));
        a.enter_hybrid(1_000);
        assert!(is_projecting(&a));
        a.return_to_live();
        assert!(!is_projecting(&a));
    }

    // ── Scrubber ─────────────────────────────────────────────────────────────

    #[test]
    fn scrubber_drag_left_enters_replay() {
        let mut a = TemporalAuthority::new();
        a.canonical_time_ms = 10_000;
        Scrubber::drag_left(&mut a, 3_000);
        assert_eq!(a.mode, TemporalMode::Replay);
        assert_eq!(a.replay_cursor, Some(7_000));
    }

    #[test]
    fn scrubber_drag_right_enters_projection() {
        let mut a = TemporalAuthority::new();
        a.canonical_time_ms = 10_000;
        Scrubber::drag_right(&mut a, 5_000);
        assert_eq!(a.mode, TemporalMode::Projection);
        assert_eq!(a.canonical_time_ms, 15_000);
        assert_eq!(a.projection_origin, Some(10_000));
    }

    #[test]
    fn scrubber_center_lock_returns_live() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(5_000);
        Scrubber::center_lock(&mut a);
        assert_eq!(a.mode, TemporalMode::Live);
        // cursor retained
        assert_eq!(a.replay_cursor, Some(5_000));
    }

    #[test]
    fn scrubber_fork_enters_hybrid() {
        let mut a = TemporalAuthority::new();
        a.enter_replay(4_000);
        Scrubber::fork(&mut a);
        assert_eq!(a.mode, TemporalMode::Hybrid);
        assert_eq!(a.replay_cursor, Some(4_000));
    }

    // ── Frame ─────────────────────────────────────────────────────────────────

    #[test]
    fn frame_is_replay_only_in_replay_mode() {
        let f = test_frame(TemporalMode::Replay, 1.0);
        assert!(f.is_replay());
        assert!(!f.is_synthetic());
    }

    #[test]
    fn frame_is_synthetic_in_projection_and_hybrid() {
        let fp = test_frame(TemporalMode::Projection, 1.0);
        let fh = test_frame(TemporalMode::Hybrid, 1.0);
        assert!(fp.is_synthetic());
        assert!(fh.is_synthetic());
        assert!(!fp.is_replay());
    }

    // ── Divergence ───────────────────────────────────────────────────────────

    #[test]
    fn divergence_computes_delta_coherence() {
        let replay = test_frame(TemporalMode::Replay, 2.0);
        let proj   = test_frame(TemporalMode::Projection, 1.0);
        let div = TemporalDivergence::compute(replay, proj);
        // resonance diff = 1.0 × 1.0 = 1.0; trust/xi same
        assert!((div.delta_coherence - 1.0).abs() < 1e-9);
    }

    #[test]
    fn divergence_zero_for_identical_frames() {
        let r = test_frame(TemporalMode::Replay, 1.5);
        let p = test_frame(TemporalMode::Projection, 1.5);
        let div = TemporalDivergence::compute(r, p);
        assert!(div.delta_coherence < 1e-9);
        assert!(!div.is_significant());
    }

    #[test]
    fn divergence_is_significant_above_threshold() {
        let r = test_frame(TemporalMode::Replay, 3.0);
        let p = test_frame(TemporalMode::Projection, 0.0);
        let div = TemporalDivergence::compute(r, p);
        assert!(div.is_significant(), "large resonance gap must be significant");
    }

    // ── Singularity rule ─────────────────────────────────────────────────────

    #[test]
    fn only_one_mode_active_per_authority() {
        let mut a = TemporalAuthority::new();
        // Each transition leaves exactly one mode active
        a.enter_replay(1_000);
        assert_eq!(active_mode(&a), &TemporalMode::Replay);
        a.enter_projection(2_000);
        assert_eq!(active_mode(&a), &TemporalMode::Projection);
        a.return_to_live();
        assert_eq!(active_mode(&a), &TemporalMode::Live);
    }
}
