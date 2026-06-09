// WO-1301 Phase 3 — adapters/webgl_tx
// FSM regime → WebGL kinematics. Projection only. No logic. No inference.
//
// Color/motion semantics locked per CLAUDE.md §6:
//   S0 → muted slate  #3A3D4A — nearly static
//   S1 → dark neutral #1A1A1A — slow drift
//   S2 → lime         #66FF00 — coherent pulse, soft bloom
//   S3 → blue         #007FFF — irregular jitter, NO bloom, NO glow
//   S4 → purple       #8A2BE2 — gravitational compression, restrained bloom

use krylo_scl::{FsmState, KernelStateDelta, StateMutation};
use serde::{Deserialize, Serialize};

// ── Output contract ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MotionClass {
    Static,    // S0 — nearly no movement
    Drift,     // S1 — slow ambient drift
    Pulse,     // S2 — coherent periodic pulse
    Jitter,    // S3 — irregular high-frequency noise
    Compress,  // S4 — gravitational inward compression
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebGlKinematics {
    /// Hex color string matching CLAUDE.md §6 locked palette.
    pub color_hex: &'static str,
    /// Normalized RGB [0.0, 1.0] for direct uniform upload.
    pub color_rgb: [f32; 3],
    pub motion: MotionClass,
    /// Overall field intensity [0.0, 1.0].
    pub intensity: f32,
    /// Bloom allowed. False for S3 (blue) by spec.
    pub bloom: bool,
    /// Glow allowed. False for S3 (blue) by spec.
    pub glow: bool,
    /// Emissive dominance [0.0, 1.0]. Only lime/purple reach high values.
    pub emissive: f32,
    /// Source regime that produced this frame.
    pub regime: FsmState,
}

// ── Kinematics table (locked — no runtime logic) ──────────────────────────────

impl WebGlKinematics {
    fn for_regime(regime: &FsmState) -> Self {
        match regime {
            FsmState::S0_PassiveObservation => Self {
                color_hex: "#3A3D4A",
                color_rgb: [0.227, 0.239, 0.290],
                motion: MotionClass::Static,
                intensity: 0.05,
                bloom: false,
                glow: false,
                emissive: 0.0,
                regime: regime.clone(),
            },
            FsmState::S1_StructureFormation => Self {
                color_hex: "#1A1A1A",
                color_rgb: [0.102, 0.102, 0.102],
                motion: MotionClass::Drift,
                intensity: 0.20,
                bloom: false,
                glow: false,
                emissive: 0.05,
                regime: regime.clone(),
            },
            FsmState::S2_CoherenceConfirmation => Self {
                color_hex: "#66FF00",
                color_rgb: [0.400, 1.000, 0.000],
                motion: MotionClass::Pulse,
                intensity: 0.65,
                bloom: true,
                glow: true,
                emissive: 0.75,
                regime: regime.clone(),
            },
            FsmState::S3_ResonanceActive => Self {
                // Blue: mid-luminance only. NO bloom. NO glow. Per spec.
                color_hex: "#007FFF",
                color_rgb: [0.000, 0.498, 1.000],
                motion: MotionClass::Jitter,
                intensity: 0.80,
                bloom: false,
                glow: false,
                emissive: 0.30,
                regime: regime.clone(),
            },
            FsmState::S4_ExecutionDispatch => Self {
                color_hex: "#8A2BE2",
                color_rgb: [0.541, 0.169, 0.886],
                motion: MotionClass::Compress,
                intensity: 1.00,
                bloom: true,
                glow: false, // restrained bloom only — no full glow
                emissive: 0.90,
                regime: regime.clone(),
            },
        }
    }
}

// ── Adapter ───────────────────────────────────────────────────────────────────

pub struct WebGlTx {
    current: WebGlKinematics,
}

impl WebGlTx {
    pub fn new() -> Self {
        Self {
            current: WebGlKinematics::for_regime(&FsmState::S0_PassiveObservation),
        }
    }

    /// Process an incoming delta. Only RegimeAuthorized mutations update output.
    /// All other delta types return the current kinematics unchanged.
    /// No logic. No inference. Pure projection.
    pub fn project(&mut self, delta: &KernelStateDelta) -> &WebGlKinematics {
        if let StateMutation::RegimeAuthorized { new_state } = &delta.mutation {
            self.current = WebGlKinematics::for_regime(new_state);
        }
        &self.current
    }

    /// Current kinematics without consuming a delta.
    pub fn current(&self) -> &WebGlKinematics {
        &self.current
    }
}

impl Default for WebGlTx {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use krylo_scl::StateMutation;

    fn auth_delta(state: FsmState, seq: u64) -> KernelStateDelta {
        KernelStateDelta {
            sequence_id: seq,
            entity_anchor: 1,
            entity_view: vec![],
            timestamp_ms: seq * 100,
            mutation: StateMutation::RegimeAuthorized { new_state: state.clone() },
            fsm_regime: state,
        }
    }

    fn non_auth_delta(seq: u64) -> KernelStateDelta {
        KernelStateDelta {
            sequence_id: seq,
            entity_anchor: 1,
            entity_view: vec![],
            timestamp_ms: seq * 100,
            mutation: StateMutation::StructureEvolved {
                sigma_fast_trace: 0.1,
                sigma_slow_trace: 0.05,
            },
            fsm_regime: FsmState::S0_PassiveObservation,
        }
    }

    #[test]
    fn starts_in_passive_kinematics() {
        let tx = WebGlTx::new();
        assert_eq!(tx.current().motion, MotionClass::Static);
        assert_eq!(tx.current().color_hex, "#3A3D4A");
        assert!(!tx.current().bloom);
    }

    #[test]
    fn s2_produces_lime_pulse_with_bloom() {
        let mut tx = WebGlTx::new();
        tx.project(&auth_delta(FsmState::S2_CoherenceConfirmation, 1));
        let k = tx.current();
        assert_eq!(k.color_hex, "#66FF00");
        assert_eq!(k.motion, MotionClass::Pulse);
        assert!(k.bloom);
        assert!(k.glow);
    }

    #[test]
    fn s3_blue_has_no_bloom_no_glow() {
        let mut tx = WebGlTx::new();
        tx.project(&auth_delta(FsmState::S3_ResonanceActive, 1));
        let k = tx.current();
        assert_eq!(k.color_hex, "#007FFF");
        assert_eq!(k.motion, MotionClass::Jitter);
        assert!(!k.bloom, "blue must never bloom");
        assert!(!k.glow, "blue must never glow");
    }

    #[test]
    fn s4_purple_compress_restrained_bloom() {
        let mut tx = WebGlTx::new();
        tx.project(&auth_delta(FsmState::S4_ExecutionDispatch, 1));
        let k = tx.current();
        assert_eq!(k.color_hex, "#8A2BE2");
        assert_eq!(k.motion, MotionClass::Compress);
        assert!(k.bloom);
        assert!(!k.glow, "S4 is restrained bloom only — no full glow");
        assert!(k.emissive >= 0.85, "purple must reach high emissive dominance");
    }

    #[test]
    fn non_auth_delta_does_not_change_kinematics() {
        let mut tx = WebGlTx::new();
        tx.project(&auth_delta(FsmState::S2_CoherenceConfirmation, 1));
        let color_before = tx.current().color_hex;
        tx.project(&non_auth_delta(2));
        assert_eq!(tx.current().color_hex, color_before);
    }

    #[test]
    fn regime_transitions_update_kinematics() {
        let mut tx = WebGlTx::new();
        let states = [
            FsmState::S1_StructureFormation,
            FsmState::S2_CoherenceConfirmation,
            FsmState::S3_ResonanceActive,
            FsmState::S4_ExecutionDispatch,
        ];
        for (i, state) in states.iter().enumerate() {
            tx.project(&auth_delta(state.clone(), i as u64 + 1));
            assert_eq!(&tx.current().regime, state);
        }
    }

    #[test]
    fn intensity_increases_with_regime_severity() {
        let s0 = WebGlKinematics::for_regime(&FsmState::S0_PassiveObservation);
        let s2 = WebGlKinematics::for_regime(&FsmState::S2_CoherenceConfirmation);
        let s4 = WebGlKinematics::for_regime(&FsmState::S4_ExecutionDispatch);
        assert!(s0.intensity < s2.intensity);
        assert!(s2.intensity < s4.intensity);
        assert!((s4.intensity - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn only_lime_and_purple_reach_high_emissive() {
        let s0 = WebGlKinematics::for_regime(&FsmState::S0_PassiveObservation);
        let s1 = WebGlKinematics::for_regime(&FsmState::S1_StructureFormation);
        let s2 = WebGlKinematics::for_regime(&FsmState::S2_CoherenceConfirmation);
        let s3 = WebGlKinematics::for_regime(&FsmState::S3_ResonanceActive);
        let s4 = WebGlKinematics::for_regime(&FsmState::S4_ExecutionDispatch);
        assert!(s0.emissive < 0.5);
        assert!(s1.emissive < 0.5);
        assert!(s2.emissive >= 0.5, "lime must reach high emissive");
        assert!(s3.emissive < 0.5, "blue stays mid-luminance");
        assert!(s4.emissive >= 0.5, "purple must reach high emissive");
    }
}
