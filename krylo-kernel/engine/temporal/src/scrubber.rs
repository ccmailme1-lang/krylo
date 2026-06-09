use crate::{authority::TemporalAuthority, mode::TemporalMode};

/// UI time control binding (§9).
/// The scrubber does NOT control UI state.
/// It is a writer to canonical_time_ms + mode switch.
///
/// Interaction map:
///   drag left  → Replay (seek backward into history)
///   drag right → Projection (advance into synthetic future)
///   center     → Live (return to real-time ingest authority)
pub struct Scrubber;

impl Scrubber {
    /// Drag left — enter or extend Replay mode, seek backward by delta_ms.
    pub fn drag_left(authority: &mut TemporalAuthority, delta_ms: u64) {
        let current = authority.replay_cursor.unwrap_or(authority.canonical_time_ms);
        authority.mode = TemporalMode::Replay;
        authority.replay_cursor = Some(current.saturating_sub(delta_ms));
    }

    /// Drag right — enter or extend Projection mode, advance canonical_time_ms.
    pub fn drag_right(authority: &mut TemporalAuthority, delta_ms: u64) {
        if authority.mode != TemporalMode::Projection {
            // Set projection origin to current canonical time before branching
            authority.projection_origin = Some(authority.canonical_time_ms);
        }
        authority.mode = TemporalMode::Projection;
        authority.canonical_time_ms = authority.canonical_time_ms.saturating_add(delta_ms);
    }

    /// Center lock — return to Live, stream is now the time authority.
    pub fn center_lock(authority: &mut TemporalAuthority) {
        authority.mode = TemporalMode::Live;
        // Retain cursors — re-entering replay restores last position
    }

    /// Fork current position into Hybrid mode for counterfactual branching.
    pub fn fork(authority: &mut TemporalAuthority) {
        let cursor = authority.replay_cursor.unwrap_or(authority.canonical_time_ms);
        authority.enter_hybrid(cursor);
    }
}
