// KRYL-1293 v1.1 — Happy Path: real structural result, replacing the WO-1826/WO-1821
// mock oscillator entirely (KRYL-1089 disclosed it; this ticket removes it).
//
// HAPPY PATH = the lowest-governed-friction OBSERVED route, selected exclusively from
// real route/R-T-C evidence. Never fabricated: no eligible route -> NOT_ESTABLISHED,
// an honest absence state, never a zero-friction or simulated result.
//
// KRYL-1293 investigation (this session, verified via direct runtime test + repo-wide
// search, not assumed) confirmed neither piece of required substrate exists yet:
//   - No route/pathway traversal-record store anywhere in this codebase. Real
//     relationships exist (deriveRelationships(), 15 real pairs for a real subject,
//     confirmed live) but "Relationship != route" (spec §1) -- a route is not
//     constructed from relationship adjacency here, that is the exact fabrication
//     this ticket forbids.
//   - No governed R/T/C measurement substrate (KRYL-1278, Resource/Time/Cost) is
//     implementation-authorized. KRYL-1298 (the substrate ticket) is held.
// getEligibleObservedRoutes() and hasGovernedRTCEvidence() are the real integration
// points for both, once they exist. They are not stubs with fabricated output --
// they are real functions that correctly return "nothing eligible" against what is
// actually there today.

import { useState, useEffect } from 'react';

export const HP_STATUS = Object.freeze({
  ESTABLISHED:     'ESTABLISHED',
  NOT_ESTABLISHED: 'NOT_ESTABLISHED',
});

// KRYL-1089's disclosure flag is retired here -- there is no longer simulated data to
// disclose. HP_IS_SIMULATED is removed; the 5 consumers now read `status` instead.

// §1 — "Do not construct a route merely because relationships exist. Relationship != route."
// No traversal-record store exists in this codebase (confirmed, KRYL-1293). Real function,
// real signature, honestly returns [] against the real (currently empty) substrate.
function getEligibleObservedRoutes(subject) {
  return [];
}

// §2 — an eligible route must carry governed R/T/C evidence sufficient to compare. No
// governed R/T/C substrate exists yet (KRYL-1278 not implementation-authorized). Real
// gate, correctly never passes today -- not a placeholder that silently defaults to true.
function hasGovernedRTCEvidence(route) {
  return false;
}

// §2 — "Do not introduce a new composite Friction Score. Do not invent weights." This
// function intentionally has no aggregate-comparison logic of its own: writing one (even
// a simple R+T+C sum) would be exactly that prohibited invention. It must be answered by
// the authorized R/T/C substrate's own comparison rule (KRYL-1278) once that exists.
// Correctly unreachable today: selectLowestFriction() only calls this over routes that
// already passed hasGovernedRTCEvidence(), which never happens yet.
function compareByGovernedFriction(routeA, routeB) {
  throw new Error(
    'compareByGovernedFriction: no governed R/T/C comparison rule exists yet (KRYL-1278 ' +
    'not implementation-authorized). This is unreachable until a real rule is authorized -- ' +
    'not something this module may invent (spec §2: no composite score, no invented weights).'
  );
}

// §3 — select the eligible route with the lowest governed friction. Preserves genuine
// ties rather than inventing a differentiator. Returns NOT_ESTABLISHED, never a
// zero-friction or simulated result, when no eligible route exists.
function selectLowestFriction(routes) {
  const eligible = routes.filter(hasGovernedRTCEvidence);
  if (eligible.length === 0) {
    return { status: HP_STATUS.NOT_ESTABLISHED, route: null, tiedRoutes: null };
  }
  const sorted = [...eligible].sort(compareByGovernedFriction);
  const lowest = sorted[0];
  const tied   = sorted.filter(r => compareByGovernedFriction(r, lowest) === 0);
  return tied.length > 1
    ? { status: HP_STATUS.ESTABLISHED, route: null, tiedRoutes: tied }
    : { status: HP_STATUS.ESTABLISHED, route: lowest, tiedRoutes: null };
}

// ── EVENT DISPATCH ────────────────────────────────────────────────────────────
// Only real, meaningful state transitions are dispatched -- hp:peak.displaced,
// hp:peak.emergence, and hp:peak.multi_convergence are retired along with the mock
// oscillator: they described "challengers" and per-domain HIGH-state concepts that
// existed only to give the random walk something to oscillate around. Neither concept
// exists in the real model.
function dispatchHPEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ── REACT HOOK ────────────────────────────────────────────────────────────────
// subject: optional, real (e.g. a canonical entity id / subjectScope result) -- passed
// through to getEligibleObservedRoutes() unchanged. Omitting it is honest too: with no
// route substrate yet, no subject value changes the (always-empty) result.
export function useHappyPathEngine(subject = null) {
  const [state, setState] = useState(() => selectLowestFriction(getEligibleObservedRoutes(subject)));

  useEffect(() => {
    const prevStatus = state.status;
    const next = selectLowestFriction(getEligibleObservedRoutes(subject));
    setState(next);

    if (prevStatus !== HP_STATUS.ESTABLISHED && next.status === HP_STATUS.ESTABLISHED) {
      dispatchHPEvent('hp:peak.qualified', { route: next.route, tiedRoutes: next.tiedRoutes });
    } else if (prevStatus === HP_STATUS.ESTABLISHED && next.status !== HP_STATUS.ESTABLISHED) {
      dispatchHPEvent('hp:peak.decay', {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  return state; // { status, route, tiedRoutes }
}

// ── WO-1820: UNICORN ALERT HOOK ───────────────────────────────────────────────
// Listens to hp:* events. Returns alert log + clear function. Unchanged in shape;
// the event set it listens for is now the real, retired-of-mock-concepts set above.
const HP_EVENTS = [
  'hp:peak.qualified',
  'hp:peak.decay',
];

const ALERT_LABELS = {
  'hp:peak.qualified': 'HAPPY PATH ESTABLISHED',
  'hp:peak.decay':     'HAPPY PATH LOST',
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
