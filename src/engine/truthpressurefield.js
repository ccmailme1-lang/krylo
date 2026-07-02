// WO-2035 — Truth Pressure Field
// Tracks cumulative directional pressure per domain from ranked-signal confidence.
// Reuses FRACTURE_POLARITY_THRESHOLD from domaingravity.js rather than redefining it.
import { FRACTURE_POLARITY_THRESHOLD } from './domaingravity.js';

const HIGH_CONFIDENCE_THRESHOLD = 0.70;
const PRESSURE_UP   = 1.5;
const PRESSURE_DOWN = 1.0;
const DECAY_PER_HOUR = 0.15; // linear

const pressureByDomain = {};
const lastUpdateMs = {};

export function updatePressure(domain, signal, now = Date.now()) {
  if (lastUpdateMs[domain] != null) {
    const hoursElapsed = (now - lastUpdateMs[domain]) / (1000 * 60 * 60);
    pressureByDomain[domain] = (pressureByDomain[domain] ?? 0) * (1 - Math.min(1, DECAY_PER_HOUR * hoursElapsed));
  }
  lastUpdateMs[domain] = now;

  const confidence = signal?.confidence ?? 0;
  let delta = 0;
  if (confidence > HIGH_CONFIDENCE_THRESHOLD) delta = PRESSURE_UP;
  else if (confidence < FRACTURE_POLARITY_THRESHOLD) delta = -PRESSURE_DOWN;

  pressureByDomain[domain] = (pressureByDomain[domain] ?? 0) + delta;
  return pressureByDomain[domain];
}

export function getPressure(domain) {
  return pressureByDomain[domain] ?? 0;
}

export function resetPressureField() {
  for (const k of Object.keys(pressureByDomain)) delete pressureByDomain[k];
  for (const k of Object.keys(lastUpdateMs)) delete lastUpdateMs[k];
}
