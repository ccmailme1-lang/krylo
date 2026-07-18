// whythismatters.jsx — KRYL-1004 Math-Transparency 'Why This Matters' derivation surface.
// RENDER-ONLY. Computes NOTHING. Reads the already-computed synthesis.metrics object
// (metricsengine.js is the sole authority, §18 wiring contract) and exposes the mechanism
// behind the detected state instead of a black-box conclusion:
//   Signal density · Independent sources · Cross-domain confirmation · Structural precursor · Convergence
// The decision-emission derivation shown here re-derives metrics.decisionEmissionScore exactly
// (§18 H5, multiplicative) from operands already present on the object — an outside inspector can
// re-multiply the printed numbers and land on the printed score.
// §22: absent legs (no EvidenceGraph → sci/sps null) render WITHHELD, never faked to zero.
import React from 'react';
import HelpMark from '../shared/helpmark.jsx';
import { getMetricDefinition } from '../../engine/metricdefinitions.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const BLUE = '#007FFF';
const DIM  = 'rgba(255,255,255,0.30)';
const BRT  = 'rgba(255,255,255,0.85)';

function gColor(g) { return g >= 0.70 ? LIME : g >= 0.40 ? BLUE : DIM; }
function pct(g)    { return `${Math.round((g ?? 0) * 100)}%`; }
function defTitle(k) {
  const d = getMetricDefinition(k);
  return d ? `${d.definition} Scope: ${d.scope}` : undefined;
}

// One derivation row: factor label, its real value, groundedness chip, optional help.
function Factor({ label, metricKey, value, grounded, withheld, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ flex: '0 0 118px', fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: DIM }}>
        {label}{metricKey && <HelpMark title={defTitle(metricKey)} />}
      </span>
      {withheld ? (
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>WITHHELD · {note}</span>
      ) : (
        <>
          <span style={{ fontFamily: MONO, fontSize: 11, color: BRT, minWidth: 44 }}>{value}</span>
          {grounded != null && (
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: gColor(grounded) }}>
              {pct(grounded)} grounded
            </span>
          )}
          {note && <span style={{ fontFamily: MONO, fontSize: 8, color: DIM }}>{note}</span>}
        </>
      )}
    </div>
  );
}

export default function WhyThisMatters({ metrics }) {
  if (!metrics) return null;
  const { signal, validity, convergence, sci, sps, economicsGroundedness, decisionEmissionScore } = metrics;

  // Fully ungrounded / ambiguous — the strip already renders the ungrounded state; nothing to derive.
  if (!(signal?.value > 0) && !sci) return null;

  // avgGnd re-derived from the four groundedness legs metricsengine averaged (H5). Printed so the
  // emission product below is fully checkable from the numbers on screen.
  const avgGnd = ((signal?.groundedness ?? 0) + (validity?.groundedness ?? 0) +
                  (convergence?.groundedness ?? 0) + (economicsGroundedness ?? 0)) / 4;

  const indepSources = sci?.coveredTypes?.length ?? null;               // independent evidence types
  const crossDomain  = sci?.classCoverage ? Object.keys(sci.classCoverage).length : null; // epistemic classes spanned

  return (
    <details style={{ margin: '10px 0 14px', border: '1px solid rgba(255,255,255,0.10)', background: '#000' }}>
      <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '9px 12px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: LIME }}>
        WHY THIS MATTERS · DERIVATION
      </summary>
      <div style={{ padding: '4px 12px 12px' }}>
        <Factor label="SIGNAL DENSITY"   metricKey="signal"      value={signal?.value?.toFixed(2)}      grounded={signal?.groundedness} />
        <Factor label="CONVERGENCE"      metricKey="convergence" value={convergence?.state ?? convergence?.value?.toFixed(2)} grounded={convergence?.groundedness}
                note={convergence?.queryRelevant ? 'query-relevant' : 'ambient field'} />
        <Factor label="INDEP. SOURCES"   metricKey="sci"         value={indepSources} withheld={indepSources == null} note="no evidence graph"
                grounded={sci?.groundedness} />
        <Factor label="CROSS-DOMAIN"     value={crossDomain != null ? `${crossDomain} classes` : null} withheld={crossDomain == null} note="no evidence graph" />
        <Factor label="STRUCT. PRECURSOR" metricKey="sps"        value={sps != null ? Number(sps).toFixed(2) : null} withheld={sps == null} note="N<5" />

        {/* Emission derivation — every operand printed above; product = the score metricsengine emitted. */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: DIM, marginBottom: 4 }}>
            DECISION EMISSION (multiplicative — a weak leg craters it)
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BRT, lineHeight: 1.7 }}>
            {signal?.value?.toFixed(2)} <span style={{ color: DIM }}>signal</span> ×{' '}
            {validity?.value?.toFixed(2)} <span style={{ color: DIM }}>validity</span> ×{' '}
            {convergence?.value?.toFixed(2)} <span style={{ color: DIM }}>conv</span> ×{' '}
            {avgGnd.toFixed(2)} <span style={{ color: DIM }}>grounded</span>{' '}
            <span style={{ color: LIME }}>= {decisionEmissionScore}</span>
          </div>
        </div>
      </div>
    </details>
  );
}
