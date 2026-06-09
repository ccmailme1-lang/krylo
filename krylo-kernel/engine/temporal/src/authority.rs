use crate::mode::TemporalMode;

/// The single temporal authority (§4.2).
/// Controls which timeline defines "now" for the entire rendering context.
/// Everything projects from this — not from local component state.
#[derive(Debug)]
pub struct TemporalAuthority {
    pub mode:              TemporalMode,
    pub canonical_time_ms: u64,
    pub playback_rate:     f64,
    pub paused:            bool,
    pub replay_cursor:     Option<u64>, // set in Replay + Hybrid modes
    pub projection_origin: Option<u64>, // origin point for Projection branch
}

impl TemporalAuthority {
    pub fn new() -> Self {
        Self {
            mode:              TemporalMode::Live,
            canonical_time_ms: 0,
            playback_rate:     1.0,
            paused:            false,
            replay_cursor:     None,
            projection_origin: None,
        }
    }

    /// Enter Replay mode — seek to a specific historical cursor.
    pub fn enter_replay(&mut self, cursor_ms: u64) {
        self.mode = TemporalMode::Replay;
        self.replay_cursor = Some(cursor_ms);
    }

    /// Enter Projection mode — synthetic branch from a known origin.
    pub fn enter_projection(&mut self, origin_ms: u64) {
        self.mode = TemporalMode::Projection;
        self.projection_origin = Some(origin_ms);
        self.canonical_time_ms = origin_ms;
    }

    /// Enter Hybrid mode — replay baseline + fork to projection from cursor.
    /// This is the counterfactual branching mode (§5.4).
    pub fn enter_hybrid(&mut self, replay_cursor_ms: u64) {
        self.mode = TemporalMode::Hybrid;
        self.replay_cursor = Some(replay_cursor_ms);
        self.canonical_time_ms = replay_cursor_ms;
    }

    /// Return to live ingest — canonical real-time authority.
    pub fn return_to_live(&mut self) {
        self.mode = TemporalMode::Live;
        // retain cursors — re-entering replay should restore position
    }

    /// Advance canonical time by delta_ms. Respects paused state and playback_rate.
    pub fn advance(&mut self, delta_ms: u64) {
        if self.paused { return; }
        let scaled = (delta_ms as f64 * self.playback_rate) as u64;
        match self.mode {
            TemporalMode::Replay => {
                if let Some(c) = self.replay_cursor.as_mut() {
                    *c = c.saturating_add(scaled);
                }
            }
            TemporalMode::Projection | TemporalMode::Hybrid => {
                self.canonical_time_ms = self.canonical_time_ms.saturating_add(scaled);
            }
            TemporalMode::Live => {
                self.canonical_time_ms = self.canonical_time_ms.saturating_add(delta_ms);
            }
        }
    }
}

impl Default for TemporalAuthority {
    fn default() -> Self {
        Self::new()
    }
}
