import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
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
import { transformIntentToConstraints } from '../../engine/baylogic.js';
import { computeStructuralFriction }   from '../../engine/structuralfriction.js';
import { trackLens, trackFloor, sortedSituations, topFloor, trackAdvanced, trackRules, deriveState } from '../../engine/cascadeusage.js';

const MONO         = "'IBM Plex Mono', monospace";
const LIME         = '#66FF00';
const DANGER       = '#FF3300';
const simBtnStyle  = { flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase' };
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

// Mock histogram density — 20 bars, 5 per FLOOR_RANGES bucket
const HIST_DENSITY = [0.22,0.38,0.48,0.62,0.58,0.72,0.88,0.92,0.78,0.68,0.82,0.95,0.88,0.72,0.62,0.52,0.46,0.42,0.32,0.28];

const SIT_ABBREV = {
  REALTOR: 'HOME', RETIREMENT: 'RETIRE', INVESTOR: 'INCOME',
  ATHLETE: 'CAREER', FAMILY: 'FAMILY', STUDENT: 'START',
  TRANSITION: 'OVER', HEALTH: 'HEALTH', SALES: 'BUILD',
  OPEN: 'OPEN', EXPENSE: 'REDUCE',
};
const FLOOR_ABBREV = { 500: '<$1K', 5000: '$1K+', 50000: '$10K+', 150000: '$100K+' };

function TokenBox({ activeSituation, selectedFloor, horizon, seedQuery,
                    onRemoveSituation, onRemoveFloor, onRemoveHorizon,
                    onQueryChange, onFocus, onBlur }) {
  const inputRef = useRef(null);
  const hasContent = activeSituation || selectedFloor != null || horizon || seedQuery;
  const tokens = [
    activeSituation && { id: 'sit',   label: SIT_ABBREV[activeSituation.lens]  ?? activeSituation.lens,  onRemove: onRemoveSituation },
    activeSituation && selectedFloor != null && { id: 'floor', label: FLOOR_ABBREV[selectedFloor] ?? String(selectedFloor), onRemove: onRemoveFloor },
    activeSituation && selectedFloor != null && horizon && { id: 'hz', label: HORIZON_LABELS[horizon] ?? horizon, onRemove: onRemoveHorizon },
  ].filter(Boolean);

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        border: `1px solid ${hasContent ? 'rgba(102,255,0,0.25)' : 'rgba(255,255,255,0.1)'}`,
        padding: '8px 12px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        cursor: 'text', minHeight: 44,
        transition: 'border-color 200ms',
      }}
    >
      {tokens.map(t => (
        <span key={t.id} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          borderRadius: 999, border: `1px solid ${LIME}`,
          padding: '2px 8px 2px 10px',
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
          color: LIME, textTransform: 'uppercase', flexShrink: 0,
        }}>
          {t.label}
          <button onClick={e => { e.stopPropagation(); t.onRemove(); }} style={{
            background: 'none', border: 'none',
            color: 'rgba(102,255,0,0.5)', cursor: 'pointer',
            padding: '0 0 0 2px', fontSize: 12, lineHeight: 1,
          }}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={seedQuery}
        onChange={e => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={tokens.length === 0 ? 'build your signal query...' : ''}
        style={{
          flex: 1, minWidth: 60,
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: MONO, fontSize: 9,
          color: '#ffffff', letterSpacing: '0.1em',
        }}
      />
    </div>
  );
}

function StaggeredChips({ chips, selected, onSelect, getKey, getLabel, isSelected }) {
  const containerRef = useRef(null);
  const [offsets, setOffsets] = useState([]);

  useLayoutEffect(() => {
    const buttons = containerRef.current?.querySelectorAll('button[data-chip]');
    if (!buttons?.length) return;
    const rows = [];
    let lastTop = -1, rowIdx = -1;
    buttons.forEach(btn => {
      const top = Math.round(btn.getBoundingClientRect().top);
      if (Math.abs(top - lastTop) > 4) { rowIdx++; lastTop = top; }
      rows.push(rowIdx);
    });
    setOffsets(chips.map((_, i) => {
      const isFirstInRow = i === 0 || rows[i - 1] !== rows[i];
      return isFirstInRow && rows[i] % 2 === 1 ? 12 : 0;
    }));
  }, [chips]);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {chips.map((chip, i) => {
        const key = getKey(chip);
        const label = getLabel(chip);
        const active = isSelected(chip, selected);
        return (
          <button
            key={key}
            data-chip="1"
            onClick={() => onSelect(chip)}
            style={{
              marginLeft: offsets[i] ?? 0,
              borderRadius: 999,
              padding: '6px 14px',
              fontFamily: MONO, fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.2)'}`,
              color: active ? LIME : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'border-color 120ms, color 120ms',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
          >
            {active ? '✓ ' : ''}{label}
          </button>
        );
      })}
    </div>
  );
}

function deriveFromMagnitude(m) {
  if (m < 25)  return { floor: 500,    horizon: 'IMMEDIATE', volatility: 'LOW' };
  if (m < 50)  return { floor: 5000,   horizon: 'SHORT',     volatility: 'LOW-MED' };
  if (m < 75)  return { floor: 50000,  horizon: 'MEDIUM',    volatility: 'MEDIUM' };
  return         { floor: 150000,  horizon: 'LONG',      volatility: 'HIGH' };
}

function TargetSlider({ value, onChange, resolvedThreshold, closestResolved }) {
  const derived    = deriveFromMagnitude(value);
  const trackRef   = useRef(null);
  const [dragging, setDragging] = useState(false);

  const updateFromX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))));
  };

  const startDrag = (e) => { e.preventDefault(); setDragging(true); updateFromX(e.clientX); };

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => updateFromX(e.clientX);
    const onUp   = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em' }}>INTENT STRENGTH</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div ref={trackRef} onMouseDown={startDrag} style={{ position: 'relative', height: 1, background: 'rgba(255,255,255,0.12)', cursor: 'pointer', margin: '4px 0 16px' }}>
        <div style={{ position: 'absolute', left: 0, width: `${value}%`, height: '100%', background: 'rgba(102,255,0,0.4)' }} />
        <div style={{ position: 'absolute', left: `${value}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, background: LIME, cursor: dragging ? 'grabbing' : 'grab' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em' }}>
        {[
          { label: 'CAPITAL',    val: FLOOR_RANGES.find(r => r.value === derived.floor)?.label ?? '—' },
          { label: 'HORIZON',    val: HORIZON_LABELS[derived.horizon] ?? derived.horizon },
          { label: 'VOLATILITY', val: derived.volatility },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{val}</span>
          </div>
        ))}
      </div>
      {resolvedThreshold != null && (
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 8, color: 'rgba(102,255,0,0.4)', letterSpacing: '0.2em' }}>
          ↓ RESOLVED AT {resolvedThreshold}
          {closestResolved != null && <span style={{ color: 'rgba(255,255,255,0.2)' }}> (requested {closestResolved})</span>}
        </div>
      )}
    </div>
  );
}

function FloorHistogram({ selectedFloor, onFloor }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pct, setPct] = useState(() => {
    if (!selectedFloor) return 0.625; // default to 3rd bucket
    const idx = FLOOR_RANGES.findIndex(r => r.value === selectedFloor);
    return idx >= 0 ? (idx + 0.5) / FLOOR_RANGES.length : 0.625;
  });

  const bucketIdx = Math.min(FLOOR_RANGES.length - 1, Math.floor(pct * FLOOR_RANGES.length));
  const barsPerBucket = HIST_DENSITY.length / FLOOR_RANGES.length; // 5

  const updatePct = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newPct = Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width));
    setPct(newPct);
    const idx = Math.min(FLOOR_RANGES.length - 1, Math.floor(newPct * FLOOR_RANGES.length));
    onFloor(FLOOR_RANGES[idx].value);
  };

  const startDrag = (e) => { e.preventDefault(); setDragging(true); updatePct(e.clientX); };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => updatePct(e.clientX);
    const onUp   = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40, marginBottom: 10 }}>
        {HIST_DENSITY.map((d, i) => {
          const barBucket = Math.floor(i / barsPerBucket);
          const inRange   = barBucket <= bucketIdx;
          return (
            <div key={i} style={{
              flex: 1, height: `${d * 100}%`,
              background: inRange ? LIME : 'rgba(255,255,255,0.12)',
              transition: 'background 100ms',
            }} />
          );
        })}
      </div>
      <div ref={trackRef} onMouseDown={startDrag} style={{ position: 'relative', height: 1, background: 'rgba(255,255,255,0.12)', cursor: 'pointer', margin: '0 0 8px' }}>
        <div style={{ position: 'absolute', left: 0, width: `${pct * 100}%`, height: '100%', background: 'rgba(102,255,0,0.4)' }} />
        <div style={{
          position: 'absolute', left: `${pct * 100}%`, top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 6, height: 6, background: LIME, cursor: dragging ? 'grabbing' : 'grab',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em' }}>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>$0</span>
        <span style={{ color: LIME }}>{FLOOR_RANGES[bucketIdx].label}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>$100K+</span>
      </div>
    </div>
  );
}

function ChainSlot({ label, children }) {
  return (
    <>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '14px 0' }} />
      <div style={{ marginBottom: 24, opacity: 0, animation: 'slot-enter 280ms ease forwards' }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 10 }}>
          {label}
        </div>
        {children}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalysisIdleField({ activeCones = null }) {

  // Store
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
  const [selectedFloor,   setSelectedFloor]   = useState(null);
  const [horizon,         setHorizon]         = useState(null);
  const [focused,         setFocused]         = useState(false);
  const [plusOpen,        setPlusOpen]        = useState(false);
  const [volatilityShock, setVolatilityShock] = useState(false);
  const [simRunning,      setSimRunning]      = useState(false);
  const [regimeKey,       setRegimeKey]       = useState('Sovereign_Wealth');
  const [missingField,    setMissingField]    = useState(null);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);
  const [rules,           setRules]           = useState([]);
  const [signalVisible,   setSignalVisible]   = useState(false);
  const [processing,      setProcessing]      = useState(false);
  const [optCapResetKey,  setOptCapResetKey]  = useState(0);
  const [intentMagnitude, setIntentMagnitude] = useState(50);
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
  const canExecute    = !!activeLens;
  const bayDomain      = LENS_BROKER_DOMAIN_MAP[activeLens] ?? 'GENERAL';
  const bayResult      = useMemo(() => transformIntentToConstraints(intentMagnitude, bayDomain), [intentMagnitude, bayDomain]);
  const frictionResult = useMemo(() => computeStructuralFriction(bayDomain, bayResult), [bayDomain, bayResult]);
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


  const queryDebounceRef   = useRef(null);
  const centerTextareaRef  = useRef(null);

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

  function removeSituationToken() {
    setActiveSituation(null); setSelectedFloor(null); setHorizon(null);
    setSeedQuery(''); setSignalVisible(false); signalShownRef.current = false;
  }
  function removeFloorToken()   { setSelectedFloor(null); setHorizon(null); }
  function removeHorizonToken() { setHorizon(null); }

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
    // flush uncontrolled textarea value before reading seedQuery
    if (centerTextareaRef.current) {
      clearTimeout(queryDebounceRef.current);
      setSeedQuery(centerTextareaRef.current.value);
    }
    if (!activeLens) { setMissingField('BASE'); return; }
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
      intentMagnitude,
      volatilityShock,
    };

    tensor.horizonMix         = frictionResult.horizonMix;
    tensor.structuralFriction = frictionResult.structuralFriction;
    tensor.arbitration        = arbitrate(tensor);

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
    }, 900);
  }

  function resetSession() {
    setActiveSession(null);
    setActiveSituation(null);
    setSeedQuery('');
    if (centerTextareaRef.current) centerTextareaRef.current.value = '';
    setSelectedFloor(null);
    setHorizon(DEFAULT_HORIZON);
    setRules([]);
    setSignalVisible(false);
    signalShownRef.current = false;
    setMissingField(null);
    setOptCapResetKey(k => k + 1);
  }

  function handleIntentChart(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setIntentMagnitude(Math.max(0, Math.min(100, Math.round((x / rect.width) * 100))));
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
        @keyframes slot-enter     { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .attractor-active  { animation: attractor-pulse   2.4s linear infinite; }
        .vector-incomplete { animation: vector-incomplete 0.9s ease-in-out infinite; }
        .aif-btn-live:hover { background: rgba(102,255,0,0.04); border-color: rgba(102,255,0,0.5); color: ${LIME}; }
      `}</style>

      <div style={{ width: '100%', height: '100%', background: BG, color: '#fff', overflow: 'hidden', fontFamily: MONO, position: 'relative', display: 'flex' }}>

        {/* ── SIMULATION CONTROL PANEL ─────────────────────────────────── */}
        <aside style={{
          width: hasSession ? 220 : 360, flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          zIndex: 20, transition: 'width 0.4s ease', overflow: 'hidden',
        }}>

          {/* ── HEADER ── */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER_MED}`, padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, border: '1px solid rgba(255,255,255,0.3)', transform: 'rotate(45deg)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: MONO, fontSize: FS_HEADER, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>KRYLO</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>SIMULATION MODULE // NORTH-SOUTH PANEL</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: LIME, boxShadow: `0 0 6px ${LIME}` }} />
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', color: LIME }}>SYS_STATUS: ACTIVE</span>
              </div>
            </div>
            {hasSession && (
              <button onClick={resetSession} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.6)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(102,255,0,0.3)', padding: '0 0 1px', cursor: 'pointer', marginTop: 8, display: 'block' }}>
                ← new query
              </button>
            )}
          </div>

          {/* ── SECTION 1: INTENT STRENGTH MAPPING ── */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: `1px solid ${BORDER_FAINT}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)' }}>1. INTENT STRENGTH MAPPING (θ)</div>
              <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, fontVariantNumeric: 'tabular-nums' }}>{intentMagnitude}</span>
            </div>
            {/* Chart — responds to slider; no pointer events needed */}
            {(() => {
              const im  = intentMagnitude ?? 50;
              const ws  = bayResult.score ?? 0.3;
              // Curve Y is driven by intentMagnitude — visibly shifts as user drags
              const str = ws * 0.4 + (im / 100) * 0.6;   // 0→1 combined strength
              const y0  = Math.round(140 - Math.max(8, Math.min(124, str * 30 + 8)));
              const yq1 = Math.round(140 - Math.max(8, Math.min(124, str * 60 + (im * 0.25) + 8)));
              const ym  = Math.round(140 - Math.max(8, Math.min(124, str * 90 + (im * 0.35) + 8)));
              const y1  = Math.round(140 - Math.max(8, Math.min(124, str * 110 + (im * 0.22) + 8)));
              // Crosshair sits ON the curve at x=im
              const cx  = Math.round(Math.min(305, Math.max(10, im * 3.2)));
              // Interpolate Y on curve at cx fraction
              const t   = im / 100;
              const cy  = Math.round(y0 + (ym - y0) * t * 2 * (1 - t) + (y1 - y0) * t * t);
              const safecy = Math.max(10, Math.min(124, cy));
              return (
                <svg viewBox="0 0 320 140" width="100%" style={{ display: 'block', background: '#0b0e11', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2, pointerEvents: 'none' }}>
                  <line x1="160" y1="0" x2="160" y2="140" stroke="#14191c" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="0" y1="70" x2="320" y2="70" stroke="#14191c" strokeWidth="1" strokeDasharray="2,2" />
                  <path d={`M 0,${y0} Q 80,${yq1} 160,${ym} T 320,${y1}`} fill="none" stroke="#66FF00" strokeWidth="2" />
                  <line x1={cx} y1="0" x2={cx} y2="140" stroke="#66FF00" strokeWidth="0.8" opacity="0.5" />
                  <circle cx={cx} cy={safecy} r="5" fill="none" stroke="#66FF00" strokeWidth="1.5" />
                  <text x={Math.min(280, cx + 8)} y={Math.max(16, safecy - 6)} fill="#66FF00" fontSize="8" fontFamily="monospace">{im}% PROJECTION</text>
                  <text x="4" y="136" fill="#3a3d4a" fontSize="7" fontFamily="monospace">0</text>
                  <text x="307" y="136" fill="#3a3d4a" fontSize="7" fontFamily="monospace" textAnchor="end">100</text>
                  <text x="160" y="136" fill="#3a3d4a" fontSize="7" fontFamily="monospace" textAnchor="middle">RAW INTENT SIGNAL</text>
                </svg>
              );
            })()}
            {/* Native range slider — guaranteed drag control */}
            <style>{`
              .intent-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 3px; outline: none; cursor: ew-resize; border-radius: 2px; margin-top: 8px; }
              .intent-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #66FF00; cursor: ew-resize; box-shadow: 0 0 6px rgba(102,255,0,0.5); }
              .intent-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #66FF00; cursor: ew-resize; border: none; box-shadow: 0 0 6px rgba(102,255,0,0.5); }
            `}</style>
            <input
              type="range" min="0" max="100" value={intentMagnitude}
              onChange={e => setIntentMagnitude(Number(e.target.value))}
              className="intent-slider"
              style={{ background: `linear-gradient(to right, #66FF00 ${intentMagnitude}%, #14191c ${intentMagnitude}%)` }}
            />
            {/* Data strip */}
            <div style={{ display: 'flex', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER_FAINT}` }}>
              {[
                ['ENVELOPE', selectedFloor != null ? `$${selectedFloor >= 1000 ? Math.round(selectedFloor / 1000) + 'K' : selectedFloor}` : '—'],
                ['HORIZON', horizon ? (HORIZON_LABELS[horizon] ?? horizon) : '—'],
                ['VOLATILITY', volatilityShock ? 'HIGH_TURB' : projectedState.stateId >= 3 ? 'TURBULENT' : 'NOMINAL'],
              ].map(([label, val], i) => (
                <div key={label} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? `1px solid ${BORDER_FAINT}` : 'none', marginLeft: i > 0 ? 10 : 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)' }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: label === 'VOLATILITY' && (volatilityShock || projectedState.stateId >= 3) ? '#007FFF' : '#ffffff', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: HORIZON DRIFT SCRUBBER ── */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: `1px solid ${BORDER_FAINT}` }}>
            {(() => {
              const hIdx = horizon ? HORIZON_ORDER.indexOf(horizon) : -1;
              const pct  = hIdx >= 0 ? (hIdx / (HORIZON_ORDER.length - 1)) * 100 : 0;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)' }}>2. HORIZON DRIFT SCRUBBER (t + Δ)</div>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: horizon ? LIME : 'rgba(255,255,255,0.2)' }}>{horizon ? (HORIZON_LABELS[horizon] ?? horizon) : '—'}</span>
                  </div>
                  {/* Range slider */}
                  <style>{`
                    .hz-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 3px; outline: none; cursor: pointer; border-radius: 2px; }
                    .hz-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${horizon ? '#ffffff' : '#3a3d4a'}; border: 2px solid ${horizon ? '#66FF00' : '#2d3748'}; cursor: pointer; }
                    .hz-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${horizon ? '#ffffff' : '#3a3d4a'}; border: 2px solid ${horizon ? '#66FF00' : '#2d3748'}; cursor: pointer; border: none; }
                  `}</style>
                  <input
                    type="range" min="0" max={HORIZON_ORDER.length - 1} step="1"
                    value={hIdx >= 0 ? hIdx : 0}
                    onChange={e => setHorizon(HORIZON_ORDER[Number(e.target.value)])}
                    className="hz-slider"
                    style={{ background: `linear-gradient(to right, #66FF00 ${pct}%, #14191c ${pct}%)` }}
                  />
                  {/* Tick labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    {HORIZON_ORDER.map((h, i) => (
                      <span key={h} style={{ fontFamily: MONO, fontSize: 7, color: h === horizon ? LIME : '#3a3d4a', letterSpacing: '0.04em' }}>
                        {HORIZON_LABELS[h] ?? h}
                      </span>
                    ))}
                  </div>
                  {/* OPERATIONAL / STRATEGIC bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
                    {[
                      ['OPERATIONAL (ws)', bayResult.score ?? 0, LIME],
                      ['STRATEGIC (wv)', frictionResult.score ?? 0, '#007FFF'],
                    ].map(([label, val, clr]) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 3 }}>
                          <span>{label}</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{Math.round(val * 100)}%</span>
                        </div>
                        <div style={{ height: 2, background: '#14191c', borderRadius: 1 }}>
                          <div style={{ height: '100%', width: `${val * 100}%`, background: clr, borderRadius: 1, transition: 'width 400ms ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── SECTION 3: VOLATILITY SHOCK OVERRIDE ── */}
          <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: `1px solid ${BORDER_FAINT}` }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>3. VOLATILITY SHOCK OVERRIDE</div>
            <div style={{
              background: '#0b0e11',
              border: `1px ${volatilityShock ? 'dashed' : 'solid'} ${volatilityShock ? 'rgba(0,127,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 4, padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: volatilityShock ? '#007FFF' : 'rgba(255,255,255,0.6)' }}>
                    FORCE TURBULENT STATE ENGINE
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    Bypasses parameters; forces wc to 0.60 ceiling
                  </div>
                </div>
              </div>
              <div
                onClick={() => setVolatilityShock(v => !v)}
                style={{
                  width: 40, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
                  background: volatilityShock ? 'rgba(0,127,255,0.25)' : 'rgba(255,255,255,0.07)',
                  border: volatilityShock ? '1px solid rgba(0,127,255,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  position: 'relative', transition: 'all 200ms',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: volatilityShock ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: volatilityShock ? '#007FFF' : 'rgba(255,255,255,0.35)',
                  transition: 'left 200ms',
                }} />
              </div>
            </div>
          </div>

          {/* ── SECTION 4: FORENSIC MATRIX FIELDS ── */}
          <div style={{ flex: 1, padding: '10px 20px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>4. FORENSIC MATRIX FIELDS (SLAB INTERSECT)</div>
            <div style={{ flex: 1, position: 'relative', background: '#07090b', border: `1px solid ${BORDER_FAINT}`, borderRadius: 2, overflow: 'hidden', minHeight: 90 }}>
              <svg viewBox="0 0 320 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
                {/* Triangular mesh overlay */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none">
                  <path d="M 80,140 L 160,60 L 240,140 Z" />
                  <path d="M 80,120 L 160,40 L 240,120 Z" />
                  <path d="M 40,160 L 160,20 L 280,160 Z" opacity="0.35" />
                </g>
                {/* Lime cluster — positions shift with intentMagnitude */}
                {[
                  [100,95,1.5],[118,88,2],[88,108,1],
                  [132,100,1.5],[148,82,2.5],[112,115,1],
                  [165,90,1.5],[152,100,2],[175,85,1],
                ].map(([bx, by, r], i) => {
                  const shift = ((intentMagnitude - 50) / 50) * 18;
                  return <circle key={i} cx={Math.round(bx + shift * (i % 3 - 1))} cy={Math.round(by - shift * 0.4)} r={r} fill="#66FF00" opacity="0.6" />;
                })}
                {/* Blue cluster — shifts opposite direction when volatilityShock active */}
                {[
                  [200,68,2],[228,58,1.5],[186,85,2],
                  [245,74,1],[215,92,2],[258,62,1.5],
                  [240,95,1.5],[282,88,1],[318,78,2],
                ].map(([bx, by, r], i) => {
                  const pull = volatilityShock ? 22 : 0;
                  const shift = ((intentMagnitude - 50) / 50) * 12;
                  return <circle key={i} cx={Math.round(bx - shift + pull * (i % 2 === 0 ? -0.3 : 0.3))} cy={Math.round(by + pull * 0.2)} r={r} fill="#007FFF" opacity={volatilityShock ? 0.95 : 0.75} />;
                })}
                {/* Connection line — stretches with intent */}
                <path
                  d={`M ${Math.round(152 + (intentMagnitude - 50) * 0.3)},82 Q ${Math.round(178 + (intentMagnitude - 50) * 0.2)},52 ${Math.round(200 + (intentMagnitude - 50) * 0.1)},68`}
                  fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" strokeDasharray="2,2"
                />
                {/* Live packet dots */}
                {packets.slice(0, 4).map((p, i) => (
                  <circle key={p.id ?? i} cx={60 + (i * 53 + projectedState.stateId * 11) % 200} cy={50 + (i * 37) % 90} r="2" fill="#66FF00" opacity="0.4" />
                ))}
                <text x="6" y="155" fill="#2a3038" fontSize="7" fontFamily="monospace">SLAB LAYER // TOPOGRAPHIC VERTEX MAPPING ACTIVE</text>
              </svg>
            </div>
          </div>

          {/* ── SIMULATION CONTROLS FOOTER ── */}
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER_MED}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!isLive ? (
              <button onClick={handleReturnToLive} className="aif-btn-live" style={{
                width: '100%', height: 38, border: '1px solid rgba(102,255,0,0.2)',
                color: 'rgba(102,255,0,0.7)', letterSpacing: '0.18em', background: 'transparent',
                cursor: 'pointer', fontFamily: MONO, fontSize: FS_EXECUTE,
              }}>RETURN TO LIVE</button>
            ) : hasSession ? (
              <>
                <button
                  onClick={handleExecute}
                  disabled={processing}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: processing ? 'rgba(102,255,0,0.06)' : 'transparent',
                    color: LIME,
                    border: `1px solid ${processing ? 'rgba(102,255,0,0.2)' : 'rgba(102,255,0,0.4)'}`,
                    cursor: processing ? 'default' : 'pointer',
                    fontFamily: MONO, fontSize: FS_EXECUTE, fontWeight: 400,
                    letterSpacing: '0.22em', textTransform: 'uppercase',
                    opacity: processing ? 0.5 : 1,
                    transition: 'opacity 200ms',
                  }}
                >{processing ? 'ANALYZING...' : '⟳ REANALYZE WITH CURRENT SETTINGS'}</button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={resetSession} style={simBtnStyle}>RESET MODEL</button>
                  <button style={simBtnStyle}>SAVE STATE</button>
                  <button style={simBtnStyle}>EXPORT SCALAR</button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleExecute}
                  disabled={processing}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: processing ? 'rgba(102,255,0,0.06)' : 'transparent',
                    color: LIME,
                    border: `1px solid ${processing ? 'rgba(102,255,0,0.2)' : 'rgba(102,255,0,0.4)'}`,
                    cursor: processing ? 'default' : 'pointer',
                    fontFamily: MONO, fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    opacity: processing ? 0.5 : 1,
                    transition: 'opacity 200ms',
                  }}
                >{processing ? 'ANALYZING...' : 'INITIALIZE STRESS SIMULATION'}</button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={resetSession} style={simBtnStyle}>RESET MODEL</button>
                  <button style={simBtnStyle}>SAVE STATE</button>
                  <button style={simBtnStyle}>EXPORT SCALAR</button>
                </div>
              </>
            )}
          </div>

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
              <span>v3.8.0</span>
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

          {/* SIGNAL QUERY — idle only */}
          {!hasSession && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none', gap: 16, padding: '0 24px' }}>
              <div style={{
                width: 600, background: 'rgba(10,10,10,0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                pointerEvents: 'auto',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}>
                <textarea
                  ref={centerTextareaRef}
                  defaultValue=""
                  onChange={e => {
                    const v = e.target.value;
                    clearTimeout(queryDebounceRef.current);
                    queryDebounceRef.current = setTimeout(() => {
                      setSeedQuery(v);
                      if (missingField === 'TARGET') setMissingField(null);
                    }, 150);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={e => { setSeedQuery(e.target.value); handleQueryBlur(); }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExecute(); }}
                  placeholder="build your signal query..."
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'transparent', border: 'none', resize: 'none',
                    fontFamily: MONO, fontSize: 14, lineHeight: 1.9,
                    color: 'rgba(255,255,255,0.88)',
                    padding: '24px 24px 12px',
                    caretColor: LIME, outline: 'none',
                  }}
                />
                {/* Bottom bar */}
                <div style={{ padding: '12px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {/* Left controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* + button with dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setPlusOpen(p => !p)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, lineHeight: 1, padding: 0,
                        }}
                      >+</button>
                      {plusOpen && (
                        <div style={{
                          position: 'absolute', bottom: 42, left: 0,
                          background: '#111', border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: 12, overflow: 'hidden',
                          minWidth: 220, zIndex: 50,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                        }}>
                          {[
                            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>, label: 'Upload document' },
                            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6m-3-3v6"/></svg>, label: 'Import from file' },
                          ].map(({ icon, label }) => (
                            <button key={label} onClick={() => setPlusOpen(false)} style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '14px 16px', background: 'transparent', border: 'none',
                              color: 'rgba(255,255,255,0.75)', cursor: 'pointer', textAlign: 'left',
                              fontFamily: MONO, fontSize: 11, letterSpacing: '0.05em',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{icon}</span>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Lens pill */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 12px', borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                        {activeSituation?.lens ?? 'SIGNAL'}
                      </span>
                      {projectedState.convergenceScore > 0 && (
                        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                          CS {projectedState.convergenceScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Right controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Mic */}
                    <button style={{
                      width: 32, height: 32, background: 'transparent', border: 'none',
                      color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="9" y="2" width="6" height="11" rx="3"/>
                        <path d="M5 10a7 7 0 0 0 14 0"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                        <line x1="8" y1="22" x2="16" y2="22"/>
                      </svg>
                    </button>
                    {/* Submit — always lime */}
                    <button
                      onClick={handleExecute}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: LIME, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"/>
                        <polyline points="5 12 12 5 19 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Situation chips below search box */}
              <div style={{ width: 600, pointerEvents: 'auto' }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 10 }}>
                  I'M FOCUSED ON
                </div>
                <StaggeredChips
                  chips={rankedSituations}
                  selected={activeSituation?.lens}
                  onSelect={selectSituation}
                  getKey={s => s.lens}
                  getLabel={s => s.label}
                  isSelected={(s, sel) => s.lens === sel}
                />
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
