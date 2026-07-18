// perceptionrisk.jsx — KRYL-1008 Perception Risk (surface components, NOT a composite index).
// RENDER-ONLY. Surfaces the perception-risk signals KRYLO ALREADY computes as ONE VIEW, each as a
// SEPARATE visible component. It deliberately does NOT compute a "Perception Risk Index":
//   §18 — components always visible, no single scalar that masks which leg is broken.
//   §23 — several of these inputs respond to the same latent variable; bundling them would inflate.
//   §22 — a signal with no source on this surface renders WITHHELD, never 0 (absence ≠ null).
// Inputs are read straight from what the Brief already computes (metrics.sci, computeTruthDynamics).
import React from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const BLUE = '#007FFF';
const DIM  = 'rgba(255,255,255,0.30)';
const BRT  = 'rgba(255,255,255,0.85)';

// A single risk-component row: label · value (or WITHHELD) · optional groundedness · one-line meaning.
function RiskRow({ label, value, unit = '', grounded, withheld, meaning }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ flex: '0 0 128px', fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: DIM }}>{label}</span>
      {withheld ? (
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>WITHHELD · {meaning}</span>
      ) : (
        <>
          <span style={{ fontFamily: MONO, fontSize: 11, color: BRT, minWidth: 52 }}>{value}{unit}</span>
          {grounded != null && (
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: grounded >= 0.7 ? LIME : grounded >= 0.4 ? BLUE : DIM }}>
              {Math.round(grounded * 100)}% grounded
            </span>
          )}
          {meaning && <span style={{ fontFamily: MONO, fontSize: 8, color: DIM }}>{meaning}</span>}
        </>
      )}
    </div>
  );
}

// props: metrics (synthesis.metrics), dynamics (computeTruthDynamics output)
export default function PerceptionRisk({ metrics, dynamics }) {
  const sci        = metrics?.sci ?? null;                       // structural confirmation
  const stability  = dynamics?.velocity ?? null;                 // identity stability velocity (number|null)
  const fracture   = dynamics?.field?.fractureDensity ?? null;   // { density, count } structural drift
  const merge      = dynamics?.field?.mergePressure ?? null;     // { pressure } dissonance proxy

  // nothing to show at all → don't render an empty shell
  if (!sci && stability == null && !fracture && !merge) return null;

  const n = v => (typeof v === 'number' ? +v.toFixed(3) : v);

  return (
    <details style={{ margin: '10px 0 14px', border: '1px solid rgba(255,255,255,0.10)', background: '#000' }}>
      <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '9px 12px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: LIME }}>
        PERCEPTION RISK · COMPONENTS
      </summary>
      <div style={{ padding: '4px 12px 10px' }}>
        <RiskRow label="SCI (CONFIRM)"    value={sci != null ? n(sci.score) : null}          grounded={sci?.groundedness}
                 withheld={sci == null} meaning="no evidence graph" />
        <RiskRow label="IDENTITY STABILITY" value={stability != null ? n(stability) : null}
                 withheld={stability == null} meaning="Δstability/window; <2 events" />
        <RiskRow label="STRUCTURAL DRIFT"   value={fracture ? n(fracture.density) : null}
                 withheld={!fracture} meaning={fracture ? `${fracture.count} fracture events` : 'no identity field'} />
        <RiskRow label="DISSONANCE"         value={merge ? n(merge.pressure) : null}
                 withheld={!merge} meaning={merge ? 'merge pressure' : 'no identity field'} />
        <RiskRow label="CONTRADICTIONS"     value={null}
                 withheld meaning="not sourced on this surface" />
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginTop: 8 }}>
          COMPONENTS ONLY — no Perception Risk Index (§18 no masking scalar · §23 non-orthogonal inputs)
        </div>
      </div>
    </details>
  );
}
