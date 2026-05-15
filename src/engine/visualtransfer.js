// SPEC-VIS-001 v1.1 — Visual Transfer Function Layer
// Deterministic mapping: structured system state → perceptual rendering manifold
// No aesthetic freedom outside defined transfer functions.

export const VERSION = 'VIS-001-v1.1';

// ── Tunable constants (require Founder calibration) ──────────────────────────
const ALPHA_LRF    = 0.3;   // tanh steepness for Leverage normalization
const LAMBDA_DECAY = 0.01;  // exponential decay rate for Event Ingestion (per ms)

// ── Domain locks (5.2) ───────────────────────────────────────────────────────
export const DOMAIN_LOCKS = {
  lrf:                 { min: -10,  max: 10,  saturation: 'clamp' },
  capital:             { min: 1,    max: 1e12, saturation: 'compress' },
  volatility:          { min: 0,    max: 1,   saturation: 'clamp' },
  causalStrength:      { min: 0,    max: 1,   saturation: 'clamp' },
  propagationVelocity: { min: 0,    max: 1,   saturation: 'clamp' },
  eventIngestion:      { min: 0,    max: Infinity, saturation: 'clamp' },
  clusterCohesion:     { min: -0.5, max: 1,   saturation: 'clamp' },
};

// ── Perceptual budget (5.3) ──────────────────────────────────────────────────
export const PERCEPTUAL_BUDGET = {
  position: 0.40,
  motion:   0.25,
  size:     0.15,
  color:    0.15,
  glow:     0.05,
};

// ── Salience priority order (5.4 / 5.8) ─────────────────────────────────────
export const PRIORITY_ORDER = [
  'lrf',
  'causalStrength',
  'volatility',
];

// ── Saturation helpers ───────────────────────────────────────────────────────
function applyClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyCompress(value, min, max) {
  // log compression into [0, 1]
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  const logVal = Math.log10(Math.max(value, 1));
  return applyClamp((logVal - logMin) / (logMax - logMin), 0, 1);
}

function saturate(value, lock) {
  if (lock.saturation === 'clamp')    return applyClamp(value, lock.min, lock.max);
  if (lock.saturation === 'compress') return applyCompress(value, lock.min, lock.max);
  if (lock.saturation === 'reject')   return (value < lock.min || value > lock.max) ? null : value;
  return value;
}

// ── Normalization functions (Section 2) ─────────────────────────────────────

// Leverage (LRF) → Z-axis  [tanh(αx), output ∈ (-1, 1)]
function normalizeLRF(x) {
  const clamped = applyClamp(x, DOMAIN_LOCKS.lrf.min, DOMAIN_LOCKS.lrf.max);
  return Math.tanh(ALPHA_LRF * clamped);
}

// Capital / Mass → Node size  [log10, output ∈ [0, 1]]
function normalizeCapital(x) {
  return applyCompress(x, DOMAIN_LOCKS.capital.min, DOMAIN_LOCKS.capital.max);
}

// Volatility → Jitter frequency  [linear [0,1], strict clamp]
function normalizeVolatility(x) {
  return applyClamp(x, 0, 1);
}

// Causal Strength → Edge thickness  [normalized weight]
function normalizeCausalStrength(x) {
  return applyClamp(x, 0, 1);
}

// Propagation Velocity → Edge flow  [linear mapping]
function normalizePropagationVelocity(x) {
  return applyClamp(x, 0, 1);
}

// Event Ingestion → Glow intensity  [exponential decay by age in ms]
function normalizeEventIngestion(ageMs) {
  const clamped = Math.max(ageMs, 0);
  return Math.exp(-LAMBDA_DECAY * clamped);
}

// Cluster Cohesion → X/Y proximity  [modularity Q, ∈ [-0.5, 1] → [0, 1]]
function normalizeClusterCohesion(Q) {
  const clamped = applyClamp(Q, DOMAIN_LOCKS.clusterCohesion.min, DOMAIN_LOCKS.clusterCohesion.max);
  return (clamped - DOMAIN_LOCKS.clusterCohesion.min) /
         (DOMAIN_LOCKS.clusterCohesion.max - DOMAIN_LOCKS.clusterCohesion.min);
}

// ── Single-metric transfer function ─────────────────────────────────────────
export function applyTransferFunction(metric, value) {
  const lock = DOMAIN_LOCKS[metric];
  if (!lock) return null;

  const saturated = saturate(value, lock);
  if (saturated === null) return null;

  switch (metric) {
    case 'lrf':                 return normalizeLRF(saturated);
    case 'capital':             return normalizeCapital(saturated);
    case 'volatility':          return normalizeVolatility(saturated);
    case 'causalStrength':      return normalizeCausalStrength(saturated);
    case 'propagationVelocity': return normalizePropagationVelocity(saturated);
    case 'eventIngestion':      return normalizeEventIngestion(saturated);
    case 'clusterCohesion':     return normalizeClusterCohesion(saturated);
    default:                    return null;
  }
}

// ── Full visual frame computation ────────────────────────────────────────────
// signalData shape:
// {
//   lrf, capital, volatility, causalStrength,
//   propagationVelocity, eventIngestionAgeMs, clusterCohesion
// }
export function computeVisualFrame(signalData) {
  return {
    z:             applyTransferFunction('lrf',                 signalData.lrf                  ?? 0),
    nodeSize:      applyTransferFunction('capital',             signalData.capital              ?? 1),
    jitterFreq:    applyTransferFunction('volatility',          signalData.volatility            ?? 0),
    edgeThickness: applyTransferFunction('causalStrength',      signalData.causalStrength        ?? 0),
    edgeFlow:      applyTransferFunction('propagationVelocity', signalData.propagationVelocity   ?? 0),
    glowIntensity: applyTransferFunction('eventIngestion',      signalData.eventIngestionAgeMs   ?? 0),
    proximity:     applyTransferFunction('clusterCohesion',     signalData.clusterCohesion       ?? 0),
  };
}

// ── Perceptual budget validator (5.3) ────────────────────────────────────────
// Maps visual frame outputs to perceptual channels and checks 100% load rule.
// Returns array of warning strings. Empty array = clean.
export function validatePerceptualBudget(visualFrame) {
  const warnings = [];

  const channelLoad = {
    position: Math.abs(visualFrame.z        ?? 0) * PERCEPTUAL_BUDGET.position,
    motion:   (visualFrame.jitterFreq       ?? 0) * PERCEPTUAL_BUDGET.motion,
    size:     (visualFrame.nodeSize         ?? 0) * PERCEPTUAL_BUDGET.size,
    glow:     (visualFrame.glowIntensity    ?? 0) * PERCEPTUAL_BUDGET.glow,
  };

  const totalLoad = Object.values(channelLoad).reduce((a, b) => a + b, 0);

  if (totalLoad > 1.0) {
    warnings.push(`[VIS-001] Perceptual budget exceeded: ${(totalLoad * 100).toFixed(1)}% (max 100%)`);
  }

  // Single-metric dominance check (5.4): no metric > 60% of its channel
  Object.entries(channelLoad).forEach(([channel, load]) => {
    const budget = PERCEPTUAL_BUDGET[channel] ?? 1;
    if (budget > 0 && load / budget > 0.6) {
      warnings.push(`[VIS-001] ${channel} channel dominance exceeded: ${(load / budget * 100).toFixed(1)}% (max 60%)`);
    }
  });

  return warnings;
}
