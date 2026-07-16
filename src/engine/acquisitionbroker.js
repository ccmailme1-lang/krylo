// WO-1365 Phase A + WO-1400 Convergence Layer
// Receives WO-1364 payload + selectedChips + activeCones.
// Maps chip intent vectors against live cone convergence to produce OLP.
// WO-1400: chipAlignment factor added as third arbitration weight.

import { classifyConvergenceState, detectFragilityPhase } from './convergenceclassifier.js';
import { BAY_MAP } from './cones.js';

// ── Chip domain → cone key mapping ───────────────────────────────────────────
// KRYL-1064 — targets are canonical §17 cone keys (was pillar). Keys are life-domain chips
// (a valid input taxonomy) projecting onto the six canonical forces.
const CHIP_DOMAIN_TO_CONE = {
  BUSINESS:    'ownership',
  INVESTMENTS: 'capital',
  HOME:        'media',
  EDUCATION:   'knowledge',
  CAR:         'technology',
  VACATION:    'labor',
  GENERAL:     'capital',
};

// ── Mock OLP candidates (Phase A) ────────────────────────────────────────────
const OLP_CANDIDATES = {
  INVESTMENTS: {
    action:   'REBALANCE INTO DURATION-MATCHED BONDS · YTM 5.4%',
    velocity: '+11.2% payload acceleration',
    entropy:  '-6.8% volatility drag eliminated',
    rationale: 'Tax-drag exceeds yield spread. Duration match locks floor.',
  },
  EDUCATION: {
    action:   'SWITCH TO INCOME-DRIVEN REPAYMENT · APR DELTA -3.2%',
    velocity: '+8.4% net cash flow acceleration',
    entropy:  '-4.1% compounding drag eliminated',
    rationale: 'Grace period expiry creates leverage window. Act before Q3.',
  },
  CAR: {
    action:   'SELL + LEASE-BACK · TCO DELTA -$4,200/YR',
    velocity: '+5.1% capital reallocation velocity',
    entropy:  '-9.3% depreciative drag eliminated',
    rationale: 'Equity floor breached. Ownership negative against TCO curve.',
  },
  HOME: {
    action:   'CASH-OUT REFI AT RATE FLOOR · DSR REDUCTION -0.08',
    velocity: '+14.7% liquidity vector unlocked',
    entropy:  '-7.2% debt-service drag eliminated',
    rationale: 'Market liquidity index supports exit premium. Window: 6–10W.',
  },
  BUSINESS: {
    action:   'RECEIVABLES ADVANCE · RUNWAY EXTENSION +6 MONTHS',
    velocity: '+18.3% operational runway acceleration',
    entropy:  '-12.1% burn-rate drag eliminated',
    rationale: 'CAC/LTV above 3x. Advance bridges to next revenue cohort.',
  },
  VACATION: {
    action:   'LIQUIDATE DISCRETIONARY · PAYLOAD DRAIN -3.1%',
    velocity: '+3.1% payload reallocation velocity',
    entropy:  '-3.1% lifestyle overhead eliminated',
    rationale: 'Overhead exceeds payload contribution threshold. Reallocate.',
  },
};

// ── Mock signal weight (Phase A) ─────────────────────────────────────────────
function mockSignalWeight(signals, signalStrength) {
  if (!signals || signals.length === 0) return 0.5;
  return Math.min(1, signalStrength ?? 0.6);
}

// ── WO-1400: Chip alignment score ────────────────────────────────────────────
// Maps selected chip intent vectors against live cone convergence scores.
// chipAlignment = Σ(chip.score × cone.convergenceScore) / chip count
function computeChipAlignment(selectedChips, activeCones) {
  if (!selectedChips?.length || !activeCones) return null;

  let total = 0;
  let count = 0;

  selectedChips.forEach(({ chip, score = 1, domain = 'BUSINESS' }) => {
    const coneKey = CHIP_DOMAIN_TO_CONE[domain?.toUpperCase()] ?? 'capital';
    const cone    = activeCones[coneKey];
    if (!cone) return;

    const d = cone.fs ?? cone.value ?? 0.5;
    const convergenceScore = Math.min(1, Math.max(0,
      0.35 * d + 0.35 * d + 0.20 * 0.7 + 0.10 * 0.5
    ));
    total += score * convergenceScore;
    count++;
  });

  return count > 0 ? Math.min(1, total / count) : null;
}

// ── Status classifier ─────────────────────────────────────────────────────────
function classifyStatus(consensusScore) {
  if (consensusScore >= 0.85) return 'VALIDATED';
  if (consensusScore >= 0.50) return 'ESTIMATED';
  return 'BLOCKED';
}

// ── Primary entry point ───────────────────────────────────────────────────────
// Input: WO-1364 acquisition contract
// Output: consensus envelope
export function processAcquisition(payload, selectedChips = [], activeCones = null) {
  const { acquisition, telemetry, criteria } = payload ?? {};

  const domain         = acquisition?.domain   ?? null;
  const lens           = acquisition?.lens      ?? 'auto';
  const signals        = acquisition?.signalFilter ?? acquisition?.signals ?? [];
  const fidelityScore  = telemetry?.fidelityScore  ?? 0;
  const signalStrength = telemetry?.signalStrength  ?? 0.6;
  const capitalFloor   = telemetry?.capitalFloor ?? null;

  // Fragility phase — derived from available payload, feed-forward only
  const _fv = {
    D: fidelityScore,
    V: Math.max(0, 1 - (signalStrength ?? 0.6)),
    A: signalStrength ?? 0.6,
    T: 0.5,
  };
  const _rawState     = classifyConvergenceState(_fv, fidelityScore);
  const fragilityPhase = detectFragilityPhase(_fv, fidelityScore, _rawState.stateId);

  // Gate: Fs < 0.50 — short-circuit
  if (fidelityScore < 0.50) {
    return {
      status:     'BLOCKED',
      confidence: Math.round(fidelityScore * 100),
      domain, lens, olp: null, criteria: criteria ?? {},
      fragilityPhase,
      arbitration: {
        signal_weight:   0,
        fidelity_weight: Math.round(fidelityScore * 100) / 100,
        chip_alignment:  null,
        consensus_score: 0,
      },
      timestamp: Date.now(),
    };
  }

  const signalWeight   = mockSignalWeight(signals, signalStrength);
  const chipAlignment  = computeChipAlignment(selectedChips, activeCones);
  const olp            = OLP_CANDIDATES[domain?.toUpperCase()] ?? OLP_CANDIDATES.BUSINESS;

  // WO-1400 consensus: 3-factor when chips present, 2-factor fallback
  const consensusScore = chipAlignment != null
    ? (signalWeight * 0.30) + (fidelityScore * 0.45) + (chipAlignment * 0.25)
    : (signalWeight * 0.40) + (fidelityScore * 0.60);

  const status = classifyStatus(consensusScore);

  return {
    status,
    olp,
    confidence:   Math.round(consensusScore * 100),
    domain, lens, capitalFloor,
    criteria:     criteria ?? {},
    fragilityPhase,
    chipAlignment: chipAlignment != null ? Math.round(chipAlignment * 100) / 100 : null,
    arbitration: {
      signal_weight:   Math.round(signalWeight  * 100) / 100,
      fidelity_weight: Math.round(fidelityScore * 100) / 100,
      chip_alignment:  chipAlignment != null ? Math.round(chipAlignment * 100) / 100 : null,
      consensus_score: Math.round(consensusScore * 100) / 100,
    },
    timestamp: Date.now(),
  };
}
