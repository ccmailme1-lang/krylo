/// Temporal interpretation mode (§4.1).
/// Only ONE mode is active per rendering context — singularity rule (§11).
#[derive(Debug, Clone, PartialEq)]
pub enum TemporalMode {
    Live,       // active ingest stream — real-time, forward only
    Replay,     // NDJSON historical frames — deterministic backward traversal
    Projection, // synthetic future manifold — no ingestion dependency
    Hybrid,     // replay baseline + projection fork — counterfactual branching
}
