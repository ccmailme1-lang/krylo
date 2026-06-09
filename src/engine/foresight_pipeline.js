// WO-1032 — Foresight Engine (Phase A Mock Pipeline)
// Verifies stage handover logic before live API activation.
// Schema-integrated: parse7PointSchema feeds Stage 01 entry.
//
// Pipeline:
//   Stage 01 — DeepSeek (mock): extract Signal Unit metadata, cross-ref 7-Point Schema
//   Stage 02 — o3 (mock):       trajectory math, ruin threshold crossing moment
//   Stage 03 — Opus 4.7 (mock): synthesizeMove() — Opportunity / Window / Move, lens-routed
//
// Live wiring (Phase B): swap mock stages for live calls in
//   deepseekingest.js · o3trajectory.js · opussynth.js
// after WO-1032 Phase B gate opens.

import { parse7PointSchema } from './pliengine.js';

// ── Stage gate — skip o3+Opus when deviation is noise ─────────────────────────
const DEVIATION_GATE = 0.20;

// ── Lens-routing templates for synthesizeMove() ───────────────────────────────
// Each lens frames Opportunity / Window / Move differently.
// "potential" qualifier is structural — present in every output.

const LENS_FRAMES = {
  INVESTOR: {
    opportunity: (ctx) =>
      `Potential asymmetric position before ${ctx.subject} consensus firms — first-mover alignment carries structural advantage over late entrants.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before coverage saturates and institutional repricing begins.`,
    move: (ctx) =>
      `Potential move: Position ahead of the inflection. The room hasn't priced this yet — ${ctx.fold === '90°' ? 'the fold is active; resolve now' : 'trend is building; monitor entry timing'}.`,
  },
  REALTOR: {
    opportunity: (ctx) =>
      `Potential market gap in ${ctx.subject}-adjacent inventory — demand signal is ahead of visible listing data.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before demand becomes visible in comps and competing inventory enters.`,
    move: (ctx) =>
      `Potential move: List or position inventory ahead of the demand surge. Early listings capture premium before competition prices in.`,
  },
  ATHLETE: {
    opportunity: (ctx) =>
      `Potential narrative leverage window for ${ctx.subject} — brand alignment before the story saturates carries authenticity premium.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before public narrative locks and sponsor budgets reallocate.`,
    move: (ctx) =>
      `Potential move: Negotiate or align now. Pre-saturation timing is the difference between leading the story and reacting to it.`,
  },
  SALES: {
    opportunity: (ctx) =>
      `Potential buyer window — ${ctx.subject} is creating decision pressure that hasn't reached procurement cycles yet.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} of elevated buyer uncertainty before policy or market direction firms.`,
    move: (ctx) =>
      `Potential move: Accelerate pipeline conversations. Budget windows are open — certainty is your competitive edge while the room is still unclear.`,
  },
  STUDENT: {
    opportunity: (ctx) =>
      `Potential credential or eligibility window tied to ${ctx.subject} — terms are fluid before formal definitions lock.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before bill text, hiring criteria, or program eligibility hardens.`,
    move: (ctx) =>
      `Potential move: Act before definitions close. Criteria are still in motion — early positioning locks terms that late movers cannot access.`,
  },
  CAREER: {
    opportunity: (ctx) =>
      `Potential hiring or transition window created by ${ctx.subject} — demand is spiking before the talent pool responds.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before the role surge becomes visible and the applicant pool expands.`,
    move: (ctx) =>
      `Potential move: Move now. Hiring velocity is high, competition is thin. The window closes when the headline becomes common knowledge.`,
  },
  LEGAL: {
    opportunity: (ctx) =>
      `Potential jurisdictional or procedural window in ${ctx.subject} — enforcement inconsistencies are actionable before federal consolidation.`,
    window: (ctx) =>
      `Potential window: ${ctx.window_label} before regulatory posture firms and the interpretive gap closes.`,
    move: (ctx) =>
      `Potential move: ${ctx.fold === '90°' ? 'File or initiate now — fragmentation window is actively open' : 'Position advisory practice around the ambiguity — high-value entry before text locks'}.`,
  },
};

// ── Window label from PLI window component ────────────────────────────────────

function labelWindow(winScore) {
  if (winScore >= 0.80) return '6–8 weeks';
  if (winScore >= 0.65) return '4–6 weeks';
  if (winScore >= 0.50) return '3–4 weeks';
  if (winScore >= 0.35) return '2–3 weeks';
  return '1–2 weeks';
}

// ── Stage 01 Mock — DeepSeek signal ingestion ─────────────────────────────────
// Extracts Signal Unit metadata from signal + schema.
// Returns structured signal_packet (mirrors live deepseekingest.js output shape).

function mockStage01(schema, signal, pliResult) {
  const deviation = Math.min(1, pliResult.components.gap * 0.7 + (1 - pliResult.components.coverage) * 0.3);
  const velocityTrend = pliResult.components.velocity > 0.4 ? 'rising' : pliResult.components.velocity > 0.2 ? 'flat' : 'falling';

  return {
    rate_of_change:       pliResult.components.velocity > 0.5 ? 'accelerating' : 'stable',
    deviation_score:      parseFloat(deviation.toFixed(3)),
    baseline_comparison:  signal.score > 75 ? 'above baseline' : signal.score > 50 ? 'at baseline' : 'below baseline',
    anomaly_flags:        pliResult.breaking_point ? ['inflection detected — PLI breaking point'] : [],
    velocity_24h:         signal.velocity ?? 0,
    velocity_trend:       velocityTrend,
    source_concentration: (signal.source_count ?? 1) < 5 ? 'concentrated' : 'distributed',
    signal_age_hours:     (signal.age_days ?? 3) * 24,
    signal_category:      signal.category ?? schema.domain,
    subject_label:        signal.id ? `${signal.id} — ${schema.goal.slice(0, 40)}` : schema.goal.slice(0, 48),
    pattern_summary:      `Signal ${velocityTrend} with ${Math.round(deviation * 100)}% deviation from baseline. Gap exposure: ${Math.round(pliResult.components.gap * 100)}%.`,
    // Schema cross-reference (WO-1034 integration)
    schema_ref: {
      domain:        schema.domain,
      subject:       schema.subject,
      decision_type: schema.decision_type,
      pli:           pliResult.pli,
    },
  };
}

// ── Stage 02 Mock — o3 trajectory math ───────────────────────────────────────
// Computes trajectory_vector from PLI components + ruin threshold.
// Returns math_object (mirrors live o3trajectory.js output shape).

function mockStage02(signalPacket, pliResult) {
  const { gap, velocity, window: win, coverage } = pliResult.components;
  const baseScore = 50 + Math.round(pliResult.pli * 50);

  // Project score trajectory over 72h assuming velocity decay of 8% per period
  const decayRate  = signalPacket.velocity_trend === 'rising' ? 1.05 : 0.92;
  const spreadBase = Math.max(3, Math.round((1 - pliResult.ar / 10) * 15));

  const trajectory = ['+6h', '+12h', '+24h', '+48h', '+72h'].map((t, i) => {
    const multiplier = Math.pow(decayRate, i + 1);
    const score = Math.min(100, Math.max(0, Math.round(baseScore * multiplier)));
    const spread = spreadBase * (i + 1);
    return {
      t,
      score,
      upper: Math.min(100, score + spread),
      lower: Math.max(0, score - spread),
    };
  });

  // Time to ruin threshold crossing (moment PLI drops below domain floor)
  const ruinDecayHours = pliResult.ruin_proximity
    ? 0
    : win > 0 ? Math.round((win / (1 - coverage + 0.01)) * 24) : null;

  // Inflection: breaking point + rising velocity = inflection detected
  const inflectionDetected = pliResult.breaking_point && signalPacket.velocity_trend === 'rising';

  return {
    trajectory,
    time_to_threshold: {
      threshold_score: 90,
      estimate_hours:  ruinDecayHours,
      confidence:      parseFloat((pliResult.ar / (pliResult.ar + 1)).toFixed(3)),
    },
    confidence_pct:      Math.round(Math.min(99, pliResult.ar * 20 + pliResult.pli * 40)),
    inflection_detected: inflectionDetected,
    inflection_detail:   inflectionDetected
      ? `Signal crossing inflection at ${Math.round(pliResult.pli * 100)} PLI with ${pliResult.fold} fold — breaking point confirmed.`
      : null,
    signal_category: signalPacket.signal_category,
    subject_label:   signalPacket.subject_label,
    // PLI + AXIS passthrough for Stage 03
    pli_result: pliResult,
  };
}

// ── Stage 03 — synthesizeMove() ───────────────────────────────────────────────
// Simulates Opus 4.7 lens-routing.
// Routes by pliResult.lens and frames Opportunity / Window / Move.
// "potential" qualifier enforced on every output field — non-negotiable.

export function synthesizeMove(mathObject) {
  const pli      = mathObject.pli_result;
  const lens     = pli.lens;
  const frames   = LENS_FRAMES[lens] ?? LENS_FRAMES.INVESTOR;
  const subject  = mathObject.subject_label.split(' — ')[0] ?? 'this signal';

  const ctx = {
    subject,
    window_label: labelWindow(pli.components.window),
    fold:         pli.fold,
    confidence:   pli.confidence,
    ar:           pli.ar,
  };

  const conviction =
    mathObject.confidence_pct >= 80 ? 'High conviction' :
    mathObject.confidence_pct >= 60 ? 'Moderate conviction' :
    'Low conviction — monitor closely';

  return {
    opportunity:     frames.opportunity(ctx),
    window:          frames.window(ctx),
    move:            frames.move(ctx),
    conviction,
    inflection_note: mathObject.inflection_detected ? mathObject.inflection_detail : null,
    lens_applied:    lens,
    legal_qualifier: 'potential',
    confidence_band: pli.confidence,
    risk_flag:       pli.ruin_proximity ? pli.ruin_label : null,
    ar:              pli.ar,
    pli:             pli.pli,
  };
}

// ── WO-1029.B — Temporal Coherence Multiplier ─────────────────────────────────
// V  = normalized Kendall inversion count over detected sequence
// Cs = 1.0 - 0.40 * V  (clamped [0.60, 1.00])
// ForesightScoreFinal = ForesightScoreBase * Cs

/**
 * @param {Array<{type:string, detectedAt:string}>} detectedPrecursors
 * @param {{precursors:Array<{type:string, step:number}>}} template
 * @returns {number} Cs in [0.60, 1.00]
 */
export function calculateTemporalCoherence(detectedPrecursors, template) {
  if (!detectedPrecursors || detectedPrecursors.length < 2) return 1.0;

  const sorted = [...detectedPrecursors].sort(
    (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
  );

  const n          = sorted.length;
  const totalPairs = (n * (n - 1)) / 2;
  if (totalPairs === 0) return 1.0;

  const stepMap = new Map(template.precursors.map(p => [p.type, p.step]));

  let violations = 0;
  for (let i = 0; i < n; i++) {
    const sI = stepMap.get(sorted[i].type) ?? 99;
    for (let j = i + 1; j < n; j++) {
      if (sI > (stepMap.get(sorted[j].type) ?? 99)) violations++;
    }
  }

  return Math.max(0.6, 1.0 - 0.4 * (violations / totalPairs));
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * runForesightPipeline
 *
 * Entry point. Hooks parse7PointSchema at Stage 01 input.
 *
 * @param {Object} schema  — 7-point universal schema (from pliengine.js)
 * @param {Object} signal  — ETR signal data
 * @returns {Object|null}  — full pipeline result, or null if deviation gate blocks
 */
export async function runForesightPipeline(schema, signal = {}) {
  // PLI computation (WO-1034 integration — feeds all three stages)
  const pliResult = parse7PointSchema(schema, signal);

  if (!pliResult.output_valid) {
    return {
      blocked: true,
      reason:  pliResult.integrity_flags.map(f => f.message).join(' · '),
      pli_result: pliResult,
    };
  }

  // Stage 01 — DeepSeek (mock)
  const signalPacket = mockStage01(schema, signal, pliResult);

  // Deviation gate — skip o3+Opus if signal is noise
  if (signalPacket.deviation_score < DEVIATION_GATE) {
    return {
      blocked: true,
      reason:  `DEVIATION_GATE: score ${signalPacket.deviation_score} below threshold ${DEVIATION_GATE}`,
      signal_packet: signalPacket,
      pli_result:    pliResult,
    };
  }

  // Stage 02 — o3 (mock)
  const mathObject = mockStage02(signalPacket, pliResult);

  // Stage 03 — Opus 4.7 (mock)
  const moveOutput = synthesizeMove(mathObject);

  return {
    blocked:       false,
    signal_packet: signalPacket,
    math_object:   mathObject,
    move:          moveOutput,
    pli_result:    pliResult,
    generated_at:  new Date().toISOString(),
  };
}
