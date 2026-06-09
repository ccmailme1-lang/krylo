use krylo_scl::FsmState;

/// Ambient resonance field for guest display.
/// Derived from normalized r_oper + FSM regime projection.
/// Raw r_oper NEVER exits the ProjectionAdapter.
#[derive(Debug, Clone)]
pub struct ResonanceField {
    /// Ambient mesh pressure [0.0, 1.0]
    pub ambient_pressure: f32,
    /// Spatial heat concentration [0.0, 1.0]
    pub spatial_heat: f32,
    /// Slow pulse gradient [0.0, 1.0]
    pub pulse_gradient: f32,
}

impl ResonanceField {
    /// r_normalized is in [0.0, 1.0] — already abstracted before this call.
    pub fn from_normalized(r_normalized: f32, regime: &FsmState) -> Self {
        let regime_weight = match regime {
            FsmState::S0_PassiveObservation   => 0.05f32,
            FsmState::S1_StructureFormation   => 0.20,
            FsmState::S2_CoherenceConfirmation => 0.55,
            FsmState::S3_ResonanceActive      => 0.75,
            FsmState::S4_ExecutionDispatch    => 0.95,
        };
        Self {
            ambient_pressure: (r_normalized * 0.7 + regime_weight * 0.3).min(1.0),
            spatial_heat:     (r_normalized * regime_weight).min(1.0),
            pulse_gradient:   (regime_weight * 0.6).min(1.0),
        }
    }
}
