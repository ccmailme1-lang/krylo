// WO-1826 — Happy Path Displacement Engine
// WO-1821 — Happy Path Qualification Criteria (5-criterion gate)
// Continuous re-evaluation. Displacement on challenger superiority + hysteresis hold.

import { useState, useEffect } from 'react';

export const EQ_DOMAINS = ['TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'];

// ── CALIBRATION CONSTANTS ─────────────────────────────────────────────────────
const HIGH_CONVERGENCE_FLOOR   = 75;                   // CALIBRATE: stateId=4 from convergenceclassifier.js
const COUNTER_SIGNAL_CEILING   = 30;                   // CALIBRATE: live signal calibration pass required
const PERSISTENCE_THRESHOLD_MS = 72 * 60 * 60 * 1000; // CALIBRATE: 72h investor default (WO-1821)
const DISPLACEMENT_MARGIN      = 8;                    // CALIBRATE: challenger composite score gap
const TICK_MS                  = 4000;                 // engine tick cadence (canvas refresh)

// ── MOCK SEED — pre-dated persistence for demo viability ─────────────────────
const D3 = Date.now() - 3 * 24 * 60 * 60 * 1000;
const D6H = Date.now() - 6 * 60 * 60 * 1000;

function initSignals() {
  return {
    TECHNOLOGY: { score: 77, velocity: 'BUILDING',  counterSignal: 12, since: D3  },
    CAPITAL:    { score: 84, velocity: 'BUILDING',  counterSignal: 8,  since: D3  },
    KNOWLEDGE:  { score: 52, velocity: 'FLAT',      counterSignal: 18, since: D6H },
    LABOR:      { score: 38, velocity: 'BUILDING',  counterSignal: 22, since: D6H },
    MEDIA:      { score: 27, velocity: 'DECAYING',  counterSignal: 35, since: D6H },
    OWNERSHIP:  { score: 14, velocity: 'FLAT',      counterSignal: 9,  since: D6H },
  };
}

// ── STATE CLASSIFICATION ──────────────────────────────────────────────────────
function classifyState(score) {
  if (score >= HIGH_CONVERGENCE_FLOOR) return 'HIGH';
  if (score < 20)  return 'INSUFFICIENT';
  if (score < 45)  return 'LOW';
  return 'BUILDING';
}

// ── WO-1821: ALL FIVE CRITERIA MUST HOLD ─────────────────────────────────────
function qualifies(score, state, velocity, since, counterSignal) {
  if (score < HIGH_CONVERGENCE_FLOOR)                    return false; // Criterion 1 + 5
  if (Date.now() - since < PERSISTENCE_THRESHOLD_MS)    return false; // Criterion 2
  if (velocity === 'DECAYING')                           return false; // Criterion 3
  if (counterSignal > COUNTER_SIGNAL_CEILING)            return false; // Criterion 4
  if (state === 'TURBULENT')                             return false; // Turbulence override
  return true;
}

function compositeScore(score, velocity) {
  return score + (velocity === 'BUILDING' ? 5 : velocity === 'DECAYING' ? -5 : 0);
}

// ── ENGINE COMPUTATION ────────────────────────────────────────────────────────
function computeState(signals, prev) {
  const domainStates = {};
  const qualified = [];

  for (const d of EQ_DOMAINS) {
    const { score, velocity, counterSignal, since } = signals[d];
    const state = classifyState(score);
    const isQual = qualifies(score, state, velocity, since, counterSignal);
    domainStates[d] = { score, state, velocity, counterSignal, since, qualified: isQual };
    if (isQual) qualified.push(d);
  }

  // Happy Path: ≥2 independent qualified domains (causal independence assumed in mock)
  let happyPath = null;
  if (qualified.length >= 2) {
    const peak = qualified.reduce((a, b) =>
      compositeScore(domainStates[a].score, domainStates[a].velocity) >=
      compositeScore(domainStates[b].score, domainStates[b].velocity) ? a : b
    );
    happyPath = {
      qualified:    true,
      domains:      qualified,
      peakScore:    compositeScore(domainStates[peak].score, domainStates[peak].velocity),
      peakPosition: EQ_DOMAINS.indexOf(peak),
      since:        prev?.happyPath?.qualified ? prev.happyPath.since : Date.now(),
      velocity:     domainStates[peak].velocity,
    };
  }

  // Challengers: domains above 70% of floor, not yet fully qualifying
  const challengers = EQ_DOMAINS
    .filter(d => !qualified.includes(d) && domainStates[d].score >= HIGH_CONVERGENCE_FLOOR * 0.7)
    .map(d => {
      const { score, velocity, state, since, counterSignal } = domainStates[d];
      const met = [
        score >= HIGH_CONVERGENCE_FLOOR,
        Date.now() - since >= PERSISTENCE_THRESHOLD_MS,
        velocity !== 'DECAYING',
        counterSignal <= COUNTER_SIGNAL_CEILING,
        state !== 'TURBULENT',
      ].filter(Boolean).length;
      return {
        domain:       d,
        peakScore:    compositeScore(score, velocity),
        peakPosition: EQ_DOMAINS.indexOf(d),
        criteriasMet: met,
        gap:          HIGH_CONVERGENCE_FLOOR - score,
      };
    });

  // Displacement detection (WO-1826 Rule 3)
  let lastDisplacement = prev?.lastDisplacement ?? null;
  if (
    happyPath?.qualified &&
    prev?.happyPath?.qualified &&
    happyPath.peakPosition !== prev.happyPath.peakPosition &&
    happyPath.peakScore - prev.happyPath.peakScore >= DISPLACEMENT_MARGIN
  ) {
    lastDisplacement = {
      at:       Date.now(),
      outgoing: { domains: prev.happyPath.domains, peakScore: prev.happyPath.peakScore },
      incoming: { domains: happyPath.domains,       peakScore: happyPath.peakScore      },
    };
  }

  return { happyPath, challengers, lastDisplacement, domainStates };
}

// ── MOCK OSCILLATOR ───────────────────────────────────────────────────────────
function tick(signals) {
  const next = {};
  for (const d of EQ_DOMAINS) {
    const { score, since } = signals[d];
    const drift = (Math.random() - 0.47) * 2.2;
    const nextScore = Math.max(0, Math.min(100, score + drift));
    const velocity  = nextScore > score + 0.4 ? 'BUILDING' : nextScore < score - 0.4 ? 'DECAYING' : 'FLAT';
    next[d] = { ...signals[d], score: nextScore, velocity };
  }
  return next;
}

// ── REACT HOOK ────────────────────────────────────────────────────────────────
export function useHappyPathEngine() {
  const [state, setState] = useState(() => {
    const signals = initSignals();
    return { signals, engine: computeState(signals, null) };
  });

  useEffect(() => {
    const id = setInterval(() => {
      setState(prev => {
        const signals = tick(prev.signals);
        const engine  = computeState(signals, prev.engine);
        return { signals, engine };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return {
    engineState:   state.engine,
    domainSignals: state.engine.domainStates,
  };
}
