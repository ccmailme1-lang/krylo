// pressurevessel.js — PRESSURE lens vessel model (KRYL-1084)
// Derived layer for the PRESSURE lens (Constraint Analysis). Computes GAUGE constraint pressure
// (% of ceiling) per domain via the ideal-gas-law analogue  P = (n · R · T) / V.
// MODEL, not literal thermodynamics. Doctrine: specs/pressure-vesselization-doctrine.md
//
// Additive: does NOT replace truthpressurefield.js (WO-2035, the confidence accumulator that feeds
// constraintimpactengine.js). This layer sits on top and can fold that field in as persistence.
//
// Terms — all re-derivable from the normalized 0–100 signal pool (§16):
//   n = signal mass     — Σ(magnitude/100) of the domain's signals   ("how much gas")
//   T = signal velocity — mean normalized rate-of-change / intensity  ("how hot")
//   V = structural slack — 1 − concentration (Herfindahl of shares)   ("room to move")
//   R = published scaling constant
//   P = (n · R · T) / V ;  gauge = min(100, P / CEILING × 100)  → % of ceiling (100 = fault imminent)
//
// §23 orthogonality: n is total scale; V is scale-invariant (share concentration); T is a distinct
// rate. Independent inputs — no latent-variable collapse.  §18: every term is re-derivable.

import { getPressure } from './truthpressurefield.js';

export const PV_R_CONSTANT = 1.0;  // scaling constant (published; calibration may adjust as a floor, WO-2062)
export const PV_V_FLOOR    = 0.10; // minimum slack — a vessel never has zero room (guards ÷0)
export const PV_CEILING    = 6.0;  // rated constraint limit; P == CEILING → 100% gauge

// Herfindahl concentration of signal magnitudes → structural slack V = 1 − H (clamped to floor).
// Diverse signal field → high slack (room to move). One dominant signal → low slack (locked in).
export function structuralSlack(magnitudes = []) {
  const total = magnitudes.reduce((a, m) => a + m, 0);
  if (total <= 0) return 1; // no signal → full slack
  const h = magnitudes.reduce((a, m) => { const p = m / total; return a + p * p; }, 0);
  return Math.max(PV_V_FLOOR, 1 - h);
}

// signals: [{ magnitude:0–100, velocity?:0–1, confidence?:0–1 }]
// Returns { n, T, V, P, gauge } — gauge = constraint pressure (% of ceiling), 0–100.
export function computeVesselPressure(signals = []) {
  if (!Array.isArray(signals) || signals.length === 0) return { n: 0, T: 0, V: 1, P: 0, gauge: 0 };

  const mags = signals.map(s => Math.max(0, Math.min(100, s.magnitude ?? 0)));
  const n = mags.reduce((a, m) => a + m / 100, 0);                                     // signal mass
  const T = signals.reduce((a, s) => a + (s.velocity ?? s.confidence ?? 0), 0) / signals.length; // heat
  const V = structuralSlack(mags);                                                     // slack
  const P = (n * PV_R_CONSTANT * T) / V;                                                // vessel pressure
  const gauge = Math.max(0, Math.min(100, (P / PV_CEILING) * 100));                     // % of ceiling
  return { n, T, V, P, gauge };
}

// Gauge pressure per domain from a { domain: signals[] } map.
// usePersistence folds truthpressurefield's decayed accumulator in as a mild recency weight on n
// (kept optional so the base reading stays purely re-derivable from the snapshot).
export function computePressureField(signalsByDomain = {}, { usePersistence = false } = {}) {
  const out = {};
  for (const [domain, signals] of Object.entries(signalsByDomain)) {
    const base = computeVesselPressure(signals);
    if (usePersistence) {
      const persist = Math.max(0, getPressure(domain)); // WO-2035 decayed field
      const n2 = base.n * (1 + Math.min(1, persist / 10)); // capped +100% recency weight
      const P2 = (n2 * PV_R_CONSTANT * base.T) / base.V;
      out[domain] = { ...base, n: n2, P: P2, gauge: Math.max(0, Math.min(100, (P2 / PV_CEILING) * 100)) };
    } else {
      out[domain] = base;
    }
  }
  return out;
}
