// WO-1327 — Phantom Familiarity Collapse (PFC) System
//
// Prevents engagement trajectories that accumulate without Σ_slow stabilization
// from masquerading as structural trust.
//
// Rule: Repetition without persistence is not structure. It is noise recycling.
//
// Collapse function: Γ_ij(t) = E_ij(t) · e^(−α · (1 − C_slow))
//   E_ij(t)  = engagement accumulator (co-occurrence count)
//   C_slow   = long-term covariance consistency score [0, 1]
//   α        = decay aggressiveness (spec: 2.0)
//
// PFC does not execute in Awareness state.
// PFC collapse demotes entity to Awareness via CognitiveLattice::demote().

const PFC_ALPHA: f64 = 2.0;
// Collapse threshold on the decay factor e^(-α(1-C_slow)), not on E·factor.
// e^(-α) = e^(-2) ≈ 0.135 when C_slow → 0, so threshold must be above that minimum.
// 0.25 fires when C_slow < 0.68 (persistent instability).
const COLLAPSE_GAMMA_THRESHOLD: f64 = 0.25;
const PFC_EVALUATION_WINDOW: u64 = 10;        // minimum ticks in Engagement before PFC can fire
const EPSILON: f64 = 1e-12;

pub struct PfcEngine {
    engagement_accumulator: f64,
    c_slow_consistency: f64,
    pub gamma: f64,
    ticks_in_engagement: u64,
}

impl PfcEngine {
    pub fn new() -> Self {
        Self {
            engagement_accumulator: 0.0,
            c_slow_consistency:     0.5, // neutral prior
            gamma:                  1.0, // no collapse pressure initially
            ticks_in_engagement:    0,
        }
    }

    /// Called each tick when entity is in Engagement state.
    /// sigma_slow_trace:      current trace of Σ_slow
    /// sigma_slow_prev_trace: previous trace of Σ_slow
    /// Returns true if phantom collapse should fire — caller must call csl.demote().
    pub fn tick_engagement(
        &mut self,
        sigma_slow_trace:      f64,
        sigma_slow_prev_trace: f64,
    ) -> bool {
        self.ticks_in_engagement += 1;
        self.engagement_accumulator += 1.0;

        // C_slow: stability of Σ_slow trace — 1.0 = perfectly stable, 0.0 = high drift
        let drift = if sigma_slow_prev_trace < EPSILON {
            0.0
        } else {
            (sigma_slow_trace - sigma_slow_prev_trace).abs()
                / (sigma_slow_prev_trace + EPSILON)
        };
        // Smooth C_slow with EMA to prevent single-tick stability from promoting trust
        self.c_slow_consistency = 0.9 * self.c_slow_consistency + 0.1 * (1.0 - drift).max(0.0);

        // gamma = decay factor only (not E·factor) — bounded (0,1].
        // Collapse fires when this factor falls below threshold (persistent instability).
        self.gamma = self.compute_gamma();

        // Collapse fires only STRICTLY AFTER evaluation window, and only if Γ below threshold
        self.ticks_in_engagement > PFC_EVALUATION_WINDOW
            && self.gamma < COLLAPSE_GAMMA_THRESHOLD
    }

    /// Called when entity advances to Trust — resets provisional accumulators.
    pub fn on_trust_promotion(&mut self) {
        self.ticks_in_engagement = 0;
        self.engagement_accumulator = 0.0;
        // C_slow retained — it represents the actual slow-manifold consistency observed
    }

    /// Called when PFC collapse fires or entity is externally demoted.
    pub fn on_collapse(&mut self) {
        self.engagement_accumulator = 0.0;
        self.ticks_in_engagement = 0;
        self.gamma = 1.0;
        self.c_slow_consistency = 0.5; // reset to neutral prior
    }

    fn compute_gamma(&self) -> f64 {
        // Decay factor = e^(-α·(1-C_slow)). Bounded (0,1].
        // Approaches e^(-α) ≈ 0.135 as C_slow → 0 (max decay).
        (-PFC_ALPHA * (1.0 - self.c_slow_consistency)).exp()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_sigma_slow_prevents_collapse() {
        let mut pfc = PfcEngine::new();
        // Feed stable sigma_slow (same value → zero drift → C_slow → 1.0)
        let mut collapsed = false;
        for _ in 0..(PFC_EVALUATION_WINDOW + 20) {
            if pfc.tick_engagement(1.0, 1.0) {
                collapsed = true;
                break;
            }
        }
        assert!(!collapsed, "Stable C_slow should not trigger collapse");
    }

    #[test]
    fn unstable_sigma_slow_triggers_collapse() {
        let mut pfc = PfcEngine::new();
        // Feed highly drifting sigma_slow — C_slow approaches 0 → Γ falls below threshold
        let mut collapsed = false;
        for i in 0..(PFC_EVALUATION_WINDOW + 50) {
            let prev = if i == 0 { 0.0 } else { i as f64 * 100.0 };
            let curr = (i + 1) as f64 * 100.0 * 2.0; // 100% drift each tick
            if pfc.tick_engagement(curr, prev) {
                collapsed = true;
                break;
            }
        }
        assert!(collapsed, "Unstable C_slow should trigger PFC collapse");
    }

    #[test]
    fn collapse_below_evaluation_window_never_fires() {
        let mut pfc = PfcEngine::new();
        // Even with max drift, must not collapse before evaluation window
        let mut early_collapse = false;
        for i in 0..PFC_EVALUATION_WINDOW {
            let prev = if i == 0 { 0.0 } else { i as f64 * 1000.0 };
            let curr = (i + 1) as f64 * 1000.0 * 5.0;
            if pfc.tick_engagement(curr, prev) {
                early_collapse = true;
            }
        }
        assert!(!early_collapse);
    }

    #[test]
    fn on_collapse_resets_state() {
        let mut pfc = PfcEngine::new();
        pfc.engagement_accumulator = 50.0;
        pfc.ticks_in_engagement = 25;
        pfc.gamma = 0.05;
        pfc.on_collapse();
        assert_eq!(pfc.ticks_in_engagement, 0);
        assert_eq!(pfc.engagement_accumulator, 0.0);
        assert_eq!(pfc.gamma, 1.0);
    }

    #[test]
    fn gamma_is_one_at_init() {
        let pfc = PfcEngine::new();
        // E=0, so Γ = 0 · exp(...) = 0. But initial gamma is 1.0 (no collapse pressure).
        assert_eq!(pfc.gamma, 1.0);
    }
}
