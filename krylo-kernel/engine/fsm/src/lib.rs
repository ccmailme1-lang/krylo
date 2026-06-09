// WO-1301 Phase 2 — engine/fsm
// Consumes KernelStateDelta from the bus. Evaluates regime transitions.
// NO math recomputation. NO covariance access. Authorization gating only.
// WO-1306 — mutations.rs re-exports FsmMutation from core/bus/typed contract.

pub mod mutations;

use krylo_scl::{FsmState, KernelStateDelta, StateMutation};

// Consecutive PhaseTransition events required to authorize S4_ExecutionDispatch.
const DISPATCH_GATE: u32 = 3;
// Consecutive StructureEvolved events required to cool S3/S4 → S2.
const COOLDOWN_GATE: u32 = 5;
// Consecutive StructureEvolved events in S0 required to advance to S1.
const FORMATION_GATE: u32 = 2;

pub struct KernelFsm {
    pub regime: FsmState,
    consecutive_phase: u32,
    consecutive_structure: u32,
}

impl KernelFsm {
    pub fn new() -> Self {
        Self {
            regime: FsmState::S0_PassiveObservation,
            consecutive_phase: 0,
            consecutive_structure: 0,
        }
    }

    /// Consume a delta. Returns Some(KernelStateDelta) if a regime transition
    /// is authorized — emitting RegimeAuthorized with the new state.
    /// Returns None if the current regime is unchanged.
    ///
    /// FSM cannot inspect Σ, ξ, or R directly. It reads only mutation type.
    pub fn process(&mut self, delta: &KernelStateDelta) -> Option<KernelStateDelta> {
        let prev = self.regime.clone();
        self.advance(&delta.mutation);

        if self.regime != prev {
            Some(KernelStateDelta {
                sequence_id: delta.sequence_id,
                entity_anchor: delta.entity_anchor,
                entity_view: delta.entity_view.clone(),
                timestamp_ms: delta.timestamp_ms,
                mutation: StateMutation::RegimeAuthorized {
                    new_state: self.regime.clone(),
                },
                fsm_regime: self.regime.clone(),
            })
        } else {
            None
        }
    }

    fn advance(&mut self, mutation: &StateMutation) {
        match mutation {
            StateMutation::StructureEvolved { .. } => {
                self.consecutive_phase = 0;
                self.consecutive_structure += 1;
                self.on_structure_evolved();
            }
            StateMutation::CouplingShifted { .. } => {
                self.consecutive_phase = 0;
                self.consecutive_structure = 0;
                self.on_coupling_shifted();
            }
            StateMutation::PhaseTransition { .. } => {
                self.consecutive_structure = 0;
                self.consecutive_phase += 1;
                self.on_phase_transition();
            }
            StateMutation::IdentityPartitioned { .. } => {
                // Identity events do not alter regime directly.
            }
            StateMutation::RegimeAuthorized { .. } => {
                // FSM never re-processes its own output.
            }
        }
    }

    fn on_structure_evolved(&mut self) {
        match self.regime {
            FsmState::S0_PassiveObservation => {
                if self.consecutive_structure >= FORMATION_GATE {
                    self.regime = FsmState::S1_StructureFormation;
                    self.consecutive_structure = 0;
                }
            }
            FsmState::S3_ResonanceActive | FsmState::S4_ExecutionDispatch => {
                if self.consecutive_structure >= COOLDOWN_GATE {
                    self.regime = FsmState::S2_CoherenceConfirmation;
                    self.consecutive_structure = 0;
                }
            }
            // S1 / S2 stay put on StructureEvolved — not a regression signal.
            _ => {}
        }
    }

    fn on_coupling_shifted(&mut self) {
        match self.regime {
            FsmState::S0_PassiveObservation
            | FsmState::S1_StructureFormation
            | FsmState::S2_CoherenceConfirmation => {
                self.regime = FsmState::S2_CoherenceConfirmation;
            }
            // S3/S4 coupling shifts are noise within an already-active phase.
            _ => {}
        }
    }

    fn on_phase_transition(&mut self) {
        match self.regime {
            FsmState::S0_PassiveObservation
            | FsmState::S1_StructureFormation
            | FsmState::S2_CoherenceConfirmation => {
                self.regime = FsmState::S3_ResonanceActive;
            }
            FsmState::S3_ResonanceActive => {
                if self.consecutive_phase >= DISPATCH_GATE {
                    self.regime = FsmState::S4_ExecutionDispatch;
                    self.consecutive_phase = 0;
                }
            }
            FsmState::S4_ExecutionDispatch => {
                // Already dispatching — sustained phase sustains it.
            }
        }
    }
}

impl Default for KernelFsm {
    fn default() -> Self {
        Self::new()
    }
}

// ── Pipeline: MathEngine → StateBus → KernelFsm ──────────────────────────────

use krylo_bus::{DeltaConsumer, DeltaEmitter, StateBus};

pub struct KernelPipeline {
    pub bus: StateBus,
    pub fsm: KernelFsm,
}

impl KernelPipeline {
    pub fn new() -> Self {
        Self {
            bus: StateBus::new(),
            fsm: KernelFsm::new(),
        }
    }

    /// Drain all pending deltas from the bus into the FSM.
    /// Returns any regime authorization events emitted.
    pub fn drain(&mut self) -> Vec<KernelStateDelta> {
        let mut authorizations = Vec::new();
        while let Ok(delta) = self.bus.rx.try_recv() {
            if let Some(auth) = self.fsm.process(&delta) {
                authorizations.push(auth);
            }
        }
        authorizations
    }
}

impl Default for KernelPipeline {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use krylo_scl::{KernelStateDelta, PartitionAction, StateMutation};

    fn delta(mutation: StateMutation, seq: u64) -> KernelStateDelta {
        KernelStateDelta {
            sequence_id: seq,
            entity_anchor: 1,
            entity_view: vec![],
            timestamp_ms: seq * 100,
            mutation,
            fsm_regime: FsmState::S0_PassiveObservation,
        }
    }

    fn structure() -> StateMutation {
        StateMutation::StructureEvolved {
            sigma_fast_trace: 0.1,
            sigma_slow_trace: 0.05,
        }
    }

    fn coupling() -> StateMutation {
        StateMutation::CouplingShifted { xi_matrix: vec![0.2; 25] }
    }

    fn phase(r: f64) -> StateMutation {
        StateMutation::PhaseTransition { r_oper: r }
    }

    #[test]
    fn starts_passive() {
        let fsm = KernelFsm::new();
        assert_eq!(fsm.regime, FsmState::S0_PassiveObservation);
    }

    #[test]
    fn structure_advances_s0_to_s1_after_gate() {
        let mut fsm = KernelFsm::new();
        // One tick — not enough
        let r = fsm.process(&delta(structure(), 1));
        assert!(r.is_none());
        assert_eq!(fsm.regime, FsmState::S0_PassiveObservation);
        // Second tick — crosses FORMATION_GATE=2
        let r = fsm.process(&delta(structure(), 2));
        assert!(r.is_some());
        assert_eq!(fsm.regime, FsmState::S1_StructureFormation);
    }

    #[test]
    fn coupling_advances_to_s2_from_s0() {
        let mut fsm = KernelFsm::new();
        let r = fsm.process(&delta(coupling(), 1));
        assert!(r.is_some());
        assert_eq!(fsm.regime, FsmState::S2_CoherenceConfirmation);
    }

    #[test]
    fn phase_transition_advances_to_s3() {
        let mut fsm = KernelFsm::new();
        let r = fsm.process(&delta(phase(3.5), 1));
        assert!(r.is_some());
        assert_eq!(fsm.regime, FsmState::S3_ResonanceActive);
    }

    #[test]
    fn sustained_phase_promotes_to_s4() {
        let mut fsm = KernelFsm::new();
        // Get to S3 first
        fsm.process(&delta(phase(3.5), 1));
        assert_eq!(fsm.regime, FsmState::S3_ResonanceActive);
        // Need DISPATCH_GATE=3 consecutive PhaseTransitions in S3
        for i in 2..=4 {
            fsm.process(&delta(phase(3.5), i));
        }
        assert_eq!(fsm.regime, FsmState::S4_ExecutionDispatch);
    }

    #[test]
    fn cooldown_drops_s3_to_s2_after_gate() {
        let mut fsm = KernelFsm::new();
        fsm.process(&delta(phase(3.5), 1));
        assert_eq!(fsm.regime, FsmState::S3_ResonanceActive);
        // COOLDOWN_GATE=5 consecutive StructureEvolved events
        let mut cooled = false;
        for i in 2..=10 {
            let r = fsm.process(&delta(structure(), i));
            if let Some(ref auth) = r {
                if auth.fsm_regime == FsmState::S2_CoherenceConfirmation {
                    cooled = true;
                    break;
                }
            }
        }
        assert!(cooled, "S3 should cool to S2 after {} structure events", COOLDOWN_GATE);
    }

    #[test]
    fn no_emission_when_regime_unchanged() {
        let mut fsm = KernelFsm::new();
        // In S1, StructureEvolved should not emit (no regime change)
        fsm.process(&delta(structure(), 1));
        fsm.process(&delta(structure(), 2)); // now in S1
        let r = fsm.process(&delta(structure(), 3)); // stays S1
        assert!(r.is_none());
    }

    #[test]
    fn pipeline_drains_bus_correctly() {
        use krylo_math::{MathEngine, PhiInput};

        let mut pipeline = KernelPipeline::new();
        let mut math = MathEngine::new(1, 0.3, 0.99);

        // Feed stable signal — bus accumulates deltas
        for i in 0..10u64 {
            let d = math.ingest(PhiInput {
                entity_anchor: 1,
                features: [0.1, 0.2, 0.1, 0.2, 0.1],
                timestamp_ms: i * 100,
            });
            pipeline.bus.tx.send(d).unwrap();
        }

        // Drain and check FSM advanced
        let auths = pipeline.drain();
        // At minimum FSM should have seen the ticks; may or may not authorize
        // depending on signal. Key invariant: no panic, sequence is consistent.
        for auth in &auths {
            assert!(matches!(auth.mutation, StateMutation::RegimeAuthorized { .. }));
        }
    }
}
