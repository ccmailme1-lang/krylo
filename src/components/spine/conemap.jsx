// src/components/spine/conemap.jsx
// Phase 1 — single ConeMap, single Canvas, no overlays, no auxiliary systems

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useCanvasGuard } from '../../utils/webglcontextguard.js';
import { createPortal } from 'react-dom';
import HelpMark from '../shared/helpmark.jsx';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { aggregateSignals }       from '../../engine/aggregation.js';
import { encodeCone }             from '../../engine/coneencoding.js';
import { classifyConvergenceState } from '../../engine/convergenceclassifier.js';
import LeverageLattice            from './leveragelattice.jsx';
import LeverageTowers             from '../surface/leveragetowers.jsx';
import { useBayStore, DOMAIN_ABBR } from '../../store/usebaystore.js';
import { useEntitySignal }          from '../../hooks/useEntitySignal.js';
import { useKalshiSignals }         from '../../hooks/usekalshisignals.js';
import { useDriftDivergence }       from '../../hooks/usedriftdivergence.js';
import { CANONICAL_DOMAINS, CONE_DISPLAY_ORDER } from '../../engine/ontology.js';

let _carouselStopped = false;

const LIME             = '#66FF00';
const SPACING          = 4.43;
const CONE_HEIGHT_SCALE = 6.5; // was 7.0 — reduced 2026-07-07 for margin against PulseFloor's outer ring (7.2)
const DRAG_SENSITIVITY  = 0.01; // radians per pixel of horizontal drag while frozen
const STEP_DURATION     = 0.15; // seconds — short, snappy ease for arrow-button step

// velocity glyph contract (per topology critic spec — Tufte data-ink for V metric)
function velocityDisplay(v) {
  const a = Math.abs(v);
  let glyph;
  if      (v >   5) glyph = '↑';
  else if (v >=  1) glyph = '↗';
  else if (a <   1) glyph = '→';
  else if (v >= -5) glyph = '↘';
  else              glyph = '↓';
  const color =
    v >  0 ? LIME :
    v <  0 ? 'rgba(255,255,255,0.45)' :
             'rgba(255,255,255,0.55)';
  const sign = v > 0 ? '+' : '';
  return { glyph, color, text: `${sign}${Math.round(v)}%` };
}

// Cone body color — 3-tier model (Founder directive 2026-07-02): gray = low signal
// (void/muted collapse together), blue = default body, purple = top/unicorn tier.
// Lime is never a cone fill — it stays this file's text/accent color only.
// Single source of truth for cone fill color — Cone mesh and ComparePanel accent
// both resolve through resolveConvergenceState() below. Do not add a second table.
const GRAY_TIER   = '#4A4A4A';
const BLUE_TIER   = '#007FFF';
const PURPLE_TIER = '#8A2BE2';
const THEME_COLOR = {
  void_gray:      GRAY_TIER,   // INSUFFICIENT SIGNAL
  muted_slate:    GRAY_TIER,   // LOW SIGNAL YIELD
  signal_lime:    BLUE_TIER,   // BUILDING CONVERGENCE — body default
  signal_blue:    BLUE_TIER,   // TURBULENT CONVERGENCE
  unicorn_purple: PURPLE_TIER, // HIGH CONVERGENCE
};

// KRYL-1034 — perceptual viewport lens glyphs. Suspended HUD floats a per-cone read of the
// ACTIVE lens; cone FILL color stays convergence (locked §6) — additive, not a recolor.
const LENS_GLYPH = { OBSERVE:'◉', SIGNAL:'↯', FLOW:'⇢', PRESSURE:'⧖', CONVERGENCE:'⬡', DRIFT:'↝', OPPORTUNITY:'⟡' };

// lensRead — the cone's grounded read for a lens, or a §22 withheld state when no facet exists.
// OBSERVE/SIGNAL/PRESSURE/CONVERGENCE map to data the cone already carries (grounded).
// DRIFT consumes a real divergence result (STRUCTURAL vs NARRATIVE facet) computed outside
// the Canvas; withheld → AWAITING. FLOW/OPPORTUNITY have no producer yet → AWAITING (§22).
function lensRead(lens, { domain, pressure, volatility, v, drift }) {
  const P = Math.round(pressure ?? 0);
  switch (lens) {
    case 'OBSERVE':     return { text: `${(domain ?? '').toUpperCase()} · P${P}`, grounded: true };
    case 'SIGNAL':      return { text: v?.text ?? '—', grounded: v?.text != null };
    case 'PRESSURE':    return { text: `P ${P}`, grounded: true };
    case 'CONVERGENCE': return { text: resolveConvergenceState(pressure, volatility).label, grounded: true };
    case 'DRIFT': {
      if (!drift || drift.withheld) return { text: 'AWAITING', grounded: false }; // absence → withhold, never faked
      return { text: `${drift.direction} Δ${Math.round(drift.margin)}`, grounded: true };
    }
    default:            return { text: 'AWAITING', grounded: false }; // FLOW / OPPORTUNITY (§22)
  }
}

// Resolves a cone's live pressure/volatility to a classifier state + fill color.
// The only place a convergence vector is built — Cone and ComparePanel both call this.
function resolveConvergenceState(pressure, volatility) {
  const leverageN = (pressure ?? 0) / 100;
  const vector    = { D: leverageN, V: volatility ?? 0.5, A: leverageN, T: 0.7 };
  const { label, theme } = classifyConvergenceState(vector, 0.8);
  return { label, color: THEME_COLOR[theme] ?? BLUE_TIER };
}

const ARC_THESIS = {
  'capital+technology':  'WATCH: LIQUIDITY FLOW',
  'capital+ownership':   'WATCH: ASSET TRANSFER',
  'capital+labor':       'WATCH: COST PRESSURE',
  'capital+media':       'WATCH: NARRATIVE SHIFT',
  'capital+knowledge':   'WATCH: YIELD SIGNAL',
  'legal+career':        'WATCH: EXECUTIVE EVENT',
  'labor+media':         'WATCH: NARRATIVE BREAK',
  'technology+labor':    'WATCH: DISPLACEMENT SIGNAL',
  'legal+technology':    'WATCH: REGULATORY SIGNAL',
  'knowledge+ownership': 'WATCH: IP TRANSFER',
  'knowledge+labor':     'WATCH: TALENT PRESSURE',
  'media+ownership':     'WATCH: BRAND TRANSFER',
};
function arcThesis(a, b) {
  return ARC_THESIS[[a, b].sort().join('+')] ?? 'POSSIBLE CATALYST';
}

function Cone({ state, position, isSelected = true, isLocked = false, kalshiSignal = null, viewportLens = 'OBSERVE', drift = null }) {
  const bays       = useBayStore(s => s.bays);
  const hoveredBay = useBayStore(s => s.hoveredBay);
  const bayId      = PILLAR_INDEX.indexOf(state.domain) + 1;
  const assignment = bayId > 0 ? bays[bayId]?.assignment : null;
  const coneLabel  = assignment?.title ?? (state.domain ?? '').toUpperCase();
  const isHovered  = hoveredBay === bayId;

  const [flashOpacity, setFlashOpacity] = useState(1);
  const prevTitle       = useRef(assignment?.title);
  const prevColorRef    = useRef(state.colorOverride);

  useEffect(() => {
    if (assignment?.title && assignment.title !== prevTitle.current) {
      prevTitle.current = assignment.title;
      let count = 0;
      const interval = setInterval(() => {
        setFlashOpacity(o => o < 0.5 ? 1 : 0);
        count++;
        if (count >= 10) { clearInterval(interval); setFlashOpacity(1); }
      }, 120);
      return () => clearInterval(interval);
    }
  }, [assignment?.title]);

  useEffect(() => {
    if (state.colorOverride !== prevColorRef.current) {
      prevColorRef.current = state.colorOverride;
      let count = 0;
      const interval = setInterval(() => {
        setFlashOpacity(o => o < 0.5 ? 1 : 0.1);
        count++;
        if (count >= 6) { clearInterval(interval); setFlashOpacity(1); }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [state.colorOverride]);

  // WO-1340: entity signal override — hook fetches live entity data; falls back to ambient while loading
  const { pressure: entityPressure, volatility: entityVolatility, loading: entityLoading } = useEntitySignal(assignment?.title ?? null);
  const activePressure   = (assignment && !entityLoading) ? entityPressure   : (state.pressure   ?? 0);
  const activeVolatility = (assignment && !entityLoading) ? entityVolatility : (state.volatility ?? 0.5);

  const { height, radius } = encodeCone({ ...state, pressure: activePressure, volatility: activeVolatility }, { focusId: null });
  const coneHeight = Math.max(0.2, Math.pow(height, 1.4) * CONE_HEIGHT_SCALE);
  const baseY      = coneHeight / 2 - coneHeight * 0.1;

  // Cone body color = classifier convergence state, resolved once via the shared helper.
  const stateColor = state.colorOverride ?? resolveConvergenceState(activePressure, activeVolatility).color;

  // velocity heuristic (Phase A) — deviation from neutral baseline (50)
  const velocity = (activePressure - 50) * 0.3;
  const v        = velocityDisplay(velocity);

  // 7-day forecast band — projects cone height by velocity over horizon
  // Pairs with temporal scrubber: scrub back to verify past forecasts proved right.
  const forecastFactor = 1 + velocity * 0.018; // gentle: max ~±27% projection
  const forecastDelta  = coneHeight * (forecastFactor - 1);
  const forecastY      = coneHeight / 2 + forecastDelta;
  // Offset trajectory to the right of the cone so the always-on apex label
  // doesn't occlude it. X = +0.8 places it just past the cone radius.
  const trajX = 0.8 + (radius * 1.5972);
  const trajPts = useMemo(() => new Float32Array([
    trajX, coneHeight / 2, 0,
    trajX, forecastY,      0,
  ]), [trajX, coneHeight, forecastY]);
  const tickPts = useMemo(() => {
    const w = 0.5;
    return new Float32Array([-w, 0, 0, w, 0, 0]);
  }, []);

  return (
    // base lowered 10% of cone height below ground
    <group position={[position[0], baseY, position[2]]}>
      <mesh userData={{ domain: state.domain }}>
        <coneGeometry args={[radius * 1.5972, coneHeight, 16, 12, true]} />
        <meshBasicMaterial color={stateColor} wireframe transparent opacity={(isLocked ? 1.0 : 0.7) * flashOpacity} />
      </mesh>
      {/* Invisible raycast-only base cap — coneGeometry's openEnded:true leaves the base
          hollow for rendering, which means a click aimed at the wide lower part of a
          foreground cone's silhouette can pass through with no geometry to catch it,
          hitting whatever cone is behind it instead. This plugs that hole without
          changing anything visible: opacity:0 (not visible:false — an invisible object
          is skipped by the raycaster entirely) keeps it raycast-active while rendering
          nothing. Tagged with the same domain directly (not resolved via group/parent)
          so the existing hit.object.userData.domain read in ConeScene's raycast handler
          needs no changes. */}
      <mesh position={[0, -coneHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ domain: state.domain }}>
        <circleGeometry args={[radius * 1.5972, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>


      <Html position={[0, coneHeight / 2 + 0.4, 0]} center>
        <div style={{
          fontFamily:    "'IBM Plex Mono', monospace",
          fontSize:      11,
          lineHeight:    '1.6',
          letterSpacing: '0.12em',
          textAlign:     'center',
          whiteSpace:    'nowrap',
          color:         isHovered ? LIME : isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)',
          opacity:       isHovered ? 1 : flashOpacity,
          transition:    'color 150ms ease, opacity 150ms ease',
          userSelect:    'none',
          pointerEvents: 'none',
          transition:    'color 200ms',
        }}>
          <div>{coneLabel.toUpperCase()}</div>
          <div style={{ color: isSelected ? LIME : 'rgba(102,255,0,0.35)', fontSize: 10, opacity: 0.9 }}>
            SIGNAL {Math.round(state.pressure ?? 0)}
            <span style={{ color: isSelected ? v.color : 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
              {v.glyph} {v.text}
            </span>
          </div>
        </div>
      </Html>

      {/* KRYL-1034 — suspended HUD: per-cone read of the ACTIVE lens (floats below base).
          Grounded reads in lime; withheld (§22) stays dim. Cone fill color untouched. */}
      {(() => {
        const g = LENS_GLYPH[viewportLens] ?? '◉';
        const r = lensRead(viewportLens, { domain: state.domain, pressure: activePressure, volatility: activeVolatility, v, drift });
        return (
          <Html position={[0, -coneHeight / 2 - 0.25, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em',
              whiteSpace: 'nowrap', textTransform: 'uppercase', userSelect: 'none',
              color: r.grounded ? LIME : 'rgba(255,255,255,0.3)', opacity: flashOpacity,
            }}>
              {g} {viewportLens} · {r.text}
            </div>
          </Html>
        );
      })()}
    </group>
  );
}

// matches OrbitControls autoRotateSpeed={0.5} angular velocity
const SPIN = (2 * Math.PI / 60) * 0.5;

// Global baseline feeder weights — average leverage coefficients across sectors.
const COMPOSITION = [
  { name: 'TECHNOLOGY', pct: 30 },
  { name: 'CAPITAL',   pct: 22 },
  { name: 'KNOWLEDGE', pct: 18 },
  { name: 'LABOR',     pct: 12 },
  { name: 'MEDIA',     pct: 10 },
  { name: 'OWNERSHIP', pct:  8 },
];

// KRYL-1064 — cones speak the CANONICAL §17 vocabulary end-to-end (Founder: canonical everywhere).
// The WO-1717 pillar relabel is retired; domain identity IS the canonical name. CANONICAL_ORDER is
// the fixed cone layout order (positions preserved from the pillar era) — a permutation of §17.
const CANONICAL_ORDER = CONE_DISPLAY_ORDER; // KRYL-1065 — sourced from ontology (no local domain list)

// Orders the (already-canonical) domain state into the six cones, fixed layout order, default-filled.
function orderCanonicalCones(domainState) {
  const byCanon = new Map(domainState.map(s => [s.domain, s]));
  return CANONICAL_ORDER.map(d => {
    const s = byCanon.get(d) ?? {};
    return { domain: d, pressure: s.pressure ?? 0, volatility: s.volatility ?? 0 };
  });
}

// Per-lens composition — reweighted to 4 pillars. Sums to 100. Phase A heuristic.
// KRYL-1064 — canonical §17 names (was pillar: OPERATING→OWNERSHIP, FINANCIAL→CAPITAL,
// PERSONAL→MEDIA, TIME→LABOR). Percentages are the existing Phase-A heuristic, unchanged.
const LENS_COMPOSITION = {
  INVESTOR: [
    { name: 'OWNERSHIP', pct: 43 },
    { name: 'CAPITAL',   pct: 36 },
    { name: 'MEDIA',     pct: 12 },
    { name: 'LABOR',     pct:  9 },
  ],
  REALTOR: [
    { name: 'CAPITAL',   pct: 36 },
    { name: 'OWNERSHIP', pct: 24 },
    { name: 'MEDIA',     pct: 18 },
    { name: 'LABOR',     pct: 22 },
  ],
  ATHLETE: [
    { name: 'MEDIA',     pct: 35 },
    { name: 'CAPITAL',   pct: 29 },
    { name: 'OWNERSHIP', pct: 24 },
    { name: 'LABOR',     pct: 12 },
  ],
  SALES: [
    { name: 'CAPITAL',   pct: 33 },
    { name: 'OWNERSHIP', pct: 32 },
    { name: 'MEDIA',     pct: 22 },
    { name: 'LABOR',     pct: 13 },
  ],
  LEGAL: [
    { name: 'OWNERSHIP', pct: 44 },
    { name: 'CAPITAL',   pct: 42 },
    { name: 'MEDIA',     pct:  8 },
    { name: 'LABOR',     pct:  6 },
  ],
};

// Mock provenance: per-domain source documents/feeds.
// Each entry: { src, t, title } — src = feed/outlet code, t = timestamp HH:MM.
// Phase A heuristic; swap for live attribution payload when WO-1026 lands.
// WO-1310: Driver Node-Map — entity chains per domain. Root = domain, 2 downstream nodes.
const NODE_MAP = {
  capital:    ['SERIES A CAPITAL', 'LEAD INVESTOR'],
  technology: ['PATENT FILING',    'ASSIGNEE'],
  knowledge:  ['RESEARCH GRANT',   'INSTITUTION'],
  labor:      ['UNION CONTRACT',   'NEGOTIATOR'],
  media:      ['PRESS RELEASE',    'PUBLISHER'],
  ownership:  ['HOLDING ENTITY',   'BENEFICIARY'],
  economy:    ['FISCAL PRESSURE',  'POLICY ACTOR'],
  housing:    ['LENDING DESK',     'ORIGINATOR'],
  transit:    ['FUNDING DESK',     'AUTHORITY'],
  insurance:  ['REINSURANCE',      'CARRIER'],
  education:  ['BUDGET DESK',      'DISTRICT ADMIN'],
};

// WO-1339: Resonance Path — mock resolver (Phase A)
// Structure: { path: string[], confidence: number }
// MAX_VISIBLE_HOPS = 5. Phase B: replace resolveResonancePath() with live engine call.
const MAX_VISIBLE_HOPS = 5;
const RESONANCE_PATHS = {
  dogs:        { path: ['Dogs', 'Veterinary Demand', 'Pet Insurance', 'Healthcare Spend', 'Regulatory Activity'], confidence: 74 },
  nvidia:      { path: ['Nvidia', 'AI Chip Supply', 'Data Center Demand', 'Energy Consumption', 'Grid Pressure'], confidence: 81 },
  apple:       { path: ['Apple', 'Consumer Device Spend', 'App Revenue', 'Developer Labor', 'IP Litigation'], confidence: 78 },
  tesla:       { path: ['Tesla', 'EV Adoption', 'Battery Supply', 'Lithium Demand', 'Mining Policy'], confidence: 69 },
  fed:         { path: ['Fed Rate', 'Mortgage Rates', 'Housing Demand', 'Construction Labor', 'Material Cost'], confidence: 83 },
  amazon:      { path: ['Amazon', 'Logistics Demand', 'Warehouse Labor', 'Last-Mile Delivery', 'Urban Zoning'], confidence: 77 },
  google:      { path: ['Google', 'Ad Market Spend', 'Retail Revenue', 'Consumer Sentiment', 'Credit Activity'], confidence: 72 },
  openai:      { path: ['OpenAI', 'AI Inference Demand', 'Cloud Compute', 'Energy Grid', 'Carbon Policy'], confidence: 68 },
  inflation:   { path: ['Inflation', 'Wage Pressure', 'Consumer Spend', 'Retail Margin', 'Supply Chain Cost'], confidence: 86 },
  china:       { path: ['China', 'Export Controls', 'Semiconductor Supply', 'Defense Procurement', 'Allied Policy'], confidence: 79 },
};
function resolveResonancePath(title) {
  if (!title) return null;
  const key = title.toLowerCase().trim();
  const exact = RESONANCE_PATHS[key];
  if (exact) return exact;
  // fuzzy: first word match
  const firstWord = key.split(/\s+/)[0];
  for (const k of Object.keys(RESONANCE_PATHS)) {
    if (k.startsWith(firstWord)) return RESONANCE_PATHS[k];
  }
  // generic fallback
  return { path: [title, 'Market Activity', 'Consumer Response', 'Regulatory Signal'], confidence: 61 };
}

// WO-1340: Entity Signal Injection — Phase A mock resolver
// Structure: { pressure: 0–100, volatility: 0–1 }
// Phase B: replace resolveEntitySignal() with live ingest lookup. UI contract unchanged.
const ENTITY_SIGNALS = {
  dogs:        { pressure: 72, volatility: 0.61 },
  nvidia:      { pressure: 88, volatility: 0.74 },
  apple:       { pressure: 76, volatility: 0.52 },
  tesla:       { pressure: 65, volatility: 0.82 },
  amazon:      { pressure: 80, volatility: 0.58 },
  google:      { pressure: 78, volatility: 0.55 },
  openai:      { pressure: 84, volatility: 0.79 },
  microsoft:   { pressure: 82, volatility: 0.47 },
  fed:         { pressure: 91, volatility: 0.55 },
  inflation:   { pressure: 86, volatility: 0.63 },
  china:       { pressure: 79, volatility: 0.71 },
  ukraine:     { pressure: 83, volatility: 0.88 },
  oil:         { pressure: 77, volatility: 0.69 },
  bitcoin:     { pressure: 70, volatility: 0.94 },
  housing:     { pressure: 68, volatility: 0.57 },
};
function resolveEntitySignal(title) {
  if (!title) return null;
  const key = title.toLowerCase().trim();
  const exact = ENTITY_SIGNALS[key];
  if (exact) return exact;
  const firstWord = key.split(/\s+/)[0];
  for (const k of Object.keys(ENTITY_SIGNALS)) {
    if (k.startsWith(firstWord)) return ENTITY_SIGNALS[k];
  }
  return { pressure: 55, volatility: 0.50 };
}

const MOCK_PROVENANCE = {
  economy: [
    { src: 'FRED', t: '14:32', title: 'Texas pension funds shortfall widens Q3' },
    { src: 'WSJ',  t: '13:55', title: 'State budget pressure intensifies, analysts say' },
    { src: 'BLS',  t: '12:48', title: 'Unemployment claims tick up across Sun Belt' },
  ],
  housing: [
    { src: 'NYT',  t: '14:21', title: 'California exurban commute distances hit record' },
    { src: 'HN',   t: '13:40', title: 'Mortgage origination data shows distance creep' },
    { src: 'FRED', t: '12:15', title: '30Y rates push affordability index lower again' },
  ],
  transit: [
    { src: 'NYT',  t: '14:11', title: 'MTA ridership falls 11% YoY in Q3 filing' },
    { src: 'WSJ',  t: '13:22', title: 'Subway authority faces FY24 funding shortfall' },
    { src: 'HN',   t: '11:58', title: 'Remote work share holds steady in tri-state area' },
  ],
  insurance: [
    { src: 'WSJ',  t: '14:38', title: 'Florida insurer exits coastal counties' },
    { src: 'BIZJ', t: '13:50', title: 'Reinsurance pricing up 23% in Atlantic basin' },
    { src: 'NOAA', t: '12:30', title: 'Hurricane season forecast revised upward' },
  ],
  education: [
    { src: 'WSJ',  t: '14:45', title: 'Chicago Public Schools projects $391M shortfall' },
    { src: 'BLS',  t: '13:12', title: 'Teacher vacancy data shows third-year decline' },
    { src: 'NPR',  t: '11:40', title: 'Federal ESSER funds expire Sept 30, schools brace' },
  ],
};

const EMA_ALPHA = 0.18;

const PILLAR_INDEX = CANONICAL_ORDER; // KRYL-1064 — canonical §17 identity, fixed cone order

// WO-1348 — Multi-Bay Comparative Analysis panel
function ComparePanel() {
  const bays = useBayStore(s => s.bays);
  const flagged = Object.values(bays).filter(b => b.compareFlag && b.assignment);
  if (flagged.length < 2) return null;

  return (
    <div style={{
      position:   'fixed',
      top:        48,
      bottom:     190,
      right:      272,
      width:      280,
      padding:    '14px 16px',
      background: 'rgba(0,0,0,0.72)',
      border:     '1px solid rgba(102,255,0,0.18)',
      fontFamily: "'IBM Plex Mono', monospace",
      overflowY:  'auto',
      zIndex:     20,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(102,255,0,0.7)', marginBottom: 12, textTransform: 'uppercase' }}>
        Cross-Bay Analysis · {flagged.length} subjects
      </div>

      {/* Subject headers */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {flagged.map(b => (
          <div key={b.id} style={{
            flex: 1, padding: '6px 8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginBottom: 3 }}>BAY {b.id}</div>
            <div style={{ fontSize: 9, color: '#66FF00', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.3 }}>
              {b.assignment.title}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: '0.12em' }}>{b.domain}</div>
          </div>
        ))}
      </div>

      {/* Signal delta matrix — pairwise */}
      {flagged.length >= 2 && (() => {
        const pairs = [];
        for (let i = 0; i < flagged.length; i++) {
          for (let j = i + 1; j < flagged.length; j++) {
            pairs.push([flagged[i], flagged[j]]);
          }
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>COMPARATIVE VECTORS</div>
            {pairs.map(([a, b]) => {
              const alignment = Math.max(0, 100 - Math.abs((a.id * 17 + 31) % 100 - (b.id * 17 + 31) % 100));
              const delta     = ((a.id * 13 + b.id * 7) % 40) - 20;
              const diverge   = alignment < 40 ? 'DIVERGING' : alignment < 70 ? 'NEUTRAL' : 'CONVERGING';
              const divColor  = diverge === 'CONVERGING' ? '#66FF00' : diverge === 'DIVERGING' ? 'rgba(255,80,80,0.7)' : 'rgba(255,255,255,0.4)';
              return (
                <div key={`${a.id}-${b.id}`} style={{
                  padding: '8px 10px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em' }}>
                    {a.assignment.title.split(' ')[0]} ↔ {b.assignment.title.split(' ')[0]}
                  </div>
                  {[
                    { label: 'SIGNAL DELTA',    value: `${delta >= 0 ? '+' : ''}${delta}%` },
                    { label: 'ALIGNMENT',       value: `${alignment}%` },
                    { label: 'VECTOR',          value: diverge, color: divColor },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em' }}>{label}</span>
                      <span style={{ fontSize: 8, color: color ?? '#66FF00', letterSpacing: '0.1em' }}>{value}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ marginTop: 12, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)' }}>
        PHASE A · MOCK VECTORS · LIVE ENGINE PENDING
      </div>
    </div>
  );
}

export function InspectionPanel({ cone, timeOffset = 0, lens = 'INVESTOR', log = [], coneState = [], rawDomains = [], searchPreview = null, onSearchPreviewSave = null }) {
  const [tab, setTab]         = React.useState('stats');
  const [topTab, setTopTab]   = React.useState('domain');
  const emaRef                = React.useRef({});
  const prevDomain            = React.useRef(null);
  const firstView             = React.useRef(true); // first panel load defaults to Domain view
  const panelRef              = React.useRef(null);
  const searchInputRef        = React.useRef(null);
  const [xraySnap,    setXraySnap]    = React.useState(null);
  const [assignInput, setAssignInput] = React.useState('');
  const [isEditing,   setIsEditing]   = React.useState(false);
  const [candOpen,      setCandOpen]      = React.useState(false);
  const [candInput,     setCandInput]     = React.useState('');
  const [bayPickerOpen, setBayPickerOpen] = React.useState(false);
  const [panelSearch,   setPanelSearch]   = React.useState(false);
  const [panelInput,    setPanelInput]    = React.useState('');
  const [panelResult,   setPanelResult]   = React.useState(null);
  const [convTick,      setConvTick]      = React.useState(0);
  const convergenceStartRef               = React.useRef({ label: null, startTime: Date.now() });

  // Bay store — panel is the primary control surface
  const bays           = useBayStore(s => s.bays);
  const setHoveredBay  = useBayStore(s => s.setHoveredBay);
  const assignToBay    = useBayStore(s => s.assignToBay);
  const clearBay       = useBayStore(s => s.clearBay);
  const setBayView     = useBayStore(s => s.setBayView);
  const toggleXray     = useBayStore(s => s.toggleXray);
  const toggleFreeze   = useBayStore(s => s.toggleFreeze);
  const toggleCompare  = useBayStore(s => s.toggleCompare);
  const addCandidate      = useBayStore(s => s.addCandidate);
  const removeCandidate   = useBayStore(s => s.removeCandidate);
  const candidateCache    = useBayStore(s => s.candidateCache);
  const domainCandidates  = useBayStore(s => s.domainCandidates);

  const pillarIdx = cone ? PILLAR_INDEX.indexOf(cone.domain) : -1;
  const bayId     = pillarIdx >= 0 ? pillarIdx + 1 : null;
  const bay       = bayId ? bays[bayId] : null;

  React.useEffect(() => {
    setIsEditing(false);
    setAssignInput('');
    setCandOpen(false);
    setCandInput('');
    // page load → default to Domain; afterwards, selecting a cone opens the Cone view
    setTopTab(firstView.current ? 'domain' : (cone?.domain ? 'cone' : 'domain'));
    firstView.current = false;
  }, [cone?.domain]);

  React.useEffect(() => {
    if (panelSearch && panelRef.current) {
      setTimeout(() => {
        panelRef.current.scrollTop = panelRef.current.scrollHeight;
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [panelSearch]);

  React.useEffect(() => {
    const iv = setInterval(() => setConvTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // WO-1339 Phase B — live resonance path via Ollama
  const [resonancePath, setResonancePath] = React.useState(null);
  const resonanceTitleRef = React.useRef(null);
  React.useEffect(() => {
    const title = bay?.assignment?.title;
    if (!title || title === resonanceTitleRef.current) return;
    resonanceTitleRef.current = title;
    setResonancePath(null);
    fetch('/api/resonance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
      .then(r => r.json())
      .then(data => { if (data?.path) setResonancePath(data); })
      .catch(() => {});
  }, [bay?.assignment?.title]);

  if (!cone) return null;
  const { label, color: accent } = resolveConvergenceState(cone.pressure, cone.volatility);

  if (convergenceStartRef.current.label !== label) {
    convergenceStartRef.current = { label, startTime: Date.now() };
  }
  const convElapsed  = Math.floor((Date.now() - convergenceStartRef.current.startTime) / 1000);
  const convMins     = Math.floor(convElapsed / 60);
  const convSecs     = convElapsed % 60;
  const convDuration = convMins > 0
    ? `${convMins}m ${String(convSecs).padStart(2, '0')}s`
    : `${convSecs}s`;

  const isReplay    = timeOffset > 0;
  const hoursBack   = Math.round(timeOffset * 24);

  const ALL_DOMAINS = CANONICAL_DOMAINS.map(d => d.toUpperCase()); // KRYL-1064 — canonical set from ontology
  const leaderboard = (() => {
    const map = {};
    for (const c of coneState) {
      const raw  = ((c.pressure ?? 50) - 50) * 0.3;
      const prev = emaRef.current[c.domain] ?? raw;
      const ema  = EMA_ALPHA * raw + (1 - EMA_ALPHA) * prev;
      emaRef.current[c.domain] = ema;
      map[(c.domain ?? '').toUpperCase()] = ema;
    }
    return ALL_DOMAINS
      .map(d => ({ domain: d, vel: map[d] ?? 0, abs: Math.abs(map[d] ?? 0) }))
      .sort((a, b) => b.abs - a.abs);
  })();

  return (
    <div ref={panelRef} style={{
        position:      'fixed',
        top:           48,
        bottom:        190,
        right:         16,
        width:         'calc(240px + 1vw)',
        padding:       '14px 16px',
        background:    '#000000',
        borderTop:     `1px solid ${accent}22`,
        borderRight:   `1px solid ${accent}22`,
        borderLeft:    `1px solid ${accent}22`,
        borderBottom:  '1px solid rgba(0,255,0,0.3)',
        fontFamily:    "'IBM Plex Mono', monospace",
        color:         'rgba(255,255,255,0.75)',
        fontSize:      10,
        lineHeight:    '1.5',
        letterSpacing: '0.08em',
        userSelect:    'none',
        pointerEvents: 'auto',
        zIndex:        10,
        maxHeight:     'calc(100vh - 320px)',
        overflowY:     'hidden',
      }}>
      {/* Search-preview "SIGNAL LOADED → SELECT BAY" block removed (old treatment). */}

      {/* DOMAIN | CONE toggle */}
      <div style={{ display: 'flex', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {[{ key: 'domain', label: 'DOMAIN' }, { key: 'cone', label: 'CONE' }].map(t => (
          <button key={t.key} onClick={() => setTopTab(t.key)} style={{
            flex: 1, background: 'transparent', border: 'none',
            borderBottom: topTab === t.key ? `1px solid ${LIME}` : '1px solid transparent',
            color: topTab === t.key ? LIME : 'rgba(255,255,255,0.3)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8, letterSpacing: '0.22em',
            padding: '0 0 6px 0', cursor: 'pointer', transition: 'color 150ms',
          }}>{t.label}</button>
        ))}
      </div>

      {topTab === 'domain' && (() => {
        const domain = (cone.domain ?? '').toUpperCase();
        const sig    = Math.round(cone.pressure ?? 0);
        const vol    = cone.volatility ?? 0.4;
        const domainKey = (cone.domain ?? '').toLowerCase();
        // KRYL-1064 — keyed by canonical §17 (was pillar: financial→capital, operating→ownership,
        // time→labor, personal→media, market→technology). Each cone keeps its exact prior rows.
        const DOMAIN_SIGNALS = {
          capital:    ['INTEREST RATE','EQUITY FLOW','CREDIT SPREAD','LIQUIDITY','YIELD CURVE'],
          ownership:  ['THROUGHPUT','LATENCY INDEX','ERROR RATE','CAPACITY USE','DEPLOY VEL'],
          labor:      ['SESSION DEPTH','DECAY RATE','RECENCY BIAS','HORIZON COMPRESS','TEMPO'],
          media:      ['CAREER VEL','SKILL GAP','NETWORK DENSITY','LEVERAGE RATIO','TIME COMPRESS'],
          technology: ['SENTIMENT','COVERAGE VEL','NARRATIVE IDX','AMPLIF RATE','CONSENSUS'],
          knowledge:  ['SOURCE DEPTH','CROSS-REF RATE','SIGNAL DECAY','NOVELTY IDX','VERIF RATE'],
        };
        const mockRows = (DOMAIN_SIGNALS[domainKey] ?? DOMAIN_SIGNALS.capital).map((label, i) => ({
          label, signal: Math.max(8, Math.round(sig * (1 - i * 0.08) + (i % 3) * 5)),
          vol: ['HIGH','MED','LOW','MED','HIGH'][i % 5], dir: [1,1,-1,1,0][i % 5],
        }));
        const stepBase = Math.max(20, sig - 15);
        const steps = [0,2,2,0,4,4,sig-stepBase].reduce((acc,d)=>{acc.push((acc[acc.length-1]??stepBase)+d);return acc;},[]);
        const dsW=208,dsH=72,dsPad={t:6,r:28,b:14,l:22};
        const dsIW=dsW-dsPad.l-dsPad.r,dsIH=dsH-dsPad.t-dsPad.b;
        const dsMin=Math.min(...steps)-2, dsMax=Math.max(...steps)+2;
        const dsRange=dsMax-dsMin||1;
        const dsX=i=>dsPad.l+(i/(steps.length-1))*dsIW, dsY=v=>dsPad.t+dsIH-((v-dsMin)/dsRange)*dsIH;
        const dsPts=[];steps.forEach((v,i)=>{if(i===0){dsPts.push(`${dsX(0)},${dsY(v)}`);return;}dsPts.push(`${dsX(i)},${dsY(steps[i-1])}`);dsPts.push(`${dsX(i)},${dsY(v)}`);});
        const maxAbs=Math.max(...leaderboard.map(d=>d.abs),1);
        return (
          <div>
            <div style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:7,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:4}}>ATTENTION STACK</div>
              {mockRows.map((r,i)=>(<div key={r.label} style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{color:'rgba(255,255,255,0.2)',fontSize:7,minWidth:10}}>{i+1}</span><span style={{flex:1,fontSize:7,color:'rgba(255,255,255,0.65)',letterSpacing:'0.06em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</span><span style={{fontSize:8,color:'#fff',minWidth:22,textAlign:'right'}}>{r.signal}</span><span style={{fontSize:7,color:r.vol==='HIGH'?'#ff4444':r.vol==='MED'?'#ffaa00':LIME,minWidth:24}}>{r.vol}</span><span style={{fontSize:7,color:r.dir>0?LIME:r.dir<0?'#ff4444':'rgba(255,255,255,0.3)'}}>{r.dir>0?'↑':r.dir<0?'↓':'—'}</span></div>))}
            </div>
            <div style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:8,letterSpacing:'0.2em',opacity:0.5,marginBottom:8}}>24H VOLATILITY INDEX</div>
              {leaderboard.map((item,i)=>{const v=velocityDisplay(item.vel);return(<div key={item.domain} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}><span style={{color:'rgba(255,255,255,0.25)',minWidth:14,fontSize:9}}>{i+1}</span><span style={{flex:1,color:'rgba(255,255,255,0.85)',fontSize:9,letterSpacing:'0.1em'}}>{(item.domain??'').toUpperCase()}</span><span style={{color:v.color,fontSize:9}}>{v.glyph}</span><span style={{color:v.color,fontSize:9,minWidth:36,textAlign:'right'}}>{v.text}</span></div>);})}
            </div>
            <div style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:7,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:4}}>DELTA STEPS</div>
              <svg width={dsW} height={dsH} style={{overflow:'visible'}}>{[0,25,50].map(v=><line key={v} x1={dsPad.l} y1={dsY(v)} x2={dsPad.l+dsIW} y2={dsY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>)}<polyline fill="none" stroke={LIME} strokeWidth={1.5} strokeLinecap="butt" strokeLinejoin="miter" points={dsPts.join(' ')}/><text x={dsPad.l+dsIW+3} y={dsY(sig)+3} fill={LIME} fontSize={7} fontFamily="'IBM Plex Mono',monospace">{sig}</text></svg>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:7,letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',marginBottom:8}}>LEVERAGE TOWERS</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:4}}>{leaderboard.map(item=>{const h=Math.max(4,(item.abs/maxAbs)*80);const isActive=item.domain===domain;return(<div key={item.domain} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}><div style={{width:'100%',height:h,background:LIME,opacity:isActive?1:0.45,clipPath:'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)'}}/><div style={{fontSize:6,color:isActive?LIME:'rgba(255,255,255,0.3)',letterSpacing:'0.05em',marginTop:3,textAlign:'center'}}>{item.domain.slice(0,3)}</div></div>);})}</div>
            </div>
          </div>
        );
      })()}

      {/* ── CONE TAB ── */}
      {topTab === 'cone' && <>
      {/* Header */}
      <div style={{ color: accent, fontSize: 8, letterSpacing: '0.22em', opacity: 0.85, marginBottom: 6 }}>
        INSPECTION · ACTIVE{isReplay && <span style={{ color: LIME, marginLeft: 10 }}>REPLAY T-{hoursBack}H</span>}
      </div>

      {/* Title row: entity/domain + [+] */}
      {bay && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: bay?.assignment ? LIME : '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>
            {bay?.assignment?.title ?? (cone.domain ?? '').toUpperCase()}
          </span>
          <button
            onClick={() => {
              if (panelSearch) {
                const v = panelInput.trim();
                if (v) { assignToBay(bayId, { id: v, title: v, source: 'search' }); }
                setPanelSearch(false); setPanelInput(''); setPanelResult(null);
              } else {
                setPanelSearch(true); setPanelInput(''); setPanelResult(null);
              }
            }}
            style={{ background: 'none', border: 'none', color: LIME, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, lineHeight: 1, padding: 0, cursor: 'pointer', flexShrink: 0 }}
          >{panelSearch ? '−' : '+'}</button>
        </div>
      )}

      {/* KRYL-1001 (CRE) — pure-nav link to the pre-populated analysis page for this
          anchor. Fires the existing krylo-nav postMessage (app.jsx listener); no session
          creation, no compute on click. Sits inside the panel content flow so it does
          not overlap the visor HUD. Only shown once a subject is assigned to the
          cone (bay.assignment), not for a bare domain cone. */}
      {bay?.assignment && (
        <button
          onClick={() => window.postMessage({ type: 'krylo-nav', mode: 'analysis' }, '*')}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'none', border: 'none', borderBottom: '1px solid rgba(0,127,255,0.25)',
            padding: '0 0 8px', marginBottom: 12, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em',
            color: '#007FFF', textTransform: 'uppercase',
          }}
        >
          Full Analysis →
        </button>
      )}

      {/* Inline search — opens on + click */}
      {panelSearch && bay && (
        <div style={{ marginBottom: 12 }}>
          <input
            ref={searchInputRef}
            value={panelInput}
            onChange={e => setPanelInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = panelInput.trim();
                if (v) {
                  assignToBay(bayId, { id: v, title: v, source: 'search' });
                  setPanelSearch(false); setPanelInput(''); setPanelResult(null);
                }
              }
              if (e.key === 'Escape') { setPanelSearch(false); setPanelInput(''); }
              e.stopPropagation();
            }}
            placeholder="enter subject..."
            style={{
              width: '100%',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.06em',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${LIME}`,
              color: '#fff',
              outline: 'none',
              padding: '4px 0',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* WO-1339 Phase B: Live Resonance Path via Ollama */}
      {(() => {
        const assignment = bay?.assignment;
        if (!assignment) return (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginBottom: 14 }}>
            NO SIGNAL ASSIGNED
          </div>
        );
        const resolved = resonancePath;
        if (!resolved) return (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.22em', marginBottom: 14 }}>
            RESOLVING PATH…
          </div>
        );
        const visiblePath = resolved.path.slice(1, MAX_VISIBLE_HOPS + 1);
        const hopCount = visiblePath.length;
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
              Resonance Path
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {visiblePath.map((node, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'rgba(102,255,0,0.45)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>→</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.58)',
                    textTransform: 'uppercase',
                  }}>{node}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: `${LIME}88`, letterSpacing: '0.2em', fontFamily: "'IBM Plex Mono', monospace" }}>
              {hopCount} HOPS · {resolved.confidence}% CONF
            </div>
          </div>
        );
      })()}


      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, pointerEvents: 'auto' }}>
        {['stats', 'nodes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background:    'transparent',
            border:        'none',
            borderBottom:  `1px solid ${tab === t ? LIME : 'transparent'}`,
            color:         tab === t ? LIME : 'rgba(255,255,255,0.35)',
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      8,
            letterSpacing: '0.2em',
            padding:       '0 0 3px 0',
            cursor:        'pointer',
            textTransform: 'uppercase',
          }}>
            {{ stats: 'STATS', leaderboard: 'DOMAIN', nodes: 'NODE MAP' }[t]}
          </button>
        ))}
      </div>
      {tab === 'nodes' ? (() => {
        const domain = (cone.domain ?? '').toLowerCase();
        const chain  = NODE_MAP[domain] ?? ['SIGNAL SOURCE', 'ROOT ACTOR'];
        const rootLabel = (cone.domain ?? '').toUpperCase();
        // SVG layout: root at top-center, 2 children fan out below
        const W = 208, H = 118;
        const rx = 3;
        // root rect
        const rW = 88, rH = 20, rX = (W - rW) / 2, rY = 4;
        const rCx = rX + rW / 2, rCy = rY + rH;
        // child rects
        const cW = 88, cH = 20, cY = 88;
        const c1X = 4,       c1Cx = c1X + cW / 2;
        const c2X = W - cW - 4, c2Cx = c2X + cW / 2;
        return (
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 6 }}>ENTITY GRAPH</div>
            <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
              <defs>
                <marker id="arrNM" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={`${LIME}88`} />
                </marker>
              </defs>
              {/* edges */}
              <line x1={rCx} y1={rCy} x2={c1Cx} y2={cY}
                stroke={`${LIME}44`} strokeWidth={1} markerEnd="url(#arrNM)" />
              <line x1={rCx} y1={rCy} x2={c2Cx} y2={cY}
                stroke={`${LIME}44`} strokeWidth={1} markerEnd="url(#arrNM)" />
              {/* root node */}
              <rect x={rX} y={rY} width={rW} height={rH} rx={rx}
                fill="rgba(0,0,0,0)" stroke={accent} strokeWidth={1} />
              <text x={rCx} y={rY + rH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fill={accent} fontSize={7} fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.12em">
                {rootLabel.slice(0, 10)}
              </text>
              {/* child 1 */}
              <rect x={c1X} y={cY} width={cW} height={cH} rx={rx}
                fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              <text x={c1Cx} y={cY + cH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.65)" fontSize={7} fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.1em">
                {chain[0].slice(0, 12)}
              </text>
              {/* child 2 */}
              <rect x={c2X} y={cY} width={cW} height={cH} rx={rx}
                fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              <text x={c2Cx} y={cY + cH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.65)" fontSize={7} fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.1em">
                {chain[1].slice(0, 12)}
              </text>
            </svg>
          </div>
        );
      })() : tab === 'leaderboard' ? (
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 8 }}>
            24H VOLATILITY INDEX
          </div>
          {leaderboard.map((item, i) => {
            const v = velocityDisplay(item.vel);
            return (
              <div key={item.domain} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', minWidth: 14, fontSize: 9 }}>{i + 1}</span>
                <span style={{ flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.1em' }}>
                  {(item.domain ?? '').toUpperCase()}
                </span>
                <span style={{ color: v.color, fontSize: 9 }}>{v.glyph}</span>
                <span style={{ color: v.color, fontSize: 9, minWidth: 36, textAlign: 'right' }}>{v.text}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <>
      <div style={{ marginBottom: 12 }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase',
          padding: '2px 7px', borderRadius: '2px',
          background: `${accent}18`, border: `1px solid ${accent}44`, color: accent,
        }}>{label}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>SIGNAL<HelpMark text="How strong the activity is in this area right now, from **0 to 100**." /></span>
        <span style={{ color: LIME }}>{Math.round(cone.pressure ?? 0)}</span>
      </div>

      {(() => {
        const cur = Math.round(cone.pressure ?? 0);
        const vel = ((cone.pressure ?? 50) - 50) * 0.3;
        const fcst = Math.max(0, Math.min(100, Math.round(cur * (1 + vel * 0.018))));
        const arrow = fcst > cur ? '↗' : fcst < cur ? '↘' : '→';
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, opacity: 0.85 }}>
            <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>FORECAST · +7D<HelpMark text="Where this number is expected to land **in 7 days** if the current trend keeps going." /></span>
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>
              {cur} {arrow} {fcst}
            </span>
          </div>
        );
      })()}

      {(() => {
        const MAX_EMITTERS = 6;
        const canon        = (cone.domain ?? '').toLowerCase();
        const activeSources = rawDomains.filter(d => (d.domain ?? '').toLowerCase() === canon && (d.pressure ?? 0) > 0).length;
        const D  = Math.round((activeSources / MAX_EMITTERS) * 100);
        const E  = Math.round((1 - (cone.pressure ?? 0) / 100) * (cone.volatility ?? 0) * 100);
        const LE = Math.round((1 - (cone.pressure ?? 0) / 100) * (1 - D / 100) * (1 - E / 100) * 100);
        const leLabel = LE >= 70 ? 'LONG' : LE >= 40 ? 'MED' : LE >= 15 ? 'SHORT' : 'CLOSING';
        return (
          <div style={{ paddingTop: 8, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>DIFFUSION<HelpMark text="How many **different sources** are showing this same activity — more sources means it's more spread out, not just one place." /></span>
              <span style={{ color: LIME }}>{D}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>ELASTICITY<HelpMark text="How much room this still has to change. Higher means it could still **move a lot**." /></span>
              <span style={{ color: LIME }}>{E}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>WINDOW<HelpMark text="How much time is likely left before this becomes **obvious to everyone else**." /></span>
              <span style={{ color: LIME }}>{LE} · {leLabel}</span>
            </div>
          </div>
        );
      })()}

      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 8, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>COMPOSITION<HelpMark text="What's making up this area, **broken down by category**, based on the point of view you've selected." /></span>
          <span style={{ color: LIME, opacity: 0.85 }}>{lens} LENS</span>
        </div>
        {(LENS_COMPOSITION[lens] ?? COMPOSITION).map(f => (
          <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{f.name}</span>
            <span style={{ color: LIME }}>{f.pct}%</span>
          </div>
        ))}
      </div>

      {log.length > 0 && (
        <div style={{ paddingTop: 10, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            EVENT LOG<HelpMark text="A running list of recent activity, **newest at the top**." />
          </div>
          {log.slice(0, 6).map(e => {
            const t = new Date(e.born).toTimeString().slice(0, 8);
            return (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, lineHeight: '1.55' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{t}</span>
                <span style={{ color: LIME, opacity: 0.85 }}>
                  PULSE · {(e.target ?? '').toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const sources = MOCK_PROVENANCE[cone.domain];
        if (!sources?.length) return null;
        return (
          <div style={{ paddingTop: 10, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', opacity: 0.5, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>PROVENANCE</span>
              <span style={{ opacity: 0.6 }}>{sources.length} SOURCES</span>
            </div>
            {sources.map((s, i) => (
              <div key={i} style={{ fontSize: 9, lineHeight: '1.5', marginBottom: 3, color: 'rgba(255,255,255,0.7)' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 1 }}>
                  <span style={{ color: accent, opacity: 0.9, minWidth: 30 }}>{s.src}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.t}</span>
                </div>
                <div style={{
                  color:        'rgba(255,255,255,0.78)',
                  fontSize:     9,
                  marginLeft:   4,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {s.title}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
        </>
      )}

      </>}

      {/* ── Scan Sweep ── */}
      {topTab === 'cone' && <>
      <style>{`
        @keyframes scanRotate {
          from { transform: translateX(-50%) rotate(0deg); }
          to   { transform: translateX(-50%) rotate(360deg); }
        }
      `}</style>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(102,255,0,0.07)' }}>
        <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>SCAN SWEEP<HelpMark text="Shows the system **continuously checking** for new activity in the background." /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
            {[0,1,2].map(r => (
              <div key={r} style={{
                position: 'absolute', borderRadius: '50%',
                border: '1px solid rgba(102,255,0,0.12)', inset: r * 7,
              }} />
            ))}
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 1, height: 16,
              background: `linear-gradient(to bottom, ${LIME}, transparent)`,
              transformOrigin: 'top center',
              animation: 'scanRotate 3.0s linear infinite',
              opacity: 0.7,
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 3, height: 3, borderRadius: '50%', background: LIME,
              transform: 'translate(-50%,-50%)', opacity: 0.85,
            }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(102,255,0,0.55)', letterSpacing: '0.14em', marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>{convDuration}</div>
          </div>
        </div>
      </div>
      </>}

    </div>
  );
}

// ─── WAVE 1 SUBSTRATE LAYERS ────────────────────────────────────────────────

// Layer 1: System pulse floor — concentric rings, slow heartbeat opacity
// (encodes "field is live" per Tufte motion-economy carve-out for state encoding)
//
// Wired to real data (2026-07-07): previously pure decoration — color was a
// fixed grey, opacity pulsed on elapsed time only, nothing here reflected any
// actual signal. Now driven by the same globalPressure/globalCS values that
// already drive AnalysisSubstrate/AnalysisDomainField — color uses the exact
// locked convergence-state palette (CLAUDE.md §6), pulse speed scales with
// real signal pressure. No new colors introduced — reusing already-approved
// constants in a new context.
const CONVERGENCE_COLOR = {
  INSUFFICIENT_SIGNAL:   '#3a3d4a', // muted slate
  BUILDING_CONVERGENCE:  '#66FF00', // lime
  TURBULENT_CONVERGENCE: '#007FFF', // blue
  HIGH_CONVERGENCE:      '#8A2BE2', // purple
};

function PulseFloor({ ringCount = 6, maxRadius = 8, pressure = 0, convergenceState = 'INSUFFICIENT_SIGNAL' }) {
  const matRef = useRef();
  const positions = useMemo(() => {
    const segs = 64;
    const verts = [];
    for (let r = 1; r <= ringCount; r++) {
      const radius = (r / ringCount) * maxRadius;
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        verts.push(
          Math.cos(a1) * radius, 0, Math.sin(a1) * radius,
          Math.cos(a2) * radius, 0, Math.sin(a2) * radius,
        );
      }
    }
    return new Float32Array(verts);
  }, [ringCount, maxRadius]);

  const color = CONVERGENCE_COLOR[convergenceState] ?? CONVERGENCE_COLOR.INSUFFICIENT_SIGNAL;
  // Pulse speed scales with real pressure (0-1) — higher signal volume = faster heartbeat.
  // 2.1 was the original fixed period; pressure compresses it down to ~0.7 at max.
  const pulsePeriod = 2.1 - pressure * 1.4;

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity = 0.45 + 0.20 * Math.sin(clock.elapsedTime * Math.PI / pulsePeriod);
  });

  return (
    <lineSegments position={[0, -0.4, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial ref={matRef} color={color} transparent opacity={0.45} />
    </lineSegments>
  );
}

// Layer 2: Threshold bands — three horizontal reference lines spanning the field
// at apex-height tiers (LO / MID / HI). Cones visibly cross these.
function ThresholdBands() {
  // Asymmetric: extend left further, cap right shorter so the right-edge
  // labels project clear of the inspection panel's screen x-range.
  const WL = 8.27; // 7.5 + 10% left push (two 5% increments)
  const WR = 4.5;
  // True unit mapping — must match SignalCone: coneHeight = pow(score/100, 1.4) * CONE_HEIGHT_SCALE
  const yOf = s => Math.pow(s / 100, 1.4) * CONE_HEIGHT_SCALE;
  const bands = [
    { y: yOf(50), alpha: 0.45, label: 'LO · 50' },
    { y: yOf(75), alpha: 0.55, label: 'MID · 75' },
    { y: yOf(90), alpha: 0.65, label: 'HI · 90' },
  ];
  // Interval tics every 10 signal units (named bands carry the full lines)
  const tics = [30, 40, 60, 70, 80, 100].map(s => ({ y: yOf(s), s }));
  return (
    <group>
      {tics.map(t => {
        const pts = new Float32Array([-WL - 0.35, t.y, 0, -WL, t.y, 0]);
        return (
          <React.Fragment key={`tic-${t.s}`}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[pts, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#4A4A4A" transparent opacity={0.35} />
            </lineSegments>
            <Html position={[-WL - 0.55, t.y, 0]} distanceFactor={7}>
              <div style={{
                fontFamily:    "'IBM Plex Mono', monospace",
                fontSize:      10,
                letterSpacing: '0.1em',
                color:         'rgba(255,255,255,0.35)',
                whiteSpace:    'nowrap',
                userSelect:    'none',
                pointerEvents: 'none',
                transform:     'translateX(-100%)',
              }}>
                {t.s}
              </div>
            </Html>
          </React.Fragment>
        );
      })}
      {bands.map((b, i) => {
        const pts = new Float32Array([-WL, b.y, 0, WR, b.y, 0]);
        return (
          <React.Fragment key={i}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[pts, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#4A4A4A" transparent opacity={b.alpha} />
            </lineSegments>
            <Html position={[-WL - 0.4, b.y, 0]} distanceFactor={7}>
              <div style={{
                fontFamily:    "'IBM Plex Mono', monospace",
                fontSize:      15,
                letterSpacing: '0.16em',
                color:         'rgba(255,255,255,0.6)',
                whiteSpace:    'nowrap',
                userSelect:    'none',
                pointerEvents: 'none',
                transform:     'translateX(-100%)',
              }}>
                {b.label}
              </div>
            </Html>
          </React.Fragment>
        );
      })}
    </group>
  );
}

// Layer 3: Per-cone floor footprint — small ring under each cone anchor
// defines "this is a fixed sector slot, not a floating dot"
function Footprint({ position, radius = 1.1, color = '#4A4A4A', isLocked = false, opacity }) {
  const finalColor = isLocked ? LIME : color;
  const finalOpacity = opacity !== undefined ? opacity : (isLocked ? 0.9 : 0.65);
  const positions = useMemo(() => {
    const segs = 36;
    const verts = [];
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      verts.push(
        Math.cos(a1) * radius, 0, Math.sin(a1) * radius,
        Math.cos(a2) * radius, 0, Math.sin(a2) * radius,
      );
    }
    return new Float32Array(verts);
  }, [radius]);

  return (
    <lineSegments position={[position[0], -0.04, position[2]]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={finalColor} transparent opacity={finalOpacity} />
    </lineSegments>
  );
}

// WO-1307: Boundary Gate Attenuation — two concentric threshold rings per cone.
// Gate 1 (r=1.5): warning. Gate 2 (r=1.9): breach.
// Breached gate renders as simulated dash (3-on/3-off alternating segments) in LIME.
function ThresholdGates({ position, state }) {
  const pressure = state?.pressure ?? 0;
  const actualBase = (0.3 + pressure * 0.01) * 1.5972;

  const solidRing = useMemo(() => {
    const segs = 36;
    const verts = [];
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      verts.push(Math.cos(a1), 0, Math.sin(a1), Math.cos(a2), 0, Math.sin(a2));
    }
    return new Float32Array(verts);
  }, []);

  const dashedRing = useMemo(() => {
    const segs = 36;
    const verts = [];
    for (let i = 0; i < segs; i++) {
      if (Math.floor(i / 3) % 2 !== 0) continue;
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      verts.push(Math.cos(a1), 0, Math.sin(a1), Math.cos(a2), 0, Math.sin(a2));
    }
    return new Float32Array(verts);
  }, []);

  const gates = [
    { radius: 1.5, breached: actualBase > 1.5 },
    { radius: 1.9, breached: actualBase > 1.9 },
  ];

  return (
    <>
      {gates.map(({ radius, breached }) => {
        const geo = breached ? dashedRing : solidRing;
        const scale = [radius, 1, radius];
        return (
          <lineSegments
            key={radius}
            position={[position[0], -0.02, position[2]]}
            scale={scale}
          >
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[geo, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              color={breached ? LIME : '#4A4A4A'}
              transparent
              opacity={breached ? 0.4 : 0.15}
            />
          </lineSegments>
        );
      })}
    </>
  );
}

// WO-1308: Historical Flux Trajectory — ring-buffered ghost cones with centralized decay.
// Shared GHOST_CONE_GEO (unit cone, scaled per slot). Pre-allocated material per slot.
// GhostLayer renders all active slots for a given domain index.
function GhostLayer({ domainIdx, buf }) {
  if (!buf) return null;
  const offset = domainIdx * GHOST_DEPTH;
  return (
    <>
      {buf.slots.slice(offset, offset + GHOST_DEPTH).map((slot, i) => {
        if (!slot.active) return null;
        const coneHeight = Math.max(0.2, Math.pow(slot.height, 1.4) * CONE_HEIGHT_SCALE);
        const baseY      = coneHeight / 2 - coneHeight * 0.1 - 0.15;
        return (
          <mesh
            key={i}
            position={[0, baseY, 0]}
            scale={[slot.radius * 1.5972, coneHeight, slot.radius * 1.5972]}
            geometry={GHOST_CONE_GEO}
            material={slot.mat}
          />
        );
      })}
    </>
  );
}

// WO-1309: Dynamic Frontier Waveforms — GPU vertex shader, uTime + uVolatility uniforms.
// Noise clamp [-0.35, 0.35] per spec. No CPU vertex mutation in useFrame.
const FRONTIER_SEGS = 32;

const FRONTIER_VERT = `
  attribute float aAngle;
  uniform float uTime;
  uniform float uVolatility;

  float wave(float a, float t) {
    return sin(a * 3.7 + t)        * 0.45
         + sin(a * 1.9 - t * 1.3)  * 0.35
         + sin(a * 5.1 + t * 0.7)  * 0.20;
  }

  void main() {
    vec3 pos = position;
    float n = wave(aAngle, uTime * 0.5);
    n = clamp(n, -0.35, 0.35);
    pos.y += n * uVolatility * 0.25;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRONTIER_FRAG = `
  void main() {
    gl_FragColor = vec4(0.4, 1.0, 0.0, 0.35);
  }
`;

function FrontierRing({ position, state }) {
  const { height, radius } = encodeCone(state, { focusId: null });
  const coneHeight = Math.max(0.2, Math.pow(height, 1.4) * CONE_HEIGHT_SCALE);
  const FRAC   = 0.75;
  const worldY = coneHeight * (FRAC - 0.1);
  const ringR  = (1 - FRAC) * radius * 1.5972;
  const volatility = state?.volatility ?? 0.5;
  const matRef = useRef();

  // Pre-compute ring geometry at rest (y=0) + angle attribute — no mutation in useFrame
  const { positions, angles } = useMemo(() => {
    const pos = new Float32Array(FRONTIER_SEGS * 2 * 3);
    const ang = new Float32Array(FRONTIER_SEGS * 2);
    for (let i = 0; i < FRONTIER_SEGS; i++) {
      const a0 = (i / FRONTIER_SEGS) * Math.PI * 2;
      const a1 = ((i + 1) / FRONTIER_SEGS) * Math.PI * 2;
      const b  = i * 6;
      pos[b]   = Math.cos(a0) * ringR; pos[b+1] = 0; pos[b+2] = Math.sin(a0) * ringR;
      pos[b+3] = Math.cos(a1) * ringR; pos[b+4] = 0; pos[b+5] = Math.sin(a1) * ringR;
      ang[i*2]   = a0;
      ang[i*2+1] = a1;
    }
    return { positions: pos, angles: ang };
  }, [ringR]);

  // Uniform update only — no geometry mutation
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value       = clock.elapsedTime;
    matRef.current.uniforms.uVolatility.value = volatility;
  });

  return (
    <group position={[position[0], worldY, position[2]]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aAngle"   args={[angles, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={FRONTIER_VERT}
          fragmentShader={FRONTIER_FRAG}
          transparent
          linewidth={3}
          uniforms={{ uTime: { value: 0 }, uVolatility: { value: volatility } }}
        />
      </lineSegments>
      <Html position={[ringR + 0.15, 0, 0]} distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily:    "'IBM Plex Mono', monospace",
          fontSize:      7,
          letterSpacing: '0.18em',
          color:         'rgba(102,255,0,0.55)',
          whiteSpace:    'nowrap',
          userSelect:    'none',
        }}>FRONTIER</div>
      </Html>
    </group>
  );
}


// Wave 2: event pulses — small particles rise from cone base to apex when a
// signal event fires. Mock source (timer); ~3 simultaneous, ~1.5s TTL.
function useEventStream(coneState, interval = 1800, ttl = 1500, max = 3) {
  const [events, setEvents] = useState([]);
  const idRef = useRef(0);
  useEffect(() => {
    if (!coneState.length) return;
    const tick = setInterval(() => {
      const now = Date.now();
      setEvents(prev => {
        const fresh = prev.filter(e => now - e.born < ttl);
        if (fresh.length >= max) return fresh;
        const cone = coneState[Math.floor(Math.random() * coneState.length)];
        return [...fresh, { id: ++idRef.current, target: cone.domain, born: now }];
      });
    }, interval);
    const sweep = setInterval(() => {
      const now = Date.now();
      setEvents(prev => {
        const fresh = prev.filter(e => now - e.born < ttl);
        return fresh.length === prev.length ? prev : fresh;
      });
    }, 400);
    return () => { clearInterval(tick); clearInterval(sweep); };
  }, [coneState.length, interval, ttl, max]);
  return events;
}

// Wave 2: flow arc — bezier curve between two cones that pulsed within ~2s
// of each other. Encodes inter-sector correlation as a real-time visual link.
function FlowArc({ flow, posA, apexA, posB, apexB, domainA, domainB, ttl = 3000, onArcClick }) {
  const matRef   = useRef();
  const labelRef = useRef();

  const ax = posA[0], az = posA[2], ay = apexA * 0.7;
  const bx = posB[0], bz = posB[2], by = apexB * 0.7;
  const mx = (ax + bx) / 2, mz = (az + bz) / 2;
  const my = Math.max(ay, by) + 1.2;

  const points = useMemo(() => {
    const segs = 22;
    const verts = [];
    let prev = null;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = (1-t)*(1-t)*ax + 2*(1-t)*t*mx + t*t*bx;
      const y = (1-t)*(1-t)*ay + 2*(1-t)*t*my + t*t*by;
      const z = (1-t)*(1-t)*az + 2*(1-t)*t*mz + t*t*bz;
      if (prev) verts.push(prev[0], prev[1], prev[2], x, y, z);
      prev = [x, y, z];
    }
    return new Float32Array(verts);
  }, [posA, posB, apexA, apexB]);

  useFrame(() => {
    const t = (Date.now() - flow.born) / ttl;
    const alpha = t >= 1 ? 0 : Math.min(1, t / 0.15) * (t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35));
    if (matRef.current)   matRef.current.opacity        = 0.75 * alpha;
    if (labelRef.current) labelRef.current.style.opacity = String(alpha);
  });

  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={matRef} color="#007FFF" transparent opacity={0} />
      </lineSegments>
      <Html position={[mx, my + 0.4, mz]} center>
        <div
          ref={labelRef}
          onClick={() => onArcClick?.(domainA, domainB)}
          style={{
            opacity:       0,
            pointerEvents: onArcClick ? 'auto' : 'none',
            cursor:        onArcClick ? 'pointer' : 'default',
            textAlign:     'center',
            lineHeight:    1.6,
            padding:       '4px 8px',
          }}
        >
          <div style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      '8px',
            letterSpacing: '0.2em',
            color:         '#007FFF',
            whiteSpace:    'nowrap',
          }}>
            {(domainA ?? '').toUpperCase()} ↔ {(domainB ?? '').toUpperCase()}
          </div>
          <div style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      '9px',
            letterSpacing: '0.18em',
            color:         'rgba(0,127,255,0.7)',
            whiteSpace:    'nowrap',
          }}>
            {arcThesis(domainA, domainB)}
          </div>
        </div>
      </Html>
    </>
  );
}

function EventPulse({ event, position, apexY, ttl = 1500 }) {
  const meshRef = useRef();
  const matRef  = useRef();
  useFrame(() => {
    const t = Math.min(1, (Date.now() - event.born) / ttl);
    if (meshRef.current) meshRef.current.position.y = t * apexY;
    if (matRef.current)  matRef.current.opacity     = (1 - t) * 0.95;
  });
  return (
    <mesh ref={meshRef} position={[position[0], 0, position[2]]}>
      <sphereGeometry args={[0.13, 10, 10]} />
      <meshBasicMaterial ref={matRef} color={LIME} transparent opacity={0.95} />
    </mesh>
  );
}

// WO-1313: Geographic anchors per domain — projected from US lat/lon to scene space.
// X = (lon+96)*0.276, Z = -(lat-37.5)*0.4, Y = 0
const TOPOLOGY_ANCHORS = {
  technology: [-7.1, 0, 0.1],  // Silicon Valley, CA
  capital:    [6.1,  0, -1.3], // New York, NY
  knowledge:  [6.9,  0, -2.0], // Cambridge, MA
  labor:      [3.6,  0, -1.9], // Detroit, MI
  media:      [-6.1, 0, 1.4],  // Los Angeles, CA
  ownership:  [0.2,  0, 3.1],  // Houston, TX
  market:     [-3.5, 0, -2.5], // WO-1717 pillar anchor
};

// Rough continental US outline — lineSegments pairs (sequential points form a closed polygon)
const US_OUTLINE_GEO = (() => {
  const raw = [
    [-7.5,2.0],[-7.0,0.0],[-7.2,-1.0],[-7.0,-2.2],
    [-4.5,-2.8],[0.0,-3.2],[4.0,-3.0],[6.5,-2.5],
    [7.0,-1.5],[7.0,0.0],[6.0,0.5],[5.0,1.5],
    [4.5,2.5],[3.0,4.0],[1.0,3.0],[-1.0,3.5],
    [-4.0,2.5],[-6.0,2.5],[-7.5,2.0],
  ];
  const pts = [];
  for (let i = 0; i < raw.length - 1; i++) {
    pts.push(raw[i][0], 0, raw[i][1], raw[i+1][0], 0, raw[i+1][1]);
  }
  return new Float32Array(pts);
})();

const GHOST_INTERVAL = 90;  // frames between ghost snapshots (~1.5s at 60fps)
const GHOST_DEPTH    = 3;   // ring buffer depth per cone (matches PERSISTENCE_REQUIRED WO-1126A)
const GHOST_DECAY    = 0.6; // opacity units per second
const MAX_CONES      = 8;   // pre-allocation upper bound
const MAX_GHOSTS     = MAX_CONES * GHOST_DEPTH;

// Shared unit-cone geometry — one instance, scaled per ghost slot
const GHOST_CONE_GEO = new THREE.ConeGeometry(1, 1, 16, 12, true);

// WO-1307: shared ring geometry — one instance, never per-signal
const BOUNDARY_RING_GEO = new THREE.RingGeometry(0.95, 1.0, 32);

// WO-1307: ground threshold ring — y=0 plane, semantic boundary marker
function BoundaryRing({ attenuationFactor = 1.0 }) {
  return (
    <mesh
      geometry={BOUNDARY_RING_GEO}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      scale={[attenuationFactor, attenuationFactor, 1]}
      frustumCulled={false}
    >
      <meshBasicMaterial color="#404040" transparent opacity={0.15} depthWrite={false} />
    </mesh>
  );
}

// WO-1310: driver node overlay — drei Html, positioned at cone apex, SVG directed graph
// Max 3 connections per spec; lowercase mono labels; arrowhead edges
function DriverNodeOverlay({ state, apexY, isSelected }) {
  if (!isSelected) return null;
  const domain  = (state.domain ?? '').toLowerCase();
  const rawChain = NODE_MAP[domain] ?? ['signal source', 'root actor'];
  const chain   = rawChain.slice(0, 3).map(s => s.toLowerCase());
  const W = 160, nodeH = 18, rootY = 4, childStartY = 46, childGap = 30;
  const totalH = childStartY + chain.length * childGap + 4;
  const rootCx = W / 2, rootCy = rootY + nodeH;
  return (
    <Html position={[0, apexY + 0.7, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div style={{
        width: W,
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '8px 10px',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          driver · node · map
        </div>
        <svg width={W - 20} height={totalH} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <marker id={`arrDN-${domain}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255,255,255,0.22)" />
            </marker>
          </defs>
          {/* root node */}
          <rect x={rootCx - 44} y={rootY} width={88} height={nodeH} rx={2}
            fill="rgba(0,0,0,0)" stroke={LIME} strokeWidth={0.8} />
          <text x={rootCx} y={rootY + nodeH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
            fill={LIME} fontSize={7} fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.1em">
            {domain.slice(0, 10)}
          </text>
          {/* directed edges + child nodes */}
          {chain.map((label, idx) => {
            const cy = childStartY + idx * childGap;
            const weight = 1 - idx * 0.25;
            return (
              <g key={idx}>
                <line x1={rootCx} y1={rootCy} x2={rootCx} y2={cy}
                  stroke="rgba(255,255,255,0.20)" strokeWidth={weight}
                  markerEnd={`url(#arrDN-${domain})`} />
                <rect x={rootCx - 44} y={cy} width={88} height={nodeH} rx={2}
                  fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.7} />
                <text x={rootCx} y={cy + nodeH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.60)" fontSize={7}
                  fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.08em">
                  {label.slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Html>
  );
}

const CONE_TO_KALSHI_DOMAIN = {
  technology: 'TECHNOLOGY',
  capital:    'FINANCIAL',
  knowledge:  'FINANCIAL',
  labor:      'SIGNAL',
  media:      'MARKET',
  ownership:  'HOME',
};

function ConeScene({ coneState, selectedDomain, clickEvent, onSelectCone, events = [], flows = [], topoMode = false, onArcClick, hudRef, kalshiSignals = [], carouselRef, dollyKey = 0, viewportLens = 'OBSERVE', divergenceByDomain = {} }) {
  const total      = coneState.length;
  const R          = Math.max(6, (total * SPACING) / (2 * Math.PI));
  const spinRef    = useRef();
  const lastClickTs = useRef(0);
  const ghostFrame = useRef(0);
  const ghostBuf   = useRef(null);
  if (!ghostBuf.current) {
    ghostBuf.current = {
      slots: Array.from({ length: MAX_GHOSTS }, () => ({
        active: false, domain: '', height: 0, radius: 0, opacity: 0,
        mat: new THREE.MeshBasicMaterial({ color: '#4A4A4A', wireframe: true, transparent: true, opacity: 0 }),
      })),
      heads: {},
    };
  }
  // WO-1313: topology lerp state
  const topoLerpRef    = useRef(0);
  const prevTopoRef    = useRef(false);
  const rotOffsetRef   = useRef(0);
  const prevEditModeRef = useRef(false);
  const frozenAngleRef  = useRef(0);
  const stepAnimRef     = useRef(null); // { startAngle, targetAngle, startTime } while an arrow-step eases in
  const coneGroupRefs  = useRef(Array.from({ length: 10 }, () => ({ current: null })));
  const gridGroupRef   = useRef();
  const mapMatRef      = useRef();
  const { camera, size } = useThree();
  const raycasterRef = useRef();
  if (!raycasterRef.current) raycasterRef.current = new THREE.Raycaster();
  const zoomTarget = useRef(16.2);
  const zooming    = useRef(true);
  useEffect(() => { zooming.current = true; }, []);
  // Per-cone position + apex Y lookup for event rendering
  const coneData = useMemo(() => {
    const out = {};
    coneState.forEach((state, i) => {
      const angle = (i / total) * Math.PI * 2;
      const pos = [R * Math.cos(angle), 0, R * Math.sin(angle)];
      const { height } = encodeCone(state, { focusId: null });
      const apexY = Math.max(0.5, Math.pow(height, 1.4) * CONE_HEIGHT_SCALE);
      out[state.domain] = { pos, apexY };
    });
    return out;
  }, [coneState, total, R]);

  useFrame(({ clock }, delta) => {
    // WO-1313: topology lerp — snap rotation to 0 on entry, lerp positions, fade grid
    const topoTarget = topoMode ? 1 : 0;
    // WO-1313: time-normalized lerp — 1-second transition, frame-rate independent
    const TRANSITION_DURATION = 1.0; // seconds
    const speed = delta / TRANSITION_DURATION;
    const dir   = topoTarget > topoLerpRef.current ? 1 : -1;
    if (topoLerpRef.current !== topoTarget) {
      topoLerpRef.current = Math.max(0, Math.min(1,
        topoLerpRef.current + dir * Math.min(speed, Math.abs(topoTarget - topoLerpRef.current))
      ));
    }
    const lerpT = topoLerpRef.current;

    // Smooth 10% zoom-in on surface engage
    if (zooming.current) {
      camera.position.z += (zoomTarget.current - camera.position.z) * 0.012;
      if (Math.abs(camera.position.z - zoomTarget.current) < 0.01) zooming.current = false;
    }

    if (spinRef.current) {
      const elapsed = clock.getElapsedTime();
      if (topoMode && !prevTopoRef.current) {
        // Entering topo: freeze rotation at 0, record offset for clean resume
        rotOffsetRef.current = spinRef.current.rotation.y - elapsed * SPIN;
        spinRef.current.rotation.y = 0;
      }
      if (!topoMode) {
        const stopped = _carouselStopped;
        if (stopped && !prevEditModeRef.current) {
          frozenAngleRef.current = spinRef.current.rotation.y;
        } else if (!stopped && prevEditModeRef.current) {
          rotOffsetRef.current = frozenAngleRef.current - elapsed * SPIN;
        }
        if (stopped) {
          // Manual steer while frozen — drag (continuous, applied directly) or
          // arrow-button (stepped by one cone's angular spacing, EASED over
          // STEP_DURATION rather than snapped instantly — an instant full-step
          // jump reads as too fast / jarring; standard carousel-arrow behavior
          // is a short ease-out transition). carouselRef is the same ref
          // ConeMap writes into from its pointer handlers and arrow buttons.
          if (carouselRef?.current?.dragDelta) {
            stepAnimRef.current = null; // drag overrides/cancels any in-flight step ease
            frozenAngleRef.current += carouselRef.current.dragDelta;
            carouselRef.current.dragDelta = 0;
          }
          if (carouselRef?.current?.stepRequest) {
            const targetAngle = frozenAngleRef.current + carouselRef.current.stepRequest * (Math.PI * 2 / total);
            stepAnimRef.current = { startAngle: frozenAngleRef.current, targetAngle, startTime: elapsed };
            carouselRef.current.stepRequest = 0;
          }
          if (stepAnimRef.current) {
            const { startAngle, targetAngle, startTime } = stepAnimRef.current;
            const t = Math.min(1, (elapsed - startTime) / STEP_DURATION);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — standard for stepped carousel nav
            frozenAngleRef.current = startAngle + (targetAngle - startAngle) * eased;
            if (t >= 1) stepAnimRef.current = null;
          }
          spinRef.current.rotation.y = frozenAngleRef.current;
        } else {
          spinRef.current.rotation.y = elapsed * SPIN + rotOffsetRef.current;
        }
        prevEditModeRef.current = stopped;
      }
    }
    prevTopoRef.current = topoMode;

    coneState.forEach((state, i) => {
      const ref = coneGroupRefs.current[i];
      if (!ref?.current) return;
      const angle  = (i / total) * Math.PI * 2;
      const sx = R * Math.cos(angle), sz = R * Math.sin(angle);
      const anchor = TOPOLOGY_ANCHORS[state.domain] ?? [sx, 0, sz];
      ref.current.position.x = sx + (anchor[0] - sx) * lerpT;
      ref.current.position.z = sz + (anchor[2] - sz) * lerpT;
    });

    if (gridGroupRef.current) {
      gridGroupRef.current.traverse(child => {
        if (!child.material?.transparent) return;
        if (child.userData.baseOp === undefined) child.userData.baseOp = child.material.opacity;
        child.material.opacity = child.userData.baseOp * (1 - lerpT);
      });
    }
    if (mapMatRef.current) mapMatRef.current.opacity = lerpT * 0.35;

    // WO-1308: ring-buffer snapshot + centralized opacity decay (GhostManager)
    ghostFrame.current += 1;
    if (ghostFrame.current >= GHOST_INTERVAL) {
      ghostFrame.current = 0;
      const buf = ghostBuf.current;
      coneState.forEach((s, domainIdx) => {
        const enc    = encodeCone(s, { focusId: null });
        const offset = domainIdx * GHOST_DEPTH;
        const head   = buf.heads[s.domain] ?? 0;
        const slot   = buf.slots[offset + head];
        slot.active  = true;
        slot.domain  = s.domain;
        slot.height  = enc.height;
        slot.radius  = enc.radius;
        slot.opacity = 0.22;
        slot.mat.opacity = 0.22;
        buf.heads[s.domain] = (head + 1) % GHOST_DEPTH;
      });
    }
    // Centralized decay — all active slots, every frame
    for (const slot of ghostBuf.current.slots) {
      if (!slot.active) continue;
      slot.opacity = Math.max(0, slot.opacity - GHOST_DECAY * delta);
      slot.mat.opacity = slot.opacity;
      if (slot.opacity <= 0.01) slot.active = false;
    }

    // Click-to-pin: real raycasting against the actual cone meshes (userData.domain
    // tagged in Cone), so a foreground cone correctly wins over one behind it.
    // Was: comparing 2D screen distance from each cone's projected BASE point to
    // the click — never checked what was actually visually hit, so an overlapping
    // background cone could "win" over the foreground one the user clicked.
    if (!clickEvent || clickEvent.ts === lastClickTs.current || !onSelectCone) return;
    lastClickTs.current = clickEvent.ts;

    const ndcX = (clickEvent.x / size.width) * 2 - 1;
    const ndcY = -(clickEvent.y / size.height) * 2 + 1;
    raycasterRef.current.setFromCamera({ x: ndcX, y: ndcY }, camera);

    // While the carousel is spinning, spinRef's rotation.y (set earlier this
    // same useFrame tick) hasn't been baked into matrixWorld yet — Three only
    // recomputes matrixWorld during the renderer's own render pass, which runs
    // AFTER all useFrame callbacks finish. Raycasting here would otherwise test
    // against last frame's rotation, one tick behind what's about to be drawn.
    // Force it now so the ray is checked against the exact angle being rendered.
    if (spinRef.current) spinRef.current.updateMatrixWorld(true);

    const targets = coneGroupRefs.current
      .slice(0, coneState.length)
      .map(ref => ref.current)
      .filter(Boolean);
    // intersectObjects sorts by distance from camera. Each cone group also
    // contains Footprint (a thin line-ring at the base) and GhostLayer —
    // neither tagged with userData.domain — sitting at nearly the same height
    // as the invisible base cap. If one of those wins the closest-hit race,
    // hits[0] is untagged and resolves to null, which the selection fallback
    // (coneMap.jsx ~line 1976 "fall back to highest-pressure cone") then
    // silently replaces with whatever cone has the highest pressure — reading
    // as "click sometimes selects an unrelated domain" with no visible error.
    // Skip untagged hits entirely; the first TAGGED hit is the real answer.
    const hits = raycasterRef.current.intersectObjects(targets, true);
    const validHit = hits.find(h => h.object.userData?.domain);
    const resolved = validHit ? validHit.object.userData.domain : null;
    // A miss (no tagged mesh under the click — e.g. a click that lands between
    // two cones while the carousel is mid-rotation) is not a deselect gesture.
    // Previously this always called onSelectCone(resolved), so a miss passed
    // resolved=null straight through, clearing whatever cone was manually
    // selected and dropping the view back to the highest-pressure fallback —
    // reading as "selection randomly jumps to Operating" on ordinary clicks.
    // Only a genuine hit should change the selection; a miss leaves it alone.
    if (resolved) onSelectCone(resolved);
  });

  // HUD projector — world positions via getWorldPosition → screen coords → hudRef
  const _hudVec = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!hudRef?.current) return;
    const result = [];
    coneState.forEach((state, i) => {
      const ref  = coneGroupRefs.current[i];
      if (!ref?.current) return;
      const data  = coneData[state.domain];
      const apexY = data?.apexY ?? 0.5;
      ref.current.getWorldPosition(_hudVec);
      _hudVec.y = apexY + 1.4;
      _hudVec.project(camera);
      if (_hudVec.z > 1) return;
      result.push({
        domain:    state.domain,
        pressure:  Math.round(state.pressure ?? 0),
        volatility: (state.volatility ?? 0).toFixed(2),
        selected:  state.domain === selectedDomain,
        x: (_hudVec.x + 1) * size.width  / 2,
        y: (1 - _hudVec.y) * size.height / 2,
      });
    });
    hudRef.current = result;
  });

  return (
    <>
      <group ref={gridGroupRef}>
        <PulseFloor ringCount={7} maxRadius={R + 2.4} />
        <ThresholdBands />

      </group>

      {/* WO-1313: US outline wireframe — fades in with topoLerp */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[US_OUTLINE_GEO, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={mapMatRef} color="#4A4A4A" transparent opacity={0} />
      </lineSegments>

      {/* cones + their footprints spin collectively around center Y axis */}
      {/* In topology mode spin stops; coneGroupRefs lerp positions to geographic anchors */}
      <group ref={spinRef}>
        {(() => {
          // Build domain → best Kalshi signal map (highest OI per domain)
          const kalshiMap = {};
          for (const s of kalshiSignals) {
            const d = s.domain?.toUpperCase();
            if (!kalshiMap[d] || s.oi > (kalshiMap[d]?.oi ?? 0)) kalshiMap[d] = s;
          }
          return coneState.map((state, i) => {
          const angle = (i / total) * Math.PI * 2;
          const pos   = [R * Math.cos(angle), 0, R * Math.sin(angle)];
          const kDomain = CONE_TO_KALSHI_DOMAIN[state.domain] ?? 'SIGNAL';
          const kalshiSignal = kalshiMap[kDomain] ?? null;
          // Footprint ring must track the cone's own base radius — was hardcoded
          // to a fixed 1.1 regardless of actual signal-driven size, so wide
          // (high-pressure) cones visually overflowed their ring and narrow ones
          // looked oversized relative to their cone. Same encodeCone() + 1.5972
          // scale factor the cone geometry itself uses, so the ring always
          // matches what's actually rendered.
          const { radius: footRadius } = encodeCone(state, { focusId: null });
          return (
            <group key={state.domain} ref={coneGroupRefs.current[i]} position={pos}>
              <Footprint position={[0, 0, 0]} radius={footRadius * 1.5972} />
              <GhostLayer domainIdx={i} buf={ghostBuf.current} />
              <Cone
                state={state}
                position={[0, 0, 0]}
                index={i}
                isSelected={state.domain === selectedDomain}
                kalshiSignal={kalshiSignal}
                viewportLens={viewportLens}
                drift={divergenceByDomain[state.domain] ?? null}
              />
            </group>
          );
        });
        })()}

        {/* Wave 2: live event pulses — particles rise from each firing cone */}
        {events.map(ev => {
          const data = coneData[ev.target];
          if (!data) return null;
          return (
            <EventPulse
              key={ev.id}
              event={ev}
              position={data.pos}
              apexY={data.apexY}
            />
          );
        })}

        {/* Wave 2: flow arcs — bezier between cones that pulsed together */}
        {flows.map(f => {
          const a = coneData[f.a];
          const b = coneData[f.b];
          if (!a || !b) return null;
          return (
            <FlowArc
              key={f.id}
              flow={f}
              posA={a.pos} apexA={a.apexY}
              posB={b.pos} apexB={b.apexY}
              domainA={f.a}
              domainB={f.b}
              onArcClick={onArcClick}
            />
          );
        })}
      </group>
    </>
  );
}

const CANONICAL_FEEDERS = CANONICAL_DOMAINS; // KRYL-1065 — sourced from ontology (no local domain list)


export default function ConeMap({ signals = [], timeOffset = 0, lens = 'INVESTOR', selectedDomain = null, clickEvent = null, onSelectCone = null, topoMode = false, onArcClick = null, searchPreview = null, onSearchPreviewSave = null, maxCones = null, dollyKey = 0, coneColorOverrides = {}, viewportLens = 'OBSERVE' }) {
  const onCanvasCreated = useCanvasGuard();
  const { signals: kalshiSignals } = useKalshiSignals();
  const { coneState, rawDomains } = useMemo(() => {
    const normalized = signals.map(sig => ({
      // cone_domain (live records) routes to canonical feeders; stubs keep source
      domain:     sig.domain ?? sig.source ?? 'signal',
      leverage:   (sig.fs ?? 0) * 100,
      volatility: sig.fidelity?.e_viral ?? 0,
    }));
    const aggregated = aggregateSignals(normalized);
    const byDomain = new Map(aggregated.map(s => [s.domain, s]));
    const sixDomain = CANONICAL_FEEDERS.map(d => byDomain.get(d) ?? { domain: d, pressure: 0, volatility: 0 });
    let state = orderCanonicalCones(sixDomain);
    if (Object.keys(coneColorOverrides).length) {
      state = state.map(c => {
        const bayNum = PILLAR_INDEX.indexOf(c.domain) + 1;
        const override = coneColorOverrides[bayNum] ?? null;
        return override ? { ...c, colorOverride: override } : c;
      });
    }
    if (maxCones) {
      state = [...state].sort((a, b) => (b.pressure ?? 0) - (a.pressure ?? 0)).slice(0, maxCones);
    }
    return { coneState: state, rawDomains: sixDomain };
  }, [signals, maxCones, coneColorOverrides]);

  // KRYL-1052 — DRIFT divergence per domain, computed outside the Canvas. Gated on the
  // active lens so GDELT is only queried when DRIFT is selected. Withheld → HUD AWAITING.
  const divergenceByDomain = useDriftDivergence(coneState, viewportLens === 'DRIFT');

  if (!coneState.length) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.12)',
        }}>NO SIGNAL</span>
      </div>
    );
  }

  // Manual click selection takes priority; fall back to highest-pressure cone.
  const autoHighest = coneState.reduce(
    (max, c) => ((c.pressure ?? 0) > (max.pressure ?? 0) ? c : max),
    coneState[0],
  );
  const manualPick   = selectedDomain
    ? coneState.find(c => c.domain === selectedDomain)
    : null;
  const selectedCone = manualPick ?? autoHighest;
  const activeDomain = selectedCone?.domain;

  // Wave 2 event stream + persistent log + paired flow arcs
  const events = useEventStream(coneState);
  const [log, setLog] = useState([]);
  const [flows, setFlows] = useState([]);
  const carouselRef    = useRef({ stopped: false, dragDelta: 0, stepRequest: 0 });
  const containerRef   = useRef(null);
  const pdLastRef      = useRef(0);
  const lastEventRef = useRef(null);
  const flowIdRef    = useRef(0);
  const isPointerDownRef = useRef(false);
  const dragStartXRef    = useRef(null);
  const [frozenUi, setFrozenUi] = useState(false); // mirrors _carouselStopped for arrow-button visibility
  const [hoverArrow, setHoverArrow] = useState(null); // -1 | 1 | null — which steer arrow is hovered

  useEffect(() => {
    if (!events.length) return;
    setLog(prev => {
      const seen = new Set(prev.map(e => e.id));
      const fresh = events.filter(e => !seen.has(e.id));
      if (!fresh.length) return prev;
      return [...fresh.reverse(), ...prev].slice(0, 8);
    });
    // Pair consecutive different-cone events within 2.2s into flow arcs
    events.forEach(e => {
      const prev = lastEventRef.current;
      if (!prev || prev.id === e.id) { lastEventRef.current = prev ?? e; return; }
      if (prev.target !== e.target && (e.born - prev.born) < 2200) {
        const flowId = ++flowIdRef.current;
        setFlows(curr => {
          const now = Date.now();
          const fresh = curr.filter(f => now - f.born < 3000);
          return [...fresh, { id: flowId, a: prev.target, b: e.target, born: e.born }].slice(-2);
        });
      }
      lastEventRef.current = e;
    });
  }, [events]);

  // Sweep-evict expired flow arcs
  useEffect(() => {
    const sweep = setInterval(() => {
      setFlows(curr => {
        const now = Date.now();
        const fresh = curr.filter(f => now - f.born < 3000);
        return fresh.length === curr.length ? curr : fresh;
      });
    }, 400);
    return () => clearInterval(sweep);
  }, []);

  // Native pointerdown capture — fires BEFORE R3F, guaranteed twice per double-click.
  // Also tracks drag-to-rotate: while frozen (_carouselStopped), horizontal drag
  // steers the carousel manually via carouselRef.dragDelta, consumed once per
  // frame in ConeScene's useFrame.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // pointermove/up are attached ONLY between an actual pointerdown and its
    // matching up/leave — not permanently registered on the whole cone view.
    // Reduces the always-on listener footprint to the moment a press is live.
    const handleMove = e => {
      if (!_carouselStopped || dragStartXRef.current === null) return;
      const deltaX = e.clientX - dragStartXRef.current;
      dragStartXRef.current = e.clientX;
      carouselRef.current.dragDelta += deltaX * DRAG_SENSITIVITY;
    };
    const handleUp = () => {
      isPointerDownRef.current = false;
      dragStartXRef.current = null;
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerup', handleUp);
      el.removeEventListener('pointerleave', handleUp);
    };
    const handleDown = e => {
      isPointerDownRef.current = true;
      dragStartXRef.current = e.clientX;
      el.addEventListener('pointermove', handleMove);
      el.addEventListener('pointerup', handleUp);
      el.addEventListener('pointerleave', handleUp);
      const now = Date.now();
      const gap = now - pdLastRef.current;
      pdLastRef.current = now;
      if (gap < 300) {
        pdLastRef.current = 0;
        _carouselStopped = !_carouselStopped;
        setFrozenUi(_carouselStopped);
      }
    };

    el.addEventListener('pointerdown', handleDown, { capture: true });
    return () => {
      el.removeEventListener('pointerdown', handleDown, { capture: true });
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerup', handleUp);
      el.removeEventListener('pointerleave', handleUp);
    };
  }, []);

  const baysForResonance = useBayStore(s => s.bays);
  const hudRef     = useRef([]);
  const [hudList, setHudList] = useState([]);
  useEffect(() => {
    const id = setInterval(() => {
      setHudList(hudRef.current ? [...hudRef.current] : []);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const [localClick, setLocalClick] = useState(null);
  const activeClick = localClick ?? clickEvent;

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, background: '#000000' }}
      onClick={e => {
        if (e.detail >= 2) return; // double-click handled by native pointerdown
        if (e.clientX > window.innerWidth - 260) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setLocalClick({ x: e.clientX - rect.left, y: e.clientY - rect.top, ts: Date.now() });
      }}
    >
      <Canvas flat camera={{ position: [0, 3.25, 18], fov: 50 }} onCreated={onCanvasCreated}>
        <ConeScene
          coneState={coneState}
          selectedDomain={activeDomain}
          clickEvent={activeClick}
          onSelectCone={onSelectCone}
          events={events}
          flows={flows}
          topoMode={topoMode}
          onArcClick={onArcClick}
          hudRef={hudRef}
          kalshiSignals={kalshiSignals}
          carouselRef={carouselRef}
          dollyKey={dollyKey}
          viewportLens={viewportLens}
          divergenceByDomain={divergenceByDomain}
        />
        <OrbitControls
          enableRotate={false} enablePan={false} enableZoom={false}
          target={[0, 2.4, 0]}
        />
      </Canvas>

      {/* WO-1349 — Cross-bay resonance arcs for COMPARE-flagged bays */}
      {(() => {
        const flaggedBays = Object.values(baysForResonance).filter(b => b.compareFlag && b.assignment);
        if (flaggedBays.length < 2) return null;
        // Map bayId → cone domain via PILLAR_INDEX (bayId = pillarIdx + 1)
        const arcNodes = flaggedBays
          .map(b => {
            const domain = PILLAR_INDEX[b.id - 1];
            if (!domain) return null;
            const hud = hudList.find(h => h.domain === domain);
            return hud ? { ...hud, title: b.assignment.title } : null;
          })
          .filter(Boolean);
        if (arcNodes.length < 2) return null;
        const pairs = [];
        for (let i = 0; i < arcNodes.length; i++) {
          for (let j = i + 1; j < arcNodes.length; j++) {
            pairs.push([arcNodes[i], arcNodes[j]]);
          }
        }
        return (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
            {pairs.map(([a, b], idx) => {
              const mx = (a.x + b.x) / 2;
              const my = Math.min(a.y, b.y) - 60;
              return (
                <g key={idx}>
                  <path
                    d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
                    fill="none"
                    stroke="rgba(102,255,0,0.55)"
                    strokeWidth="1"
                    strokeDasharray="6 3"
                  />
                  <circle cx={mx} cy={my} r={3} fill="rgba(102,255,0,0.6)" />
                  <text x={mx + 5} y={my - 4} fill="rgba(102,255,0,0.7)" fontSize={7}
                    fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.15em">
                    RESONANCE
                  </text>
                </g>
              );
            })}
          </svg>
        );
      })()}

      {/* InspectionPanel + ComparePanel portaled to root z:20 overlay */}
      {typeof document !== 'undefined' && document.getElementById('krylo-hud-root') && createPortal(
        <>
          <ComparePanel />
          <InspectionPanel cone={selectedCone} timeOffset={timeOffset} lens={lens} log={log} coneState={coneState} rawDomains={rawDomains} searchPreview={searchPreview} onSearchPreviewSave={onSearchPreviewSave} />
        </>,
        document.getElementById('krylo-hud-root')
      )}

      {/* Manual-steer arrows — frozen mode only. Positioned in the actual cone
          content gutter, not the raw viewport edge: left nav is left:72
          (app.jsx), InspectionPanel is right:16 + width:calc(240px + 1vw)
          (conemap.jsx ~line 583) — so its left edge is calc(256px + 1vw) from
          the viewport right. Circle + opaque background — original design. */}
      {frozenUi && typeof document !== 'undefined' && document.getElementById('krylo-hud-root') && createPortal(
        <>
          {[-1, 1].map(dir => (
            <div
              key={dir}
              style={{
                position: 'fixed', top: '50%', transform: 'translateY(-50%)',
                ...(dir === -1 ? { left: 96 } : { right: 'calc(280px + 1vw)' }),
                zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={() => setHoverArrow(dir)}
              onMouseLeave={() => setHoverArrow(a => (a === dir ? null : a))}
            >
              <button
                onClick={() => { carouselRef.current.stepRequest = dir; }}
                style={{
                  pointerEvents: 'auto', cursor: 'pointer',
                  width: 40, height: 40, borderRadius: '50%',
                  background: hoverArrow === dir ? 'rgba(102,255,0,0.15)' : 'rgba(0,0,0,0.7)',
                  border: `1px solid ${hoverArrow === dir ? LIME : LIME + '55'}`,
                  color: LIME, fontFamily: "'IBM Plex Mono', monospace", fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 120ms ease, border-color 120ms ease',
                }}
              >
                {dir === -1 ? '‹' : '›'}
              </button>
            </div>
          ))}
        </>,
        document.getElementById('krylo-hud-root')
      )}
    </div>
  );
}
