// WO-1340 — Emergence Payload: Unified Pane View
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore }  from '../../store/useanalysisstore.js';
import { useBayStore, DOMAIN_REGISTRY } from '../../store/usebaystore.js';
import { useEntitySignal }   from '../../hooks/useEntitySignal.js';
import { synthesizeQuery }   from '../../engine/querysynthesis.js';
import { emitTelemetry }    from '../../engine/telemetry.js';
import LeverageField         from './leveragefield.jsx';
import { getDisplayEntity }  from '../../utils/formatters.js';
import { routeLens }         from '../../engine/lensrouter.js';
import DecisionFrameCard     from './decisionframe.jsx';
import { useHappyPathEngine } from '../../engine/happypathdisplacementengine.js';
import { computeMetrics }    from '../../engine/metricsengine.js';
import MetricStrip           from './metricstrip.jsx';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Times New Roman', serif";
const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const PURPLE = '#8A2BE2';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.85)';

// ── Mock data (replaced by live engine when wired) ────────────────────────────
const ATTENTION = [
  { rank: 1, signal: 'Convergence Pressure',   category: 'Infrastructure / Signal',  trend: '↑', momentum: 'Accelerating', mColor: LIME,   conf: 0.88 },
  { rank: 2, signal: 'Liquidity Rotation',      category: 'Macro / Capital Flows',    trend: '↘', momentum: 'Stabilizing',  mColor: BLUE,   conf: 0.64 },
  { rank: 3, signal: 'Supply Chain Friction',   category: 'Global / Logistics',       trend: '↗', momentum: 'Emerging',     mColor: PURPLE, conf: 0.58 },
  { rank: 4, signal: 'Sentiment Latency',       category: 'Media / Narrative',        trend: '↗', momentum: 'Mild',         mColor: DIM,    conf: 0.46 },
];

const KEY_DRIVERS = [
  { label: 'Signal density rate',   delta: '+14%', pos: true  },
  { label: 'Cross-domain reach',    delta: '+21%', pos: true  },
  { label: 'Temporal coherence',    delta: '+8%',  pos: true  },
  { label: 'Volatility index',      delta: '-6%',  pos: false },
];

const REVELATION_STEPS = ['Scanning', 'Interpreting', 'Stabilizing', 'Ready'];

const TRAJ_POINTS = [0.18, 0.22, 0.28, 0.31, 0.35, 0.42, 0.50, 0.55, 0.61, 0.68, 0.74, 0.78];

// ── Domain Isolation Console data ─────────────────────────────────────────────
const DOMAIN_BAYS = [
  { id: 'FINANCIAL', domain: 'FINANCIAL', metric: 'Volatility: 49.0σ' },
  { id: 'MARKET',    domain: 'MARKET',    metric: 'Volatility: 59.9β' },
  { id: 'CAREER',    domain: 'CAREER',    metric: 'Growth: 46.3idx'   },
  { id: 'HEALTH',    domain: 'HEALTH',    metric: 'Biosync: 500mhz'   },
];

const MESH_NODES = [
  {x:28,y:18},{x:55,y:10},{x:78,y:24},{x:82,y:50},{x:55,y:62},{x:24,y:50},{x:50,y:34},
];
const MESH_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5]];

function NodeMesh() {
  return (
    <svg width={100} height={72} style={{ display: 'block', margin: '6px 0' }}>
      {MESH_EDGES.map(([a, b], i) => (
        <line key={i} x1={MESH_NODES[a].x} y1={MESH_NODES[a].y}
          x2={MESH_NODES[b].x} y2={MESH_NODES[b].y}
          stroke="rgba(102,255,0,0.35)" strokeWidth={0.8} />
      ))}
      {MESH_NODES.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i === 6 ? 3 : 2} fill={LIME} />
      ))}
    </svg>
  );
}

function SystemClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York' }) + ' EST');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

// ── Domain Isolation Console ──────────────────────────────────────────────────

function SignalCluster({ entityTitle, pressure, volatility, loading, headline }) {
  const [ring, setRing] = useState(0);
  const [opacity, setOpacity] = useState(0.35);

  // active pulse: ring expands 0→1 on interval keyed to volatility
  useEffect(() => {
    if (loading || !entityTitle) {
      // idle breathe
      let up = true;
      const id = setInterval(() => {
        setOpacity(o => { const next = up ? o + 0.04 : o - 0.04; if (next >= 0.65) up = false; if (next <= 0.25) up = true; return next; });
      }, 60);
      return () => clearInterval(id);
    }
    // active pulse: ring 0→1 then snap back
    const intervalMs = Math.round(800 + (1 - volatility) * 1400);
    const id = setInterval(() => setRing(r => r >= 1 ? 0 : r + 0.06), 30);
    return () => clearInterval(id);
  }, [loading, entityTitle, volatility]);

  const borderColor = loading || !entityTitle
    ? `rgba(255,255,255,${opacity.toFixed(2)})`
    : pressure > 75 ? LIME
    : pressure > 50 ? 'rgba(102,255,0,0.55)'
    : 'rgba(102,255,0,0.28)';

  const size = (!loading && entityTitle) ? Math.round(52 + (pressure / 100) * 20) : 64;
  // ring: expand outward then fade
  const ringOpacity = ring < 0.5 ? ring * 2 : (1 - ring) * 2;
  const ringScale   = 1 + ring * 0.35;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, transition: 'width 600ms ease, height 600ms ease' }}>
      {/* expanding ring */}
      {!loading && entityTitle && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: `1px solid ${borderColor}`,
          opacity: ringOpacity,
          transform: `scale(${ringScale})`,
          pointerEvents: 'none',
        }} />
      )}
      <div style={{
        width: '100%', height: '100%',
        background: '#0a0a0a',
        border: `1px solid ${borderColor}`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 400ms ease',
      }}>
        {(!loading && (entityTitle || headline)) ? (
          <span style={{
            fontSize: 9, color: LIME, fontFamily: SERIF,
            lineHeight: 1.3, textAlign: 'center', padding: '0 8px',
            transition: 'color 400ms ease',
          }}>
            {entityTitle
              ? entityTitle
              : headline.split(' ').slice(0, 6).join(' ')}
          </span>
        ) : (
          <span style={{
            fontSize: 9, color: `rgba(255,255,255,${opacity.toFixed(2)})`,
            fontFamily: MONO, letterSpacing: '0.12em',
            transition: 'color 400ms ease',
          }}>···</span>
        )}
      </div>
    </div>
  );
}

function useDomainHeadline(domain, active) {
  const [headline, setHeadline] = useState(null);
  useEffect(() => {
    if (!active) return;
    fetch(`/api/signals/headline?domain=${domain}`)
      .then(r => r.json())
      .then(d => setHeadline(d.headline ?? null))
      .catch(() => {});
  }, [domain, active]);
  return headline;
}

function DomainCard({ bayId, domainLabel }) {
  const bay         = useBayStore(s => s.bays[bayId]);
  const entityTitle = bay?.assignment?.title ?? null;
  const { pressure, volatility, loading } = useEntitySignal(entityTitle);
  const headline    = useDomainHeadline(domainLabel, true);

  return (
    <div style={{
      border: `1px solid rgba(255,255,255,0.06)`,
      background: '#000',
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: MONO }}>
            ID: {domainLabel}
          </div>
          <div style={{ fontSize: 10, color: LIME, textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: MONO, fontWeight: 'bold' }}>
            DOMAIN: {domainLabel}
          </div>
        </div>
        <SignalCluster entityTitle={entityTitle} pressure={pressure} volatility={volatility} loading={!headline && !entityTitle} headline={headline} />
      </div>
      {entityTitle && !loading && (
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: LIME, fontFamily: MONO }}>
            PRESSURE <span style={{ color: '#fff' }}>{pressure}</span>
          </div>
          <div style={{ fontSize: 9, color: DIM, fontFamily: MONO }}>
            VOL <span style={{ color: '#fff' }}>{(volatility * 100).toFixed(1)}σ</span>
          </div>
        </div>
      )}
      {headline && (
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,0.70)', fontFamily: SERIF,
          lineHeight: 1.4, marginTop: 2,
          borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 6,
        }}>
          {headline.length > 120 ? headline.slice(0, 117) + '…' : headline}
        </div>
      )}
      {!entityTitle && !headline && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: MONO, marginTop: 4, letterSpacing: '0.18em' }}>
          NO SIGNAL ASSIGNED
        </div>
      )}
    </div>
  );
}

const PULSE_STYLE = `@keyframes dic-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`;

function DomainIsolationConsole() {
  const [clock, setClock] = useState('');
  useEffect(() => {
    // inject keyframes once
    if (!document.getElementById('dic-pulse-styles')) {
      const s = document.createElement('style');
      s.id = 'dic-pulse-styles';
      s.textContent = PULSE_STYLE;
      document.head.appendChild(s);
    }
    const tick = () => {
      const d = new Date();
      setClock('SYSTEM CLOCK: ' + d.toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York' }) + ' EST');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flexShrink: 0, fontFamily: MONO, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
      <div style={{ fontSize: 9, color: DIM, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>Domain Isolation Console</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BORDER }}>
        <DomainCard bayId={1} domainLabel="FINANCIAL" />
        <DomainCard bayId={2} domainLabel="MARKET"    />
        <DomainCard bayId={3} domainLabel="CAREER"    />
        <DomainCard bayId={4} domainLabel="HEALTH"    />
      </div>
      <div style={{ marginTop: 1, background: BORDER }}>
        <div style={{ background: '#000', padding: '8px 12px', display: 'flex', gap: 32, fontSize: 9, color: DIM }}>
          <div>{clock}</div>
          <div>ACTIVE THREADS: 6</div>
        </div>
      </div>
    </div>
  );
}


// ── Sub-components ────────────────────────────────────────────────────────────

function Sparkline({ points, color = LIME, w = 120, h = 32 }) {
  if (!points?.length) return null;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(p => h - ((p - min) / range) * h * 0.85 - h * 0.075);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function ConfidenceBar({ value, color = LIME }) {
  const segs = 8;
  const filled = Math.round(value * segs);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: segs }, (_, i) => (
        <div key={i} style={{
          width: 18, height: 6,
          background: i < filled ? color : 'rgba(255,255,255,0.1)',
        }} />
      ))}
    </div>
  );
}

function DonutGauge({ value, color = LIME, size = 72 }) {
  const r   = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;
  const fill = arc * value;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeDasharray={`${arc} ${circ}`} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${fill} ${circ}`} strokeLinecap="butt" />
    </svg>
  );
}

function TrajectoryChart({ points, color = LIME, w = '100%', h = 60 }) {
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const W = 200;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(p => h - ((p - min) / range) * h * 0.8 - h * 0.1);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: w, height: h, display: 'block' }} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r={3} fill={color} />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TargetPacket() {
  const sessions       = useAnalysisStore(s => s.sessions);
  const activeId       = useAnalysisStore(s => s.activeSessionId);
  const session        = activeId ? sessions[activeId] : null;
  const envelope       = session?.tensor?.envelope ?? null;

  const synthesis = useMemo(() => synthesizeQuery(session), [session]);

  const entity      = getDisplayEntity(session?.query ?? '').toUpperCase() || 'AWAITING SIGNAL';
  const confScore   = synthesis?.confidence ?? 0.78;
  const stateLabel  = synthesis?.stateLabel ?? 'BUILDING CONVERGENCE';
  const ATTENTION   = synthesis?.attentionStack ?? [];
  const KEY_DRIVERS = synthesis?.keyDrivers ?? [];
  const TRAJ_POINTS = synthesis?.trajPoints ?? [0.18,0.22,0.28,0.31,0.35,0.42,0.50,0.55,0.61,0.68,0.74,0.78];

  // LEV-02: ranked candidates from arbitration engine
  const arbitration  = session?.tensor?.arbitration ?? null;
  const topCandidates = arbitration?.topK ?? [];
  const paretoExtra   = arbitration?.paretoAdditions ?? [];
  const happyPath     = topCandidates[0] ?? null;
  const alternatives  = topCandidates.slice(1);
  const scoreGap      = happyPath && alternatives.length > 0
    ? ((happyPath.score - alternatives[0].score) * 100).toFixed(0)
    : null;

  const revelationStep  = 3;
  const { profiles: lensProfiles, rfe: lensRfe } = useMemo(() => routeLens(session), [session]);
  const hpScore         = Math.round(confScore * 100);
  const { engineState } = useHappyPathEngine();
  const metrics         = useMemo(() => computeMetrics(synthesis, engineState, null), [synthesis, engineState]);

  // WO-1716: Domain Clamp — user-controlled bay assignment
  const assignToBay    = useBayStore(s => s.assignToBay);
  const [clampBay, setClampBay] = useState('');
  const BAY_MAP = { TECH: 1, LEGAL: 2, MARKET: 3, HEALTH: 4, CAREER: 5, FINANCE: 6 };
  const qualified = envelope?.status === 'VALIDATED' || envelope?.status === 'ESTIMATED';
  function handleClampAssign() {
    if (!qualified || !clampBay || !session) return;
    const bayId = BAY_MAP[clampBay];
    if (!bayId) return;
    assignToBay(bayId, { title: session.query, domain: clampBay, source: 'user-clamp', ts: Date.now() });
    setClampBay('');
  }

  const [showAlts, setShowAlts] = useState(false);
  const actionPanelRef = useRef(null);
  const [actionScroll, setActionScroll] = useState({ up: false, down: false });
  const checkActionScroll = useCallback(() => {
    const el = actionPanelRef.current;
    if (!el) return;
    setActionScroll({
      up:   el.scrollTop > 8,
      down: el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    });
  }, []);
  useEffect(() => {
    const t = setTimeout(checkActionScroll, 0);
    const el = actionPanelRef.current;
    if (!el) return () => clearTimeout(t);
    const ro = new ResizeObserver(checkActionScroll);
    ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [session, checkActionScroll]);

  if (!session) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
          Awaiting Signal
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000', fontFamily: MONO,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── PANE 1: Top Banner ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: `1px solid ${BORDER}`,
        height: '28%', minHeight: 160,
      }}>

        {/* Left: Primary Signal */}
        <div style={{
          flex: 1.5, padding: '20px 24px',
          borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase', marginBottom: 10 }}>
              Primary Signal
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: BRT, lineHeight: 1.2, marginBottom: 12 }}>
              {entity}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: LIME, border: `1px solid rgba(102,255,0,0.4)`, padding: '3px 10px',
              }}>
                {stateLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.1em' }}>
                  Confidence
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: LIME, letterSpacing: '0.1em' }}>
                  {confScore.toFixed(2)}
                </span>
                <ConfidenceBar value={confScore} color={LIME} />
              </div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.7, maxWidth: 480 }}>
              {synthesis?.primaryInsight ?? 'Signal processing…'}
            </div>
          </div>
        </div>

        {/* Right: Signal Momentum */}
        <div style={{
          flex: 1, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase' }}>
              Signal Momentum
            </div>
            <span style={{ fontFamily: MONO, fontSize: 20, color: LIME, letterSpacing: '0.05em' }}>{synthesis?.momentum?.value ?? '+—'}</span>
          </div>
          <TrajectoryChart points={TRAJ_POINTS} color={LIME} h={55} />
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.1em' }}>vs 1H ago</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: LIME }}>{synthesis?.momentum?.h1 ?? '+—'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.1em' }}>vs 24H ago</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: LIME }}>{synthesis?.momentum?.h24 ?? '+—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WO-1868: Metric Strip ──────────────────────────────────────────── */}
      <MetricStrip metrics={metrics} style={{ background: '#000' }} />

      {/* ── PANE 2: Middle Row ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flex: 1,
        borderBottom: `1px solid ${BORDER}`,
        minHeight: 0,
      }}>

        {/* Left: Attention Stack */}
        <div style={{
          flex: 1.2, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${BORDER}`, overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 24px', borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: BRT, textTransform: 'uppercase' }}>
              Attention Stack
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 9, color: '#000', background: LIME,
              padding: '1px 6px', letterSpacing: '0.1em',
            }}>
              {ATTENTION.length}
            </span>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 60px 100px 80px',
            padding: '7px 24px', borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}>
            {['RANK', 'SIGNAL', 'TREND', 'MOMENTUM', 'CONFIDENCE'].map(h => (
              <span key={h} style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {/* Table rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {ATTENTION.map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 60px 100px 80px',
                padding: '12px 24px', borderBottom: `1px solid rgba(255,255,255,0.04)`,
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: item.mColor, letterSpacing: '0.05em' }}>{item.rank}</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: BRT, letterSpacing: '0.08em', marginBottom: 3 }}>{item.signal}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.08em' }}>{item.category}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 14, color: item.mColor }}>{item.trend}</span>
                <span style={{
                  fontFamily: MONO, fontSize: 8, color: item.mColor,
                  border: `1px solid ${item.mColor}33`, padding: '2px 8px',
                  letterSpacing: '0.1em', width: 'fit-content',
                }}>
                  {item.momentum}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: BRT, letterSpacing: '0.05em' }}>
                  {typeof item.conf === 'number' ? item.conf.toFixed(2) : '—'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.15em', cursor: 'pointer' }}>
              View all 8 signals →
            </span>
          </div>
        </div>

        {/* Right: Recommended Action */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          <>
              {actionScroll.up && (
                <div style={{
                  position: 'absolute', top: 40, left: 0, right: 0, zIndex: 10,
                  height: 28, pointerEvents: 'none',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, letterSpacing: '0.2em' }}>▴</span>
                </div>
              )}
              <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                  height: 32, pointerEvents: 'none',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, letterSpacing: '0.2em' }}>▾</span>
                </div>

              {/* AltToggle drawer */}
              {showAlts && (
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
                  background: '#050505', borderLeft: `1px solid rgba(255,255,255,0.10)`,
                  zIndex: 30, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase' }}>HYPOTHESIS FIELD</span>
                    <span
                      onClick={() => { setShowAlts(false); emitTelemetry({ type: 'AltToggleEvent', action: 'close', requestId: arbitration?.requestId, timestamp: new Date().toISOString() }); }}
                      style={{ fontFamily: MONO, fontSize: 9, color: DIM, cursor: 'pointer', letterSpacing: '0.1em' }}
                    >✕</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alternatives.map(c => {
                      const gProxy = c.features ? Object.values(c.features).filter(v => v >= 0.5).length : 0;
                      return (
                        <div key={c.id} data-test="hypothesis_item" style={{ padding: '10px 12px', borderLeft: `2px solid ${c.type === 'action' ? LIME : c.type === 'risk' ? 'rgba(255,80,80,0.6)' : c.type === 'opportunity' ? BLUE : 'rgba(255,255,255,0.2)'}`, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.14em' }}>{c.id}</span>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>G:{gProxy} <span style={{ fontSize: 6, letterSpacing: '0.06em' }}>PROXY_UNTIL_WO1848</span></span>
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>{c.type.toUpperCase()}</div>
                          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{c.content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ padding: '10px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: LIME }}>⊙</span>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: BRT, textTransform: 'uppercase' }}>ANALYTICAL FRAME</span>
              </div>


              <div ref={actionPanelRef} onScroll={checkActionScroll} style={{ flex: 1, minHeight: 0, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {alternatives.length > 0 && (() => {
                  const rate     = arbitration?.total > 0 ? (arbitration.passed / arbitration.total) : 0;
                  const winLabel = rate > 0.5 ? 'OPEN' : rate > 0.25 ? 'TIGHT' : 'CLOSING';
                  const winColor = winLabel === 'OPEN' ? LIME : winLabel === 'TIGHT' ? 'rgba(255,255,255,0.4)' : 'rgba(255,80,80,0.5)';
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* WO-1851 — ASSEMBLANCE header: 2-axis structural space (W × G) */}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
                          ASSEMBLANCE · {alternatives.length} PATHS
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: winColor }}>
                          W: {winLabel}
                        </span>
                      </div>
                      {/* Hypothesis items — W axis live; G is SV_cluster_count_proxy until WO-1848 */}
                      {alternatives.map(c => {
                        const gProxy = c.features ? Object.values(c.features).filter(v => v >= 0.5).length : 0;
                        return (
                        <div key={c.id} data-test="hypothesis_item" data-id={c.id}
                          style={{ padding: '10px 14px', borderLeft: `2px solid ${c.type === 'action' ? LIME : c.type === 'risk' ? 'rgba(255,80,80,0.6)' : c.type === 'opportunity' ? BLUE : 'rgba(255,255,255,0.2)'}`, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.14em' }}>{c.id}</span>
                            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)' }}>
                              G:{gProxy} PROXY_UNTIL_WO1848
                            </span>
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', marginBottom: 5 }}>
                            {c.type.toUpperCase()} · W:{winLabel}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{c.content}</div>
                        </div>
                      ); })}
                      {paretoExtra.length > 0 && (
                        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: DIM, marginTop: 4 }}>+{paretoExtra.length} unattested paths</div>
                      )}
                    </div>
                  );
                })()}
                {synthesis?.leverage && <LeverageField leverage={synthesis.leverage} />}
                <div style={{ border: `1px solid rgba(102,255,0,0.2)`, padding: '16px 20px', background: 'rgba(102,255,0,0.03)' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, color: BRT, lineHeight: 1.4, marginBottom: 8 }}>{synthesis?.recommendedAction ?? 'Analysis in progress…'}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: LIME, letterSpacing: '0.1em', marginBottom: 14 }}>{synthesis?.timeHorizon ?? '—'}</div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[{ label: 'Confidence', value: confScore.toFixed(2) }, { label: 'Time Horizon', value: synthesis?.timeHorizon ?? '—' }, { label: 'Impact', value: synthesis?.impactLevel ?? '—' }].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: LIME, letterSpacing: '0.08em' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <DomainIsolationConsole />
              </div>
          </>
        </div>
      </div>

      {/* ── DECISION TRANSLATION LAYER — WO-1839 ──────────────────────────── */}
      <div style={{ display: 'flex', flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DecisionFrameCard lensProfiles={lensProfiles} hpScore={hpScore} />
        </div>

        {/* Confidence Trajectory — moved from PANE 3 */}
        <div style={{ width: 200, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: DIM, textTransform: 'uppercase', marginBottom: 8 }}>
            Confidence Trajectory
          </div>
          <TrajectoryChart points={TRAJ_POINTS} color={LIME} h={42} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>10m ago</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: LIME }}>{confScore.toFixed(2)}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>Now</span>
          </div>
        </div>

        {/* Key Drivers — moved from PANE 3 */}
        <div style={{ width: 200, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: DIM, textTransform: 'uppercase', marginBottom: 10 }}>
            Key Drivers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, justifyContent: 'center' }}>
            {KEY_DRIVERS.map(({ label, delta, pos }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: pos ? LIME : 'rgba(255,80,80,0.8)', fontSize: 8 }}>{pos ? '▶' : '▼'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: MID, letterSpacing: '0.06em' }}>{label}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, color: pos ? LIME : 'rgba(255,80,80,0.8)', letterSpacing: '0.08em' }}>{delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WO-1835: CEO COMPETITIVE EDGE BRIEF ──────────────────────────── */}
      {lensRfe?.state !== 'UNCLASSIFIED' && session?.lens?.toUpperCase() === 'CEO' && lensProfiles[0]?.lensId === 'DEFENDER' && hpScore >= 65 && (() => {
        const convLabel = {
          INSUFFICIENT_SIGNAL:   'insufficient signal — no position warranted',
          LOW_SIGNAL_YIELD:      'low signal — monitor only',
          BUILDING_CONVERGENCE:  'building convergence — early position window',
          TURBULENT_CONVERGENCE: 'turbulent — asymmetric risk, caution warranted',
          HIGH_CONVERGENCE:      'high convergence — structural shift detected',
        };
        const winRate  = arbitration?.total > 0 ? (arbitration.passed / arbitration.total) : 0;
        const winLabel = winRate > 0.5 ? 'OPEN WINDOW' : winRate > 0.25 ? 'TIGHT WINDOW' : 'CLOSING WINDOW';
        const sigPos   = `${session.query} — ${convLabel[stateLabel] ?? stateLabel.toLowerCase()}`;
        const edgeClaim = topCandidates[0]?.label ?? '—';
        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>Competitive Edge</div>
              {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
                  multi-domain signal · entropy {lensRfe.entropy.toFixed(2)}
                </span>
              )}
            </div>
            {[
              { label: 'SIGNAL POSITION',   value: sigPos },
              { label: 'STRUCTURAL WINDOW', value: winLabel },
              { label: 'EDGE CLAIM',        value: edgeClaim },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: BRT, letterSpacing: '0.05em', lineHeight: 1.4 }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── WO-1834: CFO ROI PROOF LAYER ──────────────────────────────────── */}
      {lensRfe?.state !== 'UNCLASSIFIED' && session?.lens?.toUpperCase() === 'CFO' && hpScore >= 50 && (() => {
        const accuracy   = Math.round(confScore * 100);
        const signalDrift = KEY_DRIVERS.filter(d => d.pos).length;
        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>ROI Proof</div>
              {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
                  multi-domain signal · entropy {lensRfe.entropy.toFixed(2)}
                </span>
              )}
            </div>
            {[
              { label: 'SIGNAL ACCURACY',  value: `${accuracy}% confidence — ${signalDrift} drivers positive` },
              { label: 'DECISION OUTCOME', value: topCandidates[0]?.label ?? 'Awaiting arbitration' },
              { label: 'ROAS',             value: metrics ? `${metrics.roas.value}x · ${metrics.roas.label}` : '—' },
              { label: 'CAC',              value: metrics ? `$${metrics.cac.value.toLocaleString()} · ${metrics.cac.label}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.06em' }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── WO-1831: MANUFACTURING / COO OPERATIONS LENS ─────────────────── */}
      {lensRfe?.state !== 'UNCLASSIFIED' && (session?.lens?.toUpperCase() === 'COO' || session?.lens?.toUpperCase() === 'MANUFACTURING') && hpScore >= 50 && (() => {
        const winRate  = arbitration?.total > 0 ? (arbitration.passed / arbitration.total) : 0;
        const adoptTiming = winRate > 0.6 ? 'OPTIMAL — adopt now' : winRate > 0.35 ? 'MONITOR — 30-day window' : 'DEFER — signal below adoption threshold';
        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>Operations Brief</div>
              {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
                  multi-domain signal · entropy {lensRfe.entropy.toFixed(2)}
                </span>
              )}
            </div>
            {[
              { label: 'CAPITAL PRESSURE',  value: `${hpScore}% signal strength — ${stateLabel.replace(/_/g, ' ')}` },
              { label: 'LABOR SIGNAL',      value: topCandidates.find(c => /labor|workforce|staffing/i.test(c.label ?? ''))?.label ?? 'No labor signal in active batch' },
              { label: 'ADOPTION TIMING',   value: adoptTiming },
              { label: 'BOARD POSITION',    value: topCandidates[0]?.label ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: BRT, letterSpacing: '0.05em', lineHeight: 1.4 }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── WO-1833: DECISION CADENCE BRIDGE ──────────────────────────────── */}
      {lensRfe?.state !== 'UNCLASSIFIED' && ['CEO','CFO','COO','MANUFACTURING'].includes(session?.lens?.toUpperCase()) && (() => {
        const lens = session.lens.toUpperCase();
        const QUARTERS = ['Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'];
        const storageKey = `krylo_staged_signal_${session?.id ?? 'default'}`;
        const staged = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'); } catch { return null; } })();
        function stageSignal(quarter) {
          const payload = { query: session?.query, lens, quarter, hpScore, stateLabel, ts: Date.now() };
          try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); } catch {}
        }
        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', flexShrink: 0 }}>
              {staged ? `STAGED → ${staged.quarter}` : 'STAGE FOR DECISION'}
            </span>
            {!staged && QUARTERS.map(q => (
              <button key={q} onClick={() => stageSignal(q)} style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
                background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`,
                color: 'rgba(255,255,255,0.4)', padding: '3px 8px', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(102,255,0,0.4)'; e.currentTarget.style.color = LIME; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >{q}</button>
            ))}
            {staged && (
              <button onClick={() => { try { sessionStorage.removeItem(storageKey); } catch {} }} style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)', padding: '3px 8px', cursor: 'pointer',
              }}>clear</button>
            )}
          </div>
        );
      })()}

      {/* ── OLP VECTOR BLOCK ───────────────────────────────────────────────── */}
      {envelope && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>OPTIMAL LEVERAGE POSITION</span>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: envelope.status === 'VALIDATED' ? LIME : envelope.status === 'ESTIMATED' ? 'rgba(102,255,0,0.5)' : MID, padding: '2px 6px', border: `1px solid ${envelope.status === 'VALIDATED' ? LIME : 'rgba(255,255,255,0.12)'}` }}>{envelope.status}</span>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[{ label: 'LENS', value: (envelope.lens ?? '—').toUpperCase() }, { label: 'DOMAIN', value: envelope.domain ?? '—' }, { label: 'FLOOR', value: `$${(envelope.capitalFloor ?? 0).toLocaleString()}` }, { label: 'CONFIDENCE', value: `${envelope.confidence}%` }].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: LIME, letterSpacing: '0.1em' }}>{value}</span>
                </div>
              ))}
            </div>
            {envelope.olp && [{ label: 'PROJECTED VELOCITY', value: envelope.olp.velocity, icon: '↑' }, { label: 'ENTROPY MITIGATION', value: envelope.olp.entropy, icon: '⊘' }].map(({ label, value, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: DIM, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: BRT, letterSpacing: '0.06em' }}>{value}</div>
                </div>
              </div>
            ))}
            {envelope.olp?.rationale && <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, lineHeight: 1.65, letterSpacing: '0.06em' }}>{envelope.olp.rationale}</div>}

            {/* WO-1716: Domain Clamp — user assigns result to a bay */}
            <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', flexShrink: 0 }}>ASSIGN TO BAY</span>
              <select
                value={clampBay}
                onChange={e => setClampBay(e.target.value)}
                disabled={!qualified}
                title={!qualified ? 'Requires qualified candidate status' : ''}
                style={{
                  flex: 1, background: '#000', color: qualified ? LIME : 'rgba(255,255,255,0.2)',
                  border: `1px solid ${qualified ? 'rgba(102,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', padding: '3px 6px',
                  cursor: qualified ? 'pointer' : 'not-allowed', outline: 'none',
                }}
              >
                <option value="">— SELECT DOMAIN —</option>
                {DOMAIN_REGISTRY.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={handleClampAssign}
                disabled={!qualified || !clampBay}
                style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                  background: 'transparent', cursor: qualified && clampBay ? 'pointer' : 'not-allowed',
                  border: `1px solid ${qualified && clampBay ? 'rgba(102,255,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: qualified && clampBay ? LIME : 'rgba(255,255,255,0.2)', padding: '3px 10px', flexShrink: 0,
                }}
              >CLAMP</button>
            </div>
            {envelope.criteria && Object.keys(envelope.criteria).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, marginBottom: 2 }}>CRITERIA SUBMITTED</div>
                {Object.entries(envelope.criteria).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9 }}>
                    <span style={{ color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ color: BRT }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM }}>OPTIMAL ACTION</span>
              </div>
              {envelope.olp?.action && <div style={{ fontFamily: MONO, fontSize: 11, color: LIME, letterSpacing: '0.07em', lineHeight: 1.5, textTransform: 'uppercase' }}>{envelope.olp.action}</div>}
              {envelope.arbitration && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, marginBottom: 2 }}>ARBITRATION</div>
                  {[{ label: 'SIGNAL WEIGHT', value: envelope.arbitration.signal_weight }, { label: 'FIDELITY WEIGHT', value: envelope.arbitration.fidelity_weight }, { label: 'CONSENSUS SCORE', value: envelope.arbitration.consensus_score }].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9 }}>
                      <span style={{ color: DIM, letterSpacing: '0.1em' }}>{label}</span>
                      <span style={{ color: LIME }}>{(value * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
