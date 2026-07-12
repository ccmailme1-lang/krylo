// confirmationvelocity.js — KRYL-1018: first slice of the Perception / Decision Field doctrine.
//
// CONFIRMATION VELOCITY = how fast a hypothesis is being CONFIRMED as evidence accrues.
// It is the perception leverage signal: among competing branches of a canonical event, the one
// confirming FASTEST is the non-obvious structural read emerging "before it becomes consensus."
//
// §11a legality (the load-bearing guardrail): this measures confirmation of ALREADY-OBSERVED
// evidence over time — RETROSPECTIVE / present-tense. It is NOT a prediction residual or an
// expected-next-signal forecast. Same math as momentum, opposite time-arrow (see relationontology
// TIME_ARROW / assertNoForecast). Every output is stamped timeArrow: 'RETROSPECTIVE'.
//
// §19 attribution (coincidence trap): a velocity from too few observations is coincidence, not
// confirmation. Below MIN_CONFIRM_N we WITHHOLD (never assert a leverage claim without N).
//
// §23 orthogonality: velocity ⊥ strength ⊥ convergence.
//   strength  = cumulative support LEVEL (how confirmed)          — a level
//   velocity  = d(support)/dt                                     — a rate (this module)
//   convergence = agreement ACROSS sources at a point            — a spread
// These are independent axes; this module produces ONLY the rate. Never fold level/spread in.

export const MIN_CONFIRM_N = 3;      // §19 attribution floor — below this, withhold
const N_SATURATE           = 12;     // proxy-quality (confidence) saturates ~N=12
const DEFAULT_WINDOW_MS     = 30 * 24 * 3600 * 1000; // 30d trailing window
const DAY_MS               = 24 * 3600 * 1000;

export const CV_AXES = Object.freeze({
  THIS_MODULE: 'velocity (rate)',
  DISTINCT_FROM: Object.freeze(['strength (level)', 'convergence (cross-source spread)']),
});

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

// Confirmation velocity for ONE hypothesis from its confirming-evidence timeline.
//   timeline: [{ t, weight }]  — OBSERVED confirming observations (t = epoch ms, weight = evidence
//             support, e.g. tier-weighted). Grounded input only; nothing assigned here.
//   returns { withheld, reason?, n, velocity, acceleration, confidence, window, timeArrow }
//     velocity     — support confirmed per DAY over the trailing window (retrospective rate)
//     acceleration — recent-window rate minus prior-window rate (detect-only; +ve = confirming faster)
export function confirmationVelocity(timeline, { nowTs = Date.now(), windowMs = DEFAULT_WINDOW_MS } = {}) {
  const obs = (timeline ?? [])
    .filter(o => o && typeof o.t === 'number' && (o.weight ?? 0) > 0)
    .sort((a, b) => a.t - b.t);
  const n = obs.length;

  // §19 — coincidence guard. Not enough observations to attribute a rate.
  if (n < MIN_CONFIRM_N) {
    return { withheld: true, reason: 'INSUFFICIENT_N', n, velocity: null, acceleration: null,
             confidence: 0, window: windowMs, timeArrow: 'RETROSPECTIVE' };
  }

  const windowDays = windowMs / DAY_MS;
  const sumIn = (lo, hi) => obs.reduce((s, o) => (o.t > lo && o.t <= hi ? s + o.weight : s), 0);

  const recent = sumIn(nowTs - windowMs, nowTs);
  const prior  = sumIn(nowTs - 2 * windowMs, nowTs - windowMs);
  const velocity     = recent / windowDays;                 // support / day, trailing window
  const acceleration = (recent - prior) / windowDays;       // Δrate across adjacent windows

  return {
    withheld: false,
    n,
    velocity:     parseFloat(velocity.toFixed(4)),
    acceleration: parseFloat(acceleration.toFixed(4)),
    confidence:   clamp01(n / N_SATURATE),                  // proxy quality — carried, never hidden
    window:       windowMs,
    timeArrow:    'RETROSPECTIVE',                          // §11a — confirmation, not forecast
  };
}

// Rank competing branches of ONE canonical event by confirmation velocity.
//   branches: [{ id, label, timeline }]
//   returns { ranked: [{ id, label, velocity, acceleration, n, confidence }],  // survivors, fastest first
//             withheld: [{ id, label, reason, n }] }                            // below MIN_CONFIRM_N
// Ranking surfaces the fastest-confirming (earliest / least-obvious) branch — the leverage read.
// Withheld branches are NOT ranked-as-zero (§22 absence ≠ null): they are reported separately.
export function rankBranches(branches, opts = {}) {
  const ranked = [], withheld = [];
  for (const b of branches ?? []) {
    const cv = confirmationVelocity(b.timeline, opts);
    if (cv.withheld) { withheld.push({ id: b.id, label: b.label, reason: cv.reason, n: cv.n }); continue; }
    ranked.push({ id: b.id, label: b.label, velocity: cv.velocity, acceleration: cv.acceleration, n: cv.n, confidence: cv.confidence });
  }
  ranked.sort((a, b) => b.velocity - a.velocity);
  return { ranked, withheld };
}
