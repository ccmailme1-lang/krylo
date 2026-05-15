// WO-1082-A frozen ABI constants — mirrors codec/src/constants.rs exactly
// DO NOT MODIFY without a protocol version change

export const ABI_VERSION: number       = 0x01;
export const DOMAIN_SEPARATOR: number  = 0xAB;
export const HEADER_SIZE: number       = 41;
export const EVENT_HEADER_SIZE: number = 20;
export const MAX_BATCH_SIZE: number    = 1_000_000;
export const MAX_FRAME_SIZE: number    = 50 * 1024 * 1024;
