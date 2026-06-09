use crate::frame::TemporalFrame;

/// Hybrid mode comparison engine (§10).
/// Used for counterfactual analysis: "what changed causally?"
/// Not just "what looks different?" — delta is weighted by causal significance.
#[derive(Debug)]
pub struct TemporalDivergence {
    pub replay_frame:     TemporalFrame, // what actually happened
    pub projection_frame: TemporalFrame, // what the synthetic branch predicts
    pub delta_coherence:  f64,           // composite causal distance
}

impl TemporalDivergence {
    /// Compute divergence between a replay frame and a projection frame.
    /// delta_coherence is a weighted composite:
    ///   resonance diff × 1.0 (primary signal)
    ///   trust diff     × 0.5 (slower-moving, lower weight)
    ///   xi_pressure    × 0.3 (coupling noise, lowest weight)
    pub fn compute(replay: TemporalFrame, projection: TemporalFrame) -> Self {
        let delta = (replay.resonance - projection.resonance).abs()
            + (replay.trust - projection.trust).abs() * 0.5
            + (replay.xi_pressure - projection.xi_pressure).abs() * 0.3;
        Self {
            replay_frame:     replay,
            projection_frame: projection,
            delta_coherence:  delta,
        }
    }

    /// True if the divergence is structurally significant.
    /// Threshold chosen so noise-level differences do not trigger analysis paths.
    pub fn is_significant(&self) -> bool {
        self.delta_coherence > 0.25
    }
}
