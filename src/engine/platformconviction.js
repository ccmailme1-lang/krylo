// src/engine/platformconviction.js — WO-1735: Platform Conviction Arc
//
// CLASS: INTERPRETATION — conviction framework for investors/operators.
// Subscribes to PLATFORM_FORMATION (WO-1741). Cannot define trigger logic.
// Per WO-1743 contract: validateProtocol() enforces subscription-only pattern.
//
// Arc: Non-Consensus (WO-1734) → Platform Formation (WO-1741) → Conviction (WO-1735)
// Khosla enters on non-consensus gap. These four enter when conviction fires:
//   Vishria (infrastructure), Leone (global category), Mignot (fintech), Gil (growth)
//
// Three conviction levels:
//   EARLY_CONVICTION   — formation detected, velocity gate pending (too early for most)
//   CONFIRMED_CONVICTION — formation confirmed ≥14 days (Vishria/Leone/Mignot entry window)
//   HYPERGROWTH_WINDOW   — Gil condition: CAPITAL + LABOR + MEDIA all > 55 simultaneously

import { validateProtocol, META_SIGNALS } from './metasignals.js';
import { PLATFORM_FORMATION_PHASE } from './platformformation.js';

// ── Protocol registration (WO-1743 contract) ────────────────────────────────
export const ConvictionArcProtocol = {
  name: 'PlatformConvictionArc',
  subscriptions: ['PLATFORM_FORMATION'],
};

// Throws PROTOCOL_CONTRACT_VIOLATION if protocol defines trigger logic.
validateProtocol(ConvictionArcProtocol);

// ── Conviction taxonomy ──────────────────────────────────────────────────────
export const CONVICTION_LEVEL = {
  NONE:        'NONE',
  EARLY:       'EARLY_CONVICTION',       // Phase A: detected, velocity pending
  CONFIRMED:   'CONFIRMED_CONVICTION',   // Phase B: sustained ≥14 days
  HYPERGROWTH: 'HYPERGROWTH_WINDOW',     // Phase C: Gil condition
};

const GIL_DOMAINS   = ['CAPITAL', 'LABOR', 'MEDIA'];
const GIL_THRESHOLD = 55;

// Persona entries by conviction level
export const CONVICTION_PERSONAS = {
  [CONVICTION_LEVEL.EARLY]: [],
  [CONVICTION_LEVEL.CONFIRMED]: ['VISHRIA', 'LEONE', 'MIGNOT'],
  [CONVICTION_LEVEL.HYPERGROWTH]: ['VISHRIA', 'LEONE', 'MIGNOT', 'GIL'],
};

// ── Gil condition detector (Phase C) ────────────────────────────────────────
// CAPITAL + LABOR + MEDIA all above GIL_THRESHOLD simultaneously.
// This is local signal reading within the conviction layer — not a new meta-signal.
function _detectGilCondition(signals) {
  for (const domain of GIL_DOMAINS) {
    const s = signals.find(sig => sig.domain === domain);
    if (!s || (s.signal ?? 0) <= GIL_THRESHOLD) return false;
  }
  return true;
}

// ── classifyConviction(formation, signals, ncResult) ────────────────────────
//
// formation:  output of detectPlatformFormation() — WO-1741
// signals:    raw Kalshi signal array — for Gil condition check
// ncResult:   output of analyzeNonConsensus() — WO-1734 (optional, enriches context)
//
// Returns:
// {
//   level:          CONVICTION_LEVEL
//   personas:       string[]     — which investors enter at this level
//   gilCondition:   boolean      — Phase C gate
//   ncContext:      boolean      — non-consensus window was open before formation
//   formation:      object       — pass-through WO-1741 output
//   metaSignal:     string       — META_SIGNALS.PLATFORM_FORMATION.output
//   ts:             number
// }
export function classifyConviction(formation, signals = [], ncResult = null) {
  const ts = Date.now();

  if (!formation?.triggered) {
    return {
      level:        CONVICTION_LEVEL.NONE,
      personas:     [],
      gilCondition: false,
      ncContext:    false,
      formation,
      metaSignal:   META_SIGNALS.PLATFORM_FORMATION.output,
      ts,
    };
  }

  const gilCondition = _detectGilCondition(signals);
  const ncContext    = ncResult?.classification === 'DIVERGING';

  let level;
  if (gilCondition && formation.phase === PLATFORM_FORMATION_PHASE.CONFIRMED) {
    level = CONVICTION_LEVEL.HYPERGROWTH;
  } else if (formation.phase === PLATFORM_FORMATION_PHASE.CONFIRMED) {
    level = CONVICTION_LEVEL.CONFIRMED;
  } else {
    level = CONVICTION_LEVEL.EARLY;
  }

  return {
    level,
    personas:   CONVICTION_PERSONAS[level] ?? [],
    gilCondition,
    ncContext,
    formation,
    metaSignal: META_SIGNALS.PLATFORM_FORMATION.output,
    ts,
  };
}
