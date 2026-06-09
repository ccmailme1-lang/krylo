use crate::{authority::TemporalAuthority, mode::TemporalMode};

/// Core arbitration: resolve what "now" is given the current authority (§6).
///
/// system_time_ms: caller-provided wall clock — keeps this function pure
/// and testable without std::time dependency in the hot path.
pub fn resolve_time(authority: &TemporalAuthority, system_time_ms: u64) -> u64 {
    match authority.mode {
        TemporalMode::Live       => system_time_ms,
        TemporalMode::Replay     => authority.replay_cursor.unwrap_or(authority.canonical_time_ms),
        TemporalMode::Projection => authority.canonical_time_ms,
        TemporalMode::Hybrid     => authority.canonical_time_ms,
    }
}

/// Select the active TemporalMode for the current frame.
/// Enforces singularity rule (§11): only one interpretation of time per frame.
pub fn active_mode(authority: &TemporalAuthority) -> &TemporalMode {
    &authority.mode
}

/// True if the authority is in a historical state (can seek backward).
pub fn is_historical(authority: &TemporalAuthority) -> bool {
    matches!(authority.mode, TemporalMode::Replay | TemporalMode::Hybrid)
}

/// True if projection branch is active.
pub fn is_projecting(authority: &TemporalAuthority) -> bool {
    matches!(authority.mode, TemporalMode::Projection | TemporalMode::Hybrid)
}
