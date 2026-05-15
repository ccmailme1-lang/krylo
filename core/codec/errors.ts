// WO-1082-C error taxonomy — variant order is bitwise consistent with
// codec/src/errors.rs. DO NOT reorder without a protocol version change.

export const DecodeError = {
    InvalidLength:            'InvalidLength',
    FrameSizeOutOfBounds:     'FrameSizeOutOfBounds',
    LengthMismatch:           'LengthMismatch',
    UnsupportedVersion:       'UnsupportedVersion',
    DomainMismatch:           'DomainMismatch',
    ExcessiveEventCount:      'ExcessiveEventCount',
    TruncatedEventHeader:     'TruncatedEventHeader',
    InvalidDomainId:          'InvalidDomainId',
    TruncatedPayload:         'TruncatedPayload',
    LengthInvariantViolation: 'LengthInvariantViolation',
} as const;

export type DecodeErrorKind = typeof DecodeError[keyof typeof DecodeError];

export class CodecError extends Error {
    constructor(public readonly kind: DecodeErrorKind) {
        super(kind);
        this.name = 'CodecError';
    }
}
