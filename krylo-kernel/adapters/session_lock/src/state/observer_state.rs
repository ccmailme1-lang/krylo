/// Observer informational state (§3). NOT the kernel FSM.
/// This is observer-state evolution — perceptual fidelity escalation.
#[derive(Debug, Clone, PartialEq)]
pub enum ObserverState {
    S0_Awareness,       // Ambient resonance only
    S1_Familiarity,     // Short replay windows
    S2_Continuity,      // Historical continuity
    S3_Trust,           // High-fidelity forensic trails
    S4_StructuralAccess, // Persistent structural timelines
}

/// Per-observer trust accumulation vector (§4).
#[derive(Debug, Clone)]
pub struct ObserverTrustVector {
    pub continuity_score:     f64, // [0.0, 1.0] accumulated continuity
    pub observation_duration: f64, // seconds of sustained observation
    pub revisit_consistency:  f64, // [0.0, 1.0] return-visit regularity
    pub interaction_entropy:  f64, // [0.0, 1.0] behavioral randomness (low = trustworthy)
    pub volatility_penalty:   f64, // [0.0, 0.5] subtracted from net trust
}

impl ObserverTrustVector {
    pub fn new() -> Self {
        Self {
            continuity_score:     0.0,
            observation_duration: 0.0,
            revisit_consistency:  0.0,
            interaction_entropy:  0.5, // unknown entropy at start — neutral
            volatility_penalty:   0.0,
        }
    }

    /// Net trust score — composite of all vector components minus penalty.
    pub fn net_trust(&self) -> f64 {
        let base = (self.continuity_score     * 0.35
            + (self.observation_duration / 3600.0).min(1.0) * 0.25
            + self.revisit_consistency    * 0.25
            + (1.0 - self.interaction_entropy.min(1.0)) * 0.15)
            .min(1.0);
        (base - self.volatility_penalty).max(0.0)
    }
}

impl Default for ObserverTrustVector {
    fn default() -> Self {
        Self::new()
    }
}

/// State lock — created when observer reaches S3 (§7).
/// Stabilizes projection fidelity; prevents abrupt perceptual degradation.
#[derive(Debug, Clone)]
pub struct StateLock {
    pub locked_at_ms:   u64,
    pub observer_state: ObserverState,
}
