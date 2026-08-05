// WO-1340 — Emergence Payload: Unified Pane View
import React, { useMemo, useState, useEffect } from 'react';
import { useAnalysisStore }  from '../../store/useanalysisstore.js';
import { useBayStore, DOMAIN_REGISTRY } from '../../store/usebaystore.js';
import { useEntitySignal, ENTITY_SIGNAL_STATUS } from '../../hooks/useEntitySignal.js';
import { synthesizeQuery }   from '../../engine/querysynthesis.js';
import { emitTelemetry }    from '../../engine/telemetry.js';
import LeverageField         from './leveragefield.jsx';
import { getDisplayEntity }  from '../../utils/formatters.js';
import { routeLens }         from '../../engine/lensrouter.js';
import DecisionFrameCard     from './decisionframe.jsx';
import { useHappyPathEngine } from '../../engine/happypathdisplacementengine.js';
import { computeMetrics }        from '../../engine/metricsengine.js';
import { recordMetricsSnapshot } from '../../engine/domainmetricsstore.js';
import { buildRenderDirective }  from '../../engine/scprl.js';
import { computeTruthDynamics } from '../../engine/identitydynamics.js';
import { getAllDomainPressures, getQueryDomainPressure } from '../../engine/domaingravity.js';
import { getLRPrior }          from '../../engine/pathstore.js';
import { STATE_TYPE, normalizeToProjectionLanguage } from '../../engine/statecontract.js';
import { findCheapestFuel, findAverageFuel, findNearbyStations, isPetroQuery, petroType } from '../../engine/petrolocator.js';
import PetroTemplate from './petrotemplate.jsx';
import WhyTracePanel from './whytracepanel.jsx';
import { guestWithholdCopy } from '../../engine/guestlanguage.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Times New Roman', serif";
const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const PURPLE = '#8A2BE2';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.85)';

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

// Founder directive 2026-08-04 — replaces the per-card SignalCluster circle (headline text
// crammed into a ~64px circle, unreadable, duplicated the plain-text headline already shown
// below it). One shared risk/return-style scatter for all 4 bays, same visual grammar as a
// portfolio efficient-frontier chart: X = volatility, Y = pressure, one labeled point per
// domain — both real values, same useEntitySignal() hook DomainCard already uses, nothing
// fabricated. A domain with no resolved reading yet is simply absent from the plot (§22 —
// KRYL-1085's own doctrine in this file), listed underneath instead of guessed at.
const SCATTER_BAYS = [
  { bayId: 1, domainLabel: 'FINANCIAL' },
  { bayId: 2, domainLabel: 'MARKET'    },
  { bayId: 3, domainLabel: 'CAREER'    },
  { bayId: 4, domainLabel: 'HEALTH'    },
];

function DomainRiskScatter() {
  const bay1 = useBayStore(s => s.bays[1]);
  const bay2 = useBayStore(s => s.bays[2]);
  const bay3 = useBayStore(s => s.bays[3]);
  const bay4 = useBayStore(s => s.bays[4]);
  const sig1 = useEntitySignal(bay1?.assignment?.title ?? null);
  const sig2 = useEntitySignal(bay2?.assignment?.title ?? null);
  const sig3 = useEntitySignal(bay3?.assignment?.title ?? null);
  const sig4 = useEntitySignal(bay4?.assignment?.title ?? null);
  const signals = [sig1, sig2, sig3, sig4];

  const allPoints = SCATTER_BAYS.map((b, i) => ({ ...b, ...signals[i] }));
  const resolved  = allPoints.filter(p => p.status === ENTITY_SIGNAL_STATUS.RESOLVED);
  const unresolved = allPoints.filter(p => p.status !== ENTITY_SIGNAL_STATUS.RESOLVED);

  // viewBox chosen to match the wide, ~2.3:1 aspect ratio of the approved reference.
  const W = 460, H = 200, PAD_L = 34, PAD_B = 22, PAD_T = 10, PAD_R = 14;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const x = (volatility) => PAD_L + Math.max(0, Math.min(1, volatility)) * plotW;
  const y = (pressure)   => PAD_T + (1 - Math.max(0, Math.min(100, pressure)) / 100) * plotH;
  const dotColor = (pressure) => pressure > 75 ? LIME : pressure > 50 ? 'rgba(102,255,0,0.55)' : 'rgba(102,255,0,0.28)';

  return (
    <div style={{ padding: '10px 12px 8px', background: '#000', borderTop: `1px solid ${BORDER}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', fontFamily: MONO }}>
        {/* gridlines — min/mid/max only, per data-ink discipline */}
        {[0, 0.5, 1].map(f => (
          <line key={`gx${f}`} x1={PAD_L + f * plotW} y1={PAD_T} x2={PAD_L + f * plotW} y2={PAD_T + plotH} stroke={BORDER} strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map(f => (
          <line key={`gy${f}`} x1={PAD_L} y1={PAD_T + f * plotH} x2={PAD_L + plotW} y2={PAD_T + f * plotH} stroke={BORDER} strokeWidth="1" />
        ))}
        {/* axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke={DIM} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke={DIM} strokeWidth="1" />
        {/* axis labels */}
        <text x={PAD_L + plotW / 2} y={H - 4} textAnchor="middle" fontSize="7" letterSpacing="0.2em" fill={DIM}>VOLATILITY →</text>
        <text x={10} y={PAD_T + plotH / 2} textAnchor="middle" fontSize="7" letterSpacing="0.2em" fill={DIM} transform={`rotate(-90 10 ${PAD_T + plotH / 2})`}>PRESSURE →</text>
        {/* points */}
        {resolved.map(p => {
          const cx = x(p.volatility), cy = y(p.pressure);
          const color = dotColor(p.pressure);
          return (
            <g key={p.bayId}>
              <circle cx={cx} cy={cy} r="4" fill={color} />
              <text x={cx + 7} y={cy + 3} fontSize="8" fill={color} letterSpacing="0.08em">{p.domainLabel}</text>
            </g>
          );
        })}
      </svg>
      {unresolved.length > 0 && (
        <div style={{ fontSize: 8, color: DIM, letterSpacing: '0.12em', marginTop: 4 }}>
          NO SIGNAL RESOLVED: {unresolved.map(p => p.domainLabel).join(' · ')}
        </div>
      )}
    </div>
  );
}

// Domain label → HN search term (no server proxy required)
const DOMAIN_HN_QUERY = {
  FINANCIAL: 'finance economy interest rates',
  MARKET:    'technology startup market',
  CAREER:    'hiring jobs labor market',
  HEALTH:    'healthcare medicine',
};

function useDomainHeadline(domain, active) {
  const [headline, setHeadline] = useState(null);
  useEffect(() => {
    if (!active) return;
    const q = DOMAIN_HN_QUERY[domain] ?? domain.toLowerCase();
    fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=points%3E30&hitsPerPage=1`)
      .then(r => r.json())
      .then(d => setHeadline(d.hits?.[0]?.title ?? null))
      .catch(() => {});
  }, [domain, active]);
  return headline;
}

function DomainCard({ bayId, domainLabel }) {
  const bay         = useBayStore(s => s.bays[bayId]);
  const entityTitle = bay?.assignment?.title ?? null;
  const { pressure, volatility, resolved, status } = useEntitySignal(entityTitle);
  const headline    = useDomainHeadline(domainLabel, true);

  return (
    <div style={{
      border: `1px solid rgba(255,255,255,0.06)`,
      background: '#000',
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: MONO }}>
          ID: {domainLabel}
        </div>
        <div style={{ fontSize: 10, color: LIME, textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: MONO, fontWeight: 'bold' }}>
          DOMAIN: {domainLabel}
        </div>
      </div>
      {entityTitle && resolved && (
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: LIME, fontFamily: MONO }}>
            PRESSURE <span style={{ color: '#fff' }}>{pressure}</span>
          </div>
          <div style={{ fontSize: 9, color: DIM, fontFamily: MONO }}>
            VOL <span style={{ color: '#fff' }}>{(volatility * 100).toFixed(1)}σ</span>
          </div>
        </div>
      )}
      {/* KRYL-1085 — an unresolved lookup is stated, not hidden. Silence would read as
          "no pressure" rather than "no reading" (§20/§22). */}
      {entityTitle && status === ENTITY_SIGNAL_STATUS.UNAVAILABLE && (
        <div style={{ fontSize: 9, color: DIM, fontFamily: MONO, letterSpacing: '0.14em', marginTop: 4 }}>
          NO SIGNAL RESOLVED FOR THIS ENTITY
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
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, marginTop: 4, letterSpacing: '0.18em' }}>
          MONITORING
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
      <DomainRiskScatter />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BORDER, marginTop: 1 }}>
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
  const xs = points.map((_, i) => (i / Math.max(points.length - 1, 1)) * w);
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
  if (!points?.length) return null;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const W = 200;
  const xs = points.map((_, i) => (i / Math.max(points.length - 1, 1)) * W);
  const ys = points.map(p => h - ((p - min) / range) * h * 0.8 - h * 0.1);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: w, height: h, display: 'block' }} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r={3} fill={color} />
    </svg>
  );
}

// ── WO-1880: Fracture Output Surface (§20 Direction Honesty) ─────────────────
// First-class signal surface. Equal visual weight to constructive output.
// Fracture polarity is a detection event, not a warning label.
function FractureSignalSurface({ domainPressures }) {
  const all          = Object.values(domainPressures);
  const fracturing   = all.filter(p => p.polarity === 'fracture' && p.signalCount > 0);
  const constructive = all.filter(p => p.polarity !== 'fracture' && p.signalCount > 0);

  if (fracturing.length === 0) {
    return (
      <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, padding: '9px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>DOMAIN STATUS</span>
        {all.map(p => (
          <span key={p.domain} style={{
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.15em',
            color: p.signalCount > 0 ? 'rgba(102,255,0,0.35)' : 'rgba(255,255,255,0.10)',
          }}>{p.domain}</span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,127,255,0.35)', padding: '14px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.35em', color: BLUE }}>STRUCTURAL DIVERGENCE</span>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.15em', color: 'rgba(0,127,255,0.55)' }}>
          {fracturing.length} DOMAIN{fracturing.length !== 1 ? 'S' : ''} IN FRACTURE POLARITY
        </span>
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: constructive.length > 0 ? 12 : 0 }}>
        {fracturing.map(p => (
          <div key={p.domain} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: BLUE }}>{p.domain}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: BLUE, fontWeight: 600, letterSpacing: '0.02em' }}>
                {p.magnitude.toFixed(0)}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(0,127,255,0.55)', letterSpacing: '0.12em' }}>
                {p.signalCount} SIG
              </span>
            </div>
          </div>
        ))}
      </div>

      {constructive.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>CONSTRUCTIVE</span>
          {constructive.map(p => (
            <span key={p.domain} style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.15em', color: 'rgba(102,255,0,0.40)' }}>
              {p.domain} · {p.magnitude.toFixed(0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TargetPacket() {
  const sessions       = useAnalysisStore(s => s.sessions);
  const activeId       = useAnalysisStore(s => s.activeSessionId);
  const session        = activeId ? sessions[activeId] : null;
  const envelope       = session?.tensor?.envelope ?? null;

  const synthesis = useMemo(() => synthesizeQuery(session), [session]);

  // Petro Locator (hidden utility, isolated from the engine): a "cheapest fuel near
  // me" query resolves to a live cheapest-station lookup. Withholds, never fabricates.
  const [petro, setPetro] = useState(null);
  const [stations, setStations] = useState(null);   // KRYL-1076 — real OSM station field
  useEffect(() => {
    const q = session?.query ?? '';
    if (!isPetroQuery(q)) { setPetro(null); setStations(null); return; }
    let alive = true;
    setPetro({ loading: true });
    setStations(null);
    const type = petroType(q);
    // Station price (Zyla, paid) first; fall back to the free EIA regional average.
    findCheapestFuel({ type })
      .then(r => {
        if (r && !r.withheld) { if (alive) setPetro(r); return; }
        return findAverageFuel({ type }).then(a => { if (alive) setPetro(a); });
      })
      .catch(() => { if (alive) setPetro({ withheld: true, reason: 'ERROR' }); });
    // KRYL-1076 — real station LOCATIONS (OSM), independent of the price path. The map renders
    // whenever locations resolve, even if the price path withholds.
    findNearbyStations()
      .then(s => { if (alive) setStations(s && !s.withheld ? s : null); })
      .catch(() => { if (alive) setStations(null); });
    return () => { alive = false; };
  }, [session?.query]);

  // KRYL-DEFECT-0001 follow-up: was independently derived here (different fallback than
  // intelligencebrief.jsx's export-gate computation) — under session-timing edge cases the two
  // could disagree, showing STRUCTURAL ABSENCE here while the export gate unlocked. Matching
  // intelligencebrief.jsx's exact derivation so this panel and the export gate can't diverge.
  const entity      = getDisplayEntity(session?.query ?? 'Unknown Signal');
  // KRYL-1089: confidence is grounded only when the engine measured it. The old `?? 0.78`
  // fabricated a number whenever the seam withheld — that was the "new 78% constant". When
  // fidelity is UNGROUNDED / confidence is null, there is NO score to show.
  const confGrounded = synthesis?.fidelity !== 'UNGROUNDED' && typeof synthesis?.confidence === 'number';
  const confScore   = confGrounded ? synthesis.confidence : null;
  // Option A — no empty windows. Always present a value: grounded measurement when available,
  // else the classification estimate (always computed), labeled EST so it's never passed off as measured.
  const confEstimate  = typeof synthesis?.classificationConfidence === 'number' ? synthesis.classificationConfidence : null;
  const confDisplay   = confGrounded ? confScore : confEstimate;
  const confIsEstimate = !confGrounded && confDisplay != null;
  const stateLabel  = synthesis?.stateLabel ?? 'BUILDING CONVERGENCE';
  // DEF-1863: nothing in this pipeline produces an observed/closed outcome yet — default PROJECTION.
  const stateType   = synthesis?.stateType ?? STATE_TYPE.PROJECTION;
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
  const hpScore         = confGrounded ? Math.round(confScore * 100) : null;
  const { engineState } = useHappyPathEngine();
  const lrPrior         = useMemo(() => getLRPrior({ domain: synthesis?.queryDomain, stateLabel, lens: session?.lens ?? 'GENERAL' }), [synthesis?.queryDomain, stateLabel, session?.lens]);
  // Real domain signal (0..1) — same accessor SIGNAL/PRESSURE/CONVERGENCE use. Factors real macro
  // signal into CAC/ROAS/LTV instead of pure formula; construct made visible via the metric label.
  const domainSignal    = useMemo(() => {
    if (!synthesis?.queryDomain || synthesis.queryDomain === 'AMBIGUOUS') return null;
    const dp = getQueryDomainPressure(synthesis.queryDomain);
    return dp?.signalCount > 0 ? dp.magnitude / 100 : null;
  }, [synthesis?.queryDomain]);
  const metrics         = useMemo(() => computeMetrics(synthesis, engineState, null, lrPrior, null, domainSignal), [synthesis, engineState, lrPrior, domainSignal]);
  // Producer side of the domain metrics history store — records the real,
  // already-computed metrics object, tagged by domain. Never recomputes,
  // never fires speculatively — only when a real synthesis+domain exists.
  useEffect(() => {
    if (synthesis?.queryDomain && metrics) {
      recordMetricsSnapshot({ domain: synthesis.queryDomain, metrics });
    }
  }, [synthesis?.queryDomain, metrics]);
  const dynamics        = useMemo(() => computeTruthDynamics(synthesis?.canonicalId ?? null), [synthesis?.canonicalId]);
  // WO-1880: full 6-domain pressure field — §20 both directions always
  const domainPressures = useMemo(() => getAllDomainPressures(), [synthesis]);

  // WO-1876: write DNA entry to localStorage after synthesis resolves
  useEffect(() => {
    const domain = synthesis?.queryDomain;
    const q      = session?.query;
    if (!domain || !q || domain === 'AMBIGUOUS') return;
    const entry = {
      query:     q,
      domain,
      stateLabel: synthesis?.stateLabel ?? '',
      lens:       session?.lens ?? '',
      converged:  synthesis?.resolutionEligible !== false,
      ts:         Date.now(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('krylo_search_dna') ?? '[]');
      const deduped  = existing.filter(e => e.query !== q || Math.abs(e.ts - entry.ts) > 5000);
      localStorage.setItem('krylo_search_dna', JSON.stringify([...deduped, entry].slice(-500)));
      window.postMessage({ type: 'krylo-dna-update' }, '*');
    } catch {}
  }, [synthesis?.queryDomain, synthesis?.stateLabel, synthesis?.resolutionEligible, session?.query, session?.lens]);

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

  if (!session) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
          Awaiting Signal
        </span>
      </div>
    );
  }

  // Gas Go hidden perk — hand the whole pane to the dedicated fuel template,
  // bypassing the analysis frame (no INSUFFICIENT/NO PATHS/REFORMULATE noise).
  if (isPetroQuery(session?.query ?? '')) return <PetroTemplate petro={petro} stations={stations} />;

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
          flex: 1.5, minWidth: 0, padding: '20px 24px', // DEF-300: minWidth:0 lets this flex column shrink so long titles wrap, not overflow
          borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase', marginBottom: 10 }}>
              Primary Signal
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: BRT, lineHeight: 1.2, marginBottom: 12, overflowWrap: 'anywhere', wordBreak: 'break-word', textTransform: 'uppercase' }}>
              {entity}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: synthesis?.resolutionEligible === false ? DIM : LIME,
                border: synthesis?.resolutionEligible === false ? '1px solid rgba(255,255,255,0.1)' : `1px solid rgba(102,255,0,0.4)`,
                padding: '3px 10px',
              }}>
                {synthesis?.resolutionEligible === false ? 'INSUFFICIENT SIGNAL' : stateLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.1em' }}>
                  Confidence
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: confGrounded ? LIME : DIM, letterSpacing: '0.1em' }}>
                  {confDisplay != null ? `${confDisplay.toFixed(2)}${confIsEstimate ? ' EST' : ''}` : 'UNCLASSIFIED'}
                </span>
                {confDisplay != null && <ConfidenceBar value={confDisplay} color={confGrounded ? LIME : DIM} />}
              </div>
            </div>
            {(synthesis?.timeHorizon || synthesis?.impactLevel) && (
              <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                {[{ label: 'Time Horizon', value: synthesis?.timeHorizon }, { label: 'Impact', value: synthesis?.impactLevel }].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: LIME, letterSpacing: '0.08em' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.7, maxWidth: 480 }}>
              {synthesis?.recommendedAction ?? (
                (stateLabel === 'INSUFFICIENT_SIGNAL' || synthesis?.resolutionEligible === false)
                  ? 'Query did not resolve. Add a decision, amount, or timeline.'
                  : stateLabel === 'LOW_SIGNAL_YIELD'
                  ? 'Signal below threshold. Narrow the query.'
                  : 'Generating'
              )}
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

      {/* ── PANE 2: Vertical Stack ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', flex: 1,
        borderBottom: `1px solid ${BORDER}`,
        minHeight: 0,
      }}>

        {/* Analytical Frame — full height, AttentionStack above header */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          position: 'relative', minHeight: 0,
        }}>
          <>
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
                            <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>G:{gProxy} <span style={{ fontSize: 6, letterSpacing: '0.06em' }}>PROXY_UNTIL_WO1848</span></span>
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>{(c.type ?? 'path').toUpperCase()}</div>
                          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{typeof c.content === 'string' ? c.content : String(c.content ?? '')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── ANALYTICAL FRAME header */}
              <div style={{ padding: '10px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: LIME }}>⊙</span>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: BRT, textTransform: 'uppercase' }}>ANALYTICAL FRAME</span>
              </div>

              {/* ── Scrollable content — ASSEMBLANCE + LeverageField + DIC in single scroll */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {petro && (
                <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: LIME, textTransform: 'uppercase' }}>⛽ Closest Cheapest Gas</div>
                  {petro.loading && <div style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>Locating…</div>}
                  {petro.withheld && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                      {petro.reason === 'LOCATION_UNAVAILABLE' ? 'Location unavailable — allow location access.'
                        : petro.reason === 'ZIP_UNRESOLVED'     ? "Couldn't resolve your ZIP from location."
                        : petro.reason === 'NO_STATION_DATA'    ? 'No local station data (feed pending subscription).'
                        : 'Lookup failed.'}
                      <span style={{ fontSize: 7, color: DIM, marginLeft: 6, letterSpacing: '0.1em' }}>[{petro.reason}]</span>
                    </div>
                  )}
                  {!petro.loading && !petro.withheld && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: SERIF, fontSize: 15, color: BRT }}>{petro.station}</span>
                        <span style={{ fontFamily: MONO, fontSize: 18, color: LIME }}>{petro.price}<span style={{ fontSize: 9, color: DIM, marginLeft: 3 }}>/gal</span></span>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: MID }}>{petro.address}</div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.14em' }}>
                        {(petro.type ?? '').toUpperCase()} · ZIP {petro.zip} · AREA AVG {petro.average ?? '—'} · LOW {petro.lowest ?? '—'}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alternatives.length === 0 && (() => {
                  const q = session?.query?.trim() ?? '';
                  // Reformulate cue only when the query itself is under-specified — i.e.
                  // refining it would yield richer results. A specific query that simply
                  // found no paths is not refinable, so no cue there.
                  const needsRefine = stateLabel === 'INSUFFICIENT_SIGNAL' || synthesis?.resolutionEligible === false;
                  const suggestions = [
                    `Add timeline or dollar context`,
                    `The structural signal for ${q}?`,
                    `${q} — decision risk and structural opportunity`,
                  ];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase' }}>
                        NO PATHS RESOLVED
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, letterSpacing: '0.04em', maxWidth: 340 }}>
                        {stateLabel === 'INSUFFICIENT_SIGNAL'
                          ? 'Add a decision, amount, or timeline.'
                          : 'No paths survived. Try a more specific query.'
                        }
                      </div>
                      {synthesis?.queryDomain && (
                        <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                          DOMAIN ATTEMPTED · {synthesis.queryDomain.replace(/_/g, ' ')}
                        </div>
                      )}
                      {needsRefine && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#007FFF', flexShrink: 0, animation: 'reformulate-blink 1.1s ease-in-out infinite' }} />
                          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: DIM, textTransform: 'uppercase' }}>
                            REFORMULATE →
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {suggestions.map((s, i) => (
                            <div
                              key={i}
                              style={{
                                fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.06em',
                                padding: '3px 14px 3px 8px',
                                background: 'rgba(102,255,0,0.10)',
                                borderLeft: '2px solid rgba(102,255,0,0.45)',
                                alignSelf: 'flex-start',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {`+ ${s}`}
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })()}
                {alternatives.length > 0 && (() => {
                  const rate        = arbitration?.total > 0 ? (arbitration.passed / arbitration.total) : 0;
                  const winLabel    = rate > 0.5 ? 'OPEN' : rate > 0.25 ? 'TIGHT' : 'CLOSING';
                  const winColor    = winLabel === 'OPEN' ? LIME : winLabel === 'TIGHT' ? 'rgba(255,255,255,0.4)' : 'rgba(255,80,80,0.5)';
                  const rd          = buildRenderDirective(alternatives, synthesis, metrics);
                  const toneColors  = { NEUTRAL: DIM, COMPRESSED: 'rgba(255,200,0,0.5)', CAUTIONARY: 'rgba(255,80,80,0.6)' };
                  const toneColor   = toneColors[rd.toneLabel] ?? DIM;
                  const sortedAlts  = rd.sortedPathIds.length
                    ? [...alternatives].sort((a, b) => rd.sortedPathIds.indexOf(a.id) - rd.sortedPathIds.indexOf(b.id))
                    : alternatives;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
                          ASSEMBLANCE · {alternatives.length} PATHS
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: toneColor }}>
                          {rd.toneLabel} · W: {winLabel}
                        </span>
                      </div>
                      {sortedAlts.map(c => {
                        const gProxy = c.features ? Object.values(c.features).filter(v => v >= 0.5).length : 0;
                        return (
                        <div key={c.id} data-test="hypothesis_item" data-id={c.id}
                          style={{ padding: '10px 14px', borderLeft: `2px solid ${c.type === 'action' ? LIME : c.type === 'risk' ? 'rgba(255,80,80,0.6)' : c.type === 'opportunity' ? BLUE : 'rgba(255,255,255,0.2)'}`, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                            <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)' }}>
                              G:{gProxy} PROXY_UNTIL_WO1848
                            </span>
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', marginBottom: 5 }}>
                            {(c.type ?? 'path').toUpperCase()} · W:{winLabel}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{typeof c.content === 'string' ? c.content : String(c.content ?? '')}</div>
                        </div>
                      ); })}
                      {paretoExtra.length > 0 && (
                        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: DIM, marginTop: 4 }}>+{paretoExtra.length} unattested paths</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── LeverageField moved to the bottom-right panel (replaced the redundant Signal Feed) */}

              {/* ── Domain Isolation Console */}
              <DomainIsolationConsole />
              </div>{/* end single scroll */}
          </>
        </div>
      </div>

      {/* ── DECISION TRANSLATION LAYER + ATTENTION STACK ────────────────── */}
      {/* No forced minHeight — a withheld Decision Translation card is already tight on its own
          (decisionframe.jsx); reserving 220px regardless left that column mostly black void.
          Row now sizes to real content (Leverage Field's actual height when it's the taller side). */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DecisionFrameCard lensProfiles={lensProfiles} hpScore={hpScore} collapsed />
        </div>
        {/* Leverage Field — moved here to replace the Signal Feed (that panel duplicated the
            top-of-page header data: domain/state/confidence/signal/lens/horizon). */}
        <div style={{ flexShrink: 0, width: '45%', borderLeft: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: BRT, textTransform: 'uppercase' }}>Leverage Field</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
            {synthesis?.leverage
              ? <LeverageField leverage={synthesis.leverage} />
              : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.06em' }}>No leverage signal</span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── KRYL-2101: WHY · STRUCTURAL PROVENANCE (universal, not lens-gated) ── */}
      <WhyTracePanel entity={entity} />

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
              { label: normalizeToProjectionLanguage('DECISION OUTCOME', stateType), value: topCandidates[0]?.label ?? 'Awaiting arbitration' },
              // KRYL-1015: economics gate on .withheld — never render a fabricated $ (esp. on a real named person). §19/§22.
              { label: 'ROAS',             value: (metrics && !metrics.roas.withheld) ? `${metrics.roas.value}x · ${metrics.roas.label}` : (metrics ? guestWithholdCopy('UNGROUNDED_TAG') : '—') },
              { label: 'CAC',              value: (metrics && !metrics.cac.withheld && metrics.cac.value != null) ? `$${metrics.cac.value.toLocaleString()} · ${metrics.cac.label}` : (metrics ? guestWithholdCopy('UNGROUNDED_TAG') : '—') },
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
        const adoptTiming = normalizeToProjectionLanguage(
          winRate > 0.6 ? 'OPTIMAL — adopt now' : winRate > 0.35 ? 'MONITOR — 30-day window' : 'DEFER — signal below adoption threshold',
          stateType
        );
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

      {/* ── WO-1880: Fracture Output Surface (§20 Direction Honesty) ─────── */}
      <FractureSignalSurface domainPressures={domainPressures} />

    </div>
  );
}
