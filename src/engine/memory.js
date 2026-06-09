// WO-1023 — Hysteresis Buffer
// Ring buffer depth=3, matching PERSISTENCE_REQUIRED from WO-1126A.
// Stores WebGL vertex offset deltas per frame. No dynamic allocation in frame loop.
// Read always precedes write within a frame tick.

const DEPTH           = 3;
const DESYNC_GAP      = 5;

export function createHysteresisBuffer(vertexCount) {
  const slots = Array.from({ length: DEPTH }, () => ({
    frameId:   -1,
    timestamp: 0,
    offsets:   new Float32Array(vertexCount * 3),
  }));

  return { slots, head: 0, count: 0, vertexCount };
}

export function writeFrame(buf, frameId, offsets) {
  const slot    = buf.slots[buf.head];
  slot.frameId  = frameId;
  slot.timestamp = performance.now();
  slot.offsets.set(offsets);

  buf.head  = (buf.head + 1) % DEPTH;
  if (buf.count < DEPTH) buf.count++;
}

// ageIndex: 0 = most recent committed, 1 = one prior, 2 = oldest
export function readFrame(buf, ageIndex = 0) {
  if (buf.count === 0) return null;
  const idx = ((buf.head - 1 - ageIndex) % DEPTH + DEPTH) % DEPTH;
  return buf.slots[idx];
}

export function flushBuffer(buf) {
  buf.head  = 0;
  buf.count = 0;
  for (const slot of buf.slots) {
    slot.frameId  = -1;
    slot.timestamp = 0;
    slot.offsets.fill(0);
  }
}

export function getDepth(buf) {
  return buf.count;
}

// Returns true if the gap between last written frameId and current frameId
// exceeds the desync threshold — caller must flush and rebuild.
export function isDesynced(buf, currentFrameId) {
  const last = readFrame(buf, 0);
  if (!last || last.frameId < 0) return false;
  return (currentFrameId - last.frameId) > DESYNC_GAP;
}
