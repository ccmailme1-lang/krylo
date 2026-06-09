use serde::{Deserialize, Serialize};
use krylo_scl::FsmState;
use super::origin::EventOrigin;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedMutation<T> {
    pub inner: T,
    pub confidence: f32,  // statistical validity of signal
    pub entropy: f64,     // signal uncertainty
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedEnvelope<TMutation> {
    pub sequence_id: u64,
    pub entity_anchor: u64,
    pub origin: EventOrigin,
    pub timestamp_ms: u64,
    pub mutation: TypedMutation<TMutation>,
    pub fsm_hint: Option<FsmState>, // advisory only — NOT authoritative
}
