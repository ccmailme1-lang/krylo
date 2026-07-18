// statedistribution.jsx — KRYL-1003 Perception State-Distribution HUD.
// Additive, presentational. Renders a bounded convergence-band distribution from REAL classifier
// states (AMPLIFYING / STABLE / DISSIPATING) as a thin segmented bar + mono legend. No simulation.
// Below MIN_POPULATION it WITHHOLDS (detect-not-predict) instead of drawing a fake single-state bar.
import React, { useMemo } from 'react';
import { computeStateDistribution } from '../../engine/statedistribution.js';

const MONO = "'IBM Plex Mono', monospace";
// Locked §6 tokens — no new color. lime=amplifying, slate=stable, blue=dissipating.
const THEME_HEX = {
  signal_lime:  '#66FF00',
  muted_slate:  '#3a3d4a',
  signal_blue:  '#007FFF',
};
const DIM = 'rgba(255,255,255,0.35)';

// props: stateIds (real classifier stateIds) OR a precomputed distribution.
export default function StateDistribution({ stateIds = null, distribution = null, label = 'PERCEPTION STATE' }) {
  const dist = useMemo(
    () => distribution ?? computeStateDistribution(stateIds ?? []),
    [distribution, stateIds],
  );

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: DIM }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)' }}>
        PROJECTION · N={dist.n}
      </span>
    </div>
  );

  // §22 / detect-not-predict: not enough real readings to be a distribution.
  if (!dist.sufficient) {
    return (
      <div style={{ padding: '2px 0' }}>
        {header}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: DIM, marginTop: 6 }}>
          DISTRIBUTION WITHHELD · N&lt;2
          {dist.insufficientCount > 0 && ` · ${dist.insufficientCount} INSUFFICIENT`}
        </div>
      </div>
    );
  }

  const shown = dist.bands.filter(b => b.pct > 0);
  return (
    <div style={{ padding: '2px 0' }}>
      {header}
      {/* segmented bar — widths are the real percentages */}
      <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        {shown.map(b => (
          <div key={b.key} style={{ width: `${b.pct}%`, background: THEME_HEX[b.theme] ?? DIM }} />
        ))}
      </div>
      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 7 }}>
        {shown.map(b => (
          <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ width: 6, height: 6, background: THEME_HEX[b.theme] ?? DIM, display: 'inline-block' }} />
            {b.label} <span style={{ color: '#fff' }}>{b.pct}%</span>
          </span>
        ))}
      </div>
      {dist.insufficientCount > 0 && (
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>
          {dist.insufficientCount} INSUFFICIENT (excluded)
        </div>
      )}
    </div>
  );
}
