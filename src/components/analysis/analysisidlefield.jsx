import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAnalysisStore }           from '../../store/useanalysisstore.js';
import TargetPacket                   from './targetpacket.jsx';
import IntelligenceBrief              from './intelligencebrief.jsx';
import { usereplay }                  from '../../hooks/usereplay.js';
import { useframestream }             from '../../hooks/useframestream.js';
import { computePositionVector }      from '../../engine/positioningengine.js';
import { classifyConvergenceState, applyTransitionPolicy } from '../../engine/convergenceclassifier.js';
import { emitTelemetry, getTelemetryLog } from '../../engine/telemetry.js';
import { resolveHorizon, HORIZON_ORDER, HORIZON_META, DEFAULT_HORIZON } from '../../engine/temporalhorizon.js';
import { parseIntent }                from '../../engine/intentparser.js';
import { LENS_PRESETS }               from '../../registry/lenspresets.js';
import { synthesizeQuery } from '../../engine/querysynthesis.js';
import { SITUATIONS, LENS_DOMAIN_MAP, LENS_BROKER_DOMAIN_MAP, FLOOR_RANGES, CALIBRATION_SIGNALS, CONFIDENCE_THRESHOLD, KEY_OPS, OP_OPS } from '../../engine/ingress.js';
import { arbitrate }                  from '../../engine/aiae.js';
import { buildEnvelope, storeEnvelope } from '../../engine/lineage.js';
import OptionCapital                    from './optioncapital.jsx';
import CoachWell                        from './coachwell.jsx';
import { trackLens, trackFloor, sortedSituations, topFloor, trackAdvanced, trackRules, deriveState } from '../../engine/cascadeusage.js';
import { useBayStore } from '../../store/usebaystore.js';

const MONO         = "'IBM Plex Mono', monospace";
const LIME         = '#66FF00';
const DANGER       = '#FF3300';
const BG           = '#05070a';
const INPUT_BG     = '#050505';
const BORDER       = 'rgba(255,255,255,0.08)';
const BORDER_FAINT = 'rgba(255,255,255,0.05)';
const BORDER_MED   = 'rgba(255,255,255,0.06)';

// Font scale — questions match their answer options
const FS_QUESTION   = 10;   // section prompts — same as answer chips
const FS_CHIP       = 10;   // situation chips, calibration text
const FS_SMALL      = 8;    // floor/horizon labels + buttons, meta labels
const FS_TEXTAREA   = 12;   // query input
const FS_HINT       = 9;    // analyzing / add constraint
const FS_EXECUTE    = 11;   // execute button
const FS_HEADER     = 12;   // sidebar header
const FS_MAIN_HDR   = 13;   // main field header
const FS_TELEMETRY  = 11;   // telemetry rail / domain headers
const FS_PACKET     = 12;   // packet rows

const DOMAIN_REACH       = { 0: 5e6, 1: 3e6, 2: 1e5, 3: 5e5, 4: 1e6, 5: 2e6 };
const DOMAIN_LABELS      = { 0: 'FIN', 1: 'MKT', 2: 'LEG', 3: 'HLT', 4: 'CAR', 5: 'TEC' };
const MAX_EVENTS         = 50;
const EMA_ALPHA          = 0.18;
const PACKET_COOLDOWN_MS = 4000;
const MAX_PACKETS        = 6;
const domains            = ['FINANCIAL', 'MARKET', 'LEGAL', 'HEALTH', 'CAREER', 'TECHNOLOGY'];

const HORIZON_LABELS = {
  IMMEDIATE:  'NOW',
  SHORT:      'SHORT',
  MEDIUM:     'MED',
  LONG:       'LONG',
  STRUCTURAL: 'YEARS',
};


// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: FS_QUESTION, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function CalibrationSignal({ lens }) {
  const signal = CALIBRATION_SIGNALS[lens];
  if (!signal || signal.confidence < CONFIDENCE_THRESHOLD) return null;
  return (
    <div style={{ borderLeft: `2px solid ${LIME}`, paddingLeft: 12, marginBottom: 32, opacity: 0, animation: 'signal-fade-in 300ms ease forwards' }}>
      <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: LIME, letterSpacing: '0.28em', marginBottom: 6 }}>OBSERVATION</div>
      <div style={{ fontFamily: MONO, fontSize: FS_CHIP, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, letterSpacing: '0.04em' }}>
        {signal.observation}
      </div>
    </div>
  );
}

function generateDeterministicEventId(frameId, entity, timestamp) {
  const input = `${frameId}|${entity}|${timestamp}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash = hash & hash;
  }
  return `emergence:${Math.abs(hash).toString(36).padStart(8, '0')}`;
}

function deriveProxy(frames, prevCount) {
  if (!frames?.length) return null;
  const totalEvents = frames.reduce((s, f) => s + (Array.isArray(f.events) ? f.events.length : 1), 0);
  const avgDomain   = frames.reduce((s, f) => s + (f.domainId ?? 0), 0) / frames.length;
  const eventDelta  = Math.abs(totalEvents - prevCount);
  const volatility  = Math.min(1, eventDelta / MAX_EVENTS);
  return {
    dependency_count:         Math.min(totalEvents, MAX_EVENTS),
    volatility,
    reach:                    DOMAIN_REACH[Math.round(avgDomain)] ?? 1e5,
    convergence_acceleration: totalEvents > prevCount ? 0.6 : 0.2,
    signal_persistence:       1 - volatility,
  };
}

function FieldCanvas({ fieldParamsRef, projectedStateRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const ctx    = canvas.getContext('2d', { alpha: false });
    const resize = () => {
      canvas.width  = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const particles = Array.from({ length: 360 }, () => ({
      x: Math.random() * canvas.width,  y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.1, vy: (Math.random() - 0.5) * 1.1,
      size: Math.random() * 1.6 + 0.9, intensity: Math.random(),
      phase: Math.random() * Math.PI * 2,
    }));
    let frame;
    const animate = () => {
      const { density, driftVelocity, opacityGrad } = fieldParamsRef.current;
      const { stateId } = projectedStateRef.current;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const t = Date.now();
      particles.forEach((p, i) => {
        const drift = driftVelocity * (density * 1.1 + 0.15);
        p.x += p.vx * drift; p.y += p.vy * drift;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -0.94;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -0.94;
        p.intensity = Math.max(0.08, Math.sin(t / 260 + p.phase + i * 0.1) * 0.45 + density);
        const alpha = p.intensity * opacityGrad * (stateId >= 2 ? 0.82 : 0.48);
        ctx.fillStyle = stateId >= 3 ? `rgba(102,255,0,${alpha})` : `rgba(102,255,0,${alpha * 0.6})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

function PacketRow({ packet }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderBottom: BORDER_FAINT,
      fontSize: FS_PACKET, fontFamily: MONO, letterSpacing: '0.08em',
      animation: 'packetIn 220ms ease-out both',
    }}>
      <span style={{ color: LIME, flexShrink: 0 }}>{packet.entity}</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, letterSpacing: '0.18em' }}>{packet.domain}</span>
      <span style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>P:{packet.pressure}</span>
      <span style={{ flexShrink: 0, color: parseFloat(packet.delta) >= 0 ? LIME : 'rgba(102,255,0,0.3)' }}>Δ:{packet.delta}</span>
      <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{packet.time}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalysisIdleField({ activeCones = null }) {

  // Store
  const assignToBay   = useBayStore(s => s.assignToBay);
  const createSession = useAnalysisStore(s => s.createSession);
  const sessions      = useAnalysisStore(s => s.sessions);
  const activeSessionId       = useAnalysisStore(s => s.activeSessionId);
  const setActiveSession      = useAnalysisStore(s => s.setActiveSession);
  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const hasSession    = !!activeSession;
  const sessionSynthesis = useMemo(() => synthesizeQuery(activeSession), [activeSession]);

  // Replay + stream
  const { history, currentIndex, seek, load } = usereplay(true);
  const { latest, stats, lagMs }              = useframestream({ enabled: true });

  // Intake state
  const [activeSituation, setActiveSituation] = useState(null);
  const [seedQuery,       setSeedQuery]       = useState('');
  const [selectedFloor,   setSelectedFloor]   = useState(() => topFloor(FLOOR_RANGES));
  const [horizon,         setHorizon]         = useState(DEFAULT_HORIZON);
  const [focused,         setFocused]         = useState(false);
  const [missingField,    setMissingField]    = useState(null);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);
  const [rules,           setRules]           = useState([]);
  const [signalVisible,   setSignalVisible]   = useState(false);
  const [processing,      setProcessing]      = useState(false);
  const [optCapResetKey,  setOptCapResetKey]  = useState(0);
  const signalShownRef   = useRef(false);
  const processingTimer  = useRef(null);

  // Results state
  const [isPremium,      setIsPremium]      = useState(false);
  const [isPlaying,      setIsPlaying]      = useState(false); // eslint-disable-line no-unused-vars
  const [projectedState, setProjectedState] = useState({
    stateId: 0, label: 'INSUFFICIENT SIGNAL', theme: 'void_gray',
    convergenceScore: 0, noveltyDelta: 0, D: 0, V: 0, A: 0, T: 0, stableFor: 0,
  });
  const [packets, setPackets] = useState([]);

  const fieldParamsRef    = useRef({ density: 0.12, driftVelocity: 1, opacityGrad: 0.4 });
  const projectedStateRef = useRef(projectedState);
  const prevCountRef      = useRef(0);
  const emaRef            = useRef(0);
  const stableRef         = useRef(0);
  const prevStateRef      = useRef(0);
  const lastEmergenceRef  = useRef(0);
  const playRef           = useRef(null);

  // Derived
  const rankedSituations = useMemo(() => sortedSituations(SITUATIONS), [activeSituation]); // re-rank after each selection
  const isLive        = history.length === 0 || currentIndex >= history.length - 1;
  const activeLens    = activeSituation?.lens ?? null;
  const canExecute    = !!activeLens && seedQuery.trim().length > 0;
  const frameId       = isLive ? `live-${stats?.received ?? 0}` : `hist-${currentIndex}`;
  const attractorActive = focused || seedQuery.trim().length > 0;
  const scopeDot      = projectedState.stateId >= 4 ? LIME
                      : projectedState.stateId >= 2 ? 'rgba(102,255,0,0.4)'
                      : 'rgba(255,255,255,0.15)';

  const fieldParams = useMemo(() => ({
    density:       Math.min(1, (stats?.received ?? 0) / 100),
    driftVelocity: Math.max(0.3, Math.min(2, 1 + (lagMs ?? 42) / 500)),
    opacityGrad:   0.4 + projectedState.convergenceScore * 0.6,
  }), [stats, lagMs, projectedState.convergenceScore]);

  useEffect(() => { fieldParamsRef.current    = fieldParams;    }, [fieldParams]);
  useEffect(() => { projectedStateRef.current = projectedState; }, [projectedState]);
  useEffect(() => () => clearTimeout(processingTimer.current), []);

  // Intake scroll indicators
  const intakeRef = useRef(null);
  const [intakeScroll, setIntakeScroll] = useState({ up: false, down: false });
  const checkIntakeScroll = () => {
    const el = intakeRef.current;
    if (!el) return;
    setIntakeScroll({
      up:   el.scrollTop > 8,
      down: el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    });
  };
  useEffect(() => {
    const raf = requestAnimationFrame(checkIntakeScroll);
    const el = intakeRef.current;
    if (!el) return () => cancelAnimationFrame(raf);
    const ro = new ResizeObserver(checkIntakeScroll);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // Live convergence classification
  useEffect(() => {
    if (!isLive || !latest) return;
    const frames = Array.isArray(latest) && latest[0]?.events !== undefined
      ? latest
      : [{ domainId: 0, events: Array.isArray(latest) ? latest : [] }];
    const proxy = deriveProxy(frames, prevCountRef.current);
    if (!proxy) return;
    const totalEvents = frames.reduce((s, f) => s + (Array.isArray(f.events) ? f.events.length : 1), 0);
    prevCountRef.current = totalEvents;
    const vector = computePositionVector(proxy, { n_max: MAX_EVENTS, sigma_max: 1.0, r_max: 1e7 });
    if (!vector) return;
    const { D, V, A, T } = vector;
    const convergenceScore = Math.min(1, Math.max(0, 0.35 * D + 0.35 * A + 0.20 * T + 0.10 * (1 - V)));
    const prevEma = emaRef.current;
    emaRef.current = prevEma + EMA_ALPHA * (convergenceScore - prevEma);
    const noveltyDelta = convergenceScore - prevEma;
    const telemetryConfidence = (lagMs ?? 0) < 300 ? 0.85 : Math.max(0.3, 1 - (lagMs ?? 0) / 1000);
    const raw    = classifyConvergenceState(vector, telemetryConfidence);
    const stable = applyTransitionPolicy(raw);
    if (stable.stateId !== prevStateRef.current) { stableRef.current = 0; prevStateRef.current = stable.stateId; }
    else { stableRef.current += 1; }
    const next = { ...stable, convergenceScore, noveltyDelta, D, V, A, T, stableFor: stableRef.current };
    setProjectedState(next);
    if (stable.stateId === 4 && convergenceScore > 0.70 && noveltyDelta > 0.05) {
      const now = Date.now();
      if (now - lastEmergenceRef.current > PACKET_COOLDOWN_MS) {
        lastEmergenceRef.current = now;
        const entity    = `K-${String.fromCharCode(65 + Math.floor(Math.random() * 7))}-${100 + Math.floor(Math.random() * 899)}`;
        const avgDomain = frames.reduce((s, f) => s + (f.domainId ?? 0), 0) / frames.length;
        const domainId  = Math.round(avgDomain);
        const fId       = `live-${stats?.received ?? 0}`;
        const packet    = {
          id: generateDeterministicEventId(fId, entity, now),
          entity, domain: DOMAIN_LABELS[domainId] ?? 'SIG',
          pressure: convergenceScore.toFixed(3), delta: noveltyDelta.toFixed(3),
          time: new Date(now).toTimeString().slice(0, 8),
        };
        setPackets(prev => [...prev.slice(-(MAX_PACKETS - 1)), packet]);
        window.dispatchEvent(new CustomEvent('WO1336_EMERGENCE', { detail: { ...packet, frameId: fId, isReplay: false } }));
      }
    }
  }, [latest, isLive, lagMs, stats]);

  // Replay convergence classification
  useEffect(() => {
    if (isLive) return;
    const frame = history[currentIndex];
    if (!frame) return;
    const frames = Array.isArray(frame.signals) && frame.signals[0]?.events !== undefined
      ? frame.signals
      : [{ domainId: 0, events: Array.isArray(frame.signals) ? frame.signals : [] }];
    const proxy = deriveProxy(frames, prevCountRef.current);
    if (!proxy) return;
    const totalEvents = frames.reduce((s, f) => s + (Array.isArray(f.events) ? f.events.length : 1), 0);
    prevCountRef.current = totalEvents;
    const vector = computePositionVector(proxy, { n_max: MAX_EVENTS, sigma_max: 1.0, r_max: 1e7 });
    if (!vector) return;
    const { D, V, A, T } = vector;
    const convergenceScore = Math.min(1, Math.max(0, 0.35 * D + 0.35 * A + 0.20 * T + 0.10 * (1 - V)));
    const prevEma = emaRef.current;
    emaRef.current = prevEma + EMA_ALPHA * (convergenceScore - prevEma);
    const noveltyDelta = convergenceScore - prevEma;
    const raw    = classifyConvergenceState(vector, 0.75);
    const stable = applyTransitionPolicy(raw);
    if (stable.stateId !== prevStateRef.current) { stableRef.current = 0; prevStateRef.current = stable.stateId; }
    else { stableRef.current += 1; }
    setProjectedState({ ...stable, convergenceScore, noveltyDelta, D, V, A, T, stableFor: stableRef.current });
  }, [history, currentIndex, isLive]);

  // ── Intake handlers ───────────────────────────────────────────────────────

  function selectSituation(sit) {
    const next = activeSituation?.lens === sit.lens ? null : sit;
    if (next) trackLens(next.lens);
    setActiveSituation(next);
    setSignalVisible(false);
    signalShownRef.current = false;
    if (next) {
      const state = deriveState(next.lens);
      setAdvancedOpen(state.shouldExpand);
      if (state.prefill) {
        setRules(state.prefill.map((r, i) => ({ ...r, id: Date.now() + i })));
      } else if (LENS_PRESETS[next.lens]) {
        const { scaffold } = LENS_PRESETS[next.lens];
        setRules(scaffold.rules.map((r, i) => ({ ...r, id: Date.now() + i })));
      }
    }
  }

  function handleQueryBlur() {
    setFocused(false);
    if (!seedQuery.trim() || !activeLens) return;
    const signal = CALIBRATION_SIGNALS[activeLens];
    if (!signal || signal.confidence < CONFIDENCE_THRESHOLD) return;
    setSignalVisible(true);
    if (!signalShownRef.current) {
      signalShownRef.current = true;
      emitTelemetry({ type: 'calibration_signal_surfaced', lens: activeLens, confidence: signal.confidence, timestamp: Date.now() });
    }
  }

  function addRule()    { setRules(p => [...p, { id: Date.now(), key: 'Source Entity', operator: 'contains', value: '' }]); }
  function removeRule(id) { setRules(p => p.filter(r => r.id !== id)); }
  function updateRule(id, field, val) { setRules(p => p.map(r => r.id === id ? { ...r, [field]: val } : r)); }

  function hashKernelState(lens, ts) {
    const src = `${lens}:${ts}:${getTelemetryLog().length}`;
    let h = 5381;
    for (let i = 0; i < src.length; i++) h = ((h << 5) + h) ^ src.charCodeAt(i);
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function handleExecute() {
    if (!activeLens)       { setMissingField('BASE');   return; }
    if (!seedQuery.trim()) { setMissingField('TARGET'); return; }
    setMissingField(null);
    if (selectedFloor != null) trackFloor(selectedFloor);
    trackRules(activeLens, rules);
    if (signalShownRef.current) {
      emitTelemetry({ type: 'calibration_signal_executed_after', lens: activeLens, timestamp: Date.now() });
    }
    setSignalVisible(false);
    signalShownRef.current = false;
    setProcessing(true);

    const ts         = Date.now();
    const id         = `session_${ts}`;
    const preset     = LENS_PRESETS[activeLens] ?? LENS_PRESETS.OPEN;
    const geometry   = preset.scaffold.geometry;
    const domainList = LENS_DOMAIN_MAP[activeLens] ?? [];
    const parsed     = parseIntent(seedQuery.trim());
    const horizonRes = resolveHorizon(horizon, 'OPERATOR');

    const domain = LENS_BROKER_DOMAIN_MAP[activeLens] ?? 'GENERAL';

    const tensor = {
      lens:               activeLens,
      kernel_state_hash:  hashKernelState(activeLens, ts),
      domains:            domainList,
      domain,
      intent:             parsed.normalized_verb,
      parsed_intent:      parsed,
      temporal_horizon:   horizonRes,
      horizon:            horizonRes?.bucket ?? 'MED',
      rules:              rules.filter(r => r.value.trim().length > 0),
      constraintStrength: geometry.constraintStrength,
      intentEntropy:      geometry.intentEntropy,
      seedQuery:          seedQuery.trim(),
      floor:              selectedFloor ?? 0,
    };

    tensor.arbitration = arbitrate(tensor);

    // CommitEvent — emitted at the payload boundary, not at render
    if (tensor.arbitration?.requestId) {
      const commitEventData = {
        type:        'CommitEvent',
        requestId:   tensor.arbitration.requestId,
        candidateId: tensor.arbitration.topCandidateId,
        score:       tensor.arbitration.topK[0]?.score ?? 0,
        nextBest:    tensor.arbitration.topK[1]?.score ?? 0,
        timestamp:   tensor.arbitration.generatedAt,
      };
      emitTelemetry(commitEventData);
      // WO-1700: Fossilize EventEnvelope at CommitEvent boundary (append-only)
      try {
        const envelope = buildEnvelope(tensor, commitEventData);
        storeEnvelope(envelope).catch(err =>
          console.warn('[WO-1700] storeEnvelope failed:', err.message)
        );
      } catch (err) {
        console.warn('[WO-1700] buildEnvelope failed:', err.message);
      }
    }

    emitTelemetry({ type: 'session_open', sessionId: id, source: 'analysis-field', query: seedQuery.trim(), anchor: activeLens, kernel_state_hash: tensor.kernel_state_hash, timestamp: ts });

    clearTimeout(processingTimer.current);
    processingTimer.current = setTimeout(() => {
      createSession(id, activeLens, seedQuery.trim(), tensor);
      setProcessing(false);
      // WO-1712: Push search query into Domain Isolation Console bays
      const query = seedQuery.trim();
      const domainMap = { FINANCIAL: 1, MARKET: 2, CAREER: 3, HEALTH: 4 };
      const primaryBay = domainMap[tensor.domain?.toUpperCase()] ?? null;
      // Assign primary domain bay first, then seed remaining with domain context
      [1, 2, 3, 4].forEach(bayId => {
        const domainLabel = Object.keys(domainMap).find(k => domainMap[k] === bayId);
        const title = primaryBay === bayId ? query : `${query} — ${domainLabel}`;
        assignToBay(bayId, { title, domain: domainLabel, source: 'analysis-search', ts: Date.now() });
      });
    }, 900);
  }

  function resetSession() {
    setActiveSession(null);
    setActiveSituation(null);
    setSeedQuery('');
    setSelectedFloor(null);
    setHorizon(DEFAULT_HORIZON);
    setRules([]);
    setSignalVisible(false);
    signalShownRef.current = false;
    setMissingField(null);
    setOptCapResetKey(k => k + 1);
  }

  function handleReturnToLive() {
    setIsPlaying(false);
    clearInterval(playRef.current);
    seek(Math.max(0, history.length - 1));
    load(100);
  }

  const chipSelect = {
    fontFamily: MONO, fontSize: FS_CHIP, background: INPUT_BG,
    border: `1px solid rgba(255,255,255,0.07)`, padding: '4px 6px',
    color: '#ffffff', outline: 'none', cursor: 'pointer', letterSpacing: '0.08em',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes packetIn       { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes signal-fade-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes attractor-pulse   { 0%,100% { box-shadow: 0 0 8px 2px rgba(102,255,0,0.35); } 50% { box-shadow: 0 0 8px 2px rgba(102,255,0,0.08); } }
        @keyframes vector-incomplete { 0%,100% { box-shadow: 0 0 0 1px rgba(102,255,0,0.7);  } 50% { box-shadow: 0 0 0 1px rgba(102,255,0,0.1);  } }
        @keyframes results-enter  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes processing-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .attractor-active  { animation: attractor-pulse   2.4s linear infinite; }
        .vector-incomplete { animation: vector-incomplete 0.9s ease-in-out infinite; }
        .aif-btn-live:hover { background: rgba(102,255,0,0.04); border-color: rgba(102,255,0,0.5); color: ${LIME}; }
      `}</style>

      <div style={{ width: '100%', height: '100%', background: BG, color: '#fff', overflow: 'hidden', fontFamily: MONO, position: 'relative', display: 'flex' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <aside style={{
          width: hasSession ? 220 : 340, flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          zIndex: 20, transition: 'width 0.4s ease', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ height: 64, flexShrink: 0, borderBottom: `1px solid ${BORDER_MED}`, padding: '0 24px', display: 'flex', alignItems: 'center' }}>
            {hasSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: MONO, fontSize: FS_SMALL, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)' }}>SESSION ACTIVE</span>
                  <button onClick={resetSession} style={{ fontFamily: MONO, fontSize: FS_CHIP, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.6)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(102,255,0,0.3)', padding: '0 0 1px 0', cursor: 'pointer' }}>
                    new query
                  </button>
                </div>
                <span style={{ fontFamily: MONO, fontSize: FS_CHIP, color: LIME, letterSpacing: '0.15em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeSession?.query?.toUpperCase() ?? '—'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, height: 24, border: '1px solid rgba(255,255,255,0.3)', transform: 'rotate(45deg)', flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: FS_HEADER, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>KRYLO</span>
                </div>
                {(activeSituation || seedQuery.trim() || selectedFloor) && (
                  <button onClick={resetSession} style={{ fontFamily: MONO, fontSize: FS_CHIP, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.6)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(102,255,0,0.3)', padding: '0 0 1px 0', cursor: 'pointer' }}>
                    reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QUERY — fixed above Option Capital */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER_MED}`, opacity: hasSession ? 0 : 1, pointerEvents: hasSession ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
            {missingField === 'TARGET' && (
              <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: LIME, letterSpacing: '0.28em', marginBottom: 8, opacity: 0.8 }}>
                DESCRIBE YOUR SITUATION TO CONTINUE
              </div>
            )}
            <SectionLabel>WHAT ARE YOU TRYING TO FIGURE OUT?</SectionLabel>
            <textarea
              value={seedQuery}
              onChange={e => { setSeedQuery(e.target.value); if (missingField === 'TARGET') setMissingField(null); }}
              onFocus={() => setFocused(true)}
              onBlur={handleQueryBlur}
              placeholder="Describe the decision you're facing or what you want to understand..."
              className={missingField === 'TARGET' ? 'vector-incomplete' : attractorActive ? 'attractor-active' : ''}
              style={{
                width: '100%', height: 90, background: INPUT_BG,
                border: `1px solid ${attractorActive ? LIME : 'rgba(255,255,255,0.07)'}`,
                padding: '14px 16px', fontFamily: MONO, fontSize: FS_TEXTAREA,
                color: '#ffffff', outline: 'none', resize: 'none',
                boxSizing: 'border-box', lineHeight: 1.7, transition: 'border-color 300ms',
              }}
            />
            <div style={{ marginTop: 6, fontFamily: MONO, fontSize: FS_HINT, letterSpacing: '0.2em', fontStyle: 'italic', transition: 'color 300ms', color: attractorActive ? 'rgba(102,255,0,0.45)' : 'rgba(255,255,255,0.12)' }}>
              {attractorActive ? '// ANALYZING...' : '// WAITING FOR INPUT...'}
            </div>
            {signalVisible && activeLens && <div style={{ marginTop: 16 }}><CalibrationSignal lens={activeLens} /></div>}
          </div>

          {/* WO-1706 — Option Capital: daily runway metric */}
          <OptionCapital resetTrigger={optCapResetKey} capital={selectedFloor} />

          {/* Scrollable intake body */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
            {/* Scroll up indicator */}
            {intakeScroll.up && (
              <div onClick={() => intakeRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 24,
                background: `linear-gradient(to bottom, ${BG}, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 4, cursor: 'pointer',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: LIME }}>▴</span>
              </div>
            )}
            {/* Scroll down indicator */}
            {intakeScroll.down && (
              <div onClick={() => intakeRef.current?.scrollTo({ top: intakeRef.current.scrollHeight, behavior: 'smooth' })} style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
                background: `linear-gradient(to top, ${BG}, transparent)`,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 5, zIndex: 4, cursor: 'pointer',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: LIME }}>▾</span>
              </div>
            )}
          <div
            ref={intakeRef}
            onScroll={checkIntakeScroll}
            className="intake-scroll"
            style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', padding: '32px 24px 24px',
              opacity: hasSession ? 0 : 1, pointerEvents: hasSession ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
            }}>

            {/* SITUATION */}
            <div style={{ marginBottom: 32 }} className={missingField === 'BASE' ? 'vector-incomplete' : ''}>
              {missingField === 'BASE' && (
                <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: LIME, letterSpacing: '0.28em', marginBottom: 10, opacity: 0.8 }}>
                  SELECT YOUR SITUATION TO CONTINUE
                </div>
              )}
              <SectionLabel>WHAT DESCRIBES YOUR SITUATION?</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rankedSituations.map(sit => {
                  const active = activeSituation?.lens === sit.lens;
                  return (
                    <button key={sit.lens} onClick={() => selectSituation(sit)} style={{
                      fontFamily: MONO, fontSize: FS_CHIP, letterSpacing: '0.14em', padding: '9px 10px',
                      background: active ? LIME : 'transparent', color: active ? '#000000' : 'rgba(255,255,255,0.4)',
                      border: 'none', cursor: 'pointer', transition: 'color 120ms, background 120ms',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                    >{active ? '✓ ' : ''}{sit.label}</button>
                  );
                })}
              </div>
            </div>

            {/* FLOOR */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginBottom: 14 }}>
                HOW MUCH CAN YOU PUT TOWARD THIS?
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {FLOOR_RANGES.map(range => {
                  const active = selectedFloor === range.value;
                  return (
                    <button key={range.value} onClick={() => setSelectedFloor(active ? null : range.value)} style={{
                      flex: 1, fontFamily: MONO, fontSize: FS_SMALL, letterSpacing: '0.06em', padding: '8px 0', border: 'none',
                      background: active ? LIME : 'transparent', color: active ? '#000' : 'rgba(255,255,255,0.3)',
                      cursor: 'pointer', transition: 'background 120ms, color 120ms',
                      borderBottom: active ? 'none' : '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = LIME; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                    >{range.label}</button>
                  );
                })}
              </div>
            </div>

            {/* TEMPORAL HORIZON */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em' }}>HOW FAR OUT ARE YOU THINKING?</div>
                <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}>{HORIZON_META[horizon]?.span ?? ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {HORIZON_ORDER.map(h => (
                  <button key={h} onClick={() => setHorizon(h)} style={{
                    flex: 1, fontFamily: MONO, fontSize: FS_SMALL, letterSpacing: '0.1em', padding: '7px 0', border: 'none',
                    background: horizon === h ? LIME : 'transparent', color: horizon === h ? '#000' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', transition: 'background 120ms, color 120ms',
                    borderBottom: horizon === h ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={e => { if (horizon !== h) e.currentTarget.style.color = LIME; }}
                  onMouseLeave={e => { if (horizon !== h) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                  >{HORIZON_LABELS[h] ?? h}</button>
                ))}
              </div>
            </div>

            {/* ADVANCED CONSTRAINTS */}
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => { setAdvancedOpen(p => { if (!p) trackAdvanced(activeLens); return !p; }); }} style={{
                fontFamily: MONO, fontSize: FS_SMALL, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: LIME, fontSize: 13 }}>{advancedOpen ? '▾' : '▸'}</span>
                ADVANCED CONSTRAINTS
              </button>
              {advancedOpen && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rules.length === 0 && (
                    <div style={{ fontFamily: MONO, fontSize: FS_CHIP, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.14em', padding: '8px 0' }}>
                      NULL LATTICE — PERMEABLE
                    </div>
                  )}
                  {rules.map(rule => (
                    <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 8, paddingTop: 4 }}>
                      <button onClick={() => removeRule(rule.id)} style={{ fontFamily: MONO, fontSize: FS_CHIP, color: DANGER, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>[X]</button>
                      <select value={rule.key}      onChange={e => updateRule(rule.id, 'key',      e.target.value)} style={chipSelect}>
                        {KEY_OPS.map(o => <option key={o} style={{ background: '#000' }}>{o}</option>)}
                      </select>
                      <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} style={chipSelect}>
                        {OP_OPS.map(o => <option key={o} style={{ background: '#000' }}>{o}</option>)}
                      </select>
                      <input value={rule.value} onChange={e => updateRule(rule.id, 'value', e.target.value)} placeholder="VALUE"
                        style={{ fontFamily: MONO, fontSize: FS_CHIP, flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '4px 6px', color: '#ffffff', outline: 'none', letterSpacing: '0.1em', minWidth: 0 }} />
                    </div>
                  ))}
                  <button onClick={addRule} style={{ fontFamily: MONO, fontSize: FS_HINT, letterSpacing: '0.2em', color: LIME, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', padding: '8px 0', marginTop: 4 }}>
                    + ADD CONSTRAINT
                  </button>
                </div>
              )}
            </div>

          </div>{/* end inner scroll div */}
          </div>{/* end scroll wrapper */}

          {/* Sticky footer */}
          {!isLive ? (
            <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
              <button onClick={handleReturnToLive} className="aif-btn-live" style={{
                width: '100%', height: 44, border: '1px solid rgba(102,255,0,0.2)',
                color: 'rgba(102,255,0,0.7)', letterSpacing: '0.18em', background: 'transparent',
                cursor: 'pointer', fontFamily: MONO, fontSize: FS_EXECUTE,
              }}>RETURN TO LIVE</button>
            </div>
          ) : !hasSession ? (
            <div style={{ padding: '16px 24px', borderTop: `1px solid rgba(255,255,255,0.05)`, flexShrink: 0 }}>
              {missingField && (
                <div style={{ fontFamily: MONO, fontSize: FS_SMALL, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.22em', marginBottom: 10, textAlign: 'center' }}>
                  {missingField === 'BASE' ? 'SELECT YOUR SITUATION TO CONTINUE' : 'DESCRIBE YOUR SITUATION TO CONTINUE'}
                </div>
              )}
              <button onClick={handleExecute} disabled={processing} style={{
                width: '100%', padding: '15px 0',
                border: (!processing && !canExecute) ? '1px solid #66FF00' : 'none',
                background: processing ? 'rgba(102,255,0,0.12)' : canExecute ? LIME : '#000000',
                color: processing ? LIME : canExecute ? '#000000' : '#66FF00',
                fontFamily: MONO, fontSize: FS_EXECUTE, fontWeight: 700,
                letterSpacing: '0.3em', textTransform: 'uppercase',
                cursor: processing ? 'default' : 'pointer',
                transition: 'background 300ms, color 300ms',
                animation: processing ? 'processing-pulse 1.1s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={e => { if (canExecute && !processing) e.currentTarget.style.background = '#ffffff'; }}
              onMouseLeave={e => { if (canExecute && !processing) e.currentTarget.style.background = LIME; }}
              >{processing ? 'ANALYZING...' : canExecute ? 'FIND MY PLAN' : 'COMPLETE YOUR PROFILE'}</button>
            </div>
          ) : null}

        </aside>

        {/* ── MAIN FIELD ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          <FieldCanvas fieldParamsRef={fieldParamsRef} projectedStateRef={projectedStateRef} />

          {/* Header */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 64,
            borderBottom: `1px solid ${BORDER_MED}`, padding: '0 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: FS_MAIN_HDR, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Analysis</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                {hasSession ? (sessionSynthesis?.stateLabel ?? 'ACTIVE') : projectedState.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: FS_TELEMETRY, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              <span>Validation Engine</span>
              <span>v3.7.2</span>
            </div>
          </div>

          {/* Domain pressure headers — idle only */}
          {!hasSession && (
            <div style={{
              position: 'absolute', top: 92, left: 32, right: 32,
              display: 'flex', justifyContent: 'space-between',
              fontSize: FS_TELEMETRY, textTransform: 'uppercase', letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.5)', zIndex: 10,
            }}>
              {domains.map(d => (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span>{d}</span>
                  <span style={{ fontSize: FS_CHIP, letterSpacing: 'normal', textTransform: 'none', color: 'rgba(255,255,255,0.2)' }}>Passive</span>
                </div>
              ))}
            </div>
          )}

          {/* Session results */}
          {hasSession && (
            <>
              <div style={{ position: 'absolute', top: 0, left: 0, right: '38%', bottom: 0, zIndex: 10, animation: 'results-enter 500ms ease forwards' }}>
                <TargetPacket />
              </div>
              <div style={{ position: 'absolute', top: 0, left: '62%', right: 0, bottom: 0, zIndex: 10, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', animation: 'results-enter 500ms ease 120ms both' }}>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <IntelligenceBrief />
                </div>
              </div>
            </>
          )}

          {/* TARGET ACQUISITION scope zone — idle only */}
          {!hasSession && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ width: 520, height: 340, background: 'rgba(3,4,6,0.92)', border: '1px solid rgba(102,255,0,0.10)', position: 'relative', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
                {[
                  { top: -1,    left: -1,  borderLeft:  '2px solid rgba(102,255,0,0.35)', borderTop:    '2px solid rgba(102,255,0,0.35)' },
                  { top: -1,    right: -1, borderRight: '2px solid rgba(102,255,0,0.35)', borderTop:    '2px solid rgba(102,255,0,0.35)' },
                  { bottom: -1, left: -1,  borderLeft:  '2px solid rgba(102,255,0,0.35)', borderBottom: '2px solid rgba(102,255,0,0.35)' },
                  { bottom: -1, right: -1, borderRight: '2px solid rgba(102,255,0,0.35)', borderBottom: '2px solid rgba(102,255,0,0.35)' },
                ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}
                <div style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER_FAINT}`, flexShrink: 0 }}>
                  <span style={{ fontSize: FS_TELEMETRY, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>KRYLO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {projectedState.convergenceScore > 0 && (
                      <span style={{ fontSize: FS_TELEMETRY, color: 'rgba(102,255,0,0.6)', fontVariantNumeric: 'tabular-nums' }}>CS {projectedState.convergenceScore.toFixed(3)}</span>
                    )}
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: scopeDot, display: 'inline-block' }} />
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  <CoachWell
                    activeSituation={activeSituation}
                    seedQuery={seedQuery}
                    selectedFloor={selectedFloor}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time axis */}
          <div style={{
            position: 'absolute', right: 16, top: 140, bottom: 80,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontSize: FS_TELEMETRY, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.16em', textTransform: 'uppercase', zIndex: 10,
          }}>
            {['Now', '-1m', '-5m', '-15m', '-1h', '-3h', '-6h', '-12h', '-24h'].map(t => <span key={t}>{t}</span>)}
          </div>

          {/* Telemetry rail */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 52,
            borderTop: `1px solid ${BORDER_FAINT}`, padding: '0 32px',
            display: 'flex', alignItems: 'center', gap: 24,
            fontSize: FS_TELEMETRY, letterSpacing: '0.4em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', zIndex: 10, background: 'rgba(0,0,0,0.5)',
          }}>
            <span>EVENT STREAM ACTIVE</span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
            <span>FRAME <span style={{ color: 'rgba(102,255,0,0.7)' }}>{frameId}</span></span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
            <span>{projectedState.label}</span>
            {packets.length > 0 && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
                <span style={{ color: 'rgba(102,255,0,0.6)' }}>{packets.length} PACKET{packets.length !== 1 ? 'S' : ''} DOCKED</span>
              </>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
