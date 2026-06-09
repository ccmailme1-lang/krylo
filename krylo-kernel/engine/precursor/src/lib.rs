// WO-1327 — Precursor Field Engine
// Extends krylo-math with Cognitive State Lattice (CSL) + Phantom Familiarity Collapse (PFC).
// Gate A (event-time monotonicity) enforced at field ingestion boundary.
//
// Architecture:
//   PrecursorField               — multi-entity field controller
//   └── EntityState (per anchor) — MathEngine + CognitiveLattice + PfcEngine
//       ├── MathEngine           — Φ→Σ→ξ→R(t) kernel (WO-1301)
//       ├── CognitiveLattice     — Awareness/Engagement/Trust state
//       └── PfcEngine            — phantom familiarity collapse operator
//
// Output contract: PrecursorDelta
//   r_canonical = true ONLY when CslState == Trust.
//   Provisional R(t) MUST NOT trigger phase transition alerts downstream.

pub mod clock;
pub mod csl;
pub mod pfc;

use std::collections::HashMap;

use krylo_math::{MathEngine, PhiInput};
use krylo_scl::KernelStateDelta;

use clock::{ClockError, EventClock};
use csl::{CognitiveLattice, CslAuthority, CslState};
use pfc::PfcEngine;

// Lambda defaults — calibration pending Gate E
const DEFAULT_LAMBDA_FAST: f64 = 0.3;   // ~1.4-tick half-life
const DEFAULT_LAMBDA_SLOW: f64 = 0.99;  // ~69-tick half-life

// ── Output contract ───────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct PrecursorDelta {
    /// Full kernel output from WO-1301 MathEngine.
    pub kernel_delta: KernelStateDelta,
    /// CSL state at time of emission.
    pub csl_state: CslState,
    /// Phantom familiarity weight Γ ∈ (0, 1]. 1.0 = no collapse pressure.
    pub pfc_gamma: f64,
    /// True only when csl_state == Trust. R(t) is canonical — eligible for phase transition signals.
    pub r_canonical: bool,
    /// True if PFC collapse fired this tick. Demotes entity to Awareness.
    pub pfc_collapsed: bool,
}

// ── Per-entity state ──────────────────────────────────────────────────────────

struct EntityState {
    math: MathEngine,
    csl:  CognitiveLattice,
    pfc:  PfcEngine,
    sigma_slow_prev_trace: f64,
}

impl EntityState {
    fn new(entity_anchor: u64, lambda_fast: f64, lambda_slow: f64) -> Self {
        Self {
            math:                  MathEngine::new(entity_anchor, lambda_fast, lambda_slow),
            csl:                   CognitiveLattice::new(),
            pfc:                   PfcEngine::new(),
            sigma_slow_prev_trace: 0.0,
        }
    }
}

// ── PrecursorField ────────────────────────────────────────────────────────────

pub struct PrecursorField {
    entities:    HashMap<u64, EntityState>,
    clock:       EventClock,
    lambda_fast: f64,
    lambda_slow: f64,
}

impl PrecursorField {
    pub fn new() -> Self {
        Self::with_lambdas(DEFAULT_LAMBDA_FAST, DEFAULT_LAMBDA_SLOW)
    }

    pub fn with_lambdas(lambda_fast: f64, lambda_slow: f64) -> Self {
        Self {
            entities:    HashMap::new(),
            clock:       EventClock::new(),
            lambda_fast,
            lambda_slow,
        }
    }

    /// Primary entry point. One PrecursorDelta emitted per accepted event.
    /// Returns Err on event-time violation (Gate A) — caller must discard.
    pub fn ingest(&mut self, input: PhiInput) -> Result<PrecursorDelta, ClockError> {
        // Gate A: monotonic event-time enforcement
        self.clock.advance(input.timestamp_ms)?;

        let anchor = input.entity_anchor;
        let lf = self.lambda_fast;
        let ls = self.lambda_slow;

        let es = self
            .entities
            .entry(anchor)
            .or_insert_with(|| EntityState::new(anchor, lf, ls));

        // 1. Kernel tick
        let kernel_delta = es.math.ingest(input);

        // Read Σ_slow trace directly from MathEngine — always current, mutation-type independent.
        let sigma_slow_trace = es.math.sigma_slow_trace();

        // 2. CSL tick — determines authority of R(t)
        let authority = es.csl.tick(sigma_slow_trace);

        // 3. PFC — only active in Engagement state
        let mut pfc_collapsed = false;
        if es.csl.state == CslState::Engagement {
            let collapse = es.pfc.tick_engagement(sigma_slow_trace, es.sigma_slow_prev_trace);
            if collapse {
                es.csl.demote();
                es.pfc.on_collapse();
                pfc_collapsed = true;
            }
        } else if es.csl.state == CslState::Trust {
            es.pfc.on_trust_promotion();
        }

        let pfc_gamma    = es.pfc.gamma;
        let csl_state    = es.csl.state.clone();
        let r_canonical  = authority == CslAuthority::Canonical;

        es.sigma_slow_prev_trace = sigma_slow_trace;

        Ok(PrecursorDelta {
            kernel_delta,
            csl_state,
            pfc_gamma,
            r_canonical,
            pfc_collapsed,
        })
    }

    pub fn entity_count(&self) -> usize { self.entities.len() }

    pub fn clock_sequence(&self) -> u64 { self.clock.sequence }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn phi(anchor: u64, features: [f64; 5], t: u64) -> PhiInput {
        PhiInput { entity_anchor: anchor, features, timestamp_ms: t }
    }

    fn field() -> PrecursorField {
        PrecursorField::new()
    }

    #[test]
    fn first_ingest_returns_awareness() {
        let mut f = field();
        let d = f.ingest(phi(1, [0.5; 5], 1000)).unwrap();
        assert_eq!(d.csl_state, CslState::Awareness);
        assert!(!d.r_canonical);
    }

    #[test]
    fn r_not_canonical_until_trust() {
        let mut f = PrecursorField::with_lambdas(0.3, 0.99);
        for i in 0..100u64 {
            let d = f.ingest(phi(1, [0.5; 5], i * 100)).unwrap();
            if d.csl_state != CslState::Trust {
                assert!(!d.r_canonical, "r_canonical must be false outside Trust");
            }
        }
    }

    #[test]
    fn gate_a_rejects_out_of_order_event() {
        let mut f = field();
        f.ingest(phi(1, [0.5; 5], 1000)).unwrap();
        let err = f.ingest(phi(1, [0.5; 5], 999));
        assert!(err.is_err());
    }

    #[test]
    fn gate_a_accepts_equal_timestamp() {
        let mut f = field();
        f.ingest(phi(1, [0.5; 5], 1000)).unwrap();
        assert!(f.ingest(phi(1, [0.5; 5], 1000)).is_ok());
    }

    #[test]
    fn multiple_entities_isolated() {
        let mut f = field();
        f.ingest(phi(1, [0.5; 5], 100)).unwrap();
        f.ingest(phi(2, [0.9; 5], 100)).unwrap();
        assert_eq!(f.entity_count(), 2);
    }

    #[test]
    fn clock_sequence_increments_per_accepted_event() {
        let mut f = field();
        f.ingest(phi(1, [0.5; 5], 100)).unwrap();
        f.ingest(phi(1, [0.5; 5], 200)).unwrap();
        assert_eq!(f.clock_sequence(), 2);
    }

    #[test]
    fn stable_signal_reaches_trust() {
        // 3 ticks → Engagement, 30 stable ticks → Trust
        let mut f = PrecursorField::with_lambdas(0.3, 0.99);
        let mut reached_trust = false;
        for i in 0..200u64 {
            let d = f.ingest(phi(1, [0.5, 0.5, 0.5, 0.5, 0.5], i * 100)).unwrap();
            if d.csl_state == CslState::Trust {
                reached_trust = true;
                break;
            }
        }
        assert!(reached_trust, "Entity should reach Trust on stable signal");
    }

    #[test]
    fn trust_state_emits_canonical_r() {
        let mut f = PrecursorField::with_lambdas(0.3, 0.99);
        let mut canonical_seen = false;
        for i in 0..200u64 {
            let d = f.ingest(phi(1, [0.5; 5], i * 100)).unwrap();
            if d.r_canonical {
                canonical_seen = true;
                break;
            }
        }
        assert!(canonical_seen, "Trust state must emit canonical R(t)");
    }

    // NOTE: PFC collapse through live MathEngine is not achievable in unit tests because
    // Welford normalization stabilizes phi² ≈ 1 regardless of input magnitude, preventing
    // observable sigma_slow trace drift. PFC collapse is validated at pfc::tests level.
    // This test verifies structural precondition: PFC fields are present and initialized.
    #[test]
    fn pfc_fields_initialized_in_delta() {
        let mut f = field();
        let d = f.ingest(phi(1, [0.5; 5], 1000)).unwrap();
        assert!(!d.pfc_collapsed);
        assert!(d.pfc_gamma > 0.0 && d.pfc_gamma <= 1.0);
    }

    #[test]
    fn kernel_delta_entity_anchor_preserved() {
        let mut f = field();
        let d = f.ingest(phi(42, [0.3; 5], 1000)).unwrap();
        assert_eq!(d.kernel_delta.entity_anchor, 42);
    }

    #[test]
    fn kernel_sequence_id_strictly_increases() {
        let mut f = field();
        let d1 = f.ingest(phi(1, [0.5; 5], 100)).unwrap();
        let d2 = f.ingest(phi(1, [0.5; 5], 200)).unwrap();
        assert!(d2.kernel_delta.sequence_id > d1.kernel_delta.sequence_id);
    }
}
