// KRYL-2101 — WhyTrace Panel: on-screen structural provenance for the queried entity.
//
// Closes the Loop #10 rendering gap: buildWhyTrace (KRYL-980) existed but was never mounted, so
// provenance never reached the user. This panel is a render-only sink over resolveWhyTrace — the
// engine decides (match / withhold / absence), React only draws. Absence renders as a classified
// §22 state, never a blank or a fabricated trace.

import React, { useMemo } from 'react';
import { getCanonicalEvents } from '../../engine/connectors/edgar8kevidence.js';
import { resolveWhyTrace, WT_STATE } from '../../engine/whytraceresolver.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const HAIR = '1px solid rgba(255,255,255,0.06)';
const DIM  = 'rgba(255,255,255,0.35)';
const MID  = 'rgba(255,255,255,0.55)';

function Metric({ k, v }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: DIM }}>{k}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, color: LIME, fontWeight: 600, marginTop: 2 }}>{v}</div>
    </div>
  );
}

export default function WhyTracePanel({ entity }) {
  const res = useMemo(() => resolveWhyTrace(entity, getCanonicalEvents()), [entity]);

  if (res.state === WT_STATE.NO_QUERY) return null;

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.3em', color: LIME }}>WHY · STRUCTURAL PROVENANCE</span>
      <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: DIM }}>{res.entity}</span>
    </div>
  );

  // §22 — absence / withhold is a stated state, not a hidden one.
  if (res.state !== WT_STATE.RESOLVED) {
    const tag = res.state === WT_STATE.TRACE_ERROR ? 'TRACE WITHHELD' : 'STRUCTURAL ABSENCE';
    return (
      <div style={{ flexShrink: 0, borderTop: HAIR, padding: '14px 24px' }}>
        {header}
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: DIM, marginTop: 8, lineHeight: 1.5 }}>
          {tag} — {res.reason}
        </div>
      </div>
    );
  }

  const { sci, lineage, dynamics, trace_edges } = res.trace;
  const pct = (x) => (typeof x === 'number' ? `${Math.round(x <= 1 ? x * 100 : x)}%` : '—');

  return (
    <div style={{ flexShrink: 0, borderTop: HAIR, padding: '14px 24px' }}>
      {header}

      <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
        <Metric k="STRUCTURAL CONFIRMATION" v={pct(sci.score)} />
        <Metric k="GROUNDEDNESS" v={pct(sci.groundedness)} />
        <Metric k="EVIDENCE TYPES" v={sci.coveredTypes?.length ?? 0} />
        <Metric k="LINEAGE EVENTS" v={lineage?.length ?? 0} />
      </div>

      {Array.isArray(trace_edges) && trace_edges.length > 0 && (
        <div style={{ marginTop: 10, borderTop: HAIR, paddingTop: 8 }}>
          {trace_edges.map((e, i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: MID, marginBottom: 2 }}>
              {e.from} <span style={{ color: DIM }}>→ {e.relation} →</span> {e.to}
            </div>
          ))}
        </div>
      )}

      {dynamics?.truthLifecycle && (
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: DIM, marginTop: 8 }}>
          LIFECYCLE · {dynamics.truthLifecycle}
          {typeof dynamics.stabilityVelocity === 'number' ? ` · Δstability ${dynamics.stabilityVelocity.toFixed(2)}` : ''}
        </div>
      )}
    </div>
  );
}
