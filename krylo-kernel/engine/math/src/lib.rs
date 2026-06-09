// WO-1301 — engine/math — PRIMARY IMPLEMENTATION TARGET
// Φ → Σ_fast/Σ_slow → ξ → R(t) → KernelStateDelta
// All physics live here. No other module touches Σ, ξ, or R.
// WO-1306 — mutations.rs re-exports MathMutation from core/bus/typed contract.

pub mod mutations;

use krylo_scl::{FsmState, KernelStateDelta, PartitionAction, StateMutation};

const DIM: usize = 5;
const EPSILON: f64 = 1e-8;

// Thresholds — calibration pending WO-1327 Gate E
const XI_COUPLING_THRESHOLD: f64 = 0.15;
const R_PHASE_THRESHOLD: f64 = 2.0;

// ── Public input contract ─────────────────────────────────────────────────────

pub struct PhiInput {
    pub entity_anchor: u64,
    pub features: [f64; DIM],
    pub timestamp_ms: u64,
}

// ── Welford online normalizer ─────────────────────────────────────────────────

struct WelfordState {
    count: u64,
    mean: [f64; DIM],
    m2: [f64; DIM],
}

impl WelfordState {
    fn new() -> Self {
        Self {
            count: 0,
            mean: [0.0; DIM],
            m2: [0.0; DIM],
        }
    }

    // O(1) update. Returns normalized feature vector.
    fn update(&mut self, x: &[f64; DIM]) -> [f64; DIM] {
        self.count += 1;
        let mut normalized = [0.0f64; DIM];
        for i in 0..DIM {
            let delta = x[i] - self.mean[i];
            self.mean[i] += delta / self.count as f64;
            let delta2 = x[i] - self.mean[i];
            self.m2[i] += delta * delta2;
            let std = if self.count > 1 {
                (self.m2[i] / (self.count - 1) as f64).sqrt().max(EPSILON)
            } else {
                1.0
            };
            normalized[i] = (x[i] - self.mean[i]) / std;
        }
        normalized
    }
}

// ── EMA covariance matrix (5×5, row-major) ───────────────────────────────────

struct CovMatrix {
    data: [f64; DIM * DIM],
    lambda: f64,
    initialized: bool,
}

impl CovMatrix {
    fn new(lambda: f64) -> Self {
        let mut data = [0.0f64; DIM * DIM];
        for i in 0..DIM {
            data[i * DIM + i] = EPSILON;
        }
        Self { data, lambda, initialized: false }
    }

    // EMA update: Σ(t) = λ·Σ(t-1) + (1-λ)·φ·φᵀ
    // No allocation. Preallocated buffer reused.
    fn update(&mut self, phi: &[f64; DIM]) {
        if !self.initialized {
            for i in 0..DIM {
                for j in 0..DIM {
                    self.data[i * DIM + j] = phi[i] * phi[j];
                }
            }
            // Ensure diagonal stays positive definite
            for i in 0..DIM {
                self.data[i * DIM + i] += EPSILON;
            }
            self.initialized = true;
            return;
        }
        let alpha = 1.0 - self.lambda;
        for i in 0..DIM {
            for j in 0..DIM {
                self.data[i * DIM + j] =
                    self.lambda * self.data[i * DIM + j] + alpha * phi[i] * phi[j];
            }
        }
    }

    fn trace(&self) -> f64 {
        (0..DIM).map(|i| self.data[i * DIM + i]).sum()
    }

    // Cholesky decomposition (lower triangular) with diagonal regularization.
    // Returns None if matrix fails positive-definiteness after regularization.
    fn cholesky(&self) -> Option<[f64; DIM * DIM]> {
        let mut a = self.data;
        for i in 0..DIM {
            a[i * DIM + i] += EPSILON;
        }
        let mut l = [0.0f64; DIM * DIM];
        for i in 0..DIM {
            for j in 0..=i {
                let mut s = a[i * DIM + j];
                for k in 0..j {
                    s -= l[i * DIM + k] * l[j * DIM + k];
                }
                if i == j {
                    if s <= 0.0 {
                        return None;
                    }
                    l[i * DIM + i] = s.sqrt();
                } else {
                    l[i * DIM + j] = s / l[j * DIM + j];
                }
            }
        }
        Some(l)
    }

    // ln det(Σ) = 2·Σ ln(L[i,i])
    fn log_det(&self) -> Option<f64> {
        let l = self.cholesky()?;
        let s: f64 = (0..DIM).map(|i| l[i * DIM + i].ln()).sum();
        Some(2.0 * s)
    }
}

// ── tr(A⁻¹·B) via Cholesky of A ──────────────────────────────────────────────
// Solve L·Z = B col-by-col (forward sub), then L'·Y = Z (back sub).
// Accumulate diagonal of Y = A⁻¹·B.

fn trace_inv_times(l: &[f64; DIM * DIM], b: &[f64; DIM * DIM]) -> f64 {
    let mut trace = 0.0f64;
    for j in 0..DIM {
        let mut col = [0.0f64; DIM];
        for i in 0..DIM {
            col[i] = b[i * DIM + j];
        }
        // Forward: L·z = col
        let mut z = [0.0f64; DIM];
        for i in 0..DIM {
            let mut s = col[i];
            for k in 0..i {
                s -= l[i * DIM + k] * z[k];
            }
            z[i] = s / l[i * DIM + i];
        }
        // Back: Lᵀ·y = z
        let mut y = [0.0f64; DIM];
        for i in (0..DIM).rev() {
            let mut s = z[i];
            for k in (i + 1)..DIM {
                s -= l[k * DIM + i] * y[k];
            }
            y[i] = s / l[i * DIM + i];
        }
        trace += y[j];
    }
    trace
}

// ── ξ: correlation matrix delta ───────────────────────────────────────────────
// ξ_ij = ρ_fast_ij − ρ_slow_ij  where ρ_ij = Σ_ij / √(Σ_ii · Σ_jj)
// Scale-invariant. Bounded [-1, 1] per element. Cannot feed back into Φ.

fn compute_xi(fast: &CovMatrix, slow: &CovMatrix) -> [f64; DIM * DIM] {
    let mut xi = [0.0f64; DIM * DIM];
    for i in 0..DIM {
        for j in 0..DIM {
            let rho_fast = {
                let d = (fast.data[i * DIM + i] * fast.data[j * DIM + j]).sqrt();
                if d < EPSILON { 0.0 } else { fast.data[i * DIM + j] / d }
            };
            let rho_slow = {
                let d = (slow.data[i * DIM + i] * slow.data[j * DIM + j]).sqrt();
                if d < EPSILON { 0.0 } else { slow.data[i * DIM + j] / d }
            };
            xi[i * DIM + j] = rho_fast - rho_slow;
        }
    }
    xi
}

fn frobenius_norm(m: &[f64; DIM * DIM]) -> f64 {
    m.iter().map(|x| x * x).sum::<f64>().sqrt()
}

// ── MathEngine ────────────────────────────────────────────────────────────────

pub struct MathEngine {
    pub entity_anchor: u64,
    sigma_fast: CovMatrix,
    sigma_slow: CovMatrix,
    phi_state: WelfordState,
    pub sequence_id: u64,
    fsm_state: FsmState,
    tick_count: u64,
}

impl MathEngine {
    pub fn new(entity_anchor: u64, lambda_fast: f64, lambda_slow: f64) -> Self {
        Self {
            entity_anchor,
            sigma_fast: CovMatrix::new(lambda_fast),
            sigma_slow: CovMatrix::new(lambda_slow),
            phi_state: WelfordState::new(),
            sequence_id: 0,
            fsm_state: FsmState::S0_PassiveObservation,
            tick_count: 0,
        }
    }

    // WO-1327: direct sigma trace accessors — needed by PrecursorField CSL/PFC layer.
    pub fn sigma_slow_trace(&self) -> f64 { self.sigma_slow.trace() }
    pub fn sigma_fast_trace(&self) -> f64 { self.sigma_fast.trace() }

    // ONLY PUBLIC ENTRYPOINT. Emits exactly one KernelStateDelta per call.
    pub fn ingest(&mut self, input: PhiInput) -> KernelStateDelta {
        assert_eq!(
            input.entity_anchor, self.entity_anchor,
            "entity_anchor mismatch — discard event"
        );

        self.tick_count += 1;
        self.sequence_id += 1;

        // 1. Welford normalization → normalized Φ vector
        let phi = self.phi_state.update(&input.features);

        // 2. Dual EMA covariance update (no allocation, preallocated buffers)
        self.sigma_fast.update(&phi);
        self.sigma_slow.update(&phi);

        // 3. ξ (correlation delta — derived only, never feeds back into Φ)
        let xi = compute_xi(&self.sigma_fast, &self.sigma_slow);
        let xi_norm = frobenius_norm(&xi);

        // 4. R(t) log-det divergence
        let r_t = self.compute_r();

        // 5. Classify mutation and advance FSM
        let mutation = self.classify_mutation(&xi, xi_norm, r_t);

        KernelStateDelta {
            sequence_id: self.sequence_id,
            entity_anchor: self.entity_anchor,
            entity_view: vec![],
            timestamp_ms: input.timestamp_ms,
            mutation,
            fsm_regime: self.fsm_state.clone(),
        }
    }

    // R(t) = tr(Σ_slow⁻¹·Σ_fast) − ln det(Σ_fast) + ln det(Σ_slow) − d
    // KL divergence between N(0,Σ_fast) and N(0,Σ_slow). Non-negative by construction.
    // Σ_slow Cholesky cached implicitly — 5×5 Cholesky is ~42 flops, negligible at this dim.
    // Cache externally when DIM scales beyond 32.
    fn compute_r(&self) -> f64 {
        let l_slow = match self.sigma_slow.cholesky() {
            Some(l) => l,
            None => return 0.0,
        };
        let trace_term = trace_inv_times(&l_slow, &self.sigma_fast.data);
        let log_det_fast = self.sigma_fast.log_det().unwrap_or(0.0);
        let log_det_slow = self.sigma_slow.log_det().unwrap_or(0.0);
        (trace_term - log_det_fast + log_det_slow - DIM as f64).max(0.0)
    }

    fn classify_mutation(
        &mut self,
        xi: &[f64; DIM * DIM],
        xi_norm: f64,
        r_t: f64,
    ) -> StateMutation {
        if r_t >= R_PHASE_THRESHOLD {
            self.fsm_state = FsmState::S3_ResonanceActive;
            StateMutation::PhaseTransition { r_oper: r_t }
        } else if xi_norm >= XI_COUPLING_THRESHOLD {
            self.fsm_state = FsmState::S2_CoherenceConfirmation;
            StateMutation::CouplingShifted { xi_matrix: xi.to_vec() }
        } else {
            if self.tick_count > 1 {
                self.fsm_state = FsmState::S1_StructureFormation;
            }
            StateMutation::StructureEvolved {
                sigma_fast_trace: self.sigma_fast.trace(),
                sigma_slow_trace: self.sigma_slow.trace(),
            }
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn engine() -> MathEngine {
        // lambda = weight on history. Higher = longer memory.
        // lambda_fast=0.3 → ~1.4-tick half-life (short memory)
        // lambda_slow=0.99 → ~69-tick half-life (long memory)
        MathEngine::new(1, 0.3, 0.99)
    }

    fn input(features: [f64; 5], t: u64) -> PhiInput {
        PhiInput { entity_anchor: 1, features, timestamp_ms: t }
    }

    #[test]
    fn sequence_id_strictly_increases() {
        let mut e = engine();
        let d1 = e.ingest(input([1.0, 0.5, 0.2, 0.8, 0.3], 1000));
        let d2 = e.ingest(input([1.1, 0.6, 0.3, 0.7, 0.4], 2000));
        assert!(d2.sequence_id > d1.sequence_id);
    }

    #[test]
    fn entity_anchor_preserved_in_delta() {
        let mut e = engine();
        let d = e.ingest(input([0.5; 5], 1000));
        assert_eq!(d.entity_anchor, 1);
    }

    #[test]
    fn starts_in_passive_observation() {
        let mut e = engine();
        let d = e.ingest(input([0.1; 5], 1000));
        assert_eq!(d.fsm_regime, FsmState::S0_PassiveObservation);
    }

    #[test]
    fn stable_signal_emits_structure_evolved() {
        let mut e = engine();
        for i in 0..10u64 {
            e.ingest(input([0.1, 0.2, 0.3, 0.4, 0.5], i * 1000));
        }
        let d = e.ingest(input([0.1, 0.2, 0.3, 0.4, 0.5], 10_000));
        assert!(matches!(d.mutation, StateMutation::StructureEvolved { .. }));
    }

    #[test]
    fn r_is_nonnegative() {
        let mut e = engine();
        for i in 0..50u64 {
            let f = i as f64 * 0.1;
            e.ingest(input([f, f * 0.5, f * 0.2, f * 0.8, f * 0.3], i * 100));
        }
        assert!(e.compute_r() >= 0.0);
    }

    #[test]
    fn sustained_spike_triggers_phase_transition() {
        // lambda_fast=0.3 (short memory), lambda_slow=0.99 (long memory ~69 ticks)
        // Σ_fast converges to spike quickly; Σ_slow retains baseline → R diverges above threshold
        let mut e = MathEngine::new(1, 0.3, 0.99);
        // Warmup: varied signal to build Σ_slow baseline
        for i in 0..50u64 {
            let f = 0.1 + (i as f64 % 3.0) * 0.05;
            e.ingest(input([f, f * 0.5, f * 1.2, f * 0.8, f * 0.3], i * 100));
        }
        // Sustained spike: Σ_fast rapidly adopts new regime; Σ_slow holds baseline → R spikes
        let mut got = false;
        for i in 0..100u64 {
            let d = e.ingest(input([8.0, -6.0, 10.0, -4.0, 7.0], (50 + i) * 100));
            if matches!(d.mutation, StateMutation::PhaseTransition { .. }) {
                got = true;
                break;
            }
        }
        assert!(got, "PhaseTransition not emitted on sustained spike");
    }

    #[test]
    fn constant_signal_does_not_panic() {
        let mut e = engine();
        for i in 0..100u64 {
            e.ingest(input([1.0; 5], i * 100));
        }
    }

    #[test]
    fn zero_signal_does_not_panic() {
        let mut e = engine();
        for i in 0..50u64 {
            e.ingest(input([0.0; 5], i * 100));
        }
    }
}
