// attentionstack.jsx — SAB Visual Bifurcation Strategy: Attention Stack
// Ranked Kalshi market signals. Hierarchy-driven focus. What matters, now.
// WO-1726: Weak Signal Detection — sub-threshold signals surfaced below main stack.
// WO-1734: Non-Consensus Layer — NC classification strip (read-only telemetry).
import React, { useState } from 'react';
import { useKalshiSignals } from '../../hooks/usekalshisignals.js';
import { detectWeakSignals } from '../../engine/weaksignaldetector.js';
import { analyzeNonConsensus } from '../../engine/nonconsensusdetector.js';

const LIME  = '#66FF00';
const DIM   = 'rgba(255,255,255,0.35)';
const MID   = 'rgba(255,255,255,0.65)';
const WEAK  = 'rgba(255,255,255,0.22)';   // sub-threshold label color
const SLATE = 'rgba(58,61,74,0.90)';      // muted_slate per CLAUDE.md color semantics

function TrendArrow({ forecast }) {
  if (forecast > 2)  return <span style={{ color: LIME }}>↑</span>;
  if (forecast < -2) return <span style={{ color: '#ff4444' }}>↓</span>;
  return <span style={{ color: DIM }}>—</span>;
}

function VolBadge({ volatility }) {
  const color = volatility === 'HIGH' ? '#ff4444' : volatility === 'MED' ? '#ffaa00' : LIME;
  return <span style={{ color, fontSize: 8 }}>{volatility}</span>;
}

export default function AttentionStack({ maxRows = 8, onSignalClick }) {
  const { signals, loading, lastFetch } = useKalshiSignals('ALL');
  const [expanded, setExpanded] = useState(false);

  // WO-1726 — WEAK-tier read-only telemetry
  const { weakSignals, emergingSignals } = detectWeakSignals(signals);
  const emergingDomains = new Set(emergingSignals.map(s => s.domain));

  // WO-1734 — NC-tier read-only telemetry (no classification logic here)
  const nc = analyzeNonConsensus(emergingSignals, signals);

  // Top signals by OI, skip duplicates by domain+direction
  const seen = new Set();
  const rows = [];
  for (const s of signals) {
    const key = `${s.domain}-${s.signal > 50 ? 'yes' : 'no'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(s);
    if (rows.length >= (expanded ? 20 : maxRows)) break;
  }

  const displayRows = rows.slice(0, expanded ? 20 : maxRows);
  const age = lastFetch ? Math.round((Date.now() - lastFetch) / 1000) : null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 340,
      background: 'rgba(0,0,0,0.82)',
      border: '1px solid rgba(102,255,0,0.15)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      fontFamily: "'IBM Plex Mono', monospace",
      userSelect: 'none',
    }}>

      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 10px',
          borderBottom: '1px solid rgba(102,255,0,0.10)',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: LIME, fontSize: 8, letterSpacing: '0.2em' }}>
          ATTENTION STACK
        </span>
        <span style={{ color: DIM, fontSize: 7 }}>
          {loading ? 'LOADING…' : age !== null ? `${age}s AGO` : ''}
          {' '}{expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '20px 60px 36px 36px 52px 40px 20px',
        gap: 0, padding: '4px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {['RNK','SIGNAL','S','Δ','VOL','CONF',''].map(h => (
          <span key={h} style={{ fontSize: 7, letterSpacing: '0.15em', color: DIM }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      {displayRows.map((s, i) => (
        <div
          key={s.ticker}
          onClick={() => onSignalClick?.(s)}
          style={{
            display: 'grid',
            gridTemplateColumns: '20px 60px 36px 36px 52px 40px 20px',
            gap: 0,
            padding: '4px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            cursor: onSignalClick ? 'pointer' : 'default',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(102,255,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ color: DIM, fontSize: 8 }}>{i + 1}</span>
          <span style={{ color: MID, fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.domain}
          </span>
          <span style={{ color: '#ffffff', fontSize: 9, fontWeight: 600 }}>{s.signal}</span>
          <span style={{
            fontSize: 8,
            color: s.forecast > 2 ? LIME : s.forecast < -2 ? '#ff4444' : DIM
          }}>
            {s.forecast > 0 ? '+' : ''}{s.forecast}
          </span>
          <VolBadge volatility={s.volatility} />
          <span style={{ color: MID, fontSize: 8 }}>{s.confidence}%</span>
          <TrendArrow forecast={s.forecast} />
        </div>
      ))}

      {/* WO-1726 Phase A/B — Weak Signals (cross-domain alert lives in WO-1734 NC layer) */}
      {weakSignals.length > 0 && (
        <div>
          <div style={{
            padding: '4px 10px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: WEAK, fontSize: 7, letterSpacing: '0.18em' }}>
              WEAK SIGNALS · {weakSignals.length}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>PRESSURE &lt; 20</span>
          </div>
          {weakSignals.slice(0, 4).map(s => {
            const isEmerging = emergingDomains.has(s.domain);
            return (
              <div
                key={`weak-${s.ticker ?? s.domain}`}
                onClick={() => onSignalClick?.(s)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 60px 36px 1fr 50px',
                  gap: 0,
                  padding: '3px 10px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  opacity: 0.55,
                  cursor: onSignalClick ? 'pointer' : 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.80'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
              >
                <span style={{ color: SLATE, fontSize: 7 }}>·</span>
                <span style={{ color: WEAK, fontSize: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.domain}
                </span>
                <span style={{ color: WEAK, fontSize: 8 }}>{s.signal}</span>
                <span style={{ color: WEAK, fontSize: 6 }}>
                  {s.slope > 0 ? `+${s.slope.toFixed(1)}/r` : s.slope < 0 ? `${s.slope.toFixed(1)}/r` : '—'}
                </span>
                {isEmerging && (
                  <span style={{ color: LIME, fontSize: 6, letterSpacing: '0.1em' }}>↗ EMERGING</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* WO-1734 — NC Classification Strip */}
      {(nc.classification !== 'AMBIGUOUS' || nc.crossDomainEmergenceDetected) && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '5px 10px',
          background: nc.classification === 'DIVERGING'
            ? 'rgba(102,255,0,0.04)'
            : nc.consensusArriving
              ? 'rgba(0,127,255,0.05)'
              : 'transparent',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 7, letterSpacing: '0.18em',
              color: nc.classification === 'DIVERGING' ? LIME
                   : nc.consensusArriving ? '#007FFF'
                   : WEAK,
            }}>
              {nc.classification === 'DIVERGING' && '◈ NON-CONSENSUS WINDOW'}
              {nc.classification === 'CONVERGING' && nc.consensusArriving && '◈ CONSENSUS FORMING'}
              {nc.crossDomainEmergenceDetected && nc.classification === 'AMBIGUOUS' && '◈ CROSS-DOMAIN EMERGENCE'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              K {nc.knowledgeAlignment} · C {nc.capitalAlignment} · Δ{nc.consensusDelta > 0 ? '+' : ''}{nc.consensusDelta}
            </span>
          </div>
          {nc.classification === 'DIVERGING' && nc.gapOpenMs > 0 && (
            <span style={{ color: WEAK, fontSize: 6 }}>
              CONVICTION WINDOW OPEN {Math.round(nc.gapOpenMs / 1000)}s · POP {Math.round(nc.populationAgreement * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Footer — market source */}
      <div style={{
        padding: '4px 10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: DIM, fontSize: 7, letterSpacing: '0.1em' }}>
          KALSHI MARKETS · {signals.length} SIGNALS
        </span>
        <span style={{ color: DIM, fontSize: 7 }}>LIVE. VERIFIABLE.</span>
      </div>
    </div>
  );
}
