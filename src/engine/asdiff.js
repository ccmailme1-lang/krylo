// WO-1038 — AS-DIFF (Pairwise Leverage Comparator)
// Counterfactual comparison of two Signal Units.
// LM = PLI_A − PLI_B adjusted by constraint/amplifier intersection.
// Dominant Axis method: TRAJECTORY · TIME · MAGNITUDE
//
// SignalUnit shape (from WO-1032/1034 pipeline):
//   { schema, signal, pli, math? }
//   schema   — 7-point universal schema  (WO-1034)
//   signal   — ETR signal data
//   pli      — parse7PointSchema() result (WO-1034)
//   math     — Stage 02 trajectory object (WO-1032, optional)

// ── Shared projection spaces — domain pair → canonical decision space ──────────

// Defines where two domain-different signals are projected for comparison.
const SPACE_RESOLVER = {
  finance_real_estate:  'cash_flow',
  real_estate_finance:  'cash_flow',
  finance_career:       'capital_allocation',
  career_finance:       'capital_allocation',
  sports_career:        'competitive_positioning',
  career_sports:        'competitive_positioning',
  sports_finance:       'market_valuation',
  finance_sports:       'market_valuation',
  legal_finance:        'risk_adjusted_exposure',
  finance_legal:        'risk_adjusted_exposure',
  legal_career:         'path_dependency',
  career_legal:         'path_dependency',
  health_career:        'timeline_pressure',
  career_health:        'timeline_pressure',
  health_legal:         'reversibility',
  legal_health:         'reversibility',
  real_estate_career:   'long_term_compounding',
  career_real_estate:   'long_term_compounding',
  sports_legal:         'competitive_positioning',
  legal_sports:         'competitive_positioning',
};

// Quality of fit for each domain in a given shared space (1.0 = native, 0.0 = incompatible)
const SPACE_QUALITY = {
  cash_flow:             { finance: 1.00, real_estate: 0.85, career: 0.60, sports: 0.45, legal: 0.70, health: 0.40, general: 0.55 },
  capital_allocation:    { finance: 0.90, real_estate: 0.70, career: 0.85, sports: 0.50, legal: 0.60, health: 0.45, general: 0.55 },
  competitive_positioning:{ sports: 1.00, career: 0.80, finance: 0.65, real_estate: 0.55, legal: 0.60, health: 0.50, general: 0.55 },
  market_valuation:      { sports: 0.85, finance: 0.95, real_estate: 0.75, career: 0.55, legal: 0.60, health: 0.40, general: 0.55 },
  risk_adjusted_exposure:{ legal: 1.00, finance: 0.90, real_estate: 0.70, career: 0.65, sports: 0.55, health: 0.60, general: 0.55 },
  path_dependency:       { legal: 0.85, career: 0.90, finance: 0.65, real_estate: 0.70, sports: 0.60, health: 0.70, general: 0.55 },
  timeline_pressure:     { health: 0.90, career: 0.85, legal: 0.70, finance: 0.60, sports: 0.80, real_estate: 0.55, general: 0.55 },
  reversibility:         { health: 0.80, legal: 0.85, real_estate: 0.90, finance: 0.75, career: 0.80, sports: 0.60, general: 0.55 },
  long_term_compounding: { real_estate: 0.90, career: 0.85, finance: 0.80, legal: 0.65, health: 0.60, sports: 0.55, general: 0.55 },
  direct:                { finance: 1.00, legal: 1.00, real_estate: 1.00, sports: 1.00, career: 1.00, health: 1.00, general: 1.00 },
};

// Divergence threshold above which the incomparability flag fires
const INCOMPARABILITY_THRESHOLD = 0.88;

// ── Space resolver ─────────────────────────────────────────────────────────────

function resolveSharedSpace(domainA, domainB) {
  if (domainA === domainB) return 'direct';
  const key = `${domainA}_${domainB}`;
  return SPACE_RESOLVER[key] ?? 'direct';
}

// ── As-If projection ──────────────────────────────────────────────────────────
// Projects raw PLI into the shared space using domain quality of fit.
// projected_pli = raw_pli × quality_A × quality_B (bilateral fit penalty)

function projectPLI(pliResult, domain, space) {
  const q = (SPACE_QUALITY[space] ?? SPACE_QUALITY.direct)[domain] ?? 0.55;
  return {
    projected: Math.min(1, pliResult.pli * q),
    quality:   q,
    // Per-component projections for axis math
    velocity:  pliResult.components.velocity * q,
    window:    pliResult.components.window * q,
    magnitude: pliResult.pli * q,
  };
}

// ── Dominant Axis ─────────────────────────────────────────────────────────────
// Identifies the single axis where the gap is widest.
// TRAJECTORY — velocity gap (who is accelerating faster)
// TIME       — window gap  (who has more runway before saturation)
// MAGNITUDE  — PLI gap     (who has larger raw opportunity)

function computeDominantAxis(projA, projB) {
  const axes = {
    TRAJECTORY: { a: projA.velocity,  b: projB.velocity,  gap: Math.abs(projA.velocity  - projB.velocity)  },
    TIME:       { a: projA.window,    b: projB.window,    gap: Math.abs(projA.window    - projB.window)    },
    MAGNITUDE:  { a: projA.magnitude, b: projB.magnitude, gap: Math.abs(projA.magnitude - projB.magnitude) },
  };

  const dominant = Object.entries(axes).reduce((best, [name, data]) =>
    data.gap > best.gap ? { name, ...data } : best,
    { name: 'MAGNITUDE', gap: -Infinity, a: 0, b: 0 }
  );

  // Axis winner: whichever unit scores higher on the dominant dimension
  const axisWinner = dominant.a >= dominant.b ? 'A' : 'B';

  return { dominant_axis: dominant.name, dominant_gap: dominant.gap, axis_winner: axisWinner, axes };
}

// ── Constraint intersection — Asymmetric Capture detection ───────────────────
// Fires when Unit A's bottleneck (highest-severity constraint) aligns with
// Unit B's amplifier (lit dependency B benefits from).
// Asymmetric Capture = A's weakness IS B's competitive strength.

function computeConstraintIntersection(unitA, unitB) {
  const schemaA = unitA.schema;
  const schemaB = unitB.schema;

  // A's bottleneck: highest severity constraint
  const aBottleneck = (schemaA.constraints ?? [])
    .sort((x, y) => (y.severity ?? 0) - (x.severity ?? 0))[0];

  // B's amplifier: lit dependency with highest coverage (B's strongest position)
  const bAmplifier = (schemaB.dependencies ?? [])
    .filter(d => d.status === 'lit')
    .sort((x, y) => (y.coverage ?? 0) - (x.coverage ?? 0))[0];

  if (!aBottleneck || !bAmplifier) {
    return { asymmetric_capture: false, detail: null };
  }

  // Asymmetric Capture fires when A is heavily constrained (severity > 0.6)
  // and B has a strong lit amplifier (coverage > 0.6) — structural gap
  const capture = aBottleneck.severity > 0.60 && (bAmplifier.coverage ?? 0) > 0.60;

  return {
    asymmetric_capture: capture,
    detail: capture
      ? `A's bottleneck [${aBottleneck.label}] is B's amplifier [${bAmplifier.id} · ${Math.round((bAmplifier.coverage ?? 0) * 100)}% coverage]. B holds structural advantage on this axis.`
      : null,
    a_bottleneck: aBottleneck,
    b_amplifier:  bAmplifier,
  };
}

// ── Leverage Margin ────────────────────────────────────────────────────────────
// LM = projected_pli_A − projected_pli_B
// Adjusted downward when Asymmetric Capture fires (B's structural edge narrows A's margin).
// Adjusted downward when space quality divergence is high (incomparable domains).

function computeLeverageMargin(projA, projB, capture, divergence) {
  const raw = projA.projected - projB.projected;

  const captureAdj    = capture ? 0.12 : 0;          // B's structural edge cuts A's apparent margin
  const divergenceAdj = divergence * 0.10;            // incomparable domains add noise discount

  const sign    = raw >= 0 ? 1 : -1;
  const adjusted = sign * Math.max(0, Math.abs(raw) - captureAdj - divergenceAdj);

  return { raw, adjusted };
}

// ── Incomparability check ─────────────────────────────────────────────────────

function checkIncomparability(qualityA, qualityB, sharedSpace) {
  if (sharedSpace === 'direct') return { incomparable: false, divergence: 0 };
  const divergence = 1 - (qualityA * qualityB);
  return {
    incomparable: divergence > INCOMPARABILITY_THRESHOLD,
    divergence,
    note: divergence > INCOMPARABILITY_THRESHOLD
      ? `INCOMPARABILITY FLAG: ${Math.round(divergence * 100)}% domain divergence — structural gap is itself the leverage signal`
      : null,
  };
}

// ── Main comparator ────────────────────────────────────────────────────────────

/**
 * buildSignalUnit — helper to construct a SignalUnit from pipeline output
 */
export function buildSignalUnit(schema, signal, pliResult, mathObject = null) {
  return { schema, signal, pli: pliResult, math: mathObject };
}

/**
 * compareSignals
 *
 * Pairwise leverage comparison of two fully-formed Signal Units.
 *
 * @param {Object} unitA  — SignalUnit { schema, signal, pli, math? }
 * @param {Object} unitB  — SignalUnit { schema, signal, pli, math? }
 * @returns {Object}      — asDiffResult
 */
export function compareSignals(unitA, unitB) {
  const domainA = unitA.schema.domain ?? 'general';
  const domainB = unitB.schema.domain ?? 'general';

  // Shared projection space
  const sharedSpace = resolveSharedSpace(domainA, domainB);

  // As-If projection
  const projA = projectPLI(unitA.pli, domainA, sharedSpace);
  const projB = projectPLI(unitB.pli, domainB, sharedSpace);

  // Incomparability
  const incomp = checkIncomparability(projA.quality, projB.quality, sharedSpace);

  // Constraint intersection → Asymmetric Capture
  const intersection = computeConstraintIntersection(unitA, unitB);

  // Leverage Margin
  const lm = computeLeverageMargin(projA, projB, intersection.asymmetric_capture, incomp.divergence);

  // Dominant Axis
  const axisResult = computeDominantAxis(projA, projB);

  // Winner declaration
  const PARITY_BAND = 0.03; // within 3 points = parity
  let winner;
  if (Math.abs(lm.adjusted) <= PARITY_BAND) {
    winner = 'PARITY';
  } else {
    winner = lm.adjusted > 0 ? 'A' : 'B';
  }

  return {
    winner,
    leverage_margin:        parseFloat(lm.adjusted.toFixed(4)),
    leverage_margin_raw:    parseFloat(lm.raw.toFixed(4)),
    dominant_axis:          axisResult.dominant_axis,
    dominant_axis_gap:      parseFloat(axisResult.dominant_gap.toFixed(4)),
    dominant_axis_winner:   axisResult.axis_winner,
    axes:                   axisResult.axes,
    shared_space:           sharedSpace,
    asymmetric_capture:     intersection.asymmetric_capture,
    asymmetric_capture_detail: intersection.detail,
    incomparability_flag:   incomp.incomparable,
    incomparability_note:   incomp.note ?? null,
    divergence:             parseFloat((incomp.divergence ?? 0).toFixed(4)),
    unit_a: {
      pli:       parseFloat(projA.projected.toFixed(4)),
      pli_raw:   parseFloat(unitA.pli.pli.toFixed(4)),
      velocity:  parseFloat(projA.velocity.toFixed(4)),
      window:    parseFloat(projA.window.toFixed(4)),
      confidence: unitA.pli.confidence,
      fold:      unitA.pli.fold,
      lens:      unitA.pli.lens,
    },
    unit_b: {
      pli:       parseFloat(projB.projected.toFixed(4)),
      pli_raw:   parseFloat(unitB.pli.pli.toFixed(4)),
      velocity:  parseFloat(projB.velocity.toFixed(4)),
      window:    parseFloat(projB.window.toFixed(4)),
      confidence: unitB.pli.confidence,
      fold:      unitB.pli.fold,
      lens:      unitB.pli.lens,
    },
    legal_qualifier: 'potential',
    generated_at:    new Date().toISOString(),
  };
}
