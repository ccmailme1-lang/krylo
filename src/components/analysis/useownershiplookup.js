// useownershiplookup.js -- DEF (2026-10-08): state of the live SEC ownership lookup for the selected entity.
// Canonical rho is in memory only and the lookup (topicconnectors.js -> runTargetedOwnershipObservation) takes
// seconds, so until it settles "no canonical relationships admitted" is not a fact yet. This hook is the one
// place both StructuralBrief and the MAP panel read that state from:
//   pending  -- the lookup was started but has not reported (show "checking", never "none admitted")
//   error    -- the lookup's failure text, or a no-response notice after TIMEOUT_MS (never silent, section 16)
//   tick     -- increments when the lookup starts or reports, so readers re-read rho
// DEF-1396: the status is read from engine/ownershiplookupstore.js (recorded at module level for every subject), not
// from an event this hook may have been unmounted for. A reader mounting after the event recovers the outcome of the
// LAST lookup run for the subject; a new run resets it to pending. The status is the lookup's only; the provenance of
// relationships already in rho is separate (latestEvidenceFor).
import { useEffect, useState } from 'react';
import { getOutcome } from '../../engine/ownershiplookupstore.js';
import { frozenLookup } from '../../engine/analyticalsnapshot.js';
import { useAnalyticalSnapshot } from '../../hooks/useanalyticalsnapshot.js';

export const OWNERSHIP_LOOKUP_TIMEOUT_MS = 45_000;

export function useOwnershipLookup(subjScope, countAdmitted) {
  useAnalyticalSnapshot(); // KRYL-1398: re-render when the displayed snapshot changes
  const isEntity = subjScope?.kind === 'ENTITY';
  const id = isEntity ? subjScope.canonicalId : null;
  const hasCik = isEntity && !!subjScope.entity?.identifiers?.edgar;
  const [tick, setTick] = useState(0);
  const [timedOutFor, setTimedOutFor] = useState(null);
  const rec = isEntity ? getOutcome(id) : null;
  const settled = !!rec?.settledAt;

  useEffect(() => {
    if (!isEntity) return;
    const bump = (e) => { if (e.detail?.canonicalId === id) setTick(n => n + 1); };
    window.addEventListener('krylo-rho-updated', bump);
    window.addEventListener('krylo-rho-started', bump);
    return () => { window.removeEventListener('krylo-rho-updated', bump); window.removeEventListener('krylo-rho-started', bump); };
  }, [isEntity, id]);

  // The 45 s clock runs from the lookup's start when one is recorded, otherwise from this mount.
  const startedAt = rec?.startedAt ?? null;
  useEffect(() => {
    if (!hasCik || settled) return;
    const left = startedAt ? Math.max(0, OWNERSHIP_LOOKUP_TIMEOUT_MS - (Date.now() - startedAt)) : OWNERSHIP_LOOKUP_TIMEOUT_MS;
    const t = setTimeout(() => setTimedOutFor(`${id}:${startedAt ?? 0}`), left);
    return () => clearTimeout(t);
  }, [hasCik, settled, id, startedAt]);

  const timedOut = !settled && timedOutFor === `${id}:${startedAt ?? 0}`;
  // KRYL-1398: once a snapshot is frozen for this subject, the lookup's status IS the one recorded at the freeze (a result that
  // arrives later is not shown until the next explicit refresh); the live record above is the pre-freeze state only.
  const frozen = isEntity ? frozenLookup(id, 'ownership') : null;
  if (frozen) {
    return {
      outcome: { id, error: frozen.state === 'FAILED' ? frozen.error : null },
      tick,
      pending: false,
      error: frozen.state === 'FAILED' ? frozen.error : (frozen.state === 'TIMEOUT' ? 'the SEC ownership lookup did not respond' : null),
    };
  }
  return {
    outcome: settled ? { id, error: rec.error } : null,
    tick,
    pending: hasCik && !settled && !timedOut, // DEF-1392: independent of how many relationships are already admitted
    error: settled ? rec.error : (timedOut ? 'the SEC ownership lookup did not respond' : null),
  };
}
