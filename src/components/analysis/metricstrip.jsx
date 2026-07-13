// WO-1868 — MetricStrip: shared nine-pillar hero strip
// WO-2009 — Epistemic Visibility Controller wired: SCI/SPS tiles are phase-gated.
// WO-2015 — Phase-Lock Indicator: Phase Dot inline with S.DENSITY tile.
// WO-2016 — Divergence Spectrum: Consensus→Edge bar below strip.
// Render-only. Never computes a metric — metricsengine.js is the authority.
// Never computes visibility — metricvisibility.js is the authority.
import React from 'react';
import { getPhaseLock } from '../../engine/phaselock.js';
import { getMetricDefinition } from '../../engine/metricdefinitions.js';
import HelpMark from '../shared/helpmark.jsx';

// Help text for a metric's label — click the "?" to see it. Render-only:
// reads a static definition, never computes or alters anything. Falls back
// to no help mark at all if a key has no definition (HelpMark itself
// returns null when text is falsy).
function defTitle(metricKey) {
  const d = getMetricDefinition(metricKey);
  if (!d) return undefined;
  return `${d.definition} Scope: ${d.scope} Units: ${d.units} Sensitivity: ${d.sensitivity}`;
}

const MONO    = "'IBM Plex Mono', monospace";
const LIME    = '#66FF00';
const BLUE    = '#007FFF';
const DIM     = 'rgba(255,255,255,0.25)';
const BRT     = 'rgba(255,255,255,0.85)';
// Dormant: zero perceptual demand — present but not demanding attention.
const DORMANT = 'rgba(255,255,255,0.10)';

// Groundedness color bands per §18: green >70%, mid 40–70%, low <40%
function gColor(gnd) {
  if (gnd >= 0.70) return LIME;
  if (gnd >= 0.40) return BLUE;
  return DIM;
}

// tileMode: 'active' (default) | 'dormant' | 'critical'
//   dormant  — label at DORMANT opacity; no display value, no tag, no groundedness
//   active   — standard rendering
//   critical — display value in LIME; tag in LIME; groundedness always shown
function Tile({ label, display, groundedness, tag, tileMode = 'active', title }) {
  if (tileMode === 'dormant') {
    return (
      <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 3 }}>
          <span style={{
            fontFamily: MONO, fontSize: 7, color: DORMANT,
            letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>{label}</span>
          <HelpMark text={title} color={DORMANT} />
        </div>
        {/* No value, no tag, no groundedness — dormant means non-demanding presence */}
      </div>
    );
  }

  if (tileMode === 'critical') {
    return (
      <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
          <span style={{
            fontFamily: MONO, fontSize: 7, color: LIME,
            letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>{label}</span>
          <HelpMark text={title} color={LIME} />
          {tag && (
            <span style={{
              fontFamily: MONO, fontSize: 6, color: LIME,
              letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>{tag}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontFamily: MONO, fontSize: 11, color: LIME,
            fontWeight: 700, letterSpacing: '0.04em',
          }}>{display}</span>
          <span style={{
            fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.1em',
          }}>{`${Math.round(groundedness * 100)}%`}</span>
        </div>
      </div>
    );
  }

  // active (default)
  const gc  = gColor(groundedness);
  const pct = `${Math.round(groundedness * 100)}%`;
  return (
    <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
        <span style={{
          fontFamily: MONO, fontSize: 7, color: DIM,
          letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>{label}</span>
        <HelpMark text={title} />
        {tag && (
          <span style={{
            fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>{tag}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontFamily: MONO, fontSize: 11, color: BRT,
          fontWeight: 600, letterSpacing: '0.04em',
        }}>{display}</span>
        <span style={{
          fontFamily: MONO, fontSize: 8, color: gc, letterSpacing: '0.1em',
        }}>{pct}</span>
      </div>
    </div>
  );
}

// WO-2015 — Phase Dot visual spec
// dotState 0: unlit ring (COMMITMENT), 1: soft fill (EXECUTION), 2: filled + pulse (REFLECTION)
const PHASE_DOT_STYLES = [
  { width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', flexShrink: 0 },
  { width: 6, height: 6, borderRadius: '50%', background: 'rgba(102,255,0,0.40)', flexShrink: 0 },
  { width: 6, height: 6, borderRadius: '50%', background: '#66FF00', flexShrink: 0, animation: 'phasePulse 1.8s ease-in-out infinite' },
];

// visibility: output of useMetricVisibility() — optional; defaults to full active rendering
// compositeMetrics: from computeCompositeMetrics() — WO-2014; optional
export default function MetricStrip({ metrics, visibility, compositeMetrics, style, hide }) {
  if (!metrics) return null;
  const { signal, validity, convergence, cac, roas, ltv, leverageRealization, sci, sps } = metrics;

  const sciMode = visibility?.sciTileMode ?? 'active';
  const spsMode = visibility?.spsTileMode ?? 'active';
  const fsmMode = visibility?.mode ?? 'QUIET'; // WO-2009 FSM state for Divergence Spectrum

  const lr          = leverageRealization;
  const phaseLock   = getPhaseLock(); // WO-2015: calendar-derived, no deps
  const phaseDotStyle = PHASE_DOT_STYLES[phaseLock.dotState] ?? PHASE_DOT_STYLES[0];

  const tiles = [
    {
      label:        'Signal',
      display:      signal ? String(Math.round((signal.value ?? 0) * 100)) : '—',
      groundedness: signal?.groundedness ?? 0,
      tag:          null,
      tileMode:     'active',
      title:        defTitle('signal'),
    },
    {
      label:        'Validity',
      display:      validity ? `${Math.round((validity.value ?? 0) * 100)}%` : '—',
      groundedness: validity?.groundedness ?? 0,
      tag:          null,
      tileMode:     'active',
      title:        defTitle('validity'),
    },
    {
      label:        'Convergence',
      display:      convergence ? `${Math.round((convergence.value ?? 0) * 100)}%` : '—',
      groundedness: convergence?.groundedness ?? 0,
      tag:          convergence?.queryRelevant === false ? 'AMB' : null,
      tileMode:     'active',
      title:        defTitle('convergence'),
    },
    {
      label:        'CAC',
      display:      (cac && !cac.withheld) ? `$${(cac.value ?? 0).toLocaleString()}` : '—',
      groundedness: cac?.groundedness ?? 0,
      tag:          cac?.withheld ? 'UNGROUNDED' : (cac?.label ?? 'MODELED'),
      tileMode:     'active',
      title:        defTitle('cac'),
    },
    {
      label:        'ROAS',
      display:      (roas && !roas.withheld) ? `${roas.value ?? 0}x` : '—',
      groundedness: roas?.groundedness ?? 0,
      tag:          roas?.withheld ? 'UNGROUNDED' : (roas?.label ?? 'MODELED'),
      tileMode:     'active',
      title:        defTitle('roas'),
    },
    {
      label:        'LTV',
      display:      (ltv && !ltv.withheld) ? `$${(ltv.value ?? 0).toLocaleString()}` : '—',
      groundedness: ltv?.groundedness ?? 0,
      tag:          ltv?.withheld ? 'UNGROUNDED' : (ltv?.label ?? 'MODELED'),
      tileMode:     'active',
      title:        defTitle('ltv'),
    },
    // Metrics after LTV removed per Founder directive 2026-07-12 (LR-Prior / S.DENSITY / SPS).
    // Strip ends at LTV. The metrics still compute in metricsengine; this trims render only.
  ];

  // DEF-1870 — placement fix: omit named tiles for this instance only (e.g. the
  // action-matrix strip drops LR-Prior). The metric + its RECORDING state stay
  // intact on every other surface; this filters render, not the metric itself.
  const shownTiles = (hide && hide.length) ? tiles.filter(t => !hide.includes(t.label)) : tiles;

  // WO-2016: Divergence Spectrum visibility
  const showSpectrum  = fsmMode !== 'QUIET' && compositeMetrics != null;
  const spectrumOpacity = fsmMode === 'CRITICAL' ? 1.0 : 0.5;
  const advantage     = compositeMetrics?.advantage ?? 0.5;
  const edge          = compositeMetrics?.edge ?? 0;
  const pointerColor  = edge >= 0.70
    ? '#66FF00'
    : edge >= 0.35
    ? '#66FF00'
    : 'rgba(255,255,255,0.35)';
  const pointerGlow   = edge >= 0.70 ? 'drop-shadow(0 0 4px #66FF00)' : 'none';

  // Inject pulse keyframes once
  const pulseStyle = `@keyframes phasePulse { 0%,100%{opacity:0.4} 50%{opacity:1.0} }`;

  return (
    <div style={{ flexShrink: 0, ...style }}>
      <style>{pulseStyle}</style>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderBottom: showSpectrum ? 'none' : '1px solid rgba(255,255,255,0.07)',
        padding: '10px 0',
        overflowX: 'auto',
      }}>
        {shownTiles.map((t, i) => (
          <React.Fragment key={t.label}>
            <TileWithDot {...t} />
            {i < shownTiles.length - 1 && (
              <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* WO-2016 — Divergence Spectrum bar */}
      {showSpectrum && (
        <div style={{
          padding: '6px 14px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          opacity: spectrumOpacity,
        }}>
          <div style={{ position: 'relative', height: 14 }}>
            {/* Track */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', transform: 'translateY(-50%)' }} />
            {/* Pointer diamond */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${Math.round(advantage * 100)}%`,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              width: 6, height: 6,
              background: pointerColor,
              filter: pointerGlow,
            }} />
            {/* Labels */}
            <span style={{ position: 'absolute', left: 0, top: 0, fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>CONSENSUS</span>
            <span style={{ position: 'absolute', right: 0, top: 0, fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>EDGE</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Tile variant that supports optional Phase Dot (WO-2015)
function TileWithDot(props) {
  const { phaseDot, ...rest } = props;
  if (!phaseDot) return <Tile {...rest} />;

  // Inject phaseDot after label in S.DENSITY tile
  const { label, display, groundedness, tag, tileMode, title } = rest;
  const DORMANT = 'rgba(255,255,255,0.10)';
  const BRT2    = 'rgba(255,255,255,0.85)';
  const gc      = gColor(groundedness);
  const pct     = `${Math.round(groundedness * 100)}%`;

  if (tileMode === 'dormant') {
    return (
      <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: DORMANT, letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
          <div style={phaseDot} />
          <HelpMark text={title} color={DORMANT} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={phaseDot} />
        <HelpMark text={title} />
        {tag && <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{tag}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BRT2, fontWeight: 600, letterSpacing: '0.04em' }}>{display}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: gc, letterSpacing: '0.1em' }}>{pct}</span>
      </div>
    </div>
  );
}
