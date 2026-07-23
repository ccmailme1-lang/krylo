// src/engine/convergencefeed.js
// Convergence lens data producer — emits the "Shade between lines" feed: step, perceived, observed.
// The shaded gap between the two lines IS the reading: narrow = CONVERGENCE (aligned), widening =
// DIVERGENCE (separating). §20 direction-honesty, "leverage = divergence between perceived fields."
//
// perceived: by default the TRAILING moving average of observed (the expected trend from observed
//   history — moving-average dispersion, exactly the reference model's method). This is
//   DETECT-NOT-PREDICT: past observations only, never a forecast. A caller with a genuinely distinct
//   perceived field can pass it explicitly to override.
// observed:  the raw signal series (the field being watched).
//
// GUARDRAILS: no hardcoded thresholds (dispersion is emitted, classified downstream); no fabricated
//   points — a missing observation stays null, never zero-filled (§22); no Math.random anywhere.

export const DEFAULT_MA_WINDOW = 5;

/**
 * computeConvergenceBands — per-step {step, observed, perceived, dispersion}.
 * @param {number[]} observed — raw signal series (nulls/non-finite are honored as absence)
 * @param {{window?:number, perceived?:number[]}} opts
 *   window    — trailing moving-average window for the derived perceived line
 *   perceived — optional explicit perceived series (two-distinct-fields mode); overrides the MA
 * @returns {{step:number, observed:number|null, perceived:number|null, dispersion:number|null}[]}
 */
export function computeConvergenceBands(observed = [], { window = DEFAULT_MA_WINDOW, perceived = null } = {}) {
  const obs = Array.isArray(observed) ? observed : [];
  const explicit = Array.isArray(perceived) ? perceived : null;
  const round = n => parseFloat(Number(n).toFixed(2));
  const out = [];

  for (let i = 0; i < obs.length; i++) {
    const oRaw = obs[i];
    if (oRaw == null || !Number.isFinite(Number(oRaw))) {
      out.push({ step: i, observed: null, perceived: null, dispersion: null }); // §22 — absence, not 0
      continue;
    }
    const observedVal = Number(oRaw);

    let perceivedVal;
    if (explicit) {
      const p = explicit[i];
      perceivedVal = (p == null || !Number.isFinite(Number(p))) ? null : Number(p);
    } else {
      // trailing MA over the last `window` finite observations, inclusive of step i
      const slice = obs.slice(Math.max(0, i - window + 1), i + 1).map(Number).filter(Number.isFinite);
      perceivedVal = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
    }

    out.push({
      step:       i,
      observed:   round(observedVal),
      perceived:  perceivedVal == null ? null : round(perceivedVal),
      dispersion: perceivedVal == null ? null : round(Math.abs(observedVal - perceivedVal)),
    });
  }
  return out;
}

/**
 * toFlourishCSV — the exact feed "Shade between lines" consumes: header + one row per step.
 * Absent steps emit empty cells (Flourish renders a gap), never a fabricated 0.
 */
export function toFlourishCSV(bands = []) {
  const header = 'step,perceived,observed';
  const rows = bands.map(b => `${b.step},${b.perceived ?? ''},${b.observed ?? ''}`);
  return [header, ...rows].join('\n');
}
