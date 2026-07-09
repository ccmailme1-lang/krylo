import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import HelpMark                       from '../shared/helpmark.jsx';
import { useAnalysisStore }           from '../../store/useanalysisstore.js';
import TargetPacket                   from './targetpacket.jsx';
import IntelligenceBrief              from './intelligencebrief.jsx';
import ReconDashboard                 from './recondashboard.jsx';
import CausalImpactView               from './causalimpactview.jsx';
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
import { useDomainMetrics } from '../../hooks/useDomainMetrics.js';

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
const domains            = ['FINANCIAL', 'MARKET', 'LEGAL', 'HEALTH', 'CAREER', 'TECHNOLOGY', 'MEDIA', 'OWNERSHIP'];

const HORIZON_LABELS = {
  IMMEDIATE:  'NOW',
  SHORT:      'SHORT',
  MEDIUM:     'MED',
  LONG:       'LONG',
  STRUCTURAL: 'YEARS',
};

// WO-1878 — Mission Builder constants
const SERIF = "Georgia, 'Times New Roman', serif";

const DOMAIN_CHIPS = [
  { key: 'FINANCIAL',  label: 'FINANCIAL',  icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg> },
  { key: 'MARKET',     label: 'MARKET',     icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { key: 'LEGAL',      label: 'LEGAL',      icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg> },
  { key: 'HEALTH',     label: 'HEALTH',     icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { key: 'CAREER',     label: 'CAREER',     icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
  { key: 'TECHNOLOGY', label: 'TECHNOLOGY', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { key: 'MEDIA',      label: 'MEDIA',      icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/></svg> },
  { key: 'OWNERSHIP',  label: 'OWNERSHIP',  icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
];

const DOMAIN_PRECURSORS = {
  FINANCIAL:  ['RATE ENVIRONMENT', 'CREDIT SPREADS', 'M2 VELOCITY'],
  MARKET:     ['EQUITY FLOW',      'VOLATILITY IDX', 'SECTOR ROTATION'],
  LEGAL:      ['REGULATORY SHIFT', 'CASE VELOCITY',  'COMPLIANCE FLUX'],
  HEALTH:     ['COVERAGE GAP',     'COST TRAJECTORY','ACCESS SIGNAL'],
  CAREER:     ['LABOR PRESSURE',   'HIRE VELOCITY',  'WAGE FLUX'],
  TECHNOLOGY: ['ADOPTION RATE',    'PATENT FLUX',    'DEPLOY SIGNAL'],
  MEDIA:      ['NEWS VELOCITY',    'NARRATIVE SHIFT','MESSAGE SPEND'],
  OWNERSHIP:  ['SUPPLY CONSTRAINT','CONTROL SHIFT',  'ASSET CONCENTRATION'],
};

// Maps the 8 Analysis Bay pills onto the locked six-domain taxonomy — derived
// from real DOMAIN_PRECURSORS keyword content (specs/analysis-domain-taxonomy-
// unification.md), not invented. Needed to filter AnalysisDomainField (which
// only knows the locked six) from a pill click (which uses these 8 labels).
const ANALYSIS_PILL_TO_DOMAIN = {
  FINANCIAL:  'CAPITAL',
  MARKET:     'CAPITAL',
  LEGAL:      'KNOWLEDGE',
  HEALTH:     'LABOR',
  CAREER:     'LABOR',
  TECHNOLOGY: 'TECHNOLOGY',
  MEDIA:      'MEDIA',
  OWNERSHIP:  'OWNERSHIP',
};

const SIGNAL_SCOPE_OPTIONS = [
  { key: 'live',       label: 'LIVE'            },
  { key: 'historical', label: 'HISTORICAL'       },
  { key: 'forecast',   label: 'FORECAST WINDOW'  },
];

const OUTPUT_FILTERS_DEF = [
  { key: 'precursors',     label: 'PRECURSORS'     },
  { key: 'risks',          label: 'RISKS'          },
  { key: 'opportunities',  label: 'OPPORTUNITIES'  },
  { key: 'contradictions', label: 'CONTRADICTIONS' },
];


// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: FS_QUESTION, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function CalibrationSignal({ lens, signalKey }) {
  const signal = CALIBRATION_SIGNALS[signalKey ?? lens];
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

// WO-1876 — compute Search DNA metrics from localStorage entries
function computeDNA(entries) {
  if (!entries?.length) return null;
  const domainCounts = {}, lensCounts = {};
  let converged = 0;
  const domainSet = new Set();
  entries.forEach(e => {
    if (e.domain && e.domain !== 'AMBIGUOUS') {
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
      domainSet.add(e.domain);
    }
    if (e.lens) lensCounts[e.lens] = (lensCounts[e.lens] || 0) + 1;
    if (e.converged) converged++;
  });
  // Session streak — consecutive calendar days ending today
  const dayKeys = new Set(entries.map(e => new Date(e.ts).toDateString()));
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dayKeys.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  const last = entries[entries.length - 1];
  return {
    total:         entries.length,
    domain:        Object.keys(domainCounts).sort((a,b) => domainCounts[b]-domainCounts[a])[0] ?? null,
    convergence:   Math.round((converged / entries.length) * 100),
    lens:          Object.keys(lensCounts).sort((a,b) => lensCounts[b]-lensCounts[a])[0] ?? null,
    domains_count: domainSet.size,
    last_query:    last?.query ?? null,
    streak,
  };
}

// WO-1876B — configurable metric pool for DNA objective cards
const DNA_METRICS = [
  { key: 'total',         label: 'SIGNALS EXPLORED', isNumeric: true  },
  { key: 'domain',        label: 'PRIMARY DOMAIN',   isNumeric: false, fmt: v => v?.replace(/_/g,' ') ?? '—' },
  { key: 'convergence',   label: 'CONVERGENCE RATE', isNumeric: true,  fmt: v => v + '%' },
  { key: 'lens',          label: 'TOP LENS',         isNumeric: false },
  { key: 'domains_count', label: 'DOMAINS EXPLORED', isNumeric: true  },
  { key: 'last_query',    label: 'LAST SIGNAL',      isNumeric: false, fmt: v => v ? (v.length > 15 ? v.slice(0,15)+'…' : v) : '—' },
  { key: 'streak',        label: 'SESSION STREAK',   isNumeric: true,  fmt: v => v + 'd' },
  // §18 Metrics Truth Engine — Vital Six, sourced from domainmetricsstore.js
  // (real computeMetrics() snapshots, scoped to the selected domain chip).
  // Detection trio (measured) + economics trio (modeled) — never blended.
  { key: 'dm_signal',      label: 'SIGNAL',      isNumeric: true, fmt: v => `${Math.round(v * 100)}%` },
  { key: 'dm_validity',    label: 'VALIDITY',    isNumeric: true, fmt: v => `${Math.round(v * 100)}%` },
  { key: 'dm_convergence', label: 'CONVERGENCE', isNumeric: true, fmt: v => `${Math.round(v * 100)}%` },
  { key: 'dm_cac',         label: 'CAC',         isNumeric: true, fmt: v => `$${Math.round(v)}` },
  { key: 'dm_roas',        label: 'ROAS',        isNumeric: true, fmt: v => `${v.toFixed(1)}x` },
  { key: 'dm_ltv',         label: 'LTV',         isNumeric: true, fmt: v => `$${Math.round(v)}` },
];
const DNA_METRIC_MAP = Object.fromEntries(DNA_METRICS.map(m => [m.key, m]));

function defaultDnaCards() {
  const cxRight = typeof window !== 'undefined' ? Math.min(Math.round(window.innerWidth / 2 + 336), window.innerWidth - 156) : 940;
  const cxLeft  = typeof window !== 'undefined' ? Math.max(8, Math.round(window.innerWidth / 2 - 336 - 148)) : 316;
  const cy = typeof window !== 'undefined' ? Math.round(window.innerHeight / 2 - 160) : 200;
  return [
    // Detection trio — left
    { id: 'c0', metricKey: 'dm_signal',      x: cxLeft,  y: cy },
    { id: 'c1', metricKey: 'dm_validity',    x: cxLeft,  y: cy + 110 },
    { id: 'c2', metricKey: 'dm_convergence', x: cxLeft,  y: cy + 220 },
    // Economics trio — right
    { id: 'c3', metricKey: 'dm_cac',         x: cxRight, y: cy },
    { id: 'c4', metricKey: 'dm_roas',        x: cxRight, y: cy + 110 },
    { id: 'c5', metricKey: 'dm_ltv',         x: cxRight, y: cy + 220 },
  ];
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalysisIdleField({ activeCones = null, onDomainSelect = null }) {

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
  // WO-1876 — Search DNA
  const [dna, setDna] = useState(() => {
    try {
      const entries = JSON.parse(localStorage.getItem('krylo_search_dna') ?? '[]');
      return computeDNA(entries);
    } catch { return null; }
  });

  const refreshDna = () => {
    try {
      const entries = JSON.parse(localStorage.getItem('krylo_search_dna') ?? '[]');
      setDna(computeDNA(entries));
    } catch {}
  };

  // Re-read when returning to idle state
  useEffect(() => { if (!hasSession) refreshDna(); }, [hasSession]);

  // Re-read on postMessage from targetpacket
  useEffect(() => {
    const onMsg = (e) => { if (e.data?.type === 'krylo-dna-update') refreshDna(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // WO-1876B — draggable objective cards
  const [dnaCards, setDnaCards] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('krylo_dna_cards_v4') ?? 'null');
      // Guard: discard any saved set containing a metricKey that no longer
      // exists in DNA_METRICS (stale schema from a previous card set), and
      // clamp positions on-screen so no card can be stranded off-viewport.
      if (Array.isArray(saved) && saved.length === 6 && saved.every(c => DNA_METRIC_MAP[c.metricKey])) {
        const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1200) - 156;
        const maxY = (typeof window !== 'undefined' ? window.innerHeight : 800) - 90;
        return saved.map(c => ({ ...c, x: Math.min(Math.max(8, c.x), maxX), y: Math.min(Math.max(8, c.y), maxY) }));
      }
    } catch {}
    return defaultDnaCards();
  });
  const [pickerCardId, setPickerCardId] = useState(null);
  const dragRef = useRef(null); // { id, startMx, startMy, startX, startY, moved }

  useEffect(() => {
    try { localStorage.setItem('krylo_dna_cards_v4', JSON.stringify(dnaCards)); } catch {}
  }, [dnaCards]);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startMx;
      const dy = e.clientY - d.startMy;
      if (!d.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      d.moved = true;
      setDnaCards(prev => prev.map(c => c.id === d.id ? { ...c, x: d.startX + dx, y: d.startY + dy } : c));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved) setPickerCardId(id => id === d.id ? null : d.id);
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Dismiss picker on outside click
  useEffect(() => {
    if (!pickerCardId) return;
    const dismiss = (e) => { if (!e.target.closest?.('[data-dna-card]')) setPickerCardId(null); };
    window.addEventListener('mousedown', dismiss);
    return () => window.removeEventListener('mousedown', dismiss);
  }, [pickerCardId]);

  const onCardMouseDown = (e, card) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id: card.id, startMx: e.clientX, startMy: e.clientY, startX: card.x, startY: card.y, moved: false };
  };

  const [activeSituation, setActiveSituation] = useState(null);
  const [seedQuery,       setSeedQuery]       = useState('');
  const [selectedFloor,   setSelectedFloor]   = useState(null);
  const [horizon,         setHorizon]         = useState(null);
  const [focused,         setFocused]         = useState(false);
  const [plusOpen,        setPlusOpen]        = useState(false);
  const [volatilityShock,   setVolatilityShock]   = useState(false);
  const [excludeSimulator,  setExcludeSimulator]  = useState(false);
  const [simRunning,        setSimRunning]         = useState(false);
  const [activeSlot,        setActiveSlot]         = useState('A');
  const [slotContent,       setSlotContent]        = useState({ A: false, B: false, C: false });
  const [slotWarning,       setSlotWarning]        = useState(null);
  const slotWarningTimer = useRef(null);
  const undoStackRef      = useRef([]);
  const [undoIdx,         setUndoIdx]         = useState(-1);
  const isApplyingSnap    = useRef(false);
  const [saveExploreOpen, setSaveExploreOpen] = useState(false);
  const [saveFileName,    setSaveFileName]    = useState('');
  const [regimeKey,       setRegimeKey]       = useState('Sovereign_Wealth');
  const [missingField,    setMissingField]    = useState(null);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);
  const [rules,           setRules]           = useState([]);
  const [signalVisible,   setSignalVisible]   = useState(false);
  const [processing,      setProcessing]      = useState(false);
  const [rightPanel,      setRightPanel]      = useState('BRIEF');
  const [optCapResetKey,  setOptCapResetKey]  = useState(0);
  const [intentMagnitude, setIntentMagnitude] = useState(50);
  // WO-1878 — Mission Builder state
  const [selectedDomains, setSelectedDomains] = useState([]);
  // Two distinct taxonomies exist by design (specs/analysis-domain-taxonomy-
  // unification.md): selectedDomains[0] is the raw 8-pill UI key the user
  // clicked (e.g. "FINANCIAL") — used for display, DOMAIN_PRECURSORS lookup,
  // and tensor.domainLock/synthesis.queryDomain. selectedLockedDomain is the
  // engine's locked-six bucket it maps onto (e.g. "CAPITAL") — used ONLY by
  // consumers that require the locked six (AnalysisDomainField's real
  // connector-tagged signals). Computed once here, not inlined per call site,
  // so a future card can't accidentally grab the wrong one.
  const selectedLockedDomain = useMemo(
    () => selectedDomains[0] ? (ANALYSIS_PILL_TO_DOMAIN[selectedDomains[0]] ?? null) : null,
    [selectedDomains]
  );
  const { data: domainMetrics } = useDomainMetrics(selectedDomains[0]);
  useEffect(() => {
    if (!onDomainSelect) return;
    onDomainSelect(selectedLockedDomain);
  }, [selectedLockedDomain, onDomainSelect]);
  const [outputFilters,   setOutputFilters]   = useState({ precursors: true, risks: true, opportunities: true, contradictions: true });
  const [signalScope,     setSignalScope]      = useState('live');
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

  useEffect(() => () => clearTimeout(processingTimer.current), []);

  useEffect(() => {
    const onDisk = () => setSaveExploreOpen(true);
    window.addEventListener('krylo-disk-click', onDisk);
    return () => window.removeEventListener('krylo-disk-click', onDisk);
  }, []);


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
    pushHistory({ activeSituation: next });
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

  function toggleDomain(key) {
    setSelectedDomains(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  }

  function removeSituationToken() {
    setActiveSituation(null); setSelectedFloor(null); setHorizon(null);
    setSeedQuery(''); setSignalVisible(false); signalShownRef.current = false;
    pushHistory({ activeSituation: null, selectedFloor: null, horizon: null, seedQuery: '' });
  }
  function removeFloorToken()   { setSelectedFloor(null); setHorizon(null); pushHistory({ selectedFloor: null, horizon: null }); }
  function removeHorizonToken() { setHorizon(null); pushHistory({ horizon: null }); }

  function handleQueryBlur() {
    setFocused(false);
    pushHistory();
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
    // Allow simulator to run without a selected lens — fall back to OPEN
    const effectiveLens = activeLens ?? 'OPEN';
    setMissingField(null);
    if (selectedFloor != null) trackFloor(selectedFloor);
    trackRules(effectiveLens, rules);
    if (signalShownRef.current) {
      emitTelemetry({ type: 'calibration_signal_executed_after', lens: effectiveLens, timestamp: Date.now() });
    }
    setSignalVisible(false);
    signalShownRef.current = false;
    setProcessing(true);

    const ts         = Date.now();
    const id         = `session_${ts}`;
    const preset     = LENS_PRESETS[effectiveLens] ?? LENS_PRESETS.OPEN;
    const geometry   = preset.scaffold.geometry;
    const domainList = LENS_DOMAIN_MAP[effectiveLens] ?? [];
    const parsed     = parseIntent(seedQuery.trim());
    const horizonRes = resolveHorizon(horizon, 'OPERATOR');

    const domain = LENS_BROKER_DOMAIN_MAP[effectiveLens] ?? 'GENERAL';

    const tensor = {
      lens:               effectiveLens,
      kernel_state_hash:  hashKernelState(effectiveLens, ts),
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
    // Phase B: attach synthesis before arbitration so generateCandidates has real content
    tensor.domainLock    = selectedDomains[0] ?? null;
    tensor.outputFilters = outputFilters;
    tensor.signalScope   = signalScope;
    tensor.synthesis          = synthesizeQuery({ query: seedQuery.trim(), lens: effectiveLens, domain, tensor: { domainLock: tensor.domainLock } });
    tensor.fidelityScore      = tensor.synthesis?.confidence ?? 0;
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

    emitTelemetry({ type: 'session_open', sessionId: id, source: 'analysis-field', query: seedQuery.trim(), anchor: effectiveLens, kernel_state_hash: tensor.kernel_state_hash, timestamp: ts });

    clearTimeout(processingTimer.current);
    processingTimer.current = setTimeout(() => {
      createSession(id, effectiveLens, seedQuery.trim(), tensor);
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

  function selectSlot(slot) {
    if (slot === activeSlot) return;
    setActiveSlot(slot);
    if (slotContent[slot]) applySnapshot(slotContent[slot]);
  }

  function handleReturnToLive() {
    setIsPlaying(false);
    clearInterval(playRef.current);
    seek(Math.max(0, history.length - 1));
    load(100);
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────
  function captureSnap(overrides = {}) {
    return { activeSituation, selectedFloor, horizon, intentMagnitude, volatilityShock, rules, seedQuery, ...overrides };
  }

  function applySnapshot(snap) {
    if (!snap) return;
    isApplyingSnap.current = true;
    setActiveSituation(snap.activeSituation ?? null);
    setSelectedFloor(snap.selectedFloor ?? null);
    setHorizon(snap.horizon ?? null);
    setIntentMagnitude(snap.intentMagnitude ?? 50);
    setVolatilityShock(snap.volatilityShock ?? false);
    setRules(snap.rules ?? []);
    setSeedQuery(snap.seedQuery ?? '');
    if (centerTextareaRef.current) centerTextareaRef.current.value = snap.seedQuery ?? '';
    requestAnimationFrame(() => { isApplyingSnap.current = false; });
  }

  function pushHistory(overrides = {}) {
    if (isApplyingSnap.current) return;
    const snap = captureSnap(overrides);
    setUndoIdx(prev => {
      const next = prev + 1;
      undoStackRef.current = [...undoStackRef.current.slice(0, next), snap];
      return next;
    });
  }

  function handleUndo() {
    if (undoIdx <= 0) return;
    const newIdx = undoIdx - 1;
    applySnapshot(undoStackRef.current[newIdx]);
    setUndoIdx(newIdx);
  }

  function handleRedo() {
    if (undoIdx >= undoStackRef.current.length - 1) return;
    const newIdx = undoIdx + 1;
    applySnapshot(undoStackRef.current[newIdx]);
    setUndoIdx(newIdx);
  }

  // Nav arrow CustomEvent bridge
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [undoIdx]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [undoIdx]);
  useEffect(() => {
    const onUndo = () => handleUndoRef.current();
    const onRedo = () => handleRedoRef.current();
    window.addEventListener('krylo-undo', onUndo);
    window.addEventListener('krylo-redo', onRedo);
    return () => {
      window.removeEventListener('krylo-undo', onUndo);
      window.removeEventListener('krylo-redo', onRedo);
    };
  }, []);

  // ── A/B slot ──────────────────────────────────────────────────────────────
  function handleSaveState() {
    setSlotContent(prev => ({ ...prev, [activeSlot]: captureSnap() }));
  }

  function handleCopySlot() {
    const other = activeSlot === 'A' ? 'B' : 'A';
    setSlotContent(prev => ({ ...prev, [other]: prev[activeSlot] }));
  }

  function handleExportJSON() {
    const data = slotContent[activeSlot] ?? captureSnap();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${saveFileName.trim() || `krylo-slot-${activeSlot}`}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveExploreOpen(false);
    setSaveFileName('');
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
        @keyframes slide-from-left  { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        @keyframes slide-from-right { from { transform:translateX(100%);  } to { transform:translateX(0); } }
        .attractor-active  { animation: attractor-pulse   2.4s linear infinite; }
        .vector-incomplete { animation: vector-incomplete 0.9s ease-in-out infinite; }
        .aif-btn-live:hover { background: rgba(102,255,0,0.04); border-color: rgba(102,255,0,0.5); color: ${LIME}; }
      `}</style>

      <div style={{ width: '100%', height: '100%', background: BG, color: '#fff', overflow: 'hidden', fontFamily: MONO, position: 'relative', display: 'flex' }}>

        {/* ── SIMULATION CONTROL PANEL ─────────────────────────────────── */}
        <aside style={{
          width: 242, flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
          background: 'rgba(5,7,10,0.96)',
          display: 'flex', flexDirection: 'column',
          zIndex: 20, overflow: 'hidden',
        }}>

          {/* ── HEADER ── */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER_MED}`, padding: '12px 20px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', lineHeight: '1.8' }}>
              <div style={{ color: 'rgba(255,255,255,0.2)' }}>SIMULATION MODULE // NORTH-SOUTH PANEL</div>
              <div style={{ color: LIME }}>● SYS_STATUS: ACTIVE</div>
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
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center' }}>1. INTENT STRENGTH MAPPING (θ)<HelpMark text="How strongly-worded your question is. A more specific, confident question gets a higher number." /></div>
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
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)' }}>{label}</div>
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
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center' }}>2. HORIZON SCRUBBER (t + Δ)<HelpMark text="How far into the future you want to look — from right now out to years ahead. Slide it to change the time window." /></div>
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
                      <span key={h} style={{ fontFamily: MONO, fontSize: 9, color: h === horizon ? LIME : '#3a3d4a', letterSpacing: '0.04em' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 3 }}>
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

          {/* ── SECTION 3: FORENSIC MATRIX FIELDS ── */}
          <div style={{ flexShrink: 0, padding: '10px 20px', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${BORDER_FAINT}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', marginBottom: 8, display: 'flex', alignItems: 'center' }}>3. FORENSIC MATRIX FIELDS (SLAB INTERSECT)<HelpMark text="A map showing which topic areas (Tech, Money, Knowledge, Labor, Media, Ownership) have the most activity right now. Bigger circle = more activity." /></div>
            <div style={{ height: 180, position: 'relative', background: '#07090b', border: `1px solid ${BORDER_FAINT}`, borderRadius: 2, overflow: 'hidden' }}>
              {(() => {
                // 6 domain anchors — fixed positions on 320×160 SVG
                // value (0–1) from activeCones drives r and opacity directly
                const DOMAIN_ANCHORS = [
                  { key: 'financial', label: 'CAPITAL',   cx: 100, cy: 58  },
                  { key: 'operating', label: 'TECH',      cx: 160, cy: 32  },
                  { key: 'knowledge', label: 'KNOW',      cx: 220, cy: 58  },
                  { key: 'time',      label: 'LABOR',     cx: 100, cy: 118 },
                  { key: 'personal',  label: 'MEDIA',     cx: 160, cy: 132 },
                  { key: 'market',    label: 'OWNERSHIP', cx: 220, cy: 118 },
                ];
                const cones = activeCones ?? {};
                const intentShift = ((intentMagnitude - 50) / 50) * 14; // ±14px at extremes
                const shockShift  = volatilityShock ? 8 : 0;

                return (
                  <svg viewBox="0 0 320 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
                    {/* Mesh edges between adjacent domain pairs */}
                    <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.75" fill="none">
                      {[[0,1],[1,2],[3,4],[4,5],[0,3],[1,4],[2,5],[0,4],[1,5],[1,3]].map(([a,b],i) => {
                        const A = DOMAIN_ANCHORS[a], B = DOMAIN_ANCHORS[b];
                        const va = cones[A.key]?.value ?? 0, vb = cones[B.key]?.value ?? 0;
                        const combined = (va + vb) / 2;
                        return <line key={i} x1={A.cx} y1={A.cy} x2={B.cx} y2={B.cy} opacity={0.04 + combined * 0.18} />;
                      })}
                    </g>
                    {/* Domain nodes — r and opacity are direct functions of cone.value */}
                    {DOMAIN_ANCHORS.map(({ key, label, cx, cy }) => {
                      const cone  = cones[key] ?? { value: 0, color: 'rgba(255,255,255,0.2)' };
                      const v     = Math.max(0, Math.min(1, cone.value));       // clamp 0–1
                      const r     = 2 + v * 8;                                  // 2px–10px
                      const op    = 0.3 + v * 0.7;                             // 0.30–1.00
                      const color = cone.color ?? '#66FF00';
                      // intent magnitude shifts X; volatility shock adds Y jitter keyed to node index
                      const nx = Math.round(cx + intentShift * (cx < 160 ? -0.5 : cx > 160 ? 0.5 : 0));
                      const ny = Math.round(cy + (volatilityShock ? shockShift * ((cy > 80 ? 1 : -1)) : 0));
                      return (
                        <g key={key}>
                          <circle cx={nx} cy={ny} r={Math.round(r * 10) / 10} fill={color} opacity={op} />
                          <text x={nx} y={ny + Math.round(r) + 8} textAnchor="middle"
                            fill={color} fontSize="5.5" fontFamily="monospace"
                            opacity={Math.round(op * 10) / 10} letterSpacing="0.08em">
                            {label}
                          </text>
                          <text x={nx + Math.round(r) + 3} y={ny + 2} textAnchor="start"
                            fill="rgba(255,255,255,0.35)" fontSize="5" fontFamily="monospace">
                            {Math.round(v * 100)}
                          </text>
                        </g>
                      );
                    })}
                    <text x="6" y="155" fill="#1c2128" fontSize="6.5" fontFamily="monospace" letterSpacing="0.06em">SLAB // 6-DOMAIN FIELD</text>
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* ── SIGNAL SCOPE ── */}
          <div style={{ flexShrink: 0, padding: '10px 20px', borderBottom: `1px solid ${BORDER_FAINT}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)', marginBottom: 10, display: 'flex', alignItems: 'center' }}>4. SIGNAL SCOPE<HelpMark text="Choose whether to look at what's happening right now (Live), what's already happened (Historical), or a future time window you pick (Forecast Window)." /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SIGNAL_SCOPE_OPTIONS.map(opt => {
                const active = signalScope === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSignalScope(opt.key)}
                    style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                      background: active ? 'rgba(102,255,0,0.06)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(102,255,0,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      color: active ? LIME : 'rgba(255,255,255,0.35)',
                      padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 150ms',
                    }}
                  >
                    {active ? '● ' : '○ '}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RE-ANALYZE ── only after search execute */}
          {hasSession && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0', flexShrink: 0 }}>
            <button
              onClick={resetSession}
              title="Re-analyze"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.75, transition: 'opacity 150ms, filter 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'drop-shadow(0 0 6px #66FF00)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.filter = 'none'; }}
            >
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#66FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>}

          {/* ── SIMULATION CONTROLS FOOTER ── */}
          {!isLive && (
            <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER_MED}`, padding: '12px 16px' }}>
              <button onClick={handleReturnToLive} className="aif-btn-live" style={{
                width: '100%', height: 38, border: '1px solid rgba(102,255,0,0.2)',
                color: 'rgba(102,255,0,0.7)', letterSpacing: '0.18em', background: 'transparent',
                cursor: 'pointer', fontFamily: MONO, fontSize: FS_EXECUTE,
              }}>RETURN TO LIVE</button>
            </div>
          )}


        </aside>

        {/* ── MAIN FIELD ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 64,
            borderBottom: `1px solid ${BORDER_MED}`, padding: '0 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10, background: 'rgba(5,7,10,0.95)',
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


          {/* Session results */}
          {hasSession && (
            <>
              <div style={{ position: 'absolute', top: 0, left: 0, right: '38%', bottom: 0, zIndex: 10, background: '#000' }}>
                <TargetPacket />
              </div>
              <div style={{ position: 'absolute', top: 0, left: '62%', right: 0, bottom: 0, zIndex: 10, background: '#000', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0, background: '#000' }}>
                  {['BRIEF', 'RECON', 'IMPACT'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRightPanel(tab)}
                      style={{
                        padding: '10px 20px', background: 'transparent', border: 'none',
                        borderBottom: `2px solid ${rightPanel === tab ? '#66FF00' : 'transparent'}`,
                        color: rightPanel === tab ? '#66FF00' : 'rgba(255,255,255,0.55)',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.22em',
                        cursor: 'pointer', textTransform: 'uppercase', marginBottom: -1,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {rightPanel === 'BRIEF' ? <IntelligenceBrief />
                    : rightPanel === 'RECON' ? <ReconDashboard />
                    : <div style={{ height: '100%', overflowY: 'auto' }}><CausalImpactView subject={activeSession?.query} /></div>}
                </div>
              </div>
            </>
          )}

          {/* SIGNAL QUERY — idle only */}
          {!hasSession && (
            <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none', padding: '72px 24px 80px' }}>

              {/* Headline */}
              <div style={{ textAlign: 'center', marginBottom: 28, pointerEvents: 'none' }}>
                <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.82)' }}>WHAT ARE YOU</div>
                <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.06em', color: LIME }}>FOCUSED ON?</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginTop: 10 }}>
                  Search across topics, domains or ask anything
                </div>
              </div>

              <div style={{ width: 600, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* ── CHOOSE A DOMAIN ── */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 10 }}>CHOOSE A DOMAIN</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DOMAIN_CHIPS.map(({ key, label, icon }, i) => {
                      const active   = selectedDomains.includes(key);
                      const dominant = selectedDomains[0] === key && selectedDomains.length > 1;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleDomain(key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                            background: active ? 'rgba(102,255,0,0.06)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.14)'}`,
                            color: active ? LIME : 'rgba(255,255,255,0.45)',
                            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                            boxShadow: active ? '0 0 10px rgba(102,255,0,0.22)' : 'none',
                            transition: 'all 140ms',
                            opacity: 0, animation: 'krylo-fade-in 0.3s ease forwards', animationDelay: `${i * 60}ms`,
                          }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff'; } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                        >
                          <span style={{ opacity: active ? 1 : 0.45, display: 'flex' }}>{icon}</span>
                          {dominant && <span style={{ width: 5, height: 5, borderRadius: '50%', background: LIME, flexShrink: 0 }} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── TRENDING PRECURSORS ── */}
                {selectedDomains[0] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, minHeight: 22 }}>
                    <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.28em', flexShrink: 0 }}>TRENDING</span>
                    {(DOMAIN_PRECURSORS[selectedDomains[0]] ?? []).map(p => (
                      <span key={p} style={{
                        fontFamily: MONO, fontSize: 8, color: 'rgba(102,255,0,0.5)',
                        letterSpacing: '0.1em', padding: '2px 9px',
                        border: '1px solid rgba(102,255,0,0.14)', borderRadius: 999,
                      }}>{p}</span>
                    ))}
                  </div>
                )}

                {/* ── OBJECTIVE (textarea + toolbar) ── */}
                <div style={{
                  background: 'rgba(10,10,10,0.96)',
                  border: `1px solid ${focused ? 'rgba(102,255,0,0.28)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
                  transition: 'border-color 200ms',
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
                    placeholder="Describe what you're trying to accomplish..."
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'transparent', border: 'none', resize: 'none',
                      fontFamily: MONO, fontSize: 14, lineHeight: 1.9,
                      color: 'rgba(255,255,255,0.88)',
                      padding: '20px 24px 10px',
                      caretColor: LIME, outline: 'none',
                    }}
                  />
                  {/* Toolbar */}
                  <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* + attachment */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setPlusOpen(p => !p)}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, padding: 0 }}
                        >+</button>
                        {plusOpen && (
                          <div style={{ position: 'absolute', bottom: 36, left: 0, background: '#111', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 200, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                            {[
                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>, label: 'Upload document' },
                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6m-3-3v6"/></svg>, label: 'Import from file' },
                            ].map(({ icon, label }) => (
                              <button key={label} onClick={() => setPlusOpen(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.72)', cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{icon}</span>{label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Exclude sim */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={excludeSimulator} onChange={e => setExcludeSimulator(e.target.checked)} style={{ accentColor: LIME, width: 11, height: 11, cursor: 'pointer' }} />
                        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: excludeSimulator ? 'rgba(102,255,0,0.6)' : 'rgba(255,255,255,0.22)', textTransform: 'uppercase', transition: 'color 150ms' }}>EXCLUDE SIM</span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button style={{ width: 30, height: 30, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                      </button>
                      <button onClick={handleExecute} style={{ width: 34, height: 34, borderRadius: '50%', background: LIME, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── SIGNAL SCOPE ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.28em', marginRight: 4, flexShrink: 0 }}>SIGNAL SCOPE</span>
                  {SIGNAL_SCOPE_OPTIONS.map(({ key, label }) => {
                    const active = signalScope === key;
                    return (
                      <button key={key} onClick={() => setSignalScope(key)} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', padding: '4px 11px', borderRadius: 999, cursor: 'pointer', background: 'transparent', border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.1)'}`, color: active ? LIME : 'rgba(255,255,255,0.28)', transition: 'all 120ms' }}>
                        {active ? '● ' : '○ '}{label}
                      </button>
                    );
                  })}
                </div>

                {/* ── OUTPUT FILTERS ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.28em', flexShrink: 0 }}>OUTPUT</span>
                  {OUTPUT_FILTERS_DEF.map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={outputFilters[key]} onChange={e => setOutputFilters(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: LIME, width: 10, height: 10, cursor: 'pointer' }} />
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: outputFilters[key] ? 'rgba(102,255,0,0.65)' : 'rgba(255,255,255,0.22)', transition: 'color 120ms' }}>{label}</span>
                    </label>
                  ))}
                </div>

                {/* ── I'M FOCUSED ON ── */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 10 }}>I'M FOCUSED ON</div>
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


            </div>
          )}

          {/* WO-1876B — DNA objective cards: draggable, click-configurable, fixed-positioned */}
          {!hasSession && dnaCards.map(card => {
            const metric   = DNA_METRIC_MAP[card.metricKey];
            const rawVal   = card.metricKey.startsWith('dm_')
              ? (domainMetrics?.[card.metricKey.slice(3)]?.value ?? null)
              : dna?.[card.metricKey];
            const display  = rawVal !== undefined && rawVal !== null
              ? (metric.fmt ? metric.fmt(rawVal) : String(rawVal))
              : '—';
            const isOpen   = pickerCardId === card.id;
            return (
              <div
                key={card.id}
                data-dna-card
                onMouseDown={e => onCardMouseDown(e, card)}
                style={{
                  position: 'fixed',
                  left: card.x,
                  top:  card.y,
                  width: 148,
                  background: 'rgba(4,6,9,0.82)',
                  backdropFilter: 'blur(14px)',
                  border: `1px solid ${isOpen ? 'rgba(102,255,0,0.35)' : 'rgba(102,255,0,0.10)'}`,
                  borderRadius: 7,
                  padding: '13px 15px 11px',
                  cursor: 'grab',
                  userSelect: 'none',
                  zIndex: isOpen ? 8900 : 8800,
                  pointerEvents: 'auto',
                  transition: 'border-color 120ms',
                }}
              >
                {/* Grip dots */}
                <div style={{ position: 'absolute', top: 9, right: 10, display: 'grid', gridTemplateColumns: 'repeat(3,3px)', gap: 2, opacity: 0.22 }}>
                  {[...Array(6)].map((_,i) => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />)}
                </div>

                {/* Label */}
                <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', paddingRight: 16 }}>
                  {metric.label}
                </div>

                {/* Value */}
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: metric.isNumeric ? LIME : '#fff', letterSpacing: '0.02em', lineHeight: 1.15, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {display}
                </div>

                {/* Config hint */}
                <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.22)', textTransform: 'uppercase', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  TAP TO CONFIGURE
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Metric picker */}
                {isOpen && (
                  <div
                    data-dna-card
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                      width: 192,
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: 'rgba(4,6,9,0.97)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 6,
                      zIndex: 8801,
                    }}
                  >
                    <div style={{ padding: '7px 12px 5px', fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      SELECT METRIC
                    </div>
                    {DNA_METRICS.map(m => {
                      const active = m.key === card.metricKey;
                      return (
                        <div
                          key={m.key}
                          data-dna-card
                          onClick={() => { setDnaCards(prev => prev.map(c => c.id === card.id ? { ...c, metricKey: m.key } : c)); setPickerCardId(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: active ? 'rgba(102,255,0,0.05)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                          }}
                        >
                          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: active ? LIME : 'transparent', border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.18)'}` }} />
                          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: active ? LIME : 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
                            {m.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

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

        {/* ── SAVE EXPLORE PANEL ── */}
        {saveExploreOpen && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            [activeSlot === 'A' ? 'left' : 'right']: 0,
            width: 280,
            background: '#0a0c0f',
            borderLeft:  activeSlot === 'B' ? `1px solid ${BORDER}` : 'none',
            borderRight: activeSlot === 'A' ? `1px solid ${BORDER}` : 'none',
            zIndex: 60,
            display: 'flex', flexDirection: 'column',
            animation: `${activeSlot === 'A' ? 'slide-from-left' : 'slide-from-right'} 200ms ease`,
          }}>
            <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: `1px solid ${BORDER_FAINT}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: LIME }}>SAVE — SLOT {activeSlot}</div>
              <button onClick={() => setSaveExploreOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, fontFamily: MONO }}>×</button>
            </div>
            <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>FILE NAME</div>
                <input
                  value={saveFileName}
                  onChange={e => setSaveFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleExportJSON(); }}
                  placeholder={`krylo-slot-${activeSlot}`}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0b0e11', border: `1px solid ${BORDER}`,
                    color: '#fff', fontFamily: MONO, fontSize: 10,
                    padding: '8px 12px', outline: 'none', letterSpacing: '0.06em',
                  }}
                />
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.18)', marginTop: 6, letterSpacing: '0.1em' }}>.json</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>CONTENTS</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, letterSpacing: '0.04em' }}>
                  {slotContent[activeSlot] ? (
                    <>
                      <div>LENS: {slotContent[activeSlot].activeSituation?.lens ?? '—'}</div>
                      <div>INTENT: {slotContent[activeSlot].intentMagnitude ?? '—'}</div>
                      <div>HORIZON: {slotContent[activeSlot].horizon ?? '—'}</div>
                    </>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.2)' }}>No saved state in slot {activeSlot}</div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '16px 20px', borderTop: `1px solid ${BORDER_FAINT}` }}>
              <button
                onClick={handleExportJSON}
                style={{ width: '100%', padding: '10px 0', background: LIME, border: 'none', color: '#000', fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', cursor: 'pointer', textTransform: 'uppercase' }}
              >Save as JSON</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
