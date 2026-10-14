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
import { surfaceRouter } from './surfacerouter.js';
import { subjectScope }              from './subjectscope.js';
import { admitPublicFiler }          from './secfileradmission.js';
import { toTopologyNodeId }          from './entityresolution.js';
import { findAdmittedRelationshipsForLive, latestEvidenceForLive } from './canonicalrelationshipprojection.js';
import { captureCanonicalFormationSnapshots } from './formationsnapshotclient.js';
import { runRelationshipChange, getRelationshipChange } from './relationshipchangeservice.js';
import { markStarted } from './ownershiplookupstore.js';
import { admitCapitalEvents, admitAcquisitions } from './capitaleventadmission.js';
import { fetchInsiderRoles } from './connectors/insiderroles.js';
import { producerEligibility } from './produceridentifiers.js';
import { admitInsiderRoles } from './insiderroleadmission.js';
import { fetchFormDPeople } from './connectors/formdpeople.js';
import { admitFormDRoles } from './formdpeopleadmission.js';
import { buildFormDOfferingSignal } from './connectors/formdoffering.js';
import { fetchClinicalTrials } from './connectors/clinicaltrials.js';
import { admitClinicalTrials } from './clinicaltrialadmission.js';
import { fetchPatentAssignments } from './connectors/patentassignee.js';
import { admitPatentAssignments } from './patentassigneeadmission.js';
import { verifyGleifLei } from './gleifidentity.js';
import { SETTLE_TIMEOUT_MS } from './analyticalsnapshot.js';
// The durable store's read may wait as long as the snapshot itself waits for any lookup (its decided settlement contract, 45 s): the browser allows only a few parallel connections to the
// engine, and slow source lookups can hold them, so a 3 s abort recorded a healthy store as failed (seen on the first case of a subject, 2026-10-14).
const STORE_HYDRATE_MS = SETTLE_TIMEOUT_MS;
import { fetchMediaObservations, buildMediaSignals } from './connectors/gdeltmediaobservation.js';
import { admitMediaArticles } from './mediaarticleadmission.js';import { setAdmissionReport, setLaborReport, setEligibilityReport } from './admissionreport.js';
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
    admitPublicFiler(pre.subject.text, { searchFn: secSearch, nameFn: secNameLookup, gleifFn }).then((r) => {
      if (r.outcome === 'ADMITTED') fireEntityScoped(q, { refresh });   // registers the entity lookups before 'admission' settles
      settleLookup('admission', r.outcome === 'LOOKUP_FAILED' ? 'the SEC filer lookup failed' : null);
    }).catch((e) => { settleLookup('admission', String(e?.message ?? e)); });
  }
  armSettlement();
}

// Canonical name source binding (KRYL-1407; the engine's /api/sec-names): what a typed name may mean. An unavailable route returns an error object and the
// admission path falls back to its name-based check.
async function secNameLookup(text) {
  try {
    const r = await fetch('/api/sec-names?' + new URLSearchParams({ name: text }));
    if (!r.ok) return { error: 'HTTP ' + r.status };
    return await r.json();
  } catch (e) { return { error: String(e?.message ?? e) }; }
}

// GLEIF binding for the admission path (the engine's /api/gleif-entity route; KRYL-1417).
async function gleifFn(name) {
  const r = await fetch('/api/gleif-entity?' + new URLSearchParams({ name }));
  if (!r.ok) return { error: `HTTP ${r.status}` };
  return r.json();
}
async function gleifLeiFn(lei) {
  const r = await fetch('/api/gleif-entity?' + new URLSearchParams({ lei }));
  if (!r.ok) return { error: `HTTP ${r.status}` };
  return r.json();
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
  // Producer eligibility is its own contract (produceridentifiers.js): the SEC-keyed producers run only for an entity that carries an SEC CIK; the ones that cannot run are
  // recorded with the identifier they lack (shown to the reader), never skipped silently and never given a substituted identifier.
  const elig = scope.kind === 'ENTITY' ? producerEligibility(scope.entity) : null;
  if (scope.kind === 'ENTITY') setEligibilityReport(scope.canonicalId, elig);
  // KRYL-1414 (Founder ratified 2026-10-12): ClinicalTrials.gov lead sponsorship for a company already resolved by its SEC CIK (the registry never creates identity; an exact legal-name match
  // is required, so a company with no studies yields none). Launched after the durable store has been loaded, like every other producer.
  // KRYL-1416 (Founder ratified 2026-10-13, narrowly): granted-patent assignee from the local USPTO PatentsView bulk file, exact legal name of the resolved company only. A missing file is stated, never read as "no patents".
  const launchPatents = (alreadyExpected = false) => {
    if (!elig.eligible.includes('patents')) return;
    const ids = scope.entity.identifiers;
    if (!alreadyExpected) expectLookup('patents', { canonicalId: scope.canonicalId });
    // An entity with no SEC CIK that carries an LEI (KRYL-1417): the producer runs only once the live GLEIF record for that LEI confirms the entity now (ACTIVE, ISSUED, legal name equal);
    // the patents are then matched to the GLEIF legal name exactly. Identity only; nothing else is read from the record.
    const ready = ids.edgar ? Promise.resolve({ ok: true, entity: { cik: ids.edgar, lei: ids.lei, name: scope.entity.name } })
      : verifyGleifLei(scope.entity, { gleifLeiFn }).then(v => (v.verified ? { ok: true, entity: { lei: v.lei, name: v.legalName, displayName: scope.entity.name, gleif: v.evidence } } : { ok: false, why: `the GLEIF record for LEI ${ids.lei} did not confirm the entity (${v.reason}${v.detail ? `: ${v.detail}` : ''})` }));
    ready.then((g) => {
      if (!g.ok) return settleLookup('patents', g.why);
      const entity = g.entity;
      return fetchPatentAssignments({ entity }).then((r) => {
        if (r.fileMissing) return settleLookup('patents', `the USPTO granted-patent file is not installed (${r.fileMissing.where}); technology patents are not read`);
        if (r.failed) return settleLookup('patents', `the granted-patent lookup failed (${r.failed})`);
        admitPatentAssignments({ entity, patents: r.patents });
        window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId, error: null } }));
        return settleLookup('patents', null);
      });
    }).catch((e) => settleLookup('patents', String(e?.message ?? e)));
  };
  // KRYL-1418 (Founder ratified 2026-10-13): dated GDELT articles naming the company's SEC registered name, as subject-bound MEDIA observations (never relationships; nothing inferred from an article).
  const launchMedia = () => {
    if (!elig.eligible.includes('media')) return;
    const entity = { cik: scope.entity.identifiers.edgar, name: scope.entity.name };
    expectLookup('media', { canonicalId: scope.canonicalId });
    fetchMediaObservations({ entity }).then((r) => {
      if (r.failed) return settleLookup('media', `the GDELT lookup failed (${r.failed})`);
      const sigs = buildMediaSignals({ canonicalId: scope.canonicalId, entityName: scope.entity.name, result: r });
      if (sigs.length) surfaceRouter.dispatchBatch(sigs);
      admitMediaArticles({ entity, result: r });   // KRYL-1418: only an article whose title names the company becomes a relationship (cited, "named in article")
      window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId, error: null } }));
      return settleLookup('media', null);
    }).catch((e) => settleLookup('media', String(e?.message ?? e)));
  };
  const launchClinical = () => {
    if (!elig.eligible.includes('clinical')) return;
    const entity = { cik: scope.entity.identifiers.edgar, name: scope.entity.name };
    expectLookup('clinical', { canonicalId: scope.canonicalId });
    fetchClinicalTrials({ entity }).then((r) => {
      if (r.failed) return settleLookup('clinical', `the ClinicalTrials.gov lookup failed (${r.failed})`);
      admitClinicalTrials({ entity, trials: r.trials });
      window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId, error: null } }));
      return settleLookup('clinical', null);
    }).catch((e) => settleLookup('clinical', String(e?.message ?? e)));
  };
  if (scope.kind === 'ENTITY' && elig.eligible.includes('ownership')) {
    expectLookup('ownership', { canonicalId: scope.canonicalId }); expectLookup('8k', { canonicalId: scope.canonicalId }); expectLookup('counterparty', { canonicalId: scope.canonicalId }); expectLookup('labor', { canonicalId: scope.canonicalId });
    if (refresh) expectLookup('change', { canonicalId: scope.canonicalId });
    // Decision record step 4: the subject's stored relationships (with their stable ids and history) are loaded into the in-memory store BEFORE the
    // SEC lookups run, so admissions below are recognised as the same relationships (PERSISTENT) and the first view already holds earlier sessions' work.
    expectLookup('store', { canonicalId: scope.canonicalId });
    // The comparison's SEC retrieval starts after the counterparty matching has finished (both search SEC; together they burst, and a burst can come back empty).
    let cpDone; const cpPromise = new Promise((r) => { cpDone = r; });
    const launchLookups = () => {
      markStarted(scope.canonicalId); // DEF-1396: a new run resets any earlier outcome to pending
      launchClinical(); launchPatents(); launchMedia();
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
        // KRYL-1409: acquisitions go through the same matching (shared cache) and the same single write path. They are matched FIRST (one or two names), so
        // a financing-heavy filer's long counterparty list cannot push an acquisition past the snapshot's settlement time.
        const ambiguous = (r?.acquisitionEvents ?? []).flatMap(e => (e.acquisition?.skipped ?? []).filter(x => /^AMBIGUOUS/.test(x.reason)).map(x => ({ accession: e.accession, reason: x.reason })));
        admitAcquisitions({ filer, events: r?.acquisitionEvents ?? [], searchFn: secSearch, registryCache })
          .then(async (acq) => {
            const cap = await admitCapitalEvents({ filer, events: r?.capitalEvents ?? [], searchFn: secSearch, registryCache });
            return { admitted: [...acq.admitted, ...cap.admitted], rejected: [...acq.rejected, ...cap.rejected], matched: cap.matched + acq.matched, deferred: cap.deferred + acq.deferred, acquisitionAmbiguous: ambiguous };
          })
          .then((res) => { setAdmissionReport(scope.canonicalId, res); return settleLookup('counterparty', res.admitted.length === 0 && res.rejected.some(x => x.outcome === 'LOOKUP_FAILED') ? 'counterparty lookups failed' : null); })
          .catch((e) => settleLookup('counterparty', String(e?.message ?? e)))
          .finally(() => cpDone());
      }).catch((e) => { settleLookup('8k', String(e?.message ?? e)); settleLookup('counterparty', 'the 8-K lookup failed'); cpDone(); });

      // KRYL-1411: officers and directors the issuer's SEC Forms 3, 4 and 5 state (both parties by SEC CIK; role as the filing states it), admitted through the single write path.
      { const issuer = { cik: scope.entity.identifiers.edgar, name: scope.entity.name };
        fetchInsiderRoles({ issuer, from: new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10), searchFn: secSearch })
          .then((r) => {
            if (r.failed) { setLaborReport(scope.canonicalId, { failed: r.failed }); return settleLookup('labor', `the SEC insider-form lookup failed (${r.failed})`); }
            const res = admitInsiderRoles({ issuer, roles: r.roles });
            setLaborReport(scope.canonicalId, { personsSeen: r.personsSeen, personsRead: r.personsRead, capped: r.capped, searchCapped: r.searchCapped, failedDocs: r.failedDocs, admitted: res.admitted.length, rejected: res.rejected.length });
            return settleLookup('labor', r.failedDocs > 0 && res.admitted.length === 0 ? 'the insider documents could not be read' : null);
          })
          .catch((e) => settleLookup('labor', String(e?.message ?? e))); }

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
    hydrateFor([toTopologyNodeId(scope.canonicalId)], { timeoutMs: STORE_HYDRATE_MS }).then((h) => settleLookup('store', h.error ? `the durable store was not reachable (${h.error})` : null)).catch((e) => settleLookup('store', String(e?.message ?? e))).finally(launchLookups);

  }

  // KRYL-1417 (Founder ratified 2026-10-13): an entity identified by its GLEIF LEI has no SEC filings; the patent producer is the one producer its identity class supports. The store is
  // loaded first, like every other producer; the other producers are reported with the identifier they need (produceridentifiers.js), never skipped silently.
  if (scope.kind === 'ENTITY' && !scope.entity.identifiers?.edgar && scope.entity.identifiers?.lei) {
    expectLookup('store', { canonicalId: scope.canonicalId });
    if (elig.eligible.includes('patents')) expectLookup('patents', { canonicalId: scope.canonicalId });   // registered now: nothing else keeps the snapshot open for an entity with no SEC filings
    hydrateFor([toTopologyNodeId(scope.canonicalId)], { timeoutMs: STORE_HYDRATE_MS })
      .then((h) => { settleLookup('store', h.error ? `the durable store was not reachable (${h.error})` : null); launchPatents(true); })
      .catch((e) => { settleLookup('store', String(e?.message ?? e)); if (elig.eligible.includes('patents')) settleLookup('patents', 'the durable store step failed first'); });
  }

  // KRYL-1413 (Founder ratified 2026-10-12): a private SEC filer (Form D issuer class) has no Forms 3, 4 or 5; its executive officers and directors are read from its own newest Form D
  // (the person identified only by the name in that filing, scoped to the issuer) and admitted through the single write path. The producer contract (produceridentifiers.js) decides who runs.
  if (scope.kind === 'ENTITY' && elig.eligible.includes('formd-people')) {
    const issuer = { cik: scope.entity.identifiers.edgar, name: scope.entity.name };
    expectLookup('store', { canonicalId: scope.canonicalId }); expectLookup('formd-people', { canonicalId: scope.canonicalId });
    hydrateFor([toTopologyNodeId(scope.canonicalId)], { timeoutMs: STORE_HYDRATE_MS })
      .then((h) => { settleLookup('store', h.error ? `the durable store was not reachable (${h.error})` : null); launchClinical(); launchPatents(); return fetchFormDPeople({ issuer, searchFn: secSearch }); })
      .then((r) => {
        if (r.failed) return settleLookup('formd-people', `the SEC Form D lookup failed (${r.failed})`);
        admitFormDRoles({ issuer, roles: r.roles });
        // KRYL-1415 (D6): the offering the same Form D states, as a dated issuer-bound CAPITAL observation (quoted as stated; not a relationship, no counterparty inferred).
        const sig = buildFormDOfferingSignal({ canonicalId: scope.canonicalId, issuerName: scope.entity.name, filing: r.filing, offering: r.offering });
        if (sig) surfaceRouter.dispatchBatch([sig]);
        window.dispatchEvent(new CustomEvent('krylo-rho-updated', { detail: { canonicalId: scope.canonicalId, error: null } }));
        return settleLookup('formd-people', r.failedDoc && r.roles.length === 0 ? 'the Form D document could not be read' : null);
      })
      .catch((e) => { settleLookup('store', String(e?.message ?? e)); settleLookup('formd-people', String(e?.message ?? e)); });
  }
}
