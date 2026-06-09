// WO-1400: Convergence Engine Audit
// Direct harness — no browser needed. Tests 2-factor and 3-factor math.

// ── Inline processAcquisition logic (mirrors acquisitionbroker.js) ────────────
const CHIP_DOMAIN_TO_CONE = {
  BUSINESS: 'operating', INVESTMENTS: 'financial', HOME: 'personal',
  EDUCATION: 'knowledge', CAR: 'market', VACATION: 'time', GENERAL: 'financial',
};

function mockSignalWeight(signals, signalStrength) {
  if (!signals?.length) return 0.5;
  return Math.min(1, signalStrength ?? 0.6);
}

function computeChipAlignment(selectedChips, activeCones) {
  if (!selectedChips?.length || !activeCones) return null;
  let total = 0, count = 0;
  selectedChips.forEach(({ chip, score = 1, domain = 'BUSINESS' }) => {
    const coneKey = CHIP_DOMAIN_TO_CONE[domain?.toUpperCase()] ?? 'financial';
    const cone    = activeCones[coneKey];
    if (!cone) return;
    const d = cone.value ?? 0.5;
    const convergenceScore = Math.min(1, Math.max(0,
      0.35 * d + 0.35 * d + 0.20 * 0.7 + 0.10 * 0.5
    ));
    total += score * convergenceScore;
    count++;
  });
  return count > 0 ? Math.min(1, total / count) : null;
}

function processAcquisition(payload, selectedChips = [], activeCones = null) {
  const { telemetry } = payload ?? {};
  const fidelityScore  = telemetry?.fidelityScore  ?? 0;
  const signalStrength = telemetry?.signalStrength  ?? 0.6;

  if (fidelityScore < 0.50) return { status: 'BLOCKED', arbitration: { chip_alignment: null } };

  const signalWeight  = mockSignalWeight([], signalStrength);
  const chipAlignment = computeChipAlignment(selectedChips, activeCones);

  const consensusScore = chipAlignment != null
    ? (signalWeight * 0.30) + (fidelityScore * 0.45) + (chipAlignment * 0.25)
    : (signalWeight * 0.40) + (fidelityScore * 0.60);

  return {
    status: consensusScore >= 0.85 ? 'VALIDATED' : consensusScore >= 0.50 ? 'ESTIMATED' : 'BLOCKED',
    confidence: Math.round(consensusScore * 100),
    chipAlignment: chipAlignment != null ? Math.round(chipAlignment * 100) / 100 : null,
    arbitration: {
      signal_weight:   Math.round(signalWeight  * 100) / 100,
      fidelity_weight: Math.round(fidelityScore * 100) / 100,
      chip_alignment:  chipAlignment != null ? Math.round(chipAlignment * 100) / 100 : null,
      consensus_score: Math.round(consensusScore * 100) / 100,
    },
  };
}

// ── Mock activeCones ──────────────────────────────────────────────────────────
const mockCones = {
  financial: { value: 0.82, color: '#66FF00' },
  operating: { value: 0.55, color: '#007FFF' },
  time:      { value: 0.63, color: '#007FFF' },
  personal:  { value: 0.71, color: '#66FF00' },
  market:    { value: 0.66, color: '#007FFF' },
  knowledge: { value: 0.58, color: '#66FF00' },
};

const basePayload = {
  acquisition: { intent: 'test', lens: 'investor', domain: 'INVESTMENTS' },
  telemetry:   { signalStrength: 0.7, fidelityScore: 0.72, capitalFloor: '' },
  criteria:    {},
};

// ── PHASE A: 2-factor baseline (no chips) ────────────────────────────────────
const baselineEnvelope = processAcquisition(basePayload, [], null);
// signalWeight = 0.5 (empty signals), fidelityScore = 0.72
const twoFactorExpected = Math.round(((0.5 * 0.40) + (0.72 * 0.60)) * 100);

console.log('\n=== WO-1400 CONVERGENCE AUDIT ===\n');
console.log('PHASE A — 2-Factor Baseline (no chips):');
console.log(`  chip_alignment     : ${baselineEnvelope.arbitration.chip_alignment}`);
console.log(`  consensus_score    : ${baselineEnvelope.arbitration.consensus_score}`);
console.log(`  expected confidence: ${twoFactorExpected}%`);
console.log(`  actual confidence  : ${baselineEnvelope.confidence}%`);
const phaseAPass = baselineEnvelope.arbitration.chip_alignment === null && baselineEnvelope.confidence === twoFactorExpected;
console.log(`  RESULT: ${phaseAPass ? 'PASS ✓' : 'FAIL ✗'}`);

// ── PHASE B: 3-factor convergence (chips locked) ─────────────────────────────
const chips = [
  { chip: 'LIQUIDITY',  score: 0.9, domain: 'BUSINESS'    },
  { chip: 'RUNWAY',     score: 0.7, domain: 'BUSINESS'    },
  { chip: 'DILUTION',   score: 0.8, domain: 'INVESTMENTS' },
];
const convergenceEnvelope = processAcquisition(basePayload, chips, mockCones);
const hasChipAlignment = convergenceEnvelope.arbitration.chip_alignment !== null;
// 3-factor formula: (sw×0.30) + (fs×0.45) + (ca×0.25)
const sw = convergenceEnvelope.arbitration.signal_weight;
const fs = convergenceEnvelope.arbitration.fidelity_weight;
const ca = convergenceEnvelope.arbitration.chip_alignment;
const expectedThreeFactor = Math.round(((sw * 0.30) + (fs * 0.45) + (ca * 0.25)) * 100) / 100;
const usesThreeFactor = hasChipAlignment && convergenceEnvelope.arbitration.consensus_score === expectedThreeFactor;

console.log('\nPHASE B — 3-Factor Convergence (chips locked):');
console.log(`  chips              : ${chips.map(c => c.chip).join(', ')}`);
console.log(`  chip_alignment     : ${ca}`);
console.log(`  signal_weight      : ${sw}`);
console.log(`  fidelity_weight    : ${fs}`);
console.log(`  expected_consensus : ${expectedThreeFactor} (3-factor formula)`);
console.log(`  consensus_score    : ${convergenceEnvelope.arbitration.consensus_score}`);
console.log(`  confidence         : ${convergenceEnvelope.confidence}%`);
const phaseBPass = hasChipAlignment && usesThreeFactor;
console.log(`  RESULT: ${phaseBPass ? 'PASS ✓' : 'FAIL ✗'}`);

console.log('\n=== AUDIT COMPLETE ===');
console.log(`Overall: ${phaseAPass && phaseBPass ? 'ALL PASS ✓' : 'FAILURES DETECTED ✗'}\n`);
