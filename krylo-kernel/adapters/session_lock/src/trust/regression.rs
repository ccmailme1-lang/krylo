use crate::state::ObserverTrustVector;

/// Apply a volatility penalty to the trust vector.
/// Penalizes scraping, rapid switching, replay harvesting, burst extraction.
pub fn apply_volatility_penalty(trust: &mut ObserverTrustVector, volatility_signal: f64) {
    trust.volatility_penalty = (trust.volatility_penalty + volatility_signal * 0.15).min(0.5);
}

/// Decay volatility penalty over time.
/// Sustained good behavior allows gradual trust recovery.
/// decay_rate: fraction to reduce per tick (e.g. 0.005 per second).
pub fn decay_volatility_penalty(trust: &mut ObserverTrustVector, decay_rate: f64) {
    trust.volatility_penalty = (trust.volatility_penalty - decay_rate).max(0.0);
}

/// Returns true if access pattern indicates scraping or burst extraction.
/// access_rate_hz: accesses per second. surface_switches: rapid context jumps.
pub fn is_volatile(access_rate_hz: f64, surface_switches: u32) -> bool {
    access_rate_hz > 10.0 || surface_switches > 20
}
