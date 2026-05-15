// WO-1082-A frozen ABI constants — DO NOT MODIFY without a protocol version change

pub const ABI_VERSION: u8 = 0x01;
pub const DOMAIN_SEPARATOR: u8 = 0xAB;
pub const HEADER_SIZE: usize = 41;
pub const EVENT_HEADER_SIZE: usize = 20;
pub const MAX_BATCH_SIZE: usize = 1_000_000;
pub const MAX_FRAME_SIZE: usize = 50 * 1024 * 1024;
