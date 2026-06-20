// WO-1826 — Happy Path Displacement Engine
// WO-1821 — Happy Path Qualification Criteria (5-criterion gate)
// Continuous re-evaluation. Displacement on challenger superiority + hysteresis hold.
// DATA SOURCE: domain pressure store only — no cone dependency (LOCKED 2026-06-20)

import { useState, useEffect, useRef } from 'react';
import { HIGH_CONVERGENCE_FLOOR, COUNTER_SIGNAL_CEILING } from './signalconstants.js';

export const EQ_DOMAINS = ['TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'];
const PERSISTENCE_THRESHOLD_MS = 72 * 60 * 60 * 1000; // CALIBRATE: 72h investor default (WO-1821)
const DISPLACEMENT_MARGIN      = 8;                    // CALIBRATE: challenger composite score gap
const HYSTERESIS_TICKS         = 3;                    // ticks challenger must hold before displacement fires
                                                       // proxy: 3×4s=12s — calibrate to 15-30min on live data
const TICK_MS                  = 4000;

// ── MOCK SEED — pre-dated persistence for demo viability ─────────────────────
const D3  = Date.now() - 3 * 24 * 60 * 60 * 1000;
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
  if (score < HIGH_CONVERGENCE_FLOOR)                 return false; // Criterion 1 + 5
  if (Date.now() - since < PERSISTENCE_THRESHOLD_MS) return false; // Criterion 2
  if (velocity === 'DECAYING')                        return false; // Criterion 3
  if (counterSignal > COUNTER_SIGNAL_CEILING)         return false; // Criterion 4
  if (state === 'TURBULENT')                          return false; // Turbulence override
  return true;
}

function compositeScore(score, velocity) {
  return score + (velocity === 'BUILDING' ? 5 : velocity === 'DECAYING' ? -5 : 0);
}

// ── ENGINE COMPUTATION ────────────────────────────────────────────────────────
function computeState(signals, prev) {
  const domainStates = {};
  const qualified    = [];

  for (const d of EQ_DOMAINS) {
    const { score, velocity, counterSignal, since } = signals[d];
    const state  = classifyState(score);
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

  // ── HYSTERESIS BUFFER (WO-1826 Rule 4) ───────────────────────────────────────
  // Challenger must hold above displacement margin for HYSTERESIS_TICKS consecutive
  // ticks before displacement fires. Prevents noise-driven displacement.
  let dispHoldPos   = prev?.dispHoldPos   ?? null;
  let dispHoldCount = prev?.dispHoldCount ?? 0;
  let lastDisplacement = prev?.lastDisplacement ?? null;

  const displacementCondition = (
    happyPath?.qualified &&
    prev?.happyPath?.qualified &&
    happyPath.peakPosition !== prev.happyPath.peakPosition &&
    happyPath.peakScore - prev.happyPath.peakScore >= DISPLACEMENT_MARGIN
  );

  if (displacementCondition) {
    if (dispHoldPos === happyPath.peakPosition) {
      dispHoldCount += 1;
    } else {
      dispHoldPos   = happyPath.peakPosition;
      dispHoldCount = 1;
    }
    if (dispHoldCount >= HYSTERESIS_TICKS) {
      lastDisplacement = {
        at:       Date.now(),
        outgoing: { domains: prev.happyPath.domains, peakScore: prev.happyPath.peakScore },
        incoming: { domains: happyPath.domains,       peakScore: happyPath.peakScore      },
      };
      dispHoldPos   = null;
      dispHoldCount = 0;
    }
  } else {
    dispHoldPos   = null;
    dispHoldCount = 0;
  }

  return { happyPath, challengers, lastDisplacement, domainStates, dispHoldPos, dispHoldCount };
}

// ── MOCK OSCILLATOR ───────────────────────────────────────────────────────────
function tick(signals) {
  const next = {};
  for (const d of EQ_DOMAINS) {
    const { score } = signals[d];
    const drift     = (Math.random() - 0.47) * 2.2;
    const nextScore = Math.max(0, Math.min(100, score + drift));
    const velocity  = nextScore > score + 0.4 ? 'BUILDING' : nextScore < score - 0.4 ? 'DECAYING' : 'FLAT';
    next[d] = { ...signals[d], score: nextScore, velocity };
  }
  return next;
}

// ── EVENT DISPATCH ────────────────────────────────────────────────────────────
function dispatchHPEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ── REACT HOOK ────────────────────────────────────────────────────────────────
export function useHappyPathEngine() {
  const [state, setState] = useState(() => {
    const signals = initSignals();
    return { signals, engine: computeState(signals, null) };
  });

  const prevEngineRef = useRef(null);

  // ── Event emission — compare prev/curr, dispatch hp:* transitions ─────────
  useEffect(() => {
    const prev = prevEngineRef.current;
    const curr = state.engine;

    if (prev) {
      // hp:peak.qualified — happy path newly designated
      if (!prev.happyPath?.qualified && curr.happyPath?.qualified) {
        dispatchHPEvent('hp:peak.qualified', {
          domains:      curr.happyPath.domains,
          peakScore:    curr.happyPath.peakScore,
          peakPosition: curr.happyPath.peakPosition,
        });
      }

      // hp:peak.displaced — confirmed after hysteresis hold
      if (curr.lastDisplacement && curr.lastDisplacement !== prev.lastDisplacement) {
        dispatchHPEvent('hp:peak.displaced', curr.lastDisplacement);
      }

      // hp:peak.decay — happy path lost qualification
      if (prev.happyPath?.qualified && !curr.happyPath?.qualified) {
        dispatchHPEvent('hp:peak.decay', {
          domains:   prev.happyPath.domains,
          peakScore: prev.happyPath.peakScore,
        });
      }

      // hp:peak.emergence — new challenger entered monitoring range
      const prevChallengerDomains = new Set((prev.challengers ?? []).map(c => c.domain));
      for (const c of (curr.challengers ?? [])) {
        if (!prevChallengerDomains.has(c.domain)) {
          dispatchHPEvent('hp:peak.emergence', {
            domain:       c.domain,
            peakScore:    c.peakScore,
            criteriasMet: c.criteriasMet,
          });
        }
      }

      // hp:peak.multi_convergence — 2+ domains reach HIGH simultaneously
      const prevHighCount = Object.values(prev.domainStates ?? {}).filter(s => s.state === 'HIGH').length;
      const currHighCount = Object.values(curr.domainStates ?? {}).filter(s => s.state === 'HIGH').length;
      if (currHighCount >= 2 && prevHighCount < 2) {
        dispatchHPEvent('hp:peak.multi_convergence', {
          domains: EQ_DOMAINS.filter(d => curr.domainStates[d]?.state === 'HIGH'),
          count:   currHighCount,
        });
      }
    }

    prevEngineRef.current = curr;
  }, [state.engine]);

  // ── Tick ──────────────────────────────────────────────────────────────────
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

// ── WO-1820: UNICORN ALERT HOOK ───────────────────────────────────────────────
// Listens to hp:* events. Returns alert log + clear function.
// Alert label rule: DOMAIN · prefix (ENTITY · when bay is entity-assigned — WO-1347)
const HP_EVENTS = [
  'hp:peak.qualified',
  'hp:peak.displaced',
  'hp:peak.decay',
  'hp:peak.emergence',
  'hp:peak.multi_convergence',
  'hp:peak.trigger_set',
];

const ALERT_LABELS = {
  'hp:peak.qualified':        'HAPPY PATH DESIGNATED',
  'hp:peak.displaced':        'HAPPY PATH DISPLACED',
  'hp:peak.decay':            'HAPPY PATH LOST',
  'hp:peak.emergence':        'CHALLENGER EMERGING',
  'hp:peak.multi_convergence':'MULTI-DOMAIN CONVERGENCE',
  'hp:peak.trigger_set':      'TRIGGER SET',
};

export function useUnicornAlerts(maxAlerts = 8) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handlers = HP_EVENTS.map(eventName => {
      const handler = (e) => {
        setAlerts(prev => [{
          id:        crypto.randomUUID(),
          event:     eventName,
          label:     ALERT_LABELS[eventName] ?? eventName,
          detail:    e.detail,
          ts:        Date.now(),
          prefix:    'DOMAIN ·',
        }, ...prev].slice(0, maxAlerts));
      };
      window.addEventListener(eventName, handler);
      return { eventName, handler };
    });

    return () => handlers.forEach(({ eventName, handler }) =>
      window.removeEventListener(eventName, handler)
    );
  }, [maxAlerts]);

  const clearAlerts = () => setAlerts([]);

  return { alerts, clearAlerts };
}
