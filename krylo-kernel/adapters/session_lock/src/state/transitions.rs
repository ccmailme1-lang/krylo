use super::observer_state::{ObserverState, ObserverTrustVector};

// Net trust thresholds for each upward transition (§10)
const S0_TO_S1: f64 = 0.10;
const S1_TO_S2: f64 = 0.30;
const S2_TO_S3: f64 = 0.55;
const S3_TO_S4: f64 = 0.80;

/// Evaluate next observer state from current trust vector.
/// Transitions are upward-only during normal operation.
/// Volatility penalty can suppress a transition but cannot reverse past S3 lock.
pub fn evaluate_transition(
    current: &ObserverState,
    trust: &ObserverTrustVector,
) -> ObserverState {
    let net = trust.net_trust();
    match current {
        ObserverState::S0_Awareness => {
            if net >= S0_TO_S1 { ObserverState::S1_Familiarity } else { ObserverState::S0_Awareness }
        }
        ObserverState::S1_Familiarity => {
            if net >= S1_TO_S2 { ObserverState::S2_Continuity } else { ObserverState::S1_Familiarity }
        }
        ObserverState::S2_Continuity => {
            if net >= S2_TO_S3 { ObserverState::S3_Trust } else { ObserverState::S2_Continuity }
        }
        ObserverState::S3_Trust => {
            if net >= S3_TO_S4 { ObserverState::S4_StructuralAccess } else { ObserverState::S3_Trust }
        }
        ObserverState::S4_StructuralAccess => ObserverState::S4_StructuralAccess,
    }
}
