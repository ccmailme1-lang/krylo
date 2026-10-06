// structurepanel.jsx — the Analysis Surface right panel.
// Full BRIEF / RECON / IMPACT column, restored at 50/50 geometry with the left
// Target Packet.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import IntelligenceBrief from './intelligencebrief.jsx';
import ReconDashboard from './recondashboard.jsx';
import CausalImpactView from './causalimpactview.jsx';
import { inferFormation } from '../../engine/formationinference.js';
import { buildPerceptionField } from '../../engine/perceptionread.js';
import { getAllDomainPressures } from '../../engine/domaingravity.js';
import { interpretStructuralQuery } from '../../engine/structuralqueryinterpreter.js';
import { synthStructuralEntity } from '../../engine/structuralentitysynthesis.js';
import { formationIdFor } from '../../engine/formationsnapshot.js';
import { fetchSubjectFormationHistory } from '../../engine/formationsnapshotclient.js';
import { subjectScope } from '../../engine/subjectscope.js';
import { toTopologyNodeId } from '../../engine/entityresolution.js';
import { findAdmittedRelationshipsFor, latestEvidenceFor } from '../../engine/canonicalrelationshipprojection.js';
import { NODE_LABELS } from '../../engine/entitytopologyregistry.js';
import { usesurfacerouter } from '../../hooks/usesurfacerouter.js';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { synthesizeQuery } from '../../engine/querysynthesis.js';
import { computeBriefSummary } from './structuralbrief.jsx';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// KRYL-1332 (Founder, 2026-09-28): BRIEF (the full Export Brief) removed from the tab set --
// approved scope was specifically "hide the Export Brief," not MAP/RECON/IMPACT, which were
// mistakenly taken down along with it when the whole panel was gated off. Restoring those three,
// keeping only BRIEF out. IntelligenceBrief import/component itself is untouched -- still
// reachable if BRIEF is ever restored, just not in this tab list.
const TABS = ['MAP', 'RECON', 'IMPACT'];

// MAP tab — scaled down so structure-field.html's own margin math (which was landing labels
// too close to the panel edges at 1:1) gets more native room to lay itself out, while the visible
// result is smaller. Dynamic (ResizeObserver-measured), not a hardcoded pixel size -- the
// iframe's native rect is always container size / MAP_SCALE, so it stays correct if the panel
// resizes. Reduced an additional 10% (0.8 -> 0.72) per Founder request, 2026-09-09.
const MAP_SCALE = 0.72;
function FormationMapTab({ query }) {
  const wrapRef = useRef(null);
  const iframeRef = useRef(null);
  const iframeReady = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // KRYL-1287 — real, live formation state (same source BRIEF's own '02 FORMATION' section
  // already correctly uses: targetpacket.jsx's fieldFormation, buildPerceptionField() ->
  // inferFormation(), reading the live domaingravity.js signal pool, not mocked). Two-step
  // memo mirrors targetpacket.jsx exactly (domainPressures stable-ref'd on `query`, fieldFormation
  // depends on that stable ref) -- NOT a continuous poll/timer, matching BRIEF's own freshness
  // cadence (recomputed per query, not on every render).
  // This is ambient/field-scoped, NOT subject-scoped. DEF-1300: KRYL-1220's subject-binding
  // bridge is delivered (BRIEF/Target Packet's own '02 FORMATION' uses it) -- this MAP view
  // was an explicit non-goal of that ticket's scope, not an undelivered dependency. Wiring
  // subject-scoping in here is a real, separate, not-yet-authorized follow-on, not a defect.
  // Live signals land asynchronously after the query is submitted (fireTopicConnectors). A
  // snapshot taken only at query time never saw them, so the MAP stayed empty until a page
  // refresh. fieldTick re-reads the pool, debounced after the last routed signal (precedent:
  // TYPE_DEBOUNCE_MS = 950 in coachwell.jsx). Same router-subscribe hook the rest of the app uses.
  const [fieldTick, setFieldTick] = useState(0);
  const fieldTickTimer = useRef(null);
  usesurfacerouter('structurepanel-map', ['oracle', 'feed', 'analysis'], () => {
    clearTimeout(fieldTickTimer.current);
    fieldTickTimer.current = setTimeout(() => setFieldTick(n => n + 1), 950);
  });
  useEffect(() => () => clearTimeout(fieldTickTimer.current), []);
  const domainPressures = useMemo(() => getAllDomainPressures(), [query, fieldTick]);

  // Supplier Structural Intelligence (specs/SPEC-external-supplier-structural-intelligence.md) --
  // the "real, separate, not-yet-authorized follow-on" the comment above named is this. Reuses
  // subjectScope() (the same resolver topicconnectors.js's fireTopicConnectors() already uses to
  // decide whether to fire a live EDGAR observation for this exact query) -- no new resolution
  // mechanism. Does NOT call runTargetedOwnershipObservation() itself: fireTopicConnectors()
  // already fires it once per real query submit elsewhere in the app, in this same JS runtime, so
  // a second call here would be a duplicate call site. This only READS whatever canonical ρ
  // already holds by the time this renders -- same pattern structuralbrief.jsx's
  // entityCanonicalRelationships already uses, proven live against JPMorgan Chase (64 real
  // admitted relationships) during this ticket's verification.
  const subjScope = useMemo(() => subjectScope(query), [query]);

  // Same real bug/fix as structuralbrief.jsx (2026-10-03): the live EDGAR observation is async,
  // this component reads ρ synchronously at render time, so it renders before admission
  // completes. Listens for the same 'krylo-rho-updated' event, scoped to this subject only.
  const [rhoTick, setRhoTick] = useState(0);
  // Last ownership-observation outcome for this subject (same shape structuralbrief.jsx keeps), so the
  // MAP's brief states a failed check the same way the left column does.
  const [ownershipOutcome, setOwnershipOutcome] = useState(null);
  useEffect(() => {
    if (subjScope.kind !== 'ENTITY') return;
    function onRhoUpdated(e) {
      if (e.detail?.canonicalId !== subjScope.canonicalId) return;
      setOwnershipOutcome({ id: e.detail.canonicalId, error: e.detail?.error ?? null });
      setRhoTick(n => n + 1);
    }
    window.addEventListener('krylo-rho-updated', onRhoUpdated);
    return () => window.removeEventListener('krylo-rho-updated', onRhoUpdated);
  }, [subjScope]);

  const entityRelationships = useMemo(() => {
    if (subjScope.kind !== 'ENTITY') return [];
    return findAdmittedRelationshipsFor(toTopologyNodeId(subjScope.canonicalId)).map(r => {
      const ev = latestEvidenceFor(r.id);
      return {
        id: r.id,
        type: r.type,
        phiClass: r.phiClass,
        part: r.part.map(id => NODE_LABELS[id] ?? id),
        // Real admission evidence (null fields stay null -- the panel shows a stated absence).
        evidence: ev ? {
          filingDate: ev.provenance?.filingDate ?? null,
          form: ev.provenance?.form ?? null,
          accession: ev.provenance?.accession ?? null,
          state: ev.predicate ?? null,
        } : null,
      };
    });
  }, [subjScope, rhoTick]);
  // Label for the subject's node on the Map plot -- the same NODE_LABELS entry ρ's own part ids
  // already resolve through above (EDGAR display name), falling back to the registry name.
  const entitySubjectLabel = useMemo(() => {
    if (subjScope.kind !== 'ENTITY') return null;
    const raw = NODE_LABELS[toTopologyNodeId(subjScope.canonicalId)] ?? subjScope.entity?.name ?? null;
    // NODE_LABELS entries carry a trailing "(CIK ##########)" -- identifier text, not the name.
    return raw ? raw.replace(/\s*\(CIK\s*\d+\)\s*$/, '') : null;
  }, [subjScope, rhoTick]); // rhoTick: NODE_LABELS is filled by the same async admission
  const fieldFormation = useMemo(() => {
    try {
      const field = buildPerceptionField({ now: Date.now() });
      return field.particles.length ? inferFormation(field.particles) : null;
    } catch { return null; }
  }, [domainPressures]);

  // Structural brief shown under the map (Founder, 2026-10-06). Same text the left column shows:
  // computeBriefSummary() is the one computation (structuralbrief.jsx); the session/synthesis are
  // read the way targetpacket.jsx reads them (the existing accepted local-recompute precedent
  // noted below for structuralQuery). The state label is passed only when synthesis has one --
  // targetpacket.jsx's own fallback default is not copied here.
  const sessions   = useAnalysisStore(s => s.sessions);
  const activeId   = useAnalysisStore(s => s.activeSessionId);
  const session    = activeId ? sessions[activeId] : null;
  const synthesis  = useMemo(() => synthesizeQuery(session), [session]);
  const brief = useMemo(() => {
    const activeDomainPressures = Object.values(domainPressures).filter(p => p.signalCount > 0);
    const entityCanonicalRelationships = subjScope.kind === 'ENTITY'
      ? findAdmittedRelationshipsFor(toTopologyNodeId(subjScope.canonicalId))
      : [];
    const ownershipFailure = subjScope.kind === 'ENTITY' && ownershipOutcome?.id === subjScope.canonicalId ? ownershipOutcome.error : null;
    const { subjectLabel, briefSentence, rows } = computeBriefSummary({
      subjScope, activeDomainPressures, fieldFormation,
      structuralQuery: synthesis?.structuralQuery, entityCanonicalRelationships, ownershipFailure,
    });
    return { subjectLabel, stateLabel: synthesis?.stateLabel ?? null, sentence: briefSentence, rows };
  }, [subjScope, domainPressures, fieldFormation, synthesis, ownershipOutcome, rhoTick]);

  // KRYL-1332 (Founder, 2026-09-28) -- real bug: switching tabs away from MAP and back remounts
  // this iframe fresh, but `onLoad` (the DOM `load` event) can fire before structure-field.html's
  // own script has finished executing far enough to register its message listener -- a genuine
  // race, worse on a remount than first mount, which is why nothing worked until a full page
  // refresh gave the timing more slack. A ref keeps the latest fieldFormation available to a
  // one-time 'krylo-map-ready' listener (the iframe now pings back once its listener is actually
  // live), so the send happens in response to a real readiness signal, not a guess about `onLoad`
  // timing. onLoad's own send stays as a harmless redundant first attempt.
  // KRYL-1332 (Founder, 2026-09-28) -- Y-axis fix: MAP's Y was a hash of the domain NAME (layout
  // spacing only, honestly labeled "MOMENTUM -- NOT AVAILABLE"). Replacing with real, already-
  // computed observation counts (domainPressures[domain].signalCount, the same number
  // StructuralBrief already shows as "N observations") -- genuinely independent of X (magnitude
  // is an average, count is a count; the KNOWLEDGE/OWNERSHIP case found live tonight -- 3 obs/
  // magnitude 0 vs. 1 obs/magnitude 98 -- is exactly the kind of thing this now shows directly).
  // Only counts cross the postMessage boundary, not the full domainPressures object.
  const domainSignalCounts = useMemo(() => {
    const out = {};
    for (const [domain, p] of Object.entries(domainPressures)) out[domain] = p.signalCount;
    return out;
  }, [domainPressures]);

  // KRYL-1334 (Founder, 2026-09-30) -- real persisted formation history, for the scrubber.
  // Locally computed structuralQuery, same pattern FormationMapTab already uses for
  // fieldFormation (independent from targetpacket.jsx's own synthesis -- no shared parent
  // state exists to read it from without a bigger prop-threading change; not attempted here,
  // matches this component's existing accepted duplication precedent). Only SUPPORTED pairs
  // have a real formation_id worth fetching history for -- NO_EVIDENCE pairs have never been
  // persisted (buildCandidateRows only ever writes SUPPORTED pairs), so fetching them would
  // always return empty; skipped rather than making a request known to return nothing.
  const [formationHistory, setFormationHistory] = useState([]);
  // KRYL-1350: topicconnectors.js dispatches 'krylo-formation-captured' once a resolved entity's
  // canonical-ρ snapshots have been written; bump a tick so the read below includes them.
  const [captureTick, setCaptureTick] = useState(0);
  useEffect(() => {
    if (subjScope.kind !== 'ENTITY') return;
    function onCaptured(e) {
      if (e.detail?.canonicalId !== subjScope.canonicalId) return;
      setCaptureTick(n => n + 1);
    }
    window.addEventListener('krylo-formation-captured', onCaptured);
    return () => window.removeEventListener('krylo-formation-captured', onCaptured);
  }, [subjScope]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Role-word route (KRYL-1334, unchanged): no longer exits early -- a real-name query is
        // UNINTERPRETABLE here and must still reach the canonical read below (KRYL-1350).
        const interp = interpretStructuralQuery(query);
        const ev = interp.state === 'INTERPRETABLE' ? synthStructuralEntity(interp) : { relationships: [] };
        const supported = ev.relationships.filter(r => r.state === 'SUPPORTED');
        const ids = [...new Set(supported.map(r => formationIdFor({
          subject: null, fieldScope: null, formationScope: null,
          entityA: r.a, entityB: r.b, relationshipType: r.facet?.relationType ?? 'OBSERVED',
        })))];
        // KRYL-1334 (2026-09-30) -- cache-busted: a GET to this exact URL, made once before the
        // backend route existed tonight, could get a 200+HTML fallback response cached by the
        // browser (this endpoint had no Cache-Control header at the time). Real root cause of
        // the scrubber not appearing during testing turned out to be a stale local dev-server
        // tab, not this -- kept anyway, since it's a correct, low-cost defensive fix in its own
        // right (this endpoint's data is always time-sensitive, never cacheable).
        const results = await Promise.all(ids.map(id =>
          fetch(`/v1/formation-state?formationId=${encodeURIComponent(id)}&_=${Date.now()}`, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : { rows: [] })
            .then(j => j.rows ?? [])
            .catch(() => [])
        ));
        // KRYL-1350 (route B): a resolved entity subject's canonical-ρ history, one request.
        const canonicalRows = subjScope.kind === 'ENTITY' ? await fetchSubjectFormationHistory(subjScope.canonicalId) : [];
        if (!cancelled) setFormationHistory([...results.flat(), ...canonicalRows]);
      } catch { if (!cancelled) setFormationHistory([]); }
    }
    load();
    return () => { cancelled = true; console.log('[KRYL-1334-DIAG] effect cleanup ran (cancelled=true) -- component unmounted or query changed again'); };
  }, [query, captureTick]);

  const fieldFormationRef = useRef(fieldFormation);
  const domainSignalCountsRef = useRef(domainSignalCounts);
  const formationHistoryRef = useRef(formationHistory);
  const entityRelationshipsRef = useRef(entityRelationships);
  useEffect(() => { fieldFormationRef.current = fieldFormation; }, [fieldFormation]);
  useEffect(() => { domainSignalCountsRef.current = domainSignalCounts; }, [domainSignalCounts]);
  useEffect(() => { formationHistoryRef.current = formationHistory; }, [formationHistory]);
  useEffect(() => { entityRelationshipsRef.current = entityRelationships; }, [entityRelationships]);
  const entitySubjectLabelRef = useRef(entitySubjectLabel);
  useEffect(() => { entitySubjectLabelRef.current = entitySubjectLabel; }, [entitySubjectLabel]);
  const briefRef = useRef(brief);
  useEffect(() => { briefRef.current = brief; }, [brief]);

  useEffect(() => {
    if (!iframeReady.current || !iframeRef.current) return;
    iframeRef.current.contentWindow.postMessage({ type: 'krylo-field-formation', formation: fieldFormation, domainSignalCounts, formationHistory, entityRelationships, entitySubjectLabel, brief }, '*');
  }, [fieldFormation, domainSignalCounts, formationHistory, entityRelationships, entitySubjectLabel, brief]);

  useEffect(() => {
    function onMapReady(e) {
      if (e.data?.type !== 'krylo-map-ready') return;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      iframeReady.current = true;
      iframeRef.current.contentWindow.postMessage({ type: 'krylo-field-formation', formation: fieldFormationRef.current, domainSignalCounts: domainSignalCountsRef.current, formationHistory: formationHistoryRef.current, entityRelationships: entityRelationshipsRef.current, entitySubjectLabel: entitySubjectLabelRef.current, brief: briefRef.current }, '*');
    }
    window.addEventListener('message', onMapReady);
    return () => window.removeEventListener('message', onMapReady);
  }, []);

  const handleLoad = () => {
    iframeReady.current = true;
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({ type: 'krylo-field-formation', formation: fieldFormationRef.current, domainSignalCounts: domainSignalCountsRef.current, formationHistory: formationHistoryRef.current, entityRelationships: entityRelationshipsRef.current, entitySubjectLabel: entitySubjectLabelRef.current, brief: briefRef.current }, '*');
    }
  };

  const nativeW = size.w / MAP_SCALE;
  const nativeH = size.h / MAP_SCALE;

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {size.w > 0 && (
        <iframe
          ref={iframeRef}
          src="/structure-field.html"
          title="Formation Map"
          onLoad={handleLoad}
          style={{
            width: nativeW, height: nativeH, border: 'none', display: 'block',
            transform: `scale(${MAP_SCALE})`, transformOrigin: 'top left',
          }}
        />
      )}
    </div>
  );
}

export default function StructurePanel({ query }) {
  const [tab, setTab] = useState('MAP');

  return (
    <div style={{
      position: 'absolute', top: 64, left: '52.5%', right: 0, bottom: 0, zIndex: 10,
      background: '#000', borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0, background: '#000' }}>
        {TABS.map(t => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '16px 20px 14px', background: 'transparent', border: 'none',
                borderBottom: `3px solid ${on ? LIME : 'transparent'}`,
                color: on ? LIME : 'rgba(255,255,255,0.55)',
                fontFamily: MONO, fontSize: 13, letterSpacing: '0.3em', // KRYL-1371: tab size per the cleanup mockup (was 10px / .22em / 2px)
                cursor: 'pointer', textTransform: 'uppercase', marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {tab === 'BRIEF' ? <IntelligenceBrief />
          : tab === 'RECON' ? <ReconDashboard />
          : tab === 'IMPACT' ? <div style={{ height: '100%', overflowY: 'auto' }}><CausalImpactView subject={query} /></div>
          : <FormationMapTab query={query} />}
      </div>
    </div>
  );
}
