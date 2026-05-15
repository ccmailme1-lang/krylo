// WO-1082-B deterministic error taxonomy — ordering is bitwise consistent with
// WO-1082-A decoder semantics. DO NOT reorder variants without a protocol version change.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecodeError {
    InvalidLength,
    FrameSizeOutOfBounds,
    LengthMismatch,
    UnsupportedVersion,
    DomainMismatch,
    ExcessiveEventCount,
    TruncatedEventHeader,
    InvalidDomainId,
    TruncatedPayload,
    LengthInvariantViolation,
}

impl core::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::InvalidLength          => write!(f, "frame below minimum length"),
            Self::FrameSizeOutOfBounds   => write!(f, "frame exceeds maximum size"),
            Self::LengthMismatch         => write!(f, "declared frame_length != actual buffer length"),
            Self::UnsupportedVersion     => write!(f, "ABI version not supported"),
            Self::DomainMismatch         => write!(f, "domain separator mismatch"),
            Self::ExcessiveEventCount    => write!(f, "event count exceeds MAX_BATCH_SIZE"),
            Self::TruncatedEventHeader   => write!(f, "event header truncated"),
            Self::InvalidDomainId        => write!(f, "event domain_id is zero"),
            Self::TruncatedPayload       => write!(f, "payload extends beyond frame boundary"),
            Self::LengthInvariantViolation => write!(f, "cursor did not reach frame_length on exit"),
        }
    }
}
