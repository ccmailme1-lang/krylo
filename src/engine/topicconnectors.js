// WO-2019 topic connectors — query-gated (not ambient). Fire once per query submit.
// Single source of truth for the 8 topic connectors + capital realization connector.
// Any new query-submission entry point must call fireTopicConnectors(q) — do not
// re-copy these calls into a new file. See SITE_MAP.md "topic connectors" table.
import { runCapitalRealizationSync } from './connectors/capitalrealizationconnector.js';
import { runGithubSync }             from './connectors/githubconnector.js';
import { runArxivSync }              from './connectors/arxivconnector.js';
import { runNpmSync }                from './connectors/npmconnector.js';
import { runPubmedSync }             from './connectors/pubmedconnector.js';
import { runOpenAlexSync }           from './connectors/openalexconnector.js';
import { runUsajobsSync }            from './connectors/usajobsconnector.js';
import { runGdeltSync }              from './connectors/gdeltconnector.js';
import { runRedditSync }             from './connectors/redditconnector.js';
import { runTargetedOwnershipObservation } from './connectors/secownershipconnector.js';
import { runTargetedEdgar8KSignalSync } from './connectors/edgar8ksignal.js';
import { subjectScope }              from './subjectscope.js';

export function fireTopicConnectors(q) {
  runGithubSync(q).catch(() => {});
  runArxivSync(q).catch(() => {});
  runNpmSync(q).catch(() => {});
  runPubmedSync(q).catch(() => {});
  runOpenAlexSync(q).catch(() => {});
  runUsajobsSync(q).catch(() => {});
  runGdeltSync(q).catch(() => {});
  runRedditSync(q).catch(() => {});
  // WO-2046 — entity capital realization (fires only when query resolves a known entity)
  runCapitalRealizationSync(q).catch(() => {});
  // KRYL-1220 — second entity-attributed domain (OWNERSHIP), same trigger point as CAPITAL
  // above. Reuses the same subjectScope() resolution capitalrealizationconnector.js now uses
  // internally (no new resolution mechanism) — resolved once here since
  // runTargetedOwnershipObservation() needs the CIK, which subjectScope()'s entity already
  // carries (entity.identifiers.edgar), not just the canonicalId. Fires only when the query
  // resolves a real entity with a known EDGAR CIK; withholds otherwise (no fabrication).
  const scope = subjectScope(q);
  if (scope.kind === 'ENTITY' && scope.entity?.identifiers?.edgar) {
    const ownershipObservation = runTargetedOwnershipObservation({
      entityCik:   scope.entity.identifiers.edgar,
      canonicalId: scope.canonicalId,
      from: new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10), // real 365-day window (KRYL-1220)
    }).catch(() => {});
    // KRYL-1220 — second attempt at a real second domain: EDGAR 8-K, entity-scoped, 90-day
    // real window (confirmed via direct API check: real EXECUTIVE_CHANGE/SHAREHOLDER_VOTE
    // filings exist for at least one real subject in this range; 7-day ambient window missed
    // them). Uses the entity's own real name for EDGAR's server-side narrowing.
    runTargetedEdgar8KSignalSync({
      entityCik:   scope.entity.identifiers.edgar,
      canonicalId: scope.canonicalId,
      entityName:  scope.entity.name,
      from: new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10), // matches OWNERSHIP's real 365-day window
    }).catch(() => {});

    // Supplier Structural Intelligence -- real bug found live 2026-10-03: structuralbrief.jsx
    // and structurepanel.jsx both read canonical ρ synchronously at render time, but this
    // observation call above is async (a real EDGAR round-trip, several real seconds). The
    // Brief/Map render BEFORE admission completes and nothing re-renders them afterward -- the
    // guest never sees the real relationship that was, in fact, just admitted a moment later.
    // Confirmed live, twice (JPMorgan Chase, then Goldman Sachs): both rendered with zero
    // canonical relationships despite 64 and 77 being admitted moments afterward. Fix: dispatch
    // a window event once admission genuinely settles, so any mounted component can force its
    // own re-render -- same event-based cross-component pattern this app already uses
    // (krylo-submit, krylo-click, krylo-field-formation), not a new mechanism.
    ownershipObservation.then(() => {
      window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId } }));
    });
  }
}
