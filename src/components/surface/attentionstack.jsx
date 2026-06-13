// attentionstack.jsx — SAB Visual Bifurcation Strategy: Attention Stack
// Ranked Kalshi market signals. Hierarchy-driven focus. What matters, now.
import React, { useState } from 'react';
import { useKalshiSignals } from '../../hooks/usekalshisignals.js';

const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.35)';
const MID  = 'rgba(255,255,255,0.65)';

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
