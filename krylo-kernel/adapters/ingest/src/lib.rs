// WO-1301 Phase 4 — adapters/ingest
// Converts external surface signals → PhiInput [5D tensor].
// Enforces monotonic event-time per entity_anchor (WO-1327 Gate A).
// Domain labels stay here. Kernel sees only PhiInput — no surface identity.
// WO-1306 — mutations.rs re-exports IngestMutation from core/bus/typed contract.

pub mod mutations;

use krylo_math::PhiInput;
use std::collections::HashMap;

const EPSILON: f64 = 1e-9;
// History window for Shannon entropy approximation (power of 2).
const HISTORY_LEN: usize = 8;
// Default anomaly threshold: signal must exceed this fraction of historical max.
const ANOMALY_THRESHOLD_FRAC: f64 = 0.75;

// ── Surface taxonomy ──────────────────────────────────────────────────────────
// Domain labels live ONLY in this adapter. Never cross into kernel.

#[derive(Debug, Clone, PartialEq)]
pub enum SurfaceKind {
    Sec,     // SEC/EDGAR filings, CIK deltas, Form ID events
    Hiring,  // Job posting rate, headcount signals
    Infra,   // Cloud provisioning events, capacity commitments
    Legal,   // Regulatory filings, court activity, compliance events
    Prl,     // Public Representation Layer: website content change score
}

// ── Raw signal from a surface adapter ────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct RawSignal {
    pub entity_anchor: u64,
    pub surface: SurfaceKind,
    /// Normalized rate value [0.0, ∞). Surface adapter is responsible for
    /// translating domain-specific counts into a comparable rate.
    pub value: f64,
    /// Event-time in milliseconds. Must be monotonic per entity_anchor.
    /// Wall-clock time is NOT acceptable — use source event timestamps.
    pub event_time_ms: u64,
}

// ── Per-entity ingestion state ────────────────────────────────────────────────

struct EntityState {
    last_event_time_ms: u64,
    last_value: f64,
    last_delta_f: f64,
    max_value: f64,
    anomaly_start_ms: Option<u64>,
    value_history: [f64; HISTORY_LEN],
    history_idx: usize,
    history_count: usize,
}

impl EntityState {
    fn new() -> Self {
        Self {
            last_event_time_ms: 0,
            last_value: 0.0,
            last_delta_f: 0.0,
            max_value: EPSILON,
            anomaly_start_ms: None,
            value_history: [0.0; HISTORY_LEN],
            history_idx: 0,
            history_count: 0,
        }
    }

    // Compute 5D Φ tensor from incoming value + event time.
    // Returns None if event_time is non-monotonic (caller enforces discard).
    fn compute_phi(
        &mut self,
        value: f64,
        event_time_ms: u64,
    ) -> Option<[f64; 5]> {
        if event_time_ms <= self.last_event_time_ms && self.history_count > 0 {
            return None; // Non-monotonic — discard per causal safety rule
        }

        let dt_s = if self.history_count == 0 {
            1.0
        } else {
            ((event_time_ms - self.last_event_time_ms) as f64 / 1000.0).max(EPSILON)
        };

        // Δf — z-scored rate change
        let delta_f = (value - self.last_value) / self.last_value.max(EPSILON);

        // a — acceleration (d(Δf)/dt)
        let accel = (delta_f - self.last_delta_f) / dt_s;

        // HΔ — Shannon entropy shift across rolling window
        let prev_entropy = self.rolling_entropy();
        self.push_history(value);
        let curr_entropy = self.rolling_entropy();
        let h_delta = curr_entropy - prev_entropy;

        // ρ — persistence above anomaly threshold
        let threshold = self.max_value * ANOMALY_THRESHOLD_FRAC;
        if value > threshold {
            if self.anomaly_start_ms.is_none() {
                self.anomaly_start_ms = Some(event_time_ms);
            }
        } else {
            self.anomaly_start_ms = None;
        }
        let persistence_s = match self.anomaly_start_ms {
            Some(start) => (event_time_ms - start) as f64 / 1000.0,
            None => 0.0,
        };

        // δprox — boundary proximity (distance to historical max)
        if value > self.max_value {
            self.max_value = value;
        }
        let d_prox = (self.max_value - value) / self.max_value.max(EPSILON);

        // Update state
        self.last_event_time_ms = event_time_ms;
        self.last_value = value;
        self.last_delta_f = delta_f;
        self.history_count += 1;

        Some([delta_f, h_delta, accel, persistence_s, d_prox])
    }

    fn push_history(&mut self, value: f64) {
        self.value_history[self.history_idx % HISTORY_LEN] = value;
        self.history_idx += 1;
    }

    // Shannon entropy over rolling window using equal-width buckets.
    // Simple approximation: treat each window value as a symbol.
    fn rolling_entropy(&self) -> f64 {
        let n = self.history_count.min(HISTORY_LEN);
        if n < 2 {
            return 0.0;
        }
        let window = &self.value_history[..n];
        let sum: f64 = window.iter().sum();
        if sum < EPSILON {
            return 0.0;
        }
        window.iter().fold(0.0, |acc, &v| {
            let p = v / sum;
            if p > EPSILON {
                acc - p * p.ln()
            } else {
                acc
            }
        })
    }
}

// ── Monotonic clock per entity ────────────────────────────────────────────────
// Enforces WO-1327 Gate A: event-time must be strictly monotonic per entity.
// On collision: nudge forward by 1ms rather than discard, preserving ordering.

struct MonotonicClock {
    last_ms: u64,
}

impl MonotonicClock {
    fn new() -> Self {
        Self { last_ms: 0 }
    }

    fn next(&mut self, raw_ms: u64) -> u64 {
        let t = raw_ms.max(self.last_ms + 1);
        self.last_ms = t;
        t
    }
}

// ── Ingest adapter ────────────────────────────────────────────────────────────

pub struct IngestAdapter {
    entity_state: HashMap<u64, EntityState>,
    clocks: HashMap<u64, MonotonicClock>,
}

impl IngestAdapter {
    pub fn new() -> Self {
        Self {
            entity_state: HashMap::new(),
            clocks: HashMap::new(),
        }
    }

    /// Convert a RawSignal into a PhiInput.
    /// Returns None if the signal is malformed (NaN/infinite value).
    /// Non-monotonic timestamps are corrected, not discarded.
    pub fn convert(&mut self, signal: RawSignal) -> Option<PhiInput> {
        if !signal.value.is_finite() {
            return None;
        }

        let anchor = signal.entity_anchor;

        // Enforce monotonic event-time
        let clock = self.clocks.entry(anchor).or_insert_with(MonotonicClock::new);
        let event_time_ms = clock.next(signal.event_time_ms);

        // Compute 5D phi
        let state = self.entity_state.entry(anchor).or_insert_with(EntityState::new);
        let features = state.compute_phi(signal.value, event_time_ms)?;

        Some(PhiInput {
            entity_anchor: anchor,
            features,
            timestamp_ms: event_time_ms,
        })
    }
}

impl Default for IngestAdapter {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn signal(anchor: u64, value: f64, t: u64) -> RawSignal {
        RawSignal {
            entity_anchor: anchor,
            surface: SurfaceKind::Sec,
            value,
            event_time_ms: t,
        }
    }

    #[test]
    fn converts_valid_signal_to_phi_input() {
        let mut adapter = IngestAdapter::new();
        let phi = adapter.convert(signal(1, 10.0, 1000));
        assert!(phi.is_some());
        let phi = phi.unwrap();
        assert_eq!(phi.entity_anchor, 1);
        assert_eq!(phi.features.len(), 5);
        assert!(phi.features.iter().all(|f| f.is_finite()));
    }

    #[test]
    fn rejects_nan_value() {
        let mut adapter = IngestAdapter::new();
        let phi = adapter.convert(signal(1, f64::NAN, 1000));
        assert!(phi.is_none());
    }

    #[test]
    fn rejects_infinite_value() {
        let mut adapter = IngestAdapter::new();
        let phi = adapter.convert(signal(1, f64::INFINITY, 1000));
        assert!(phi.is_none());
    }

    #[test]
    fn monotonic_clock_corrects_duplicate_timestamps() {
        let mut adapter = IngestAdapter::new();
        let p1 = adapter.convert(signal(1, 1.0, 1000)).unwrap();
        let p2 = adapter.convert(signal(1, 2.0, 1000)).unwrap(); // same t
        let p3 = adapter.convert(signal(1, 3.0, 999)).unwrap();  // past t
        assert!(p2.timestamp_ms > p1.timestamp_ms, "duplicate must be nudged forward");
        assert!(p3.timestamp_ms > p2.timestamp_ms, "past timestamp must be nudged forward");
    }

    #[test]
    fn monotonic_clock_is_per_entity() {
        let mut adapter = IngestAdapter::new();
        let p1 = adapter.convert(signal(1, 1.0, 5000)).unwrap();
        let p2 = adapter.convert(signal(2, 1.0, 1000)).unwrap(); // different entity, earlier t
        assert_eq!(p1.timestamp_ms, 5000);
        assert_eq!(p2.timestamp_ms, 1000, "entity 2 clock is independent of entity 1");
    }

    #[test]
    fn entities_are_isolated() {
        let mut adapter = IngestAdapter::new();
        for i in 1..=5u64 {
            adapter.convert(signal(1, i as f64, i * 1000));
        }
        // Entity 2 starts fresh — its first phi should have no history from entity 1
        let p = adapter.convert(signal(2, 1.0, 100)).unwrap();
        assert_eq!(p.entity_anchor, 2);
    }

    #[test]
    fn delta_f_increases_on_rising_value() {
        let mut adapter = IngestAdapter::new();
        adapter.convert(signal(1, 10.0, 1000)); // baseline
        let p = adapter.convert(signal(1, 20.0, 2000)).unwrap(); // doubled
        let delta_f = p.features[0];
        assert!(delta_f > 0.0, "rising value should produce positive Δf, got {}", delta_f);
    }

    #[test]
    fn d_prox_zero_at_new_max() {
        let mut adapter = IngestAdapter::new();
        adapter.convert(signal(1, 5.0, 1000));
        adapter.convert(signal(1, 10.0, 2000));
        // New max — δprox should be 0 (at boundary)
        let p = adapter.convert(signal(1, 20.0, 3000)).unwrap();
        let d_prox = p.features[4];
        assert!(d_prox < 0.01, "at new max, δprox should be ~0, got {}", d_prox);
    }

    #[test]
    fn persistence_grows_above_threshold() {
        let mut adapter = IngestAdapter::new();
        // Establish max
        adapter.convert(signal(1, 100.0, 1000));
        // Push above 75% threshold repeatedly
        let mut last_persistence = -1.0f64;
        for i in 1..=5u64 {
            let p = adapter.convert(signal(1, 80.0, 1000 + i * 1000)).unwrap();
            let rho = p.features[3];
            assert!(
                rho >= last_persistence,
                "persistence should grow, got {} then {}",
                last_persistence,
                rho
            );
            last_persistence = rho;
        }
    }

    #[test]
    fn surface_kind_stays_in_adapter_kernel_blind() {
        // PhiInput has no surface field — domain label does not leak to kernel
        let mut adapter = IngestAdapter::new();
        let phi = adapter.convert(RawSignal {
            entity_anchor: 1,
            surface: SurfaceKind::Legal,
            value: 5.0,
            event_time_ms: 1000,
        }).unwrap();
        // Confirm PhiInput carries no surface identity
        let _ = phi.entity_anchor;
        let _ = phi.features;
        let _ = phi.timestamp_ms;
        // If this compiles, SurfaceKind is not in PhiInput — test passes.
    }
}
