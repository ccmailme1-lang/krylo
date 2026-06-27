// WO-2007.4 — Recon Dashboard
// Read-only surface for Signal Candidate Packages, blind spots, active hypotheses.
// No write access to any production system.

import React, { useState, useEffect, useMemo } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { useHappyPathEngine } from '../../engine/happypathdisplacementengine.js';
import { synthesizeQuery } from '../../engine/querysynthesis.js';
import { run as runRecon } from '../../engine/reconlayer.js';
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

        {scps.map(scp => (
          <div
            key={scp.id}
            style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === scp.id ? null : scp.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: BRT, fontSize: 9, letterSpacing: '0.06em' }}>{scp.id}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: VALIDITY_COLOR[scp.causal_validity] ?? DIM, fontSize: 8, letterSpacing: '0.10em' }}>
                  {scp.causal_validity}
                </span>
                <span style={{ color: LIME, fontSize: 9, fontWeight: 600 }}>
                  {(scp.exploration_score * 100).toFixed(0)}
                </span>
              </div>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8, marginTop: 3, lineHeight: 1.5 }}>
              {scp.hypothesis}
            </div>

            {expanded === scp.id && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderLeft: `2px solid ${VALIDITY_COLOR[scp.causal_validity] ?? DIM}` }}>
                <Row label="TARGET"    value={scp.target_signal} />
                <Row label="GAP"       value={scp.observed_gap} />
                <Row label="LEAD"      value={scp.expected_lead_time} />
                <Row label="SOURCE"    value={scp.candidate_upstream_sources.join(', ')} />
                <Row label="RECOMMEND" value={scp.recommendation} />
                {scp.genealogy_chain?.length > 0 && (
                  <Row label="GENEALOGY" value={scp.genealogy_chain.join(' → ')} />
                )}
                {scp.outcome_lag_distribution && (
                  <Row label="LAG DIST"  value={`p25:${scp.outcome_lag_distribution.p25}d p50:${scp.outcome_lag_distribution.p50}d p75:${scp.outcome_lag_distribution.p75}d n:${scp.outcome_lag_distribution.n}`} />
                )}
                <Row label="STATUS"    value={scp.status} color={LIME} />
              </div>
            )}
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
