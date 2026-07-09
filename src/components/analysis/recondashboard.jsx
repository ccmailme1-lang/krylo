// WO-2007.4 — Recon Dashboard
// Read-only surface for Signal Candidate Packages, blind spots, active hypotheses.
// No write access to any production system.

import React, { useState, useEffect, useMemo } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { useHappyPathEngine } from '../../engine/happypathdisplacementengine.js';
import { synthesizeQuery } from '../../engine/querysynthesis.js';
import { run as runRecon, toReconViewModel } from '../../engine/reconlayer.js';
import { getRankedSCPs, getReconStats } from '../../engine/scpstore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const BLUE = '#007FFF';
const DIM  = 'rgba(255,255,255,0.30)';
const BRT  = 'rgba(255,255,255,0.85)';
const BORDER = 'rgba(255,255,255,0.06)';

const VALIDITY_COLOR = { IDENTIFIABLE: LIME, CONFOUNDED: '#FF4444', UNRESOLVED: BLUE };

export default function ReconDashboard() {
  const activeSessionId = useAnalysisStore(s => s.activeSessionId);
  const sessions        = useAnalysisStore(s => s.sessions);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const { engineState } = useHappyPathEngine();

  const synthesis = useMemo(() => session ? synthesizeQuery(session) : null, [session]);

  const [result,   setResult]   = useState(null);
  const [scps,     setScps]     = useState([]);
  const [stats,    setStats]    = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!engineState?.domainStates) return;
    const r = runRecon(engineState.domainStates, synthesis);
    setResult(r);
    setScps(getRankedSCPs());
    setStats(r.stats);
  }, [engineState?.domainStates, synthesis]);

  // Group the candidate flurry into digestible clusters (§21 display-only aggregation):
  // N candidates sharing a hypothesis collapse to one cluster, differentiated by source.
  const grouped = useMemo(() => toReconViewModel(scps), [scps]);

  return (
    <div style={{ background: '#000', fontFamily: MONO, padding: '16px 20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}>
        <span style={{ color: BRT, fontSize: 10, letterSpacing: '0.22em' }}>SIGNAL RECON LAYER</span>
        {stats && (
          <span style={{ color: DIM, fontSize: 8, letterSpacing: '0.10em' }}>
            {stats.total}/{stats.capacity} · {stats.byValidity.IDENTIFIABLE}I · {stats.byValidity.UNRESOLVED}U · {stats.byValidity.CONFOUNDED}C
          </span>
        )}
      </div>

      {/* Blind Spots */}
      {result?.blindSpots?.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ color: DIM, fontSize: 8, letterSpacing: '0.18em', marginBottom: 8 }}>BLIND SPOTS</div>
          {result.blindSpots.slice(0, 4).map((bs, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: LIME, fontSize: 9, letterSpacing: '0.10em' }}>{bs.domain}{bs.counterDomain ? ` / ${bs.counterDomain}` : ''}</span>
                <span style={{ color: DIM, fontSize: 7 }}>{Math.round(bs.priority * 100)}% PRIORITY</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8, marginTop: 2, lineHeight: 1.5 }}>{bs.gap}</div>
            </div>
          ))}
        </section>
      )}

      {/* Signal Candidates */}
      <section>
        <div style={{ color: DIM, fontSize: 8, letterSpacing: '0.18em', marginBottom: 8 }}>SIGNAL CANDIDATES</div>

        {scps.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8 }}>No candidates above threshold</div>
        )}

        {grouped.groups.map((group, gi) => (
          <div key={gi} style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            {/* Cluster header: the shared question + how many sources + one shared status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: BRT, fontSize: 9, lineHeight: 1.4 }}>{group.question}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ color: DIM, fontSize: 8 }}>{group.count} SRC</span>
                <span style={{ color: group.allValidity ? (VALIDITY_COLOR[group.allValidity] ?? DIM) : DIM, fontSize: 8, letterSpacing: '0.10em' }}>
                  {group.allValidity ?? 'MIXED'}
                </span>
              </div>
            </div>

            {/* The real differentiator: top upstream sources, ranked by exploration score */}
            <div style={{ marginTop: 6 }}>
              {group.top.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0 2px 10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>▸ {t.source}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ color: DIM, fontSize: 7 }}>obs {t.observability}</span>
                    <span style={{ color: LIME, fontSize: 8, fontWeight: 600 }}>{t.score}</span>
                  </div>
                </div>
              ))}
              {group.moreCount > 0 && (
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 7, padding: '2px 0 0 10px' }}>
                  … +{group.moreCount} more{group.allValidity ? ` (all ${group.allValidity.toLowerCase()} — no signal history yet)` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Watermark */}
      <div style={{ color: 'rgba(255,255,255,0.07)', fontSize: 7, letterSpacing: '0.14em', marginTop: 24, textAlign: 'center' }}>
        EXPLORATORY · CANDIDATE_ONLY · NO PRODUCTION WRITES
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ color: DIM, fontSize: 7, letterSpacing: '0.12em', minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: color ?? 'rgba(255,255,255,0.55)', fontSize: 7, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}
