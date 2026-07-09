// KRYL-1011 — Causal Impact Map view. Renders a subject's downstream blast radius
// from buildImpactMap() / toImpactViewModel(). Build-to-spec: existing KRYLO panel
// conventions (mono, lime accent, hairline-on-black), no originated design.
// Presentational only — all logic lives in the engine + the pure view-model.
import React, { useMemo } from 'react';
import { toTopologyNodeId } from '../../engine/entityresolution.js';
import { buildImpactMap, toImpactViewModel } from '../../engine/causalimpactmap.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.35)';
const HAIR = 'rgba(255,255,255,0.08)';

export default function CausalImpactView({ subject, maxDepth = 5 }) {
  const vm = useMemo(() => {
    if (!subject) return null;
    return toImpactViewModel(buildImpactMap(toTopologyNodeId(subject), { maxDepth }));
  }, [subject, maxDepth]);

  if (!vm) return null;

  return (
    <div style={{ fontFamily: MONO, background: '#000', padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase' }}>
          {vm.subject}
        </span>
        <span style={{ fontSize: 8, letterSpacing: '0.2em', color: DIM, textTransform: 'uppercase' }}>
          CAUSAL IMPACT · {vm.reached} DOWNSTREAM
        </span>
      </div>

      {vm.empty && (
        <div style={{ fontSize: 9, letterSpacing: '0.06em', color: DIM }}>
          No downstream impact recorded.
        </div>
      )}

      {vm.levels.map(level => (
        <div key={level.depth} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 7, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 6 }}>
            HOP {level.depth}
          </div>
          {level.edges.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, padding: '3px 0', borderBottom: `1px solid ${HAIR}` }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{e.from}</span>
              <span style={{ color: e.grounded ? LIME : DIM, letterSpacing: '0.06em' }}>—[{e.type}]→</span>
              <span style={{ color: '#fff' }}>{e.to}</span>
              {!e.grounded && (
                <span style={{ fontSize: 6, letterSpacing: '0.18em', color: DIM, border: `1px solid rgba(255,255,255,0.15)`, padding: '1px 4px', marginLeft: 'auto' }}>
                  TENTATIVE
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {vm.truncated && (
        <div style={{ fontSize: 7, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
          … more downstream (depth capped)
        </div>
      )}
    </div>
  );
}
