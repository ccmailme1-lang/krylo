/// Trust evolution gauge for guest display.
/// Heavily smoothed, intentionally delayed, non-linear compressed.
///
/// Design invariant: trust must visually feel old before it appears strong.
/// SMOOTHING_ALPHA is low by intent — guests cannot manufacture fast trust.
#[derive(Debug, Clone)]
pub struct TrustGauge {
    /// Longitudinal stabilization score [0.0, 1.0]
    pub longitudinal_score: f32,
    /// Structural consistency accumulation [0.0, 1.0]
    pub structural_consistency: f32,
    /// Informational maturity [0.0, 1.0] — sqrt-compressed, grows fast then plateaus
    pub informational_maturity: f32,
}

impl TrustGauge {
    // Very slow EMA — trust cannot spike even under sustained signal
    const SMOOTHING_ALPHA: f32 = 0.05;

    pub fn new() -> Self {
        Self {
            longitudinal_score:     0.0,
            structural_consistency: 0.0,
            informational_maturity: 0.0,
        }
    }

    /// Update from a new consistency signal [0.0, 1.0].
    pub fn update(&mut self, consistency_signal: f32) {
        let target = consistency_signal.clamp(0.0, 1.0);
        self.longitudinal_score +=
            Self::SMOOTHING_ALPHA * (target - self.longitudinal_score);
        // Structural consistency lags longitudinal by half a step
        self.structural_consistency +=
            (Self::SMOOTHING_ALPHA * 0.5) * (self.longitudinal_score - self.structural_consistency);
        // Informational maturity: sqrt-compressed — fast early gains, slow ceiling approach
        self.informational_maturity = self.structural_consistency.sqrt() * 0.85;
    }
}

impl Default for TrustGauge {
    fn default() -> Self {
        Self::new()
    }
}
