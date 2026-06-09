// WO-1304 — Projection layer
// Transforms deterministic kernel state → perceptual approximations.
// INVARIANT: raw kernel values (r_oper, Σ, ξ, sequence_id, entity_anchor)
// NEVER cross this boundary. Projection noise is REQUIRED (§13).

pub mod horizon;
pub mod motion;
pub mod resonance;
pub mod trust;

pub use horizon::PhaseHorizon;
pub use motion::MotionTrail;
pub use resonance::ResonanceField;
pub use trust::TrustGauge;

use krylo_scl::FsmState;
use krylo_watchdog::ThrottleState;

// ── Guest state ───────────────────────────────────────────────────────────────

/// Guest observational state (§5). NOT the kernel FSM.
#[derive(Debug, Clone, PartialEq)]
pub enum GuestState {
    G0, // Passive Visitor — no session continuity
    G1, // Observing Guest — temporary session
    G2, // Returning Observer — longitudinal continuity
}

// ── Projection fidelity ───────────────────────────────────────────────────────

/// Fidelity level derived from WO-1302 watchdog throttle state (§10).
/// Guest layer is sacrificial — kernel always wins.
#[derive(Debug, Clone, PartialEq)]
pub enum ProjectionFidelity {
    Full,       // Normal      — full mesh fidelity
    Reduced,    // Degraded    — reduced particle density
    ReplayOnly, // Throttled   — replay disabled
    Static,     // EmergencyClamp — static projection only
}

impl ProjectionFidelity {
    pub fn from_throttle(state: &ThrottleState) -> Self {
        match state {
            ThrottleState::Normal        => ProjectionFidelity::Full,
            ThrottleState::Degraded      => ProjectionFidelity::Reduced,
            ThrottleState::Throttled     => ProjectionFidelity::ReplayOnly,
            ThrottleState::EmergencyClamp => ProjectionFidelity::Static,
        }
    }
}

// ── Visual pressure ───────────────────────────────────────────────────────────

/// Perceptual approximation surface. This is all the guest ever observes.
/// No raw kernel values cross this boundary.
#[derive(Debug, Clone)]
pub struct VisualPressure {
    pub intensity:       f32, // [0.0, 1.0]
    pub instability:     f32, // [0.0, 1.0]
    pub coherence_hint:  f32, // [0.0, 1.0] — deliberately approximate
}

// ── Projection adapter ────────────────────────────────────────────────────────

// r_oper normalization ceiling. Value chosen to keep projections meaningful
// across the expected operational range without exposing the raw scale.
const R_MAX: f64 = 20.0;

// Required noise amplitude per §13. Prevents reconstruction of kernel state
// through repeated observation.
const NOISE_AMP: f32 = 0.04;

/// Transforms deterministic kernel states into perceptual approximations.
/// Stateful: maintains internal noise phase across calls.
pub struct ProjectionAdapter {
    noise_phase: f64, // internal — never exposed
}

impl ProjectionAdapter {
    pub fn new() -> Self {
        Self { noise_phase: 0.0 }
    }

    /// Project kernel observation into VisualPressure.
    /// r_oper: raw resonance from kernel (normalized internally, never forwarded).
    /// regime: current FSM state.
    /// fidelity: derived from WO-1302 ThrottleState — governs resolution.
    pub fn project(
        &mut self,
        r_oper: f64,
        regime: &FsmState,
        fidelity: &ProjectionFidelity,
    ) -> VisualPressure {
        if *fidelity == ProjectionFidelity::Static {
            return VisualPressure { intensity: 0.10, instability: 0.05, coherence_hint: 0.10 };
        }

        // Normalize — raw r_oper value is consumed here, never forwarded
        let r_norm = ((r_oper / R_MAX) as f32).clamp(0.0, 1.0);

        let regime_pressure = match regime {
            FsmState::S0_PassiveObservation    => 0.05f32,
            FsmState::S1_StructureFormation    => 0.20,
            FsmState::S2_CoherenceConfirmation => 0.55,
            FsmState::S3_ResonanceActive       => 0.75,
            FsmState::S4_ExecutionDispatch     => 0.95,
        };

        // Advance noise phase — linear congruential, fast, no allocation
        self.noise_phase = (self.noise_phase * 1.618_033_988_7 + 0.5) % 1.0;
        let noise = (self.noise_phase as f32 - 0.5) * 2.0 * NOISE_AMP;

        let fidelity_scale = match fidelity {
            ProjectionFidelity::Full       => 1.0f32,
            ProjectionFidelity::Reduced    => 0.6,
            ProjectionFidelity::ReplayOnly => 0.3,
            ProjectionFidelity::Static     => 0.0,
        };

        VisualPressure {
            intensity:      (r_norm * 0.6 + regime_pressure * 0.4) * fidelity_scale + noise,
            instability:    (1.0 - r_norm) * regime_pressure * fidelity_scale + noise.abs(),
            coherence_hint: regime_pressure * r_norm * fidelity_scale * 0.8 + noise,
        }
    }
}

impl Default for ProjectionAdapter {
    fn default() -> Self {
        Self::new()
    }
}
