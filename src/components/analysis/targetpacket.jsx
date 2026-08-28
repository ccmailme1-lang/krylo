// WO-1340 — Emergence Payload: Unified Pane View
// KRYL-1220 (UI port only) — composition ported from the approved
// `specs/KRYLO Target Packet.html`: original identity top block + PRIMARY SIGNAL
// (42px, locked) + five-metric strip (honest absence) + 01–05 analytical body.
// Live data flow, engine wiring, and lens-brief logic are UNCHANGED. No closed-loop
// bridge, no computeMetrics/querysynthesis/domainSignal changes, no fabricated
// section content. Sections with no source today render an explicit absence state.
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
// KRYL-1220 UI port: the approved composition specifies Helvetica Neue for the
// identity h1 and the 42px PRIMARY SIGNAL. This is a known §7 (report font
// contract) exception, flagged and deliberately not "corrected" during the port.
const HELV   = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const PURPLE = '#8A2BE2';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.85)';

// Approved-composition palette (from specs/KRYLO Target Packet.html).
const PKT_BG   = '#08090a';
const RULE     = '#191d1e';
const HAIRLINE = '#131617';
const LBL      = '#5d6462';   // section / eyebrow label
const LBL_DIM  = '#565d5b';
const BODY_C   = '#b6bcb7';   // body copy
const BRIGHT   = '#f4f6f2';   // headline text
const ABSENCE  = '#4f5654';   // honest-absence text

const KEY_DRIVERS = [
  { label: 'Signal density rate',   delta: '+14%', pos: true  },
  { label: 'Cross-domain reach',    delta: '+21%', pos: true  },
  { label: 'Temporal coherence',    delta: '+8%',  pos: true  },
  { label: 'Volatility index',      delta: '-6%',  pos: false },
];

const REVELATION_STEPS = ['Scanning', 'Interpreting', 'Stabilizing', 'Ready'];

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

// ── KRYL-1220 UI port: ordinal-rail section wrapper (01–05) ──────────────────
function PacketSection({ ordinal, title, mt = 54, children }) {
  return (
    <section style={{
      marginTop: mt, borderTop: `1px solid ${RULE}`, paddingTop: 30,
      display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr)', gap: 22,
    }}>
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingTop: 1 }}>
        <span style={{ display: 'block', paddingLeft: 12, fontFamily: MONO, fontSize: 9, letterSpacing: '0.05em', color: LBL_DIM }}>
          {ordinal}
        </span>
      </div>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: LBL }}>{title}</div>
        {children}
      </div>
    </section>
  );
}

// Honest-absence marker — used where the approved composition reserves a slot the
// packet cannot populate from live engine state today (KRYL-1220 / KRYL-1202).
function NotMeasured() {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: ABSENCE }}>
      NOT MEASURED
    </span>
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
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>DOMAIN STATUS</span>
        {all.map(p => (
          <span key={p.domain} style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em',
            color: p.signalCount > 0 ? 'rgba(102,255,0,0.35)' : 'rgba(255,255,255,0.10)',
          }}>{p.domain}</span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,127,255,0.35)', padding: '14px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.35em', color: BLUE }}>STRUCTURAL DIVERGENCE</span>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: 'rgba(0,127,255,0.55)' }}>
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
              <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(0,127,255,0.55)', letterSpacing: '0.12em' }}>
                {p.signalCount} SIG
              </span>
            </div>
          </div>
        ))}
      </div>

      {constructive.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>CONSTRUCTIVE</span>
          {constructive.map(p => (
            <span key={p.domain} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: 'rgba(102,255,0,0.40)' }}>
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
  // KRYL-1175: no real historical trend series exists anywhere in this system — the old fallback
  // was a fabricated climbing curve. null means "no data", not "assume an upward trend".
  const TRAJ_POINTS = synthesis?.trajPoints ?? null;

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

  // KRYL-1220 UI port — identity-line derivations, from the same domain-pressure
  // field the rest of the packet already reads. No new data source.
  const packetDate = new Date().toISOString().slice(0, 10);
  const activeDomainPressures = Object.values(domainPressures).filter(p => p.signalCount > 0);
  const observationCount = activeDomainPressures.reduce((s, p) => s + p.signalCount, 0);
  const activeDomainCount = activeDomainPressures.length;
  const identitySubline = observationCount > 0
    ? `Structural analysis · ${packetDate} · ${observationCount} observation${observationCount !== 1 ? 's' : ''} across ${activeDomainCount} domain${activeDomainCount !== 1 ? 's' : ''}`
    : `Structural analysis · ${packetDate} · no domain signal recorded`;

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

  const projectionTag = stateType === STATE_TYPE.OBSERVED ? 'OBSERVED' : 'PROJECTION';

  // ── ASSEMBLANCE / path-field fragment (unchanged logic — WO/LEV path rendering) ──
  const assemblanceBlock = (
    <div style={{ marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)' }}>
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
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      overflowY: 'auto', overflowX: 'hidden',
      background: PKT_BG, fontFamily: MONO,
    }}>
      {/* Petro hidden utility (unchanged) — surfaces only inside the analytical frame */}
      {petro && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 56px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: LIME, textTransform: 'uppercase' }}>⛽ Closest Cheapest Gas</div>
          {petro.loading && <div style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>Locating…</div>}
          {petro.withheld && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
              {petro.reason === 'LOCATION_UNAVAILABLE' ? 'Location unavailable — allow location access.'
                : petro.reason === 'ZIP_UNRESOLVED'     ? "Couldn't resolve your ZIP from location."
                : petro.reason === 'NO_STATION_DATA'    ? 'No local station data (feed pending subscription).'
                : 'Lookup failed.'}
              <span style={{ fontSize: 8, color: DIM, marginLeft: 6, letterSpacing: '0.1em' }}>[{petro.reason}]</span>
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

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 56px 96px', position: 'relative' }}>

        {/* ── HYPOTHESIS FIELD drawer (unchanged; trigger is legacy/inert) ─────── */}
        {showAlts && (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '40%',
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
                      <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>G:{gProxy} <span style={{ fontSize: 8, letterSpacing: '0.06em' }}>PROXY_UNTIL_WO1848</span></span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>{(c.type ?? 'path').toUpperCase()}</div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{typeof c.content === 'string' ? c.content : String(c.content ?? '')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── IDENTITY TOP BLOCK (approved composition) ───────────────────────── */}
        <header style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 40, padding: '18px 0 12px', borderBottom: `1px solid ${RULE}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontFamily: HELV, fontSize: 19, fontWeight: 300,
              letterSpacing: '-0.015em', color: BRIGHT,
              overflowWrap: 'anywhere', wordBreak: 'break-word',
            }}>
              {entity}
            </h1>
            <div style={{ marginTop: 9, fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: '#767d7a' }}>
              {identitySubline}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: LIME }}>ANALYSIS</div>
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: LBL }}>TARGET PACKET · DERIVED</div>
          </div>
        </header>

        {/* ── PRIMARY SIGNAL — statement reduced to 19px; label + meta line at original scale ── */}
        <section style={{ padding: '30px 0 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: LBL }}>PRIMARY SIGNAL</div>
          <p style={{
            margin: '10px 0 0', maxWidth: 950, fontFamily: HELV, fontSize: 19,
            lineHeight: 1.3, fontWeight: 300, letterSpacing: '-0.015em', color: BRIGHT,
          }}>
            {synthesis?.recommendedAction ?? (
              (stateLabel === 'INSUFFICIENT_SIGNAL' || synthesis?.resolutionEligible === false)
                ? 'Query did not resolve. Add a decision, amount, or timeline.'
                : stateLabel === 'LOW_SIGNAL_YIELD'
                ? 'Signal below threshold. Narrow the query.'
                : 'Generating.'
            )}
          </p>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 28, fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: '#767d7a' }}>
            <span>CONFIDENCE <span style={{ color: '#eceee9' }}>
              {confDisplay != null ? `${confDisplay.toFixed(2)}${confIsEstimate ? ' EST' : ''}` : 'UNCLASSIFIED'}
            </span></span>
            <span style={{ color: '#3a4140' }}>·</span>
            <span>HORIZON <span style={{ color: '#eceee9' }}>{synthesis?.timeHorizon ?? '—'}</span></span>
            <span style={{ color: '#3a4140' }}>·</span>
            <span>EVIDENCE <span style={{ color: '#eceee9' }}>{arbitration?.total != null ? arbitration.total : '—'}</span></span>
            <span style={{ color: '#3a4140' }}>·</span>
            <span>FORMATION <span style={{ color: LIME }}>
              {(synthesis?.resolutionEligible === false ? 'INSUFFICIENT SIGNAL' : stateLabel).replace(/_/g, ' ')}
            </span></span>
          </div>
        </section>

        {/* ── FIVE-METRIC STRIP — honest absence (KRYL-1220 capability gap) ────── */}
        <section style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
          {[
            ['STRUCTURAL DENSITY',   'relationships per object'],
            ['RELATIONSHIP DEPTH',   'mean hops to evidence'],
            ['EVIDENCE COVERAGE',    'objects with ≥2 sources'],
            ['TEMPORAL PERSISTENCE', 'years committed'],
            ['DOMAIN CONCENTRATION', 'capital'],
          ].map(([label, sub], i) => (
            <div key={label} style={{
              padding: i === 0 ? '10px 24px 10px 0' : i === 4 ? '10px 0 10px 24px' : '10px 24px',
              borderLeft: i === 0 ? 'none' : `1px solid ${HAIRLINE}`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: LBL_DIM }}>{label}</div>
              <div style={{ marginTop: 10 }}><NotMeasured /></div>
              <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 10, color: '#6b7270' }}>{sub}</div>
            </div>
          ))}
        </section>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, lineHeight: 1.7, color: ABSENCE, maxWidth: 720 }}>
          Structural metrics require the closed-loop analytical bridge (KRYL-1220). The packet does
          not yet receive per-observation structure, so these positions are held as measured absence,
          not filled with a proxy.
        </div>

        {/* ── 01 ANALYSIS — the interpretive act between signal and structure ─── */}
        <PacketSection ordinal="01" title="ANALYSIS" mt={80}>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Decision frame (unchanged) */}
            <DecisionFrameCard lensProfiles={lensProfiles} hpScore={hpScore} collapsed />

            {/* Leverage field (unchanged) */}
            {synthesis?.leverage
              ? (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase', marginBottom: 10 }}>Leverage Field</div>
                  <LeverageField leverage={synthesis.leverage} />
                </div>
              )
              : (
                <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.06em' }}>No leverage signal.</div>
              )}

            {/* ── WO-1835: CEO COMPETITIVE EDGE BRIEF (gating unchanged) ──────── */}
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
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>Competitive Edge</div>
                    {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
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

            {/* ── WO-1834: CFO ROI PROOF LAYER (gating unchanged) ────────────── */}
            {lensRfe?.state !== 'UNCLASSIFIED' && session?.lens?.toUpperCase() === 'CFO' && hpScore >= 50 && (() => {
              const accuracy   = Math.round(confScore * 100);
              const signalDrift = KEY_DRIVERS.filter(d => d.pos).length;
              return (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>ROI Proof</div>
                    {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
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

            {/* ── WO-1831: MANUFACTURING / COO OPERATIONS LENS (gating unchanged) ── */}
            {lensRfe?.state !== 'UNCLASSIFIED' && (session?.lens?.toUpperCase() === 'COO' || session?.lens?.toUpperCase() === 'MANUFACTURING') && hpScore >= 50 && (() => {
              const winRate  = arbitration?.total > 0 ? (arbitration.passed / arbitration.total) : 0;
              const adoptTiming = normalizeToProjectionLanguage(
                winRate > 0.6 ? 'OPTIMAL — adopt now' : winRate > 0.35 ? 'MONITOR — 30-day window' : 'DEFER — signal below adoption threshold',
                stateType
              );
              return (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.32em', color: LIME, textTransform: 'uppercase' }}>Operations Brief</div>
                    {lensRfe?.state === 'MULTI_ROLE_OVERLAP' && (
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
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

            {/* ── WO-1833: DECISION CADENCE BRIDGE (gating unchanged) ────────── */}
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
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

            {/* ── OLP VECTOR BLOCK (envelope-gated; logic unchanged) ─────────── */}
            {envelope && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>OPTIMAL LEVERAGE POSITION</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: envelope.status === 'VALIDATED' ? LIME : envelope.status === 'ESTIMATED' ? 'rgba(102,255,0,0.5)' : MID, padding: '2px 6px', border: `1px solid ${envelope.status === 'VALIDATED' ? LIME : 'rgba(255,255,255,0.12)'}` }}>{envelope.status}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                  <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', flexShrink: 0 }}>ASSIGN TO BAY</span>
                    <select
                      value={clampBay}
                      onChange={e => setClampBay(e.target.value)}
                      disabled={!qualified}
                      title={!qualified ? 'Requires qualified candidate status' : ''}
                      style={{
                        flex: 1, minWidth: 160, background: '#000', color: qualified ? LIME : 'rgba(255,255,255,0.2)',
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

            {!envelope && lensRfe?.state === 'UNCLASSIFIED' && (
              <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.6, color: ABSENCE, maxWidth: 620 }}>
                Analysis layers are lens-gated. No lens brief is active for this session and no
                optimal-leverage envelope has been derived.
              </div>
            )}
          </div>
        </PacketSection>

        {/* ── 02 FORMATION — the structural pattern that emerges from the analysis ─ */}
        <PacketSection ordinal="02" title="FORMATION">
          {/* Formation status lives in the PRIMARY SIGNAL summary line only —
              this opens on substance, not a restatement of stateLabel. */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: LBL_DIM }}>{projectionTag}</span>
            {confDisplay != null && (
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: '#767d7a' }}>
                CONF {confDisplay.toFixed(2)}{confIsEstimate ? ' EST' : ''}
              </span>
            )}
          </div>
          {envelope?.olp?.rationale && (
            <p style={{ margin: '14px 0 0', maxWidth: 620, fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: BODY_C }}>
              {envelope.olp.rationale}
            </p>
          )}
          {assemblanceBlock}
        </PacketSection>

        {/* ── 03 BASIS ───────────────────────────────────────────────────────── */}
        <PacketSection ordinal="03" title="BASIS">
          <p style={{ margin: '16px 0 0', fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, letterSpacing: '0.02em', color: BODY_C }}>
            {arbitration?.total != null
              ? `${arbitration.passed ?? 0} of ${arbitration.total} candidate path${arbitration.total !== 1 ? 's' : ''} admitted by arbitration.`
              : 'No arbitration record for this session.'}
            {observationCount > 0
              ? ` ${observationCount} observation${observationCount !== 1 ? 's' : ''} across ${activeDomainCount} domain${activeDomainCount !== 1 ? 's' : ''}.`
              : ' No domain signal recorded.'}
          </p>
          {activeDomainPressures.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '6px 22px' }}>
              {activeDomainPressures.map(p => (
                <span key={p.domain} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: '#9aa09d' }}>
                  {p.domain} <span style={{ color: '#6b7270' }}>{p.signalCount}</span>
                </span>
              ))}
            </div>
          )}

          {/* Signal Momentum (moved from the old top-right pane; data unchanged) */}
          <div style={{ marginTop: 24, borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: DIM, textTransform: 'uppercase' }}>
                Signal Momentum
              </div>
              <span style={{ fontFamily: MONO, fontSize: 20, color: LIME, letterSpacing: '0.05em' }}>{synthesis?.momentum?.value ?? '+—'}</span>
            </div>
            {TRAJ_POINTS
              ? <TrajectoryChart points={TRAJ_POINTS} color={LIME} h={55} />
              : <div style={{ height: 55, display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.05em' }}>No trend data</div>}
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
        </PacketSection>

        {/* ── 04 ATTENTION — explicitly unwired (KRYL-1202) ───────────────────── */}
        <PacketSection ordinal="04" title="ATTENTION">
          <p style={{ margin: '18px 0 0', maxWidth: 640, fontFamily: MONO, fontSize: 11.5, lineHeight: 1.65, color: '#8a918d' }}>
            Directed re-observation is not yet wired into the packet. This section will carry the
            unresolved structural questions that warrant targeted re-observation once the closed-loop
            bridge (KRYL-1202) lands.
          </p>
          <p style={{ margin: '12px 0 0', maxWidth: 640, fontFamily: MONO, fontSize: 10, lineHeight: 1.7, color: ABSENCE }}>
            ASSEMBLANCE, the Fracture Surface, and the Leverage Field are shown elsewhere in this
            packet; none of them is equivalent to targeted re-observation, so none is substituted here.
          </p>
        </PacketSection>

        {/* ── 05 PROVENANCE ──────────────────────────────────────────────────── */}
        <PacketSection ordinal="05" title="PROVENANCE">
          <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: '#9aa09d' }}>
            <span style={{ color: confGrounded ? LIME : ABSENCE }}>
              {confGrounded ? 'MEASURED' : 'UNGROUNDED'}
            </span>
            {confIsEstimate && (
              <>
                <span style={{ color: '#3a4140' }}> · </span>
                <span style={{ color: '#767d7a' }}>CONFIDENCE IS CLASSIFICATION ESTIMATE</span>
              </>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <WhyTracePanel entity={entity} />
          </div>
        </PacketSection>

      </div>

      {/* ── WO-1880: Fracture Output Surface — full-width, never suppressed (§16) ── */}
      <FractureSignalSurface domainPressures={domainPressures} />

    </div>
  );
}
