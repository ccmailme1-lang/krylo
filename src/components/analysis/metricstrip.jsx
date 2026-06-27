// WO-1868 — MetricStrip: shared six-pillar hero strip
// Render-only. Never computes a metric — metricsengine.js is the authority.
import React from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const BLUE = '#007FFF';
const DIM  = 'rgba(255,255,255,0.25)';
const BRT  = 'rgba(255,255,255,0.85)';

// Groundedness color bands per §18: green >70%, mid 40–70%, low <40%
function gColor(gnd) {
  if (gnd >= 0.70) return LIME;
  if (gnd >= 0.40) return BLUE;
  return DIM;
}

function Tile({ label, display, groundedness, tag }) {
  const gc = gColor(groundedness);
  const pct = `${Math.round(groundedness * 100)}%`;
  return (
    <div style={{ flex: 1, padding: '0 14px', minWidth: 72 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
        <span style={{
          fontFamily: MONO, fontSize: 7, color: DIM,
          letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>{label}</span>
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

export default function MetricStrip({ metrics, style }) {
  if (!metrics) return null;
  const { signal, validity, convergence, cac, roas, ltv, leverageRealization, sci, sps } = metrics;

  const lr = leverageRealization;
  const tiles = [
    {
      label: 'Signal',
      display: signal ? String(Math.round((signal.value ?? 0) * 100)) : '—',
      groundedness: signal?.groundedness ?? 0,
      tag: null,
    },
    {
      label: 'Validity',
      display: validity ? `${Math.round((validity.value ?? 0) * 100)}%` : '—',
      groundedness: validity?.groundedness ?? 0,
      tag: null,
    },
    {
      label: 'Convergence',
      display: convergence ? `${Math.round((convergence.value ?? 0) * 100)}%` : '—',
      groundedness: convergence?.groundedness ?? 0,
      tag: convergence?.queryRelevant === false ? 'AMB' : null,
    },
    {
      label: 'CAC',
      display: cac ? `$${(cac.value ?? 0).toLocaleString()}` : '—',
      groundedness: cac?.groundedness ?? 0,
      tag: cac?.label ?? 'MODELED',
    },
    {
      label: 'ROAS',
      display: roas ? `${roas.value ?? 0}x` : '—',
      groundedness: roas?.groundedness ?? 0,
      tag: roas?.label ?? 'MODELED',
    },
    {
      label: 'LTV',
      display: ltv ? `$${(ltv.value ?? 0).toLocaleString()}` : '—',
      groundedness: ltv?.groundedness ?? 0,
      tag: ltv?.label ?? 'MODELED',
    },
    {
      label: 'LR-Prior',
      display: lr ? `${lr.avgLR}× N=${lr.n}` : '— N<5',
      groundedness: lr?.groundedness ?? 0,
      tag: lr ? null : 'RECORDING',
    },
    {
      label: 'SCI',
      display: sci ? `${sci.score}/10` : '—',
      groundedness: sci?.groundedness ?? 0,
      tag: sci ? null : 'NO GRAPH',
    },
    {
      label: 'SPS',
      display: sps ? `${sps.avgLR}× N=${sps.n}` : '— N<5',
      groundedness: sps ? Math.min(1, sps.n / 5) : 0,
      tag: sps ? null : 'RECORDING',
    },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '10px 0',
      overflowX: 'auto',
      flexShrink: 0,
      ...style,
    }}>
      {tiles.map((t, i) => (
        <React.Fragment key={t.label}>
          <Tile {...t} />
          {i < tiles.length - 1 && (
            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
