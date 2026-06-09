use krylo_scl::FsmState;

/// Phase horizon — structural distance from an active regime transition.
/// Visual metaphor: pressure system forming offshore.
/// Does NOT expose dispatch certainty or exact timing.
#[derive(Debug, Clone)]
pub struct PhaseHorizon {
    /// Normalized distance from transition [0.0, 1.0].
    /// 0.0 = transition imminent, 1.0 = distant / stable.
    pub distance_to_transition: f32,
    /// Whether a transition appears structurally probable.
    /// Deliberately vague — no timing guarantee.
    pub transition_probable: bool,
}

impl PhaseHorizon {
    pub fn from_regime(regime: &FsmState, r_normalized: f32) -> Self {
        let regime_distance = match regime {
            FsmState::S0_PassiveObservation   => 1.00f32,
            FsmState::S1_StructureFormation   => 0.75,
            FsmState::S2_CoherenceConfirmation => 0.45,
            FsmState::S3_ResonanceActive      => 0.20,
            FsmState::S4_ExecutionDispatch    => 0.05,
        };
        let distance = (regime_distance * (1.0 - r_normalized * 0.5)).max(0.0);
        Self {
            distance_to_transition: distance,
            transition_probable:    distance < 0.35,
        }
    }
}
