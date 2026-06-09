// WO-1302 — Frame Budget Watchdog
// Real-time, frame-bounded execution governor.
// Enforces compute, event, and semantic pressure ceilings across the
// WO-1301 streaming inference kernel without violating causal determinism.
//
// Integration points (§7): adapters/ingest, engine/math, engine/fsm.
// This crate is the standalone governor — integration hooks are a separate step.

// ── Budget Categories ─────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct FrameBudget {
    pub window_ms: u64,

    // hard caps
    pub max_compute_ns: u64,
    pub max_events: u32,
    pub max_fsm_transitions: u32,

    // soft pressure thresholds
    pub xi_pressure_limit: f64,
    pub r_pressure_limit: f64,

    // runtime tracking
    pub compute_ns_used: u64,
    pub events_processed: u32,
    pub fsm_transitions: u32,
    pub xi_pressure: f64,
    pub r_pressure: f64,
}

// ── Throttle State ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum ThrottleState {
    Normal,
    Degraded,
    Throttled,
    EmergencyClamp,
}

// ── Watchdog Controller ───────────────────────────────────────────────────────

pub struct FrameWatchdog {
    pub budget: FrameBudget,
    pub frame_start_ns: u64,
    pub throttle_state: ThrottleState,
}

impl FrameWatchdog {
    pub fn new(budget: FrameBudget) -> Self {
        Self {
            budget,
            frame_start_ns: 0,
            throttle_state: ThrottleState::Normal,
        }
    }

    /// Pre-check gate — call before any kernel operation.
    /// Returns false when hard caps are reached.
    pub fn allow_event(&self) -> bool {
        self.budget.events_processed < self.budget.max_events
            && self.budget.compute_ns_used < self.budget.max_compute_ns
    }

    /// Update hook — call after each KernelStateDelta is processed.
    pub fn record_event(
        &mut self,
        compute_ns: u64,
        xi_delta: f64,
        r_delta: f64,
        fsm_transition: bool,
    ) {
        self.budget.compute_ns_used += compute_ns;
        self.budget.events_processed += 1;

        self.budget.xi_pressure += xi_delta;
        self.budget.r_pressure += r_delta;

        if fsm_transition {
            self.budget.fsm_transitions += 1;
        }
    }

    /// Control law — evaluates current pressure and updates throttle state.
    /// Priority: EmergencyClamp > Throttled > Degraded > Normal.
    pub fn evaluate_throttle(&mut self) -> ThrottleState {
        if self.budget.compute_ns_used > self.budget.max_compute_ns
            || self.budget.events_processed > self.budget.max_events
        {
            self.throttle_state = ThrottleState::EmergencyClamp;
        } else if self.budget.xi_pressure > self.budget.xi_pressure_limit
            || self.budget.r_pressure > self.budget.r_pressure_limit
        {
            self.throttle_state = ThrottleState::Throttled;
        } else if self.budget.events_processed > (self.budget.max_events / 2) {
            self.throttle_state = ThrottleState::Degraded;
        } else {
            self.throttle_state = ThrottleState::Normal;
        }

        self.throttle_state.clone()
    }

    /// Reset tracking counters for the next frame window.
    pub fn reset_frame(&mut self, frame_start_ns: u64) {
        self.frame_start_ns = frame_start_ns;
        self.budget.compute_ns_used = 0;
        self.budget.events_processed = 0;
        self.budget.fsm_transitions = 0;
        self.budget.xi_pressure = 0.0;
        self.budget.r_pressure = 0.0;
        self.throttle_state = ThrottleState::Normal;
    }
}

// ── Default budget (16ms frame, conservative caps) ────────────────────────────

impl FrameBudget {
    pub fn default_16ms() -> Self {
        Self {
            window_ms: 16,
            max_compute_ns: 14_000_000, // 14ms hard cap, 2ms headroom
            max_events: 1_000,
            max_fsm_transitions: 50,
            xi_pressure_limit: 5.0,
            r_pressure_limit: 10.0,
            compute_ns_used: 0,
            events_processed: 0,
            fsm_transitions: 0,
            xi_pressure: 0.0,
            r_pressure: 0.0,
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn watchdog() -> FrameWatchdog {
        FrameWatchdog::new(FrameBudget {
            window_ms: 16,
            max_compute_ns: 1_000_000,
            max_events: 100,
            max_fsm_transitions: 10,
            xi_pressure_limit: 2.0,
            r_pressure_limit: 4.0,
            compute_ns_used: 0,
            events_processed: 0,
            fsm_transitions: 0,
            xi_pressure: 0.0,
            r_pressure: 0.0,
        })
    }

    #[test]
    fn starts_normal() {
        let wd = watchdog();
        assert_eq!(wd.throttle_state, ThrottleState::Normal);
    }

    #[test]
    fn allow_event_false_when_events_at_cap() {
        let mut wd = watchdog();
        wd.budget.events_processed = wd.budget.max_events;
        assert!(!wd.allow_event(), "must block at event cap");
    }

    #[test]
    fn allow_event_false_when_compute_at_cap() {
        let mut wd = watchdog();
        wd.budget.compute_ns_used = wd.budget.max_compute_ns;
        assert!(!wd.allow_event(), "must block at compute cap");
    }

    #[test]
    fn allow_event_true_below_caps() {
        let wd = watchdog();
        assert!(wd.allow_event());
    }

    #[test]
    fn record_event_accumulates_all_fields() {
        let mut wd = watchdog();
        wd.record_event(500_000, 0.3, 0.7, true);
        wd.record_event(200_000, 0.1, 0.2, false);
        assert_eq!(wd.budget.compute_ns_used, 700_000);
        assert_eq!(wd.budget.events_processed, 2);
        assert_eq!(wd.budget.fsm_transitions, 1);
        assert!((wd.budget.xi_pressure - 0.4).abs() < 1e-9);
        assert!((wd.budget.r_pressure - 0.9).abs() < 1e-9);
    }

    #[test]
    fn degraded_at_half_event_cap() {
        let mut wd = watchdog();
        wd.budget.events_processed = 51; // > max_events(100) / 2
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::Degraded);
    }

    #[test]
    fn throttled_on_xi_pressure_exceeded() {
        let mut wd = watchdog();
        wd.budget.xi_pressure = 2.1; // > xi_pressure_limit(2.0)
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::Throttled);
    }

    #[test]
    fn throttled_on_r_pressure_exceeded() {
        let mut wd = watchdog();
        wd.budget.r_pressure = 4.1; // > r_pressure_limit(4.0)
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::Throttled);
    }

    #[test]
    fn emergency_clamp_on_compute_exceeded() {
        let mut wd = watchdog();
        wd.budget.compute_ns_used = 1_000_001; // > max_compute_ns
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::EmergencyClamp);
    }

    #[test]
    fn emergency_clamp_on_events_exceeded() {
        let mut wd = watchdog();
        wd.budget.events_processed = 101; // > max_events
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::EmergencyClamp);
    }

    #[test]
    fn emergency_clamp_takes_priority_over_throttled() {
        let mut wd = watchdog();
        wd.budget.compute_ns_used = 1_000_001; // triggers EmergencyClamp
        wd.budget.xi_pressure = 5.0;           // would trigger Throttled
        let state = wd.evaluate_throttle();
        assert_eq!(state, ThrottleState::EmergencyClamp, "EmergencyClamp must win");
    }

    #[test]
    fn reset_frame_clears_all_tracking() {
        let mut wd = watchdog();
        wd.record_event(500_000, 1.0, 2.0, true);
        wd.evaluate_throttle();
        wd.reset_frame(999_999);
        assert_eq!(wd.budget.compute_ns_used, 0);
        assert_eq!(wd.budget.events_processed, 0);
        assert_eq!(wd.budget.fsm_transitions, 0);
        assert_eq!(wd.budget.xi_pressure, 0.0);
        assert_eq!(wd.budget.r_pressure, 0.0);
        assert_eq!(wd.throttle_state, ThrottleState::Normal);
        assert_eq!(wd.frame_start_ns, 999_999);
    }
}
