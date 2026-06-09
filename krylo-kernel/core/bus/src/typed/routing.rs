// Mutation domains are defined here — the bus owns the contract.
// Engine crates re-export these types; they do not define them.
// This prevents circular dependencies and enforces the bus as the
// single source of truth for event shape.

use crossbeam_channel::Sender;
use krylo_scl::FsmState;
use super::envelope::TypedEnvelope;

// ── Math Mutation Domain ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum MathMutation {
    PhiComputed,
    SigmaUpdated { fast: f64, slow: f64 },
    XiShifted { delta: f64 },
    ResonanceComputed { r_oper: f64 },
}

// ── FSM Mutation Domain ───────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum FsmMutation {
    StateTransition { from: FsmState, to: FsmState },
    AuthorizationGranted,
    DispatchBlocked,
}

// ── Ingest Mutation Domain ────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum IngestMutation {
    RawSignalIngested,
    ClockSynced,
    BackpressureDetected,
}

// ── Static Dispatch Routing Table ─────────────────────────────────────────────
// No runtime routing logic. All routing is compile-time declared.
// Each mutation type is hard-bound to a subsystem.

pub struct BusRoutingTable {
    pub math_tx: Sender<TypedEnvelope<MathMutation>>,
    pub fsm_tx: Sender<TypedEnvelope<FsmMutation>>,
    pub ingest_tx: Sender<TypedEnvelope<IngestMutation>>,
}
