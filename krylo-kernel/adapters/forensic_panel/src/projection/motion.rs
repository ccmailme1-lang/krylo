/// Structural motion trail — emergence acceleration and convergence vectors.
/// Does NOT expose actual ξ edges or real node topology.
/// Uses projection approximation layer — pre-abstracted inputs only.
#[derive(Debug, Clone)]
pub struct MotionTrail {
    /// Emergence acceleration [−1.0, 1.0] — positive = accelerating
    pub emergence_acceleration: f32,
    /// Directional convergence signal [0.0, 1.0] — 1.0 = strong coherence
    pub convergence_direction: f32,
    /// Aggregate motion magnitude [0.0, 1.0]
    pub motion_magnitude: f32,
}

impl MotionTrail {
    /// delta_f_projected: rate-change approximation (already abstracted, not raw Δf)
    /// r_projected:       resonance approximation (not raw r_oper)
    pub fn from_projected(delta_f_projected: f32, r_projected: f32) -> Self {
        let accel = delta_f_projected.clamp(-1.0, 1.0);
        let convergence = (r_projected * 0.8).clamp(0.0, 1.0);
        let magnitude = (accel.abs() * 0.5 + r_projected * 0.5).clamp(0.0, 1.0);
        Self {
            emergence_acceleration: accel,
            convergence_direction:  convergence,
            motion_magnitude:       magnitude,
        }
    }
}
