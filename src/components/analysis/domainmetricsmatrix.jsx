// Domain Metrics Matrix — six cards (Signal/Validity/Convergence/CAC/ROAS/LTV),
// averaged per domain, scoped to whichever domain chip is currently selected.
// Mount point: analysisidlefield.jsx, reads selectedDomains[0].
//
// Architecture (per real codebase convention, §18 WIRING CONTRACT):
//   domainmetricsstore.js (producer: recordMetricsSnapshot, already wired into
//   targetpacket.jsx) -> useDomainMetrics (read-only [J] projection, no calc
//   beyond averaging) -> this component (render-only sink).
//
// Each metric averaged independently (§23 Orthogonal Axis Integrity) — never
// blended into one composite number. Help text pulled from metricdefinitions.js
// (real, already-written, sourced from metricsengine.js's own comments) —
// no invented copy.
import React from 'react';
import HelpMark from '../shared/helpmark.jsx';
import { useDomainMetrics } from '../../hooks/useDomainMetrics.js';
import { getMetricDefinition } from '../../engine/metricdefinitions.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

const CARDS = [
  { key: 'signal',      label: 'SIGNAL' },
  { key: 'validity',    label: 'VALIDITY' },
  { key: 'convergence', label: 'CONVERGENCE' },
  { key: 'cac',         label: 'CAC' },
  { key: 'roas',        label: 'ROAS' },
  { key: 'ltv',         label: 'LTV' },
];

// Formatting only — no calculation. cac/roas/ltv are dollar/ratio; signal/
// validity/convergence are 0-1 fractions, shown as a percentage.
function formatValue(key, value) {
  if (value == null) return '—';
  if (key === 'cac' || key === 'ltv') return `$${Math.round(value)}`;
  if (key === 'roas') return `${value.toFixed(1)}x`;
  return `${Math.round(value * 100)}%`;
}

export default function DomainMetricsMatrix({ activeDomain }) {
  const { data } = useDomainMetrics(activeDomain);

  if (!activeDomain) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '8px 0' }}>
        Select a domain to view metrics
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {CARDS.map(({ key, label }) => {
        const metric = data?.[key];
        const def    = getMetricDefinition(key);
        return (
          <div key={key} style={{
            padding: '10px 12px', border: `1px solid ${CARD_BORDER}`,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              {label}
              {def && <HelpMark text={def.definition} />}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: LIME }}>
              {formatValue(key, metric?.value)}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)' }}>
              {metric?.n ? `N=${metric.n}` : 'NO DATA YET'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
