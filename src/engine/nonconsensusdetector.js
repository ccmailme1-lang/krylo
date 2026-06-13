// src/engine/nonconsensusdetector.js — WO-1734: Non-Consensus Signal Layer (Khosla Protocol)
//
// Three-phase NC-tier transformer. Input must be WEAK-tagged. Output is NC-tagged.
// NC outputs must NEVER re-enter WEAK inputs — enforced by validateFlowDirection.
//
// Phase A: cross-domain correlation (re-homed from WO-1726 Phase C, origin preserved)
//          Consumes WEAK-tagged emergingSignals. Detects TECHNOLOGY + KNOWLEDGE both emerging.
// Phase B: divergence computation — KNOWLEDGE vs CAPITAL gap, conviction duration, population
// Phase C: classification output — DIVERGING | CONVERGING | AMBIGUOUS (no triggers, no signals)

import { EPISTEMIC_TIER, tagWithTier, validateBoundary, validateFlowDirection } from './epistemictier.js';

// Re-homed from WO-1726 Phase C — cross-domain pair for early emergence correlation
export const CROSS_DOMAIN_PAIR = ['TECHNOLOGY', 'KNOWLEDGE'];

export const NC_DELTA_THRESHOLD    = 30;  // KNOWLEDGE - CAPITAL > 30 = DIVERGING
export const CONVERGENCE_THRESHOLD = 10;  // delta < 10 = CONVERGING

export const NC_CLASSIFICATION = {
  DIVERGING:   'DIVERGING',   // delta > NC_DELTA_THRESHOLD — conviction window open
  CONVERGING:  'CONVERGING',  // 0 < delta < CONVERGENCE_THRESHOLD — consensus arriving
  AMBIGUOUS:   'AMBIGUOUS',   // all other states
};

// Gap open timestamps: 'KNOWLEDGE/CAPITAL' → ms timestamp
const _gapOpenAt = new Map();
function _gapKey(a, b) { return `${a}/${b}`; }

// analyzeNonConsensus(emergingSignals, signals)
//
// emergingSignals: WEAK-tagged array from detectWeakSignals() — Phase A input
// signals:         raw array of all domain pressures { domain, signal } — Phase B input
//
// Returns NC-tagged object:
// { crossDomainEmergenceDetected, emergingDomains, knowledgeAlignment, capitalAlignment,
//   consensusDelta, gapOpenMs, populationAgreement, classification, consensusArriving,
//   _epistemicTier: 'NC', promotable: false }
export function analyzeNonConsensus(emergingSignals, signals) {
  if (!Array.isArray(emergingSignals)) emergingSignals = [];
  if (!Array.isArray(signals))         signals         = [];

  const now = Date.now();

  // ── Phase A: WEAK-boundary gate + cross-domain correlation ──────────────────
  // Enforce: NC layer consumes WEAK-tier only (no raw signals, no META, no NC feedback)
  for (const s of emergingSignals) {
    validateBoundary(s, EPISTEMIC_TIER.WEAK);
    // Explicit NC→WEAK prohibition (belt-and-suspenders over validateFlowDirection)
    validateFlowDirection(EPISTEMIC_TIER.WEAK, EPISTEMIC_TIER.NC);
  }

  const emergingDomains = new Set(emergingSignals.map(s => s.domain));
  const crossDomainEmergenceDetected = CROSS_DOMAIN_PAIR.every(d => emergingDomains.has(d));

  // ── Phase B: divergence computation ─────────────────────────────────────────
  const kSig = signals.find(s => s.domain === 'KNOWLEDGE');
  const cSig = signals.find(s => s.domain === 'CAPITAL');

  const knowledgeAlignment = kSig?.signal ?? 0;
  const capitalAlignment   = cSig?.signal ?? 0;
  const consensusDelta     = knowledgeAlignment - capitalAlignment;

  // Conviction tracker: timestamps when gap opens > NC_DELTA_THRESHOLD
  // Capture prior state BEFORE mutating — consensusArriving depends on it
  const gapK = _gapKey('KNOWLEDGE', 'CAPITAL');
  const gapWasOpen = _gapOpenAt.has(gapK);

  if (consensusDelta > NC_DELTA_THRESHOLD) {
    if (!_gapOpenAt.has(gapK)) _gapOpenAt.set(gapK, now);
  } else {
    _gapOpenAt.delete(gapK);
  }
  const gapOpenMs = _gapOpenAt.has(gapK) ? now - _gapOpenAt.get(gapK) : 0;

  // Population agreement: fraction of domains above WEAK threshold (pressure > 20)
  const aboveWeak = signals.filter(s => (s.signal ?? 0) > 20).length;
  const populationAgreement = signals.length > 0
    ? parseFloat((aboveWeak / signals.length).toFixed(3))
    : 0;

  // ── Phase C: classification — divergence metrics only, no trigger emission ──
  let classification;
  if (consensusDelta > NC_DELTA_THRESHOLD) {
    classification = NC_CLASSIFICATION.DIVERGING;
  } else if (consensusDelta > 0 && consensusDelta < CONVERGENCE_THRESHOLD) {
    classification = NC_CLASSIFICATION.CONVERGING;
  } else {
    classification = NC_CLASSIFICATION.AMBIGUOUS;
  }

  // Consensus arrival: gap was open on prior call, now CONVERGING — window is closing
  const consensusArriving = classification === NC_CLASSIFICATION.CONVERGING && gapWasOpen;

  return tagWithTier({
    crossDomainEmergenceDetected,
    emergingDomains: Array.from(emergingDomains),
    knowledgeAlignment,
    capitalAlignment,
    consensusDelta,
    gapOpenMs,
    populationAgreement,
    classification,
    consensusArriving,
  }, EPISTEMIC_TIER.NC);
}

export function resetNonConsensusHistory() {
  _gapOpenAt.clear();
}
