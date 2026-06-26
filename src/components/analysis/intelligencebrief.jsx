// WO-1341 — Intelligence Brief: Premium HUD Surface
// Houston Mission Control / Presidential Situation Room aesthetic
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import ActionMatrix          from './actionmatrix.jsx';
import EQCanvas              from './eqcanvas.jsx';
import { LensRegistry }      from '../../engine/lensadapters.js';
import { synthesizeQuery }   from '../../engine/querysynthesis.js';
import { useHappyPathEngine, useUnicornAlerts } from '../../engine/happypathdisplacementengine.js';
import { useConvictionStore, useThesisMonitor, computeCalibration } from '../../engine/convictionstore.js';
import { emitTelemetry }     from '../../engine/telemetry.js';
import { getDisplayEntity }  from '../../utils/formatters.js';
import { buildExportPayload, triggerDownload, canExport, EXPORT_FS_GATE, RUNTIME_STATE } from '../../engine/consultingexport.js';
import { validateImport, reconstructSession, reconstructAcquisition, parseImportFile } from '../../engine/consultingimport.js';
import { getTracker } from '../../engine/decisionvelocity.js';
import { computeMetrics } from '../../engine/metricsengine.js';
import MetricStrip from './metricstrip.jsx';
import { logEmission, logOutcome, getLRPrior, getByConvictionId } from '../../engine/pathstore.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Times New Roman', serif";
const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const BORDER = 'rgba(255,255,255,0.08)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.88)';
const PURPLE   = '#8A2BE2';
const LIME_DIM = 'rgba(102,255,0,0.25)';
const LIME_MID = 'rgba(102,255,0,0.5)';

// ── Data ──────────────────────────────────────────────────────────────────────
function buildBrief(session, synthesis, hp = null) {
  const entity     = getDisplayEntity(session?.query ?? 'Unknown Signal');
  const lens       = session?.lens  ?? null;
  const hpDomains  = hp?.qualified ? hp.domains : null;
  // Domain field = query's classified subject domain. The HP macro-convergence
  // domains (the 6 locked: TECHNOLOGY/CAPITAL/...) describe WHERE convergence was
  // detected in the signal field — not the subject of the analysis. They belong in
  // the BLUF, not here. Leaking hp.domains[0] mislabeled expense queries as TECHNOLOGY.
  const domain = (synthesis?.queryDomain && synthesis.queryDomain !== 'AMBIGUOUS')
    ? synthesis.queryDomain
    : (session?.tensor?.domain ?? session?.tensor?.domains?.[0] ?? 'FINANCIAL');
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8) + ' EST';

  // INSUFFICIENT SIGNAL gate: when the engine flags the query as unresolved
  // (AMBIGUOUS / resolutionEligible:false), refuse to fabricate. Do NOT fall back
  // to the ambient Happy Path BLUF or the lens-adapter frames — those invent a
  // confident brief for input the engine itself rated as having no anchor.
  if (synthesis?.resolutionEligible === false || synthesis?.queryDomain === 'AMBIGUOUS') {
    return {
      classification: '//KRYLO//SIGNAL-CLASSIFIED//ANALYTICAL-USE-ONLY//',
      subject:    entity.toUpperCase(),
      lens:       lens ?? 'UNANCHORED',
      date:       dateStr,
      asOf:       timeStr,
      originator: 'ORACLE KERNEL v3.7.2',
      domain:     'INSUFFICIENT SIGNAL',
      cac:        '—',
      roas:       '—',
      insufficient: true,
      bluf:       'Insufficient signal to synthesize a brief. The query did not resolve to a domain with adequate structural data. Add a specific decision, dollar amount, or timeline to anchor analysis.',
      purpose:    'No domain anchor resolved — brief withheld to avoid fabrication.',
      fiveWs:     [],
      evidence:   [],
      assumptions:[],
      assessment: 'Analysis withheld: the input did not meet the minimum signal threshold for synthesis.',
      threats:    [],
      opportunities: [],
      coas:       [],
      alternativeView: '',
      outlook:    [],
    };
  }

  const adapter = LensRegistry.resolve(lens);
  const payload   = { entity, domain, lens };

  return {
    classification: '//KRYLO//SIGNAL-CLASSIFIED//ANALYTICAL-USE-ONLY//',
    subject:        entity.toUpperCase(),
    lens:           lens ?? 'UNANCHORED',
    date:           dateStr,
    asOf:           timeStr,
    originator:     'ORACLE KERNEL v3.7.2',
    domain:         domain.toUpperCase(),

    bluf:           synthesis?.bluf    ?? (hpDomains
      ? `Happy Path qualified: HIGH convergence across ${hpDomains.join(' + ')} — score ${hp.peakScore?.toFixed(0) ?? '—'}/100. Structural asymmetry confirmed.`
      : `Structural convergence detected in the ${domain.toLowerCase()} domain.`),
    purpose:        synthesis?.purpose ?? `To support ${lens ? lens.toLowerCase() + '-lens' : 'general'} decision-maker action.`,
    fiveWs:         synthesis?.fiveWs  ?? adapter.fiveWs?.(payload) ?? [],
    evidence:       synthesis?.evidence       ?? [],
    assumptions:    synthesis?.assumptions    ?? [],
    assessment:     synthesis?.assessment     ?? adapter.assessmentFrame(payload),
    threats:        synthesis?.threats        ?? adapter.threatContext(payload),
    opportunities:  synthesis?.opportunities  ?? adapter.opportunities(payload),
    coas:           adapter.coas(payload),
    alternativeView: synthesis?.alternativeView ?? `A minority position holds that current signals reflect seasonal variance rather than structural shift.`,
    outlook:        synthesis?.outlook ?? [
      { prob: 0.78, label: 'Phase transition completes — HIGH CONVERGENCE lock within 48h',  color: LIME },
      { prob: 0.15, label: 'Signal attenuates — BUILDING CONVERGENCE sustained without lock', color: BLUE },
      { prob: 0.07, label: 'Rapid dissolution — return to INSUFFICIENT SIGNAL baseline',      color: DIM  },
    ],
  };
}

// ── Chrome sub-components ─────────────────────────────────────────────────────

function ClassificationBanner({ text }) {
  return (
    <div style={{
      flexShrink: 0, padding: '7px 20px',
      background: 'rgba(102,255,0,0.04)',
      borderTop: `1px solid rgba(102,255,0,0.25)`,
      borderBottom: `1px solid rgba(102,255,0,0.25)`,
      textAlign: 'center',
      fontFamily: MONO, fontSize: 9, letterSpacing: '0.38em',
      color: LIME, textTransform: 'uppercase',
      position: 'relative', zIndex: 1,
    }}>
      {text}
    </div>
  );
}

function Panel({ seq, label, children }) {
  const bracketColor = 'rgba(102,255,0,0.22)';
  return (
    <div style={{ position: 'relative', marginBottom: 20, padding: '14px 14px 14px 14px' }}>
      {/* Section stamp */}
      <div style={{
        position: 'absolute', top: -7, left: 14,
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em',
        color: LIME_MID, background: 'transparent', padding: '0 8px',
        textTransform: 'uppercase',
      }}>
        {seq} · {label}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, valueColor = MID }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase', flexShrink: 0, minWidth: 'calc(72px + 1ch)' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: valueColor, letterSpacing: '0.1em' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(102,255,0,0.1)' }} />
      <div style={{ width: 3, height: 3, background: 'rgba(102,255,0,0.3)', transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: 'rgba(102,255,0,0.1)' }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function IntelligenceBrief() {
  const [premiumLocked, setPremiumLocked] = useState(true);
  const sessions               = useAnalysisStore(s => s.sessions);
  const activeId               = useAnalysisStore(s => s.activeSessionId);
  const pendingAcquisition     = useAnalysisStore(s => s.pendingAcquisition);
  const createSession          = useAnalysisStore(s => s.createSession);
  const setPendingAcquisition  = useAnalysisStore(s => s.setPendingAcquisition);
  const liveSession            = activeId ? sessions[activeId] : null;
  const staleSessionRef        = useRef(null);
  const [fadeIn, setFadeIn]    = useState(true);
  const prevActiveId           = useRef(activeId);
  const [sysTime, setSysTime]  = useState(() => new Date().toTimeString().slice(0, 8));
  const [exported, setExported] = useState(false);
  const [importState, setImportState] = useState(null); // { status, message, meta }
  const fileInputRef = useRef(null);
  // WO-1852 — hypothesis binding state (index-free, explicit only)
  const [pendingHypothesisId, setPendingHypothesisId] = useState('');

  if (liveSession) staleSessionRef.current = liveSession;
  const session    = liveSession ?? staleSessionRef.current ?? null;
  const isExpired  = !liveSession && staleSessionRef.current != null;

  const fs = pendingAcquisition?.fidelityScore
          ?? session?.tensor?.fidelityScore
          ?? session?.tensor?.confidence
          ?? 0;
  const exportUnlocked = canExport(fs, session?.lens);
  const isImported     = session?.tensor?.isImported ?? false;

  // t₂ — decision terminal event: fires on allow OR deny whenever gate resolves
  useEffect(() => {
    if (!session) return;
    const flowId = session._dvFlowId ?? null;
    if (!flowId) return;                        // no t₀ yet → phantom mount, skip
    const tracker = getTracker(flowId);
    if (!tracker) return;                       // tracker released or never started
    const convergenceScore = session?.tensor?.convergenceScore ?? null;
    const confidence       = session?.tensor?.confidence ?? null;
    const decision         = exportUnlocked ? 'allow' : 'deny';
    tracker.emit({ convergenceScore, confidence, decision });
  }, [exportUnlocked, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // WO-1878: use execute-time synthesis (full domain context) if present; re-derive only for legacy/imported sessions.
  const synthesis = useMemo(() => {
    if (!session?.query) return null;
    return session.tensor?.synthesis ?? synthesizeQuery(session);
  }, [session]);

  // WO-1752: runtime state
  const replayState = session?.tensor?.replayState ?? RUNTIME_STATE.LIVE;
  const replayMode  = replayState === RUNTIME_STATE.REPLAYING;

  function handleExport() {
    if (!exportUnlocked || !session) return;
    const brief   = buildBrief(session, synthesis, hp);
    const payload = buildExportPayload(brief, { ...session, pendingAcquisition }, fs, hp);
    triggerDownload(payload);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const { json, error: parseError } = await parseImportFile(file);
    if (parseError) {
      setImportState({ status: 'error', message: 'PARSE FAILURE — invalid file' });
      return;
    }

    const validation = validateImport(json);
    if (!validation.valid) {
      const msg = {
        INVALID_SCHEMA:       'SCHEMA MISMATCH — not a Krylo export',
        MISSING_FIELDS:       'CORRUPT EXPORT — required fields missing',
        FS_BELOW_GATE:        `Fs ${Math.round((validation.fs ?? 0) * 100)}% — below import gate (70%)`,
        PARSE_FAILURE:        'PARSE FAILURE',
        HASH_MISMATCH:        'INTEGRITY FAILURE — artifact hash mismatch, possible tampering',
        PROVENANCE_INTEGRITY: `PROVENANCE BREAK — ${validation.detail ?? 'signal source not found in snapshot'}`,
        DAG_INTEGRITY:        `DAG BREAK — ${validation.detail ?? 'evidence graph invalid'}`,
        FIDELITY_MISMATCH:    `Fs INCONSISTENCY — ${validation.detail ?? 'snapshot confidence diverges from provenance'}`,
      }[validation.error] ?? 'IMPORT REJECTED';
      setImportState({ status: 'error', message: msg });
      return;
    }

    const { lens, query, tensor } = reconstructSession(json);
    const acquisition             = reconstructAcquisition(json);
    const newId                   = crypto.randomUUID();

    createSession(newId, lens, query, tensor);
    setPendingAcquisition(acquisition);

    setImportState({
      status:       'success',
      versionMatch: validation.versionMatch,
      staleDays:    validation.staleDays,
      stateType:    validation.stateType,
      timeFrozen:   validation.timeFrozen,
      replayState:  validation.replayState,
      artifactHash: validation.artifactHash,
      isV1752:      validation.isV1752,
    });
  }

  useEffect(() => {
    if (replayMode) return; // frozen clock in REPLAYING state
    const t = setInterval(() => setSysTime(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(t);
  }, [replayMode]);

  if (!session) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.4em', textTransform: 'uppercase' }}>No Active Session</span>
      </div>
    );
  }

  const [hpOpen, setHpOpen]       = useState(false);
  const [hpDismissed, setHpDismissed] = useState(false);
  const [hpLog, setHpLog]         = useState([]);
  const [hpHeld, setHpHeld]       = useState(false);
  const hpHoldTimer               = useRef(null);
  const hpAnchorRef               = useRef(null);
  const scrollBodyRef             = useRef(null);
  const hpSnapshot                = useRef(null);
  const { engineState }           = useHappyPathEngine();
  const { alerts, clearAlerts }   = useUnicornAlerts(5);
  const hp                        = engineState?.happyPath ?? null;
  const [outcomeInput, setOutcomeInput] = useState(null); // { convictionId, pathId, value, followed }
  const lrPrior = useMemo(() => {
    if (!synthesis || synthesis.resolutionEligible === false) return null;
    return getLRPrior({ domain: synthesis.queryDomain, stateLabel: synthesis.stateLabel ?? 'BUILDING CONVERGENCE', lens: session?.lens ?? 'GENERAL' });
  }, [synthesis, session?.lens]);
  const metrics                   = useMemo(() => computeMetrics(synthesis, engineState, null, lrPrior), [synthesis, engineState, lrPrior]);

  const brief = buildBrief(session, synthesis, hp);
  const outputFilters = session?.tensor?.outputFilters ?? { precursors: true, risks: true, opportunities: true, contradictions: true };
  const convictions               = useConvictionStore();

  useEffect(() => {
    if (hp?.qualified) {
      hpSnapshot.current = hp;
      setHpHeld(true);
      clearTimeout(hpHoldTimer.current);
      if (!hpOpen) {
        hpHoldTimer.current = setTimeout(() => setHpHeld(false), 5000);
      }
    } else {
      if (!hpOpen) {
        setHpHeld(false);
        setHpLog([]);
      }
    }
  }, [hp?.qualified, hpOpen]);

  useEffect(() => {
    if (!hp?.qualified) return;
    setHpLog(prev => {
      if (prev.some(e => e.key === 'hp_qualified')) return prev;
      return [...prev, {
        key: 'hp_qualified', type: 'state_event', ts: Date.now(),
        label: 'HP QUALIFIED', detail: `${hp.domains?.join(' · ') ?? '—'} · score ${hp.peakScore?.toFixed(0) ?? '—'}`,
      }];
    });
  }, [hp?.qualified]);

  useEffect(() => {
    if (!hp?.qualified || !alerts.length) return;
    const a = alerts[alerts.length - 1];
    setHpLog(prev => [...prev, {
      key: `signal_${a?.id ?? Date.now()}`, type: 'signal_event', ts: a?.ts ?? Date.now(),
      label: 'DOMAIN ALERT', detail: a?.label ?? '—',
    }]);
  }, [alerts.length]);
  const monitorMap                = useThesisMonitor(convictions.active, engineState?.domainStates, hp);
  const calibration               = useMemo(() => computeCalibration(convictions.resolved), [convictions.resolved]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Keyframes */}
      <style>{`
        @keyframes ib-blink  { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes ib-scan   { 0%{transform:translateY(0)} 100%{transform:translateY(4px)} }
        @keyframes hp-pulse  { 0%,100%{opacity:1} 50%{opacity:0.55} }
      `}</style>

      {/* Background layers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(102,255,0,0.048) 1px, transparent 1px)',
        backgroundSize: '22px 22px' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.056) 3px, rgba(0,0,0,0.056) 4px)' }} />

      {/* Premium lock */}
      {premiumLocked && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', color: DIM, textTransform: 'uppercase' }}>Intelligence Brief</span>
          <span style={{ fontFamily: SERIF, fontSize: 18, color: BRT }}>Premium Feature</span>
          <button onClick={() => setPremiumLocked(false)} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: LIME, background: 'transparent', border: `1px solid rgba(102,255,0,0.3)`, padding: '6px 20px', textTransform: 'uppercase', cursor: 'pointer' }}>Upgrade to Unlock</button>
        </div>
      )}

      {/* ── HAPPY PATH FULL-SCREEN OVERLAY ───────────────────────────────── */}
      {hpOpen && hpSnapshot.current && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: '#000', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header bar */}
          <div style={{ flexShrink: 0, padding: '8px 20px', borderBottom: `1px solid rgba(138,43,226,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: PURPLE, textTransform: 'uppercase' }}>Happy Path Identified</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.5)', letterSpacing: '0.18em' }}>{hpSnapshot.current.domains.join(' · ')}</span>
              <span
                onClick={() => { setHpOpen(false); setHpDismissed(true); }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#fff'}
                style={{ color: '#fff', cursor: 'pointer', fontFamily: MONO, fontSize: 14, lineHeight: 1, userSelect: 'none', background: 'none', border: 'none' }}
              >✕</span>
            </div>
          </div>
          {/* Metrics */}
          <div style={{ flexShrink: 0, padding: '14px 20px', borderBottom: `1px solid rgba(138,43,226,0.12)`, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'CONVERGENCE', value: 'HIGH — sustained' },
              { label: 'VELOCITY',    value: hpSnapshot.current.velocity },
              { label: 'SCORE',       value: `${hpSnapshot.current.peakScore.toFixed(0)} / 100` },
              { label: 'COUNTER',     value: 'None above threshold' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.45)', letterSpacing: '0.22em' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: PURPLE, letterSpacing: '0.08em' }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Invalidation */}
          <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: `1px solid rgba(138,43,226,0.08)`, fontFamily: SERIF, fontSize: 10, color: 'rgba(138,43,226,0.55)', lineHeight: 1.55 }}>
            Invalidated by: velocity reversal in any qualifying domain · counter-signal breach · convergence below floor.
          </div>
          {/* Domain alerts */}
          {alerts.length > 0 && (
            <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: `1px solid rgba(138,43,226,0.08)`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.22em', color: 'rgba(138,43,226,0.45)' }}>DOMAIN · ALERTS</span>
                <span onClick={clearAlerts} style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', cursor: 'pointer', letterSpacing: '0.12em' }}>CLEAR</span>
              </div>
              {alerts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', flexShrink: 0 }}>{new Date(a.ts).toTimeString().slice(0, 8)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: PURPLE, letterSpacing: '0.1em' }}>{a.label}</span>
                </div>
              ))}
            </div>
          )}
          {/* HP Update Log */}
          <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: `1px solid rgba(138,43,226,0.08)` }}>
            <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: LIME_MID, textTransform: 'uppercase', marginBottom: 6 }}>HP UPDATE LOG</div>
            {hpLog.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.14em' }}>[ awaiting signal ]</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {hpLog.map(entry => (
                  <div key={entry.key} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>{new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                    <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>{entry.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>{entry.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* EQ Canvas */}
          <div style={{ padding: '6px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase', flexShrink: 0 }}>HYPOTHESIS · BIND ID</span>
            <input
              value={pendingHypothesisId}
              onChange={e => setPendingHypothesisId(e.target.value.trim())}
              placeholder="enter hypothesis id"
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${pendingHypothesisId ? LIME : 'rgba(255,255,255,0.12)'}`, fontFamily: MONO, fontSize: 8, color: pendingHypothesisId ? LIME : DIM, letterSpacing: '0.08em', padding: '2px 0', outline: 'none' }}
            />
            {pendingHypothesisId && (
              <span onClick={() => setPendingHypothesisId('')} style={{ fontFamily: MONO, fontSize: 8, color: DIM, cursor: 'pointer' }}>✕</span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EQCanvas
              isPremium={true}
              onCommitThesis={({ domain, engineState: es }) => {
                const arb      = es?.arbitration ?? session?.tensor?.arbitration;
                const rate     = arb?.total > 0 ? (arb.passed / arb.total) : 0;
                const winState = rate > 0.5 ? 'OPEN' : rate > 0.25 ? 'TIGHT' : 'CLOSING';
                const convId   = convictions.commit({
                  sessionId:           session?.id ?? null,
                  thesis:              session?.query ?? null,
                  timeHorizon:         synthesis?.timeHorizon ?? null,
                  domains:             es?.happyPath?.domains ?? hp?.domains ?? [],
                  peakScore:           es?.happyPath?.peakScore ?? hp?.peakScore ?? 0,
                  velocity:            es?.happyPath?.velocity ?? 'FLAT',
                  domainStates:        es?.domainStates ?? {},
                  hypothesisId:        pendingHypothesisId || null,
                  windowStateAtCommit: winState,
                });
                // WO-1869: record the emission in Path Memory so outcomes can close the loop
                logEmission({
                  convictionId: convId,
                  domain:       synthesis?.queryDomain ?? domain ?? 'UNKNOWN',
                  stateLabel:   synthesis?.stateLabel  ?? 'BUILDING CONVERGENCE',
                  lens:         session?.lens           ?? 'GENERAL',
                  projectedValue: metrics?.ltv?.value   ?? 0,
                });
                setPendingHypothesisId('');
                emitTelemetry({ type: 'CommitThesisEvent', domain, hypothesisId: pendingHypothesisId || null, windowState: winState, timestamp: new Date().toISOString() });
              }}
              onSetTrigger={({ domain, peakPosition }) => {
                window.dispatchEvent(new CustomEvent('hp:peak.trigger_set', {
                  detail: { domain, peakPosition, prefix: 'DOMAIN ·' },
                }));
              }}
            />
          </div>
        </div>
      )}

      {/* ── TOP CLASSIFICATION BANNER ─────────────────────────────────────── */}
      <ClassificationBanner text={brief.classification} />

      {/* ── MISSION HEADER ────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '8px 20px',
        borderBottom: `1px solid rgba(102,255,0,0.12)`,
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: LIME, fontSize: 9, animation: 'ib-blink 1.4s ease-in-out infinite' }}>●</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: LIME_MID, letterSpacing: '0.22em' }}>ORACLE KERNEL ACTIVE</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em' }}>MISSION: {brief.subject}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em' }}>SIGNAL LOCK</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: LIME, letterSpacing: '0.12em' }}>{sysTime} EST</span>
        </div>
      </div>

      {/* ── HAPPY PATH + EQ CANVAS — leadoff, directly under Oracle Kernel ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(102,255,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.28em', color: 'rgba(102,255,0,0.55)', whiteSpace: 'nowrap' }}>HP · HAPPY PATH</span>
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ transform: 'rotate(2deg)', position: 'relative', top: 1 }}>
              <ellipse cx="4"  cy="15" rx="5.5" ry="3.2" transform="rotate(-8 4 15)"  fill="#66FF00" fillOpacity="1"/>
              <ellipse cx="10" cy="10" rx="4.2" ry="2.5" transform="rotate(-8 10 10)" fill="#66FF00" fillOpacity="0.72"/>
              <ellipse cx="16" cy="6"  rx="3.0" ry="1.8" transform="rotate(-8 16 6)"  fill="#66FF00" fillOpacity="0.48"/>
              <ellipse cx="20" cy="3"  rx="1.9" ry="1.1" transform="rotate(-8 20 3)"  fill="#66FF00" fillOpacity="0.28"/>
            </svg>
            <div
              onClick={() => { if (!hpSnapshot.current) return; setHpOpen(true); setHpDismissed(false); setTimeout(() => { if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0; }, 80); }}
              style={{
                cursor: hpSnapshot.current ? 'pointer' : 'default',
                padding: '4px 6px', display: 'flex', alignItems: 'center',
                animation: hp?.qualified ? 'ib-blink 1.4s ease-in-out infinite' : 'none',
                opacity: hp?.qualified ? 1 : hpSnapshot.current ? 0.5 : 0,
                visibility: hpSnapshot.current ? 'visible' : 'hidden',
                marginLeft: '5%',
                pointerEvents: hpSnapshot.current ? 'auto' : 'none',
              }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
                <path d="M2 2 H10 L14 6 V18 H2 Z" stroke={PURPLE} strokeWidth="1" fill="none"/>
                <path d="M10 2 V6 H14" stroke={PURPLE} strokeWidth="1" fill="none"/>
                <line x1="4.5" y1="9"  x2="11.5" y2="9"  stroke={PURPLE} strokeWidth="0.9"/>
                <line x1="4.5" y1="12" x2="11.5" y2="12" stroke={PURPLE} strokeWidth="0.9"/>
                <line x1="4.5" y1="15" x2="9"    y2="15" stroke={PURPLE} strokeWidth="0.9"/>
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em',
                textTransform: 'uppercase', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(0,127,255,0.3)',
                color: BLUE,
                padding: '5px 14px',
                transition: 'all 200ms ease',
              }}
            >EXPORT BRIEF</button>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────────── */}
      <div ref={scrollBodyRef} style={{ flex: 3, minHeight: 0, overflowY: 'auto', padding: '16px 16px 24px', position: 'relative', zIndex: 1 }}>

        {/* HP overlay rendered outside scroll body — see root div */}
        {false && (
          <div>
            <div style={{ border: `1px solid rgba(138,43,226,0.3)`, background: 'rgba(138,43,226,0.04)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: PURPLE, textTransform: 'uppercase' }}>Happy Path Identified</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.5)', letterSpacing: '0.18em' }}>{hpSnapshot.current.domains.join(' · ')}</span>
                  <span
                    onClick={() => { setHpOpen(false); setHpDismissed(true); }}
                    onMouseEnter={e => e.currentTarget.style.color = PURPLE}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(138,43,226,0.45)'}
                    style={{ color: 'rgba(138,43,226,0.45)', cursor: 'pointer', fontFamily: MONO, fontSize: 10, lineHeight: 1, userSelect: 'none' }}
                  >x</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'CONVERGENCE', value: 'HIGH — sustained' },
                  { label: 'VELOCITY',    value: hpSnapshot.current.velocity },
                  { label: 'SCORE',       value: `${hpSnapshot.current.peakScore.toFixed(0)} / 100` },
                  { label: 'COUNTER',     value: 'None above threshold' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.45)', letterSpacing: '0.22em' }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: PURPLE, letterSpacing: '0.08em' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 10, color: 'rgba(138,43,226,0.55)', lineHeight: 1.55, borderTop: `1px solid rgba(138,43,226,0.12)`, paddingTop: 8 }}>
                Invalidated by: velocity reversal in any qualifying domain · counter-signal breach · convergence below floor.
              </div>
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid rgba(138,43,226,0.12)`, paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.22em', color: 'rgba(138,43,226,0.45)' }}>DOMAIN · ALERTS</span>
                    <span onClick={clearAlerts} style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', cursor: 'pointer', letterSpacing: '0.12em' }}>CLEAR</span>
                  </div>
                  {alerts.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', flexShrink: 0 }}>{new Date(a.ts).toTimeString().slice(0, 8)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: PURPLE, letterSpacing: '0.1em' }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {convictions.active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px 12px' }}>
                <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: 'rgba(138,43,226,0.45)', textTransform: 'uppercase' }}>
                  Active Convictions · {convictions.active.length}
                </div>
                {convictions.active.map(c => {
                  const mAlerts    = monitorMap[c.id] ?? [];
                  const highAlerts = mAlerts.filter(a => a.severity === 'high');
                  const borderColor = highAlerts.length > 0 ? 'rgba(255,80,80,0.5)'
                    : mAlerts.some(a => a.severity === 'medium') ? 'rgba(138,43,226,0.6)' : 'rgba(138,43,226,0.4)';
                  return (
                    <div key={c.id} style={{ borderLeft: `2px solid ${borderColor}`, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.4)', letterSpacing: '0.14em' }}>
                          {new Date(c.committedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', letterSpacing: '0.12em' }}>{c.domains.join(' · ')}</span>
                      </div>
                      {c.thesis && (
                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, letterSpacing: '0.03em' }}>
                          {c.thesis.length > 120 ? c.thesis.slice(0, 117) + '…' : c.thesis}
                        </div>
                      )}
                      {mAlerts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: 5 }}>
                          {mAlerts.map((a, i) => (
                            <div key={i} style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.5, letterSpacing: '0.03em',
                              color: a.severity === 'high' ? 'rgba(255,80,80,0.85)' : a.severity === 'medium' ? 'rgba(255,255,255,0.55)' : 'rgba(102,255,0,0.5)',
                            }}>{a.message}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['confirmed', 'denied', 'timed_out'].map(res => (
                          <button key={res} onClick={() => convictions.resolve(c.id, res)} style={{
                            fontFamily: MONO, fontSize: 6, letterSpacing: '0.16em', textTransform: 'uppercase',
                            background: 'transparent', cursor: 'pointer', padding: '3px 8px',
                            border: `1px solid rgba(138,43,226,0.25)`, color: 'rgba(138,43,226,0.45)',
                          }}>{res.replace('_', ' ')}</button>
                        ))}
                        <button onClick={() => convictions.dismiss(c.id)} style={{
                          fontFamily: MONO, fontSize: 6, letterSpacing: '0.16em', textTransform: 'uppercase',
                          background: 'transparent', cursor: 'pointer', padding: '3px 8px',
                          border: `1px solid rgba(255,255,255,0.08)`, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto',
                        }}>DISMISS</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {convictions.resolved.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px 16px', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
                    Decision Lineage · {convictions.resolved.length}
                  </span>
                  {calibration.total >= 5 && (
                    <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: LIME }}>
                      {Math.round(calibration.overallAccuracy * 100)}% ACCURACY
                    </span>
                  )}
                </div>
                {(calibration.overallAccuracy !== null || calibration.hpAccuracy !== null || calibration.domainAccuracy.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '8px 12px', borderLeft: `2px solid rgba(102,255,0,0.2)` }}>
                    {calibration.overallAccuracy !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Overall · {calibration.total}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.08em' }}>{calibration.confirmed}C · {calibration.denied}D · {calibration.timedOut}T</span>
                      </div>
                    )}
                    {calibration.hpAccuracy !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Happy Path · {calibration.hpResolved}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: PURPLE, letterSpacing: '0.08em' }}>{Math.round(calibration.hpAccuracy * 100)}%</span>
                      </div>
                    )}
                    {calibration.domainAccuracy.map(g => (
                      <div key={g.domains.join('+')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{g.domains.join(' · ')} · {g.count}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.08em' }}>{Math.round(g.accuracy * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {calibration.overallAccuracy === null && calibration.hpAccuracy === null && calibration.domainAccuracy.length === 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', lineHeight: 1.6 }}>
                    Calibration metrics appear after more convictions are resolved.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {convictions.resolved.map(r => {
                    const resColor   = r.resolution === 'confirmed' ? LIME : r.resolution === 'denied' ? 'rgba(255,80,80,0.8)' : DIM;
                    const hadHP      = r.peakScore >= 75 && r.domains.length >= 2;
                    const pathRecs   = getByConvictionId(r.id);
                    const path       = pathRecs[0] ?? null;
                    const hasOutcome = path?.outcomeLoggedAt != null;
                    const showForm   = outcomeInput?.convictionId === r.id;
                    return (
                      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 5, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                            {new Date(r.committedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {hadHP && <span style={{ fontFamily: MONO, fontSize: 5, letterSpacing: '0.18em', color: PURPLE, border: `1px solid rgba(138,43,226,0.3)`, padding: '1px 4px' }}>HP</span>}
                            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: resColor, textTransform: 'uppercase' }}>{r.resolution.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>{r.domains.join(' · ')}</span>
                        {r.thesis && (
                          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, letterSpacing: '0.02em' }}>
                            {r.thesis.length > 100 ? r.thesis.slice(0, 97) + '…' : r.thesis}
                          </div>
                        )}
                        {/* WO-1869: outcome capture + LR display */}
                        {hasOutcome && path.lr !== null && (
                          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.14em' }}>
                            LR {path.lr.toFixed(2)}× · {path.followed}
                          </span>
                        )}
                        {hasOutcome && path.lr === null && (
                          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.14em' }}>not followed · excluded from path memory</span>
                        )}
                        {path && !hasOutcome && !showForm && (
                          <button onClick={() => setOutcomeInput({ convictionId: r.id, pathId: path.id, value: '', followed: 'full' })} style={{
                            fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', textTransform: 'uppercase',
                            background: 'transparent', cursor: 'pointer', padding: '3px 8px', alignSelf: 'flex-start',
                            border: `1px solid rgba(102,255,0,0.2)`, color: 'rgba(102,255,0,0.4)',
                          }}>LOG OUTCOME</button>
                        )}
                        {showForm && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 3 }}>
                            <input
                              type="number" placeholder="Observed value"
                              value={outcomeInput.value}
                              onChange={e => setOutcomeInput({ ...outcomeInput, value: e.target.value })}
                              style={{ fontFamily: MONO, fontSize: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.1)`, color: BRT, padding: '3px 6px', width: 110, outline: 'none' }}
                            />
                            <select
                              value={outcomeInput.followed}
                              onChange={e => setOutcomeInput({ ...outcomeInput, followed: e.target.value })}
                              style={{ fontFamily: MONO, fontSize: 8, background: '#000', border: `1px solid rgba(255,255,255,0.1)`, color: BRT, padding: '3px 6px', outline: 'none' }}
                            >
                              <option value="full">Full</option>
                              <option value="partial">Partial</option>
                              <option value="none">None</option>
                            </select>
                            <button onClick={() => {
                              logOutcome({ pathId: outcomeInput.pathId, observedValue: parseFloat(outcomeInput.value) || 0, followed: outcomeInput.followed });
                              setOutcomeInput(null);
                            }} style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', padding: '3px 8px', border: `1px solid rgba(102,255,0,0.3)`, color: LIME }}>
                              RECORD
                            </button>
                            <button onClick={() => setOutcomeInput(null)} style={{ fontFamily: MONO, fontSize: 6, background: 'transparent', cursor: 'pointer', padding: '3px 6px', border: `1px solid rgba(255,255,255,0.08)`, color: DIM }}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ margin: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: LIME_MID, textTransform: 'uppercase', marginBottom: 8 }}>
                HP UPDATE LOG
              </div>
              {hpLog.length === 0 ? (
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.14em' }}>
                  [ awaiting signal ]
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {hpLog.map(entry => (
                    <div key={entry.key} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', flexShrink: 0, letterSpacing: '0.06em' }}>
                        {new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>
                        {entry.label}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>
                        {entry.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EQ Canvas rendered in HP overlay — see root div */}
        {false && (
          <>
            <div>
              <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase', flexShrink: 0 }}>HYPOTHESIS · BIND ID</span>
              <input
                value={pendingHypothesisId}
                onChange={e => setPendingHypothesisId(e.target.value.trim())}
                placeholder="enter hypothesis id"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${pendingHypothesisId ? LIME : 'rgba(255,255,255,0.12)'}`,
                  fontFamily: MONO, fontSize: 8, color: pendingHypothesisId ? LIME : DIM,
                  letterSpacing: '0.08em', padding: '2px 0', outline: 'none',
                }}
              />
              {pendingHypothesisId && (
                <span onClick={() => setPendingHypothesisId('')} style={{ fontFamily: MONO, fontSize: 8, color: DIM, cursor: 'pointer' }}>✕</span>
              )}
            </div>
            <EQCanvas
              isPremium={true}
              onCommitThesis={({ domain, engineState: es }) => {
                const arb      = es?.arbitration ?? session?.tensor?.arbitration;
                const rate     = arb?.total > 0 ? (arb.passed / arb.total) : 0;
                const winState = rate > 0.5 ? 'OPEN' : rate > 0.25 ? 'TIGHT' : 'CLOSING';
                const convId   = convictions.commit({
                  sessionId:           session?.id ?? null,
                  thesis:              session?.query ?? null,
                  timeHorizon:         synthesis?.timeHorizon ?? null,
                  domains:             es?.happyPath?.domains ?? hp?.domains ?? [],
                  peakScore:           es?.happyPath?.peakScore ?? hp?.peakScore ?? 0,
                  velocity:            es?.happyPath?.velocity ?? 'FLAT',
                  domainStates:        es?.domainStates ?? {},
                  hypothesisId:        pendingHypothesisId || null,
                  windowStateAtCommit: winState,
                });
                logEmission({
                  convictionId: convId,
                  domain:       synthesis?.queryDomain ?? domain ?? 'UNKNOWN',
                  stateLabel:   synthesis?.stateLabel  ?? 'BUILDING CONVERGENCE',
                  lens:         session?.lens           ?? 'GENERAL',
                  projectedValue: metrics?.ltv?.value   ?? 0,
                });
                setPendingHypothesisId('');
                emitTelemetry({ type: 'CommitThesisEvent', domain, hypothesisId: pendingHypothesisId || null, windowState: winState, timestamp: new Date().toISOString() });
              }}
              onSetTrigger={({ domain, peakPosition }) => {
                window.dispatchEvent(new CustomEvent('hp:peak.trigger_set', {
                  detail: { domain, peakPosition, prefix: 'DOMAIN ·' },
                }));
              }}
            />
          </>
        )}

        {/* IMPORTED ARTIFACT BANNER */}
        {isImported && importState?.status === 'success' && (
          <div style={{
            marginBottom: 14, padding: '8px 12px',
            border: `1px solid rgba(0,127,255,0.3)`,
            background: 'rgba(0,127,255,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: BLUE }}>
                ◈ {importState.replayState ?? 'REHYDRATED'} · {importState.stateType?.toUpperCase() ?? 'ANALYTICAL'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!importState.versionMatch && (
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(0,127,255,0.6)', letterSpacing: '0.12em' }}>⚠ VERSION DRIFT</span>
                )}
                {importState.isV1752 && (
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(0,127,255,0.5)', letterSpacing: '0.12em' }}>✓ INTEGRITY VERIFIED</span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.1em' }}>
              FROZEN {importState.timeFrozen ? new Date(importState.timeFrozen).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—'}
              {importState.staleDays != null && importState.staleDays > 7 && (
                <span style={{ color: 'rgba(0,127,255,0.5)', marginLeft: 10 }}>
                  · {importState.staleDays}d SINCE EXPORT — VERIFY AGAINST LIVE SIGNALS
                </span>
              )}
            </div>
            {importState.artifactHash && (
              <div style={{ fontFamily: MONO, fontSize: 5.5, color: 'rgba(0,127,255,0.35)', letterSpacing: '0.1em', marginTop: 3 }}>
                HASH: {importState.artifactHash}
              </div>
            )}
          </div>
        )}

        {/* IMPORT ERROR BANNER */}
        {importState?.status === 'error' && (
          <div style={{
            marginBottom: 14, padding: '7px 12px',
            border: '1px solid rgba(255,60,60,0.3)',
            background: 'rgba(255,60,60,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,80,80,0.8)' }}>
              ✗ IMPORT REJECTED — {importState.message}
            </span>
            <button onClick={() => setImportState(null)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: MONO, fontSize: 8 }}>✕</button>
          </div>
        )}

        {/* 00 · HEADER */}
        <Panel seq="00" label="Header & Classification">
          <FieldRow label="Subject"    value={brief.subject}    valueColor={BRT} />
          <FieldRow label="Anchor"     value={brief.lens}       valueColor={LIME} />
          <FieldRow label="Domain"     value={brief.domain}     valueColor={LIME_MID} />
          <FieldRow label="Date"       value={brief.date} />
          <FieldRow label="As Of"      value={brief.asOf} />
          <FieldRow label="Originator" value={brief.originator} valueColor={LIME_MID} />
        </Panel>
        <MetricStrip metrics={metrics} />


        {/* 01 · BLUF */}
        <Panel seq="01" label="BLUF · Introduction">
          <div style={{ fontFamily: SERIF, fontSize: 13, color: BRT, lineHeight: 1.8, borderLeft: `2px solid ${LIME}`, paddingLeft: 14, marginBottom: 14 }}>
            {brief.bluf}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 5 }}>Purpose</div>
          <div style={{ fontFamily: SERIF, fontSize: 11, color: MID, lineHeight: 1.7 }}>{brief.purpose}</div>
        </Panel>

        {/* 02 · BODY & KEY FINDINGS */}
        <Panel seq="02" label="Body & Key Findings">
          {/* 5 Ws */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <tbody>
              {(Array.isArray(brief.fiveWs) ? brief.fiveWs : []).map(({ w, answer }) => (
                <tr key={w} style={{ borderBottom: `1px solid rgba(102,255,0,0.07)` }}>
                  <td style={{ fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.2em', padding: '7px 12px 7px 0', verticalAlign: 'top', whiteSpace: 'nowrap', width: 48 }}>{w}</td>
                  <td style={{ fontFamily: SERIF, fontSize: 11, color: MID, lineHeight: 1.6, padding: '7px 0' }}>{answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {outputFilters.precursors && (
            <>
              <Divider />
              <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Evidence / Facts</div>
              {brief.evidence.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, flexShrink: 0, marginTop: 1 }}>▸</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.6, letterSpacing: '0.03em' }}>{typeof e === 'object' && e !== null ? `[${e.source}] ${e.finding}` : e}</span>
                </div>
              ))}
            </>
          )}
          <Divider />
          {/* Assumptions */}
          <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Assumptions</div>
          {brief.assumptions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, flexShrink: 0 }}>◦</span>
              <span style={{ fontFamily: SERIF, fontSize: 11, color: DIM, lineHeight: 1.6, fontStyle: 'italic' }}>{a}</span>
            </div>
          ))}
        </Panel>

        {/* 03 · DISCUSSION & ANALYSIS */}
        <Panel seq="03" label="Discussion & Analysis">
          <div style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.85, marginBottom: 14 }}>{brief.assessment}</div>
          <Divider />
          {outputFilters.risks && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Threats</div>
              {brief.threats.map(({ label, level, color }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.04em' }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{level}</span>
                </div>
              ))}
              <Divider />
            </>
          )}
          {outputFilters.opportunities && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Opportunities</div>
              {brief.opportunities.map(({ label }, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ color: LIME, fontSize: 9, flexShrink: 0 }}>+</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.5 }}>{label}</span>
                </div>
              ))}
              <Divider />
            </>
          )}
          {outputFilters.contradictions && (
            <div style={{ borderLeft: `1px solid rgba(102,255,0,0.2)`, paddingLeft: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Alternative Viewpoint</div>
              <div style={{ fontFamily: SERIF, fontSize: 11, color: DIM, lineHeight: 1.6, fontStyle: 'italic' }}>{brief.alternativeView}</div>
            </div>
          )}
        </Panel>

        {/* 04 · CONCLUSION & OUTLOOK */}
        <Panel seq="04" label="Conclusion & Outlook">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brief.outlook.map(({ prob, label, color }, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color, letterSpacing: '0.06em' }}>{Math.round(prob * 100)}%</span>
                <span style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.6 }}>{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* ── Happy Path — Access Latch ───────────────────────────────── */}
        {hp?.qualified && !hpOpen && !hpDismissed && (
          <div
            onClick={() => setHpOpen(true)}
            style={{
              margin: '12px 20px',
              border: `1px solid ${PURPLE}`,
              background: 'rgba(138,43,226,0.06)',
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(138,43,226,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(138,43,226,0.06)'}
          >
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: PURPLE }}>HP · QUALIFIED</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: PURPLE, opacity: 0.7 }}>OPEN</span>
          </div>
        )}

        {/* dead block removed */}
        {false && (
          <div>
            <div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'CONVERGENCE', value: 'HIGH — sustained' },
                  { label: 'VELOCITY',    value: hpSnapshot.current.velocity },
                  { label: 'SCORE',       value: `${hpSnapshot.current.peakScore.toFixed(0)} / 100` },
                  { label: 'COUNTER',     value: 'None above threshold' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.45)', letterSpacing: '0.22em' }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: PURPLE, letterSpacing: '0.08em' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 10, color: 'rgba(138,43,226,0.55)', lineHeight: 1.55, borderTop: `1px solid rgba(138,43,226,0.12)`, paddingTop: 8 }}>
                Invalidated by: velocity reversal in any qualifying domain · counter-signal breach · convergence below floor.
              </div>
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid rgba(138,43,226,0.12)`, paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.22em', color: 'rgba(138,43,226,0.45)' }}>DOMAIN · ALERTS</span>
                    <span onClick={clearAlerts} style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', cursor: 'pointer', letterSpacing: '0.12em' }}>CLEAR</span>
                  </div>
                  {alerts.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', flexShrink: 0 }}>{new Date(a.ts).toTimeString().slice(0, 8)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: PURPLE, letterSpacing: '0.1em' }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {convictions.active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px 12px' }}>
                <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: 'rgba(138,43,226,0.45)', textTransform: 'uppercase' }}>
                  Active Convictions · {convictions.active.length}
                </div>
                {convictions.active.map(c => {
                  const mAlerts    = monitorMap[c.id] ?? [];
                  const highAlerts = mAlerts.filter(a => a.severity === 'high');
                  const borderColor = highAlerts.length > 0 ? 'rgba(255,80,80,0.5)'
                    : mAlerts.some(a => a.severity === 'medium') ? 'rgba(138,43,226,0.6)' : 'rgba(138,43,226,0.4)';
                  return (
                    <div key={c.id} style={{ borderLeft: `2px solid ${borderColor}`, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.4)', letterSpacing: '0.14em' }}>
                          {new Date(c.committedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(138,43,226,0.35)', letterSpacing: '0.12em' }}>{c.domains.join(' · ')}</span>
                      </div>
                      {c.thesis && (
                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, letterSpacing: '0.03em' }}>
                          {c.thesis.length > 120 ? c.thesis.slice(0, 117) + '…' : c.thesis}
                        </div>
                      )}
                      {mAlerts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: 5 }}>
                          {mAlerts.map((a, i) => (
                            <div key={i} style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.5, letterSpacing: '0.03em',
                              color: a.severity === 'high' ? 'rgba(255,80,80,0.85)' : a.severity === 'medium' ? 'rgba(255,255,255,0.55)' : 'rgba(102,255,0,0.5)',
                            }}>{a.message}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['confirmed', 'denied', 'timed_out'].map(res => (
                          <button key={res} onClick={() => convictions.resolve(c.id, res)} style={{
                            fontFamily: MONO, fontSize: 6, letterSpacing: '0.16em', textTransform: 'uppercase',
                            background: 'transparent', cursor: 'pointer', padding: '3px 8px',
                            border: `1px solid rgba(138,43,226,0.25)`, color: 'rgba(138,43,226,0.45)',
                          }}>{res.replace('_', ' ')}</button>
                        ))}
                        <button onClick={() => convictions.dismiss(c.id)} style={{
                          fontFamily: MONO, fontSize: 6, letterSpacing: '0.16em', textTransform: 'uppercase',
                          background: 'transparent', cursor: 'pointer', padding: '3px 8px',
                          border: `1px solid rgba(255,255,255,0.08)`, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto',
                        }}>DISMISS</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {convictions.resolved.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px 16px', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
                    Decision Lineage · {convictions.resolved.length}
                  </span>
                  {calibration.total >= 5 && (
                    <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: LIME }}>
                      {Math.round(calibration.overallAccuracy * 100)}% ACCURACY
                    </span>
                  )}
                </div>
                {(calibration.overallAccuracy !== null || calibration.hpAccuracy !== null || calibration.domainAccuracy.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '8px 12px', borderLeft: `2px solid rgba(102,255,0,0.2)` }}>
                    {calibration.overallAccuracy !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Overall · {calibration.total}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.08em' }}>{calibration.confirmed}C · {calibration.denied}D · {calibration.timedOut}T</span>
                      </div>
                    )}
                    {calibration.hpAccuracy !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Happy Path · {calibration.hpResolved}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: PURPLE, letterSpacing: '0.08em' }}>{Math.round(calibration.hpAccuracy * 100)}%</span>
                      </div>
                    )}
                    {calibration.domainAccuracy.map(g => (
                      <div key={g.domains.join('+')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{g.domains.join(' · ')} · {g.count}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.08em' }}>{Math.round(g.accuracy * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {calibration.overallAccuracy === null && calibration.hpAccuracy === null && calibration.domainAccuracy.length === 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', lineHeight: 1.6 }}>
                    Calibration metrics appear after more convictions are resolved.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {convictions.resolved.map(r => {
                    const resColor   = r.resolution === 'confirmed' ? LIME : r.resolution === 'denied' ? 'rgba(255,80,80,0.8)' : DIM;
                    const hadHP      = r.peakScore >= 75 && r.domains.length >= 2;
                    const pathRecs   = getByConvictionId(r.id);
                    const path       = pathRecs[0] ?? null;
                    const hasOutcome = path?.outcomeLoggedAt != null;
                    const showForm   = outcomeInput?.convictionId === r.id;
                    return (
                      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 5, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                            {new Date(r.committedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {hadHP && <span style={{ fontFamily: MONO, fontSize: 5, letterSpacing: '0.18em', color: PURPLE, border: `1px solid rgba(138,43,226,0.3)`, padding: '1px 4px' }}>HP</span>}
                            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: resColor, textTransform: 'uppercase' }}>{r.resolution.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>{r.domains.join(' · ')}</span>
                        {r.thesis && (
                          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, letterSpacing: '0.02em' }}>
                            {r.thesis.length > 100 ? r.thesis.slice(0, 97) + '…' : r.thesis}
                          </div>
                        )}
                        {hasOutcome && path.lr !== null && (
                          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.14em' }}>
                            LR {path.lr.toFixed(2)}× · {path.followed}
                          </span>
                        )}
                        {hasOutcome && path.lr === null && (
                          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.14em' }}>not followed · excluded from path memory</span>
                        )}
                        {path && !hasOutcome && !showForm && (
                          <button onClick={() => setOutcomeInput({ convictionId: r.id, pathId: path.id, value: '', followed: 'full' })} style={{
                            fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', textTransform: 'uppercase',
                            background: 'transparent', cursor: 'pointer', padding: '3px 8px', alignSelf: 'flex-start',
                            border: `1px solid rgba(102,255,0,0.2)`, color: 'rgba(102,255,0,0.4)',
                          }}>LOG OUTCOME</button>
                        )}
                        {showForm && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 3 }}>
                            <input
                              type="number" placeholder="Observed value"
                              value={outcomeInput.value}
                              onChange={e => setOutcomeInput({ ...outcomeInput, value: e.target.value })}
                              style={{ fontFamily: MONO, fontSize: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.1)`, color: BRT, padding: '3px 6px', width: 110, outline: 'none' }}
                            />
                            <select
                              value={outcomeInput.followed}
                              onChange={e => setOutcomeInput({ ...outcomeInput, followed: e.target.value })}
                              style={{ fontFamily: MONO, fontSize: 8, background: '#000', border: `1px solid rgba(255,255,255,0.1)`, color: BRT, padding: '3px 6px', outline: 'none' }}
                            >
                              <option value="full">Full</option>
                              <option value="partial">Partial</option>
                              <option value="none">None</option>
                            </select>
                            <button onClick={() => {
                              logOutcome({ pathId: outcomeInput.pathId, observedValue: parseFloat(outcomeInput.value) || 0, followed: outcomeInput.followed });
                              setOutcomeInput(null);
                            }} style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', padding: '3px 8px', border: `1px solid rgba(102,255,0,0.3)`, color: LIME }}>
                              RECORD
                            </button>
                            <button onClick={() => setOutcomeInput(null)} style={{ fontFamily: MONO, fontSize: 6, background: 'transparent', cursor: 'pointer', padding: '3px 6px', border: `1px solid rgba(255,255,255,0.08)`, color: DIM }}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── HP Update Log ─────────────────────────────────────────── */}
            <div style={{ margin: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: LIME_MID, textTransform: 'uppercase', marginBottom: 8 }}>
                HP UPDATE LOG
              </div>
              {hpLog.length === 0 ? (
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.14em' }}>
                  [ awaiting signal ]
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {hpLog.map(entry => (
                    <div key={entry.key} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', flexShrink: 0, letterSpacing: '0.06em' }}>
                        {new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>
                        {entry.label}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>
                        {entry.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}


      </div>

      {/* ── TELEMETRY STATUS BAR ──────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '3px 20px',
        borderTop: `1px solid rgba(102,255,0,0.12)`,
        borderBottom: `1px solid rgba(102,255,0,0.12)`,
        background: 'transparent',
        display: 'flex', gap: 0, alignItems: 'center',
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>
        {[
          { label: 'SIGNAL',          value: 'LOCKED',                         color: LIME },
          { label: 'CONVERGENCE',     value: 'HIGH',                           color: LIME },
          { label: 'FRACTURE WINDOW', value: 'OPEN · 48H',                     color: LIME },
          { label: 'NODES',           value: '5 / 7',                          color: BLUE },
          { label: 'KERNEL',
            value: replayMode ? replayState : RUNTIME_STATE.LIVE,
            color: replayMode ? BLUE : LIME,
          },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{ display: 'flex', gap: 7, alignItems: 'center', paddingRight: 20, borderRight: i < 4 ? `1px solid rgba(255,255,255,0.06)` : 'none', marginRight: 20, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em' }}>{label}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color, letterSpacing: '0.18em' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── SCROLLABLE SECTION BELOW CONVERGENCE FIELD ───────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* WO-1751 CONSULTING EXPORT / IMPORT */}
        <div style={{
          padding: '8px 20px',
          borderTop: `1px solid ${exportUnlocked ? 'rgba(102,255,0,0.18)' : 'rgba(255,255,255,0.05)'}`,
          background: exportUnlocked ? 'rgba(102,255,0,0.03)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: exportUnlocked ? LIME_MID : DIM }}>
              CONSULTING I/O · WO-1752
            </span>
            <span style={{ fontFamily: MONO, fontSize: 5.5, letterSpacing: '0.14em', color: DIM }}>
              {exportUnlocked
                ? `Fs ${Math.round(fs * 100)}% — PROVENANCE-TRACED JSON READY`
                : `Fs ${Math.round(fs * 100)}% — EXPORT REQUIRES ${Math.round(EXPORT_FS_GATE * 100)}%`}
            </span>
          </div>
        </div>

        {/* RECOMMENDED ACTIONS MATRIX */}
        <div style={{ height: 300, position: 'relative', zIndex: 1, opacity: 0.65 }}>
          <ActionMatrix />
        </div>

        {/* BOTTOM CLASSIFICATION BANNER */}
        <ClassificationBanner text={brief.classification} />

      </div>

    </div>
  );
}
