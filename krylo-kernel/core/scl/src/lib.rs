// WO-1301 — System Contract Layer
// KernelStateDelta is the ONLY cross-plane truth carrier.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelStateDelta {
    pub sequence_id: u64,
    pub entity_anchor: u64,
    pub entity_view: Vec<String>,
    pub timestamp_ms: u64,
    pub mutation: StateMutation,
    pub fsm_regime: FsmState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateMutation {
    StructureEvolved {
        sigma_fast_trace: f64,
        sigma_slow_trace: f64,
    },
    CouplingShifted {
        xi_matrix: Vec<f64>,
    },
    IdentityPartitioned {
        action: PartitionAction,
        density: f64,
    },
    PhaseTransition {
        r_oper: f64,
    },
    RegimeAuthorized {
        new_state: FsmState,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FsmState {
    S0_PassiveObservation,
    S1_StructureFormation,
    S2_CoherenceConfirmation,
    S3_ResonanceActive,
    S4_ExecutionDispatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PartitionAction {
    Emerged,
    Merged,
    Cleaved,
}
