// WO-1082-C canonical event model — mirrors codec/src/types.rs
// spatialKey is bigint — JS number cannot represent all u64 values

export interface Event {
    domainId:    number;   // u8
    typeId:      number;   // u8
    commitIndex: number;   // u32
    sequenceId:  number;   // u32
    spatialKey:  bigint;   // u64
    payload:     Uint8Array;
}

export interface Frame {
    domainId: number;      // u8
    events:   Event[];
}
