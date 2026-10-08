// useownershiplookup.js -- DEF (2026-10-08): state of the live SEC ownership lookup for the selected entity.
// Canonical rho is in memory only and the lookup (topicconnectors.js -> runTargetedOwnershipObservation) takes
// seconds, so until it settles "no canonical relationships admitted" is not a fact yet. This hook is the one
// place both StructuralBrief and the MAP panel read that state from:
//   pending  -- the lookup was started but has not reported (show "checking", never "none admitted")
//   error    -- the lookup's failure text, or a no-response notice after TIMEOUT_MS (never silent, section 16)
//   tick     -- increments when the lookup reports, so readers re-read rho
import { useEffect, useState } from 'react';

export const OWNERSHIP_LOOKUP_TIMEOUT_MS = 45_000;

export function useOwnershipLookup(subjScope, countAdmitted) {
  const isEntity = subjScope?.kind === 'ENTITY';
  const id = isEntity ? subjScope.canonicalId : null;
  const hasCik = isEntity && !!subjScope.entity?.identifiers?.edgar;
  const [outcome, setOutcome] = useState(null);
  const [tick, setTick] = useState(0);
  const [timedOutFor, setTimedOutFor] = useState(null);
  const admitted = isEntity ? countAdmitted() : 0;
  const settled = outcome?.id === id;

  useEffect(() => {
    if (!isEntity) return;
    function onRhoUpdated(e) {
      if (e.detail?.canonicalId !== id) return;
      setOutcome({ id, error: e.detail?.error ?? null });
      setTick(n => n + 1);
    }
    window.addEventListener('krylo-rho-updated', onRhoUpdated);
    return () => window.removeEventListener('krylo-rho-updated', onRhoUpdated);
  }, [isEntity, id]);

  useEffect(() => {
    if (!hasCik || settled || admitted > 0) return;
    const t = setTimeout(() => setTimedOutFor(id), OWNERSHIP_LOOKUP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hasCik, settled, admitted, id]);

  const timedOut = timedOutFor === id && !settled;
  return {
    outcome,
    tick,
    pending: hasCik && !settled && !timedOut && admitted === 0,
    error: settled ? outcome.error : (timedOut ? 'the SEC ownership lookup did not respond' : null),
  };
}
