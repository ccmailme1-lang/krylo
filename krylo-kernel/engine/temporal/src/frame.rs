use crate::mode::TemporalMode;
use krylo_scl::FsmState;
use krylo_webgl_tx::WebGlKinematics;

/// The canonical render contract (§4.3).
/// This is the ONLY object allowed into the rendering layer.
/// UI, FSM visualization, WebGL — all read only this.
///
/// Production path:
///   KernelStateDelta → TemporalResolver → TemporalFrame → WebGL Adapter → Render
#[derive(Debug, Clone)]
pub struct TemporalFrame {
    pub timestamp_ms:  u64,
    pub mode:          TemporalMode,
    pub fsm_state:     FsmState,
    pub resonance:     f64,
    pub trust:         f64,
    pub xi_pressure:   f64,
    pub entity_anchor: u64,
    pub webgl_state:   WebGlKinematics,
}

impl TemporalFrame {
    pub fn new(
        timestamp_ms: u64,
        mode: TemporalMode,
        fsm_state: FsmState,
        resonance: f64,
        trust: f64,
        xi_pressure: f64,
        entity_anchor: u64,
        webgl_state: WebGlKinematics,
    ) -> Self {
        Self {
            timestamp_ms,
            mode,
            fsm_state,
            resonance,
            trust,
            xi_pressure,
            entity_anchor,
            webgl_state,
        }
    }

    /// Whether this frame originates from a deterministic historical source.
    pub fn is_replay(&self) -> bool {
        matches!(self.mode, TemporalMode::Replay)
    }

    /// Whether this frame is from a synthetic projection branch.
    pub fn is_synthetic(&self) -> bool {
        matches!(self.mode, TemporalMode::Projection | TemporalMode::Hybrid)
    }
}
