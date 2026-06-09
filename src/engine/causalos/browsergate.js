// WO-1383 — Browser Enforcement Gate
// Wires L2/L3/L4 enforcement into browser event bus.
// Writes violations to 'krylo_bau_telemetry' localStorage key.
// Initialized once on mount via app.jsx useEffect.

const BAU_KEY = 'krylo_bau_telemetry';

const BAY_CONE_MAP = {
  B01: 'cone_financial',
  B02: 'cone_operating',
  B03: 'cone_time',
  B04: 'cone_personal',
  B05: 'cone_market',
  B06: 'cone_knowledge',
};

// Valid deterministic hash: 64-char hex
const VALID_HASH = /^[0-9a-f]{64}$/i;

function readLog() {
  try { return JSON.parse(localStorage.getItem(BAU_KEY) || '[]'); } catch { return []; }
}

function appendViolation(entry) {
  const log = readLog();
  log.push({ ...entry, ts: Date.now() });
  try { localStorage.setItem(BAU_KEY, JSON.stringify(log)); } catch { /* silent */ }
}

// Gate A — cross-bay reference (Level 2 Containment)
function handleIngress(event) {
  const data = event.data;
  if (!data || data.type !== 'KRYLO_INGRESS_PAYLOAD') return;
  const { bayId, targetCone } = data;
  const expectedCone = BAY_CONE_MAP[bayId];
  if (targetCone && targetCone !== expectedCone) {
    appendViolation({
      level: 'CONTAINMENT',
      gate: 'A',
      reason: `Cross-bay ref: ${bayId} → ${targetCone} (expected ${expectedCone})`,
      bayId,
      targetCone,
    });
  }
}

// Gate B — non-deterministic kernel input (Level 3 Hard Block)
function handleKernelExec(event) {
  const { cone_id, input_hash } = event.detail || {};
  if (!input_hash || !VALID_HASH.test(input_hash)) {
    appendViolation({
      level: 'HARD_BLOCK',
      gate: 'B',
      reason: `Non-deterministic kernel input: hash '${input_hash}' failed`,
      cone_id,
      input_hash,
    });
  }
}

// Gate C — inference write attempt (Level 4 System Halt)
function handleInferenceCycle(event) {
  const { action } = event.detail || {};
  if (action === 'FORCE_WRITE') {
    window.__KRYLO_SYSTEM_HALTED__ = true;
    appendViolation({
      level: 'SYSTEM_HALT',
      gate: 'C',
      reason: 'Inference OS attempted L1 substrate write (FORCE_WRITE)',
      action,
    });
  }
}

export function initBrowserGate() {
  window.addEventListener('message',              handleIngress);
  window.addEventListener('krylo_kernel_exec',    handleKernelExec);
  window.addEventListener('krylo_inference_cycle', handleInferenceCycle);

  return () => {
    window.removeEventListener('message',               handleIngress);
    window.removeEventListener('krylo_kernel_exec',     handleKernelExec);
    window.removeEventListener('krylo_inference_cycle', handleInferenceCycle);
  };
}
