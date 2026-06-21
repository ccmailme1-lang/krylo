const LAMBDA   = 0.94;
const ALPHA    = 1 - LAMBDA;   // 0.06
const K        = 2.0;
const COOL_MS  = 30_000;

class EwmaState {
  constructor(firstValue, now) {
    this.mean      = firstValue;
    this.variance  = 0;
    this.sigma     = 0;          // cached σ from previous tick — enables Newton skip
    this.coolUntil = 0;
  }
}

const store = new Map();

/**
 * @param {string} id         — signal identifier
 * @param {number} value      — normalized 0–1 signal value
 * @param {number} [now]      — timestamp ms (default Date.now())
 * @returns {boolean}         — true = emit gate event, false = suppress
 */
export function processTick(id, value, now = Date.now()) {
  let s = store.get(id);
  if (!s) {
    store.set(id, new EwmaState(value, now));
    return false;
  }

  // Fast exit during cooldown — skips all maths
  if (now < s.coolUntil) return false;

  const dev  = value - s.mean;
  const dev2 = dev * dev;

  s.mean     = LAMBDA * s.mean     + ALPHA * value;
  s.variance = LAMBDA * s.variance + ALPHA * dev2;

  // When move is tiny: new variance ≈ LAMBDA * old variance, so cached sigma
  // is a good initial guess — one Newton step avoids Math.sqrt entirely.
  // When move is large: compute exactly.
  let sigma;
  if (dev2 < 1e-8 && s.sigma > 0) {
    sigma = 0.5 * (s.sigma + s.variance / s.sigma);
  } else {
    sigma = Math.sqrt(s.variance);
  }
  s.sigma = sigma;

  const breach = Math.abs(dev) > K * sigma;
  if (breach) s.coolUntil = now + COOL_MS;
  return breach;
}

export function resetSignal(id) {
  store.delete(id);
}

export function resetAll() {
  store.clear();
}
