// WO-1082-B canonical event model — field layout mirrors ABI v1.0 byte contract

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    pub domain_id: u8,
    pub type_id: u8,
    pub commit_index: u32,
    pub sequence_id: u32,
    pub spatial_key: u64,
    pub payload: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    pub domain_id: u8,
    pub events: Vec<Event>,
}
