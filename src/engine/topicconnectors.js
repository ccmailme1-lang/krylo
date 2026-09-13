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
    runTargetedOwnershipObservation({
      entityCik:   scope.entity.identifiers.edgar,
      canonicalId: scope.canonicalId,
    }).catch(() => {});
  }
}
