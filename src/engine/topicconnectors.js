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
import { admitPublicFiler }          from './secfileradmission.js';
import { toTopologyNodeId }          from './entityresolution.js';
import { findAdmittedRelationshipsForLive, latestEvidenceForLive } from './canonicalrelationshipprojection.js';
import { captureCanonicalFormationSnapshots } from './formationsnapshotclient.js';
import { runRelationshipChange, getRelationshipChange } from './relationshipchangeservice.js';
import { markStarted } from './ownershiplookupstore.js';
import { admitCapitalEvents } from './capitaleventadmission.js';
import { setAdmissionReport } from './admissionreport.js';
import { installStoreSink, hydrateFor, registryCache } from './canonicalstoreclient.js';
installStoreSink();   // the durable store sees every admission (single write path)
import { beginAnalysis, expectLookup, settleLookup, armSettlement } from './analyticalsnapshot.js';

export function fireTopicConnectors(q, { refresh = false } = {}) {
  // KRYL-1398: every submit opens one analysis run; the snapshot freezes when its subject lookups settle (or at 45 s).
  // A refresh re-runs the lookups for the displayed query and swaps the snapshot only when they have settled.
  if (beginAnalysis(q, { refresh }) == null && refresh) return;
  runGithubSync(q).catch(() => {});
  runArxivSync(q).catch(() => {});
  runNpmSync(q).catch(() => {});
  runPubmedSync(q).catch(() => {});
  runOpenAlexSync(q).catch(() => {});
  runUsajobsSync(q).catch(() => {});
  runGdeltSync(q).catch(() => {});
  runRedditSync(q).catch(() => {});
  // The entity-scoped connectors need a resolved entity. A subject the Query Contract selected but the registry cannot
  // resolve is first offered to the SEC-filer admission path (KRYL-1380: verified public filer, CIK identity, identity
  // only); on success the entity-scoped connectors run for the now-resolved entity. Otherwise the subject stays unresolved.
  fireEntityScoped(q, { refresh });
  const pre = subjectScope(q);
  if (pre.kind === 'UNRESOLVED' && pre.subject?.text) {
    expectLookup('admission');
    admitPublicFiler(pre.subject.text, { searchFn: secSearch }).then((r) => {
      if (r.outcome === 'ADMITTED') fireEntityScoped(q, { refresh });   // registers the entity lookups before 'admission' settles
      settleLookup('admission', r.outcome === 'LOOKUP_FAILED' ? 'the SEC filer lookup failed' : null);
    }).catch((e) => { settleLookup('admission', String(e?.message ?? e)); });
  }
  armSettlement();
}

// Search binding for the admission path (the engine's /api/edgar proxy).
async function secSearch(p) {
  const r = await fetch('/api/edgar?' + new URLSearchParams({ forms: p.forms, dateRange: 'custom', startdt: p.startdt, enddt: p.enddt, hits: p.hits, entityName: p.entityName ?? '' }));
  if (!r.ok) return { ok: false, status: r.status, hits: [] };
  const j = await r.json().catch(() => null);
  return j?.hits ? { ok: true, status: 200, hits: j.hits.hits ?? [] } : { ok: false, status: 200, hits: [] };
}

// The entity-scoped part of the query connectors. Safe to call twice for one query (once before and once after an
// admission): each connector re-resolves the subject itself and returns when there is no resolved entity.
function fireEntityScoped(q, { refresh = false } = {}) {
  const scope = subjectScope(q);
  // WO-2046 — entity capital realization (fires only when query resolves a known entity)
  // KRYL-1398: a lookup of the snapshot's settlement for a resolved entity (terminal OK or FAILED; late results change nothing).
  if (scope.kind === 'ENTITY') expectLookup('capital', { canonicalId: scope.canonicalId });
  runCapitalRealizationSync(q).then(() => settleLookup('capital')).catch((e) => settleLookup('capital', String(e?.message ?? e)));
  // KRYL-1220 — second entity-attributed domain (OWNERSHIP), same trigger point as CAPITAL
  // above. Reuses the same subjectScope() resolution capitalrealizationconnector.js now uses
  // internally (no new resolution mechanism) — resolved once here since
  // runTargetedOwnershipObservation() needs the CIK, which subjectScope()'s entity already
  // carries (entity.identifiers.edgar), not just the canonicalId. Fires only when the query
  // resolves a real entity with a known EDGAR CIK; withholds otherwise (no fabrication).
  if (scope.kind === 'ENTITY' && scope.entity?.identifiers?.edgar) {
    expectLookup('ownership', { canonicalId: scope.canonicalId }); expectLookup('8k', { canonicalId: scope.canonicalId }); expectLookup('counterparty', { canonicalId: scope.canonicalId });
    if (refresh) expectLookup('change', { canonicalId: scope.canonicalId });
    // Decision record step 4: the subject's stored relationships (with their stable ids and history) are loaded into the in-memory store BEFORE the
    // SEC lookups run, so admissions below are recognised as the same relationships (PERSISTENT) and the first view already holds earlier sessions' work.
    expectLookup('store', { canonicalId: scope.canonicalId });
    // The comparison's SEC retrieval starts after the counterparty matching has finished (both search SEC; together they burst, and a burst can come back empty).
    let cpDone; const cpPromise = new Promise((r) => { cpDone = r; });
    const launchLookups = () => {
      markStarted(scope.canonicalId); // DEF-1396: a new run resets any earlier outcome to pending
      const ownershipObservation = runTargetedOwnershipObservation({
        entityCik:   scope.entity.identifiers.edgar,
        canonicalId: scope.canonicalId,
        from: new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10), // real 365-day window (KRYL-1220)
      }).catch((err) => ({ error: err?.message ?? 'ownership observation failed' })); // never silent: the outcome travels on the event below
      // KRYL-1220 — second attempt at a real second domain: EDGAR 8-K, entity-scoped, 90-day
      // real window (confirmed via direct API check: real EXECUTIVE_CHANGE/SHAREHOLDER_VOTE
      // filings exist for at least one real subject in this range; 7-day ambient window missed
      // them). Uses the entity's own real name for EDGAR's server-side narrowing.
      runTargetedEdgar8KSignalSync({
        entityCik:   scope.entity.identifiers.edgar,
        canonicalId: scope.canonicalId,
        entityName:  scope.entity.name,
        from: new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10), // matches OWNERSHIP's real 365-day window
      }).then((r) => {
        settleLookup('8k', r?.error ?? null);
        // KRYL-1401: match the named counterparties of the extracted capital events and admit the confirmed ones (a lookup of the snapshot's
        // settlement; if it does not finish in time it is recorded TIMEOUT, the admission continues live and appears at the next Refresh).
        const filer = { cik: scope.entity.identifiers.edgar, name: scope.entity.name };
        admitCapitalEvents({ filer, events: r?.capitalEvents ?? [], searchFn: secSearch, registryCache })
          .then((res) => { setAdmissionReport(scope.canonicalId, res); return settleLookup('counterparty', res.admitted.length === 0 && res.rejected.some(x => x.outcome === 'LOOKUP_FAILED') ? 'counterparty lookups failed' : null); })
          .catch((e) => settleLookup('counterparty', String(e?.message ?? e)))
          .finally(() => cpDone());
      }).catch((e) => { settleLookup('8k', String(e?.message ?? e)); settleLookup('counterparty', 'the 8-K lookup failed'); cpDone(); });

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
      ownershipObservation.then((result) => {
        // KRYL-1353 -- the observation's outcome rides on the event: `error` is the failure text
        // (after the connector's retry), or null on success. The Brief states a failure plainly
        // instead of looking identical to "no relationships exist" (§16: no silent absence).
        window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId, error: result?.error ?? null } }));
        // KRYL-1398: the ownership lookup is terminal; a refresh waits for its own forced relationship-change run below.
        settleLookup('ownership', result?.error ?? null);
        // KRYL-1386 -- the source-dated comparison runs AFTER the targeted observation settles, so the two never hit SEC
        // together (bursts return empty or 500). Skipped when a run for this entity is in flight or finished within 10 minutes.
        // A refresh always runs it again (KRYL-1398: the replacement snapshot pins a result retrieved by that refresh).
        const prior = getRelationshipChange(scope.canonicalId);
        const fresh = prior && (prior.state === 'running' || (prior.finishedAt && Date.now() - prior.finishedAt < 600_000));
        if (refresh || !fresh) {
          const chg = Promise.race([cpPromise, new Promise((r) => setTimeout(r, 90_000))]).then(() => runRelationshipChange({ issuerCik: scope.entity.identifiers.edgar, issuerName: scope.entity.name, canonicalId: scope.canonicalId }));
          chg.then((e) => { if (refresh) settleLookup('change', e?.state === 'failed' ? e.error : (e?.result?.coverage && e.result.coverage.complete === false ? 'the relationship-change retrieval was incomplete' : null)); }).catch((e) => { if (refresh) settleLookup('change', String(e?.message ?? e)); });
        }
        // KRYL-1350 -- capture this admission as formation snapshots (one batch; the server stamps
        // capture time and decides what is a material change), THEN tell readers it landed so the
        // scrubber reads history that includes it. Separate event so the Brief above never waits.
        // (Writer path: reads the live store, because a late admission after a freeze must still be captured.)
        captureCanonicalFormationSnapshots(
          scope.canonicalId,
          findAdmittedRelationshipsForLive(toTopologyNodeId(scope.canonicalId)),
          latestEvidenceForLive,
        ).then(() => {
          window.dispatchEvent(new CustomEvent('krylo-formation-captured', { detail: { canonicalId: scope.canonicalId } }));
        }).catch(() => {});
      });
    };
    hydrateFor([toTopologyNodeId(scope.canonicalId)]).then((h) => settleLookup('store', h.error ? `the durable store was not reachable (${h.error})` : null)).catch((e) => settleLookup('store', String(e?.message ?? e))).finally(launchLookups);
  }
}
