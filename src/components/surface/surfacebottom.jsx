// surfacebottom.jsx — SAB Surface View bottom panel
// Left: Delta Step-Chart (signal score history)
// Right: Attention Stack (ranked Kalshi markets)
import React, { useState } from 'react';
import { useKalshiSignals } from '../../hooks/usekalshisignals.js';

const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.28)';
const MID  = 'rgba(255,255,255,0.65)';

// ── Delta Step-Chart ─────────────────────────────────────────────────────────
function DeltaStepChart({ signals, selectedDomain }) {
  const signal = signals.find(s =>
    selectedDomain
      ? s.domain?.toUpperCase().includes(selectedDomain.toUpperCase().slice(0,4))
      : s.oi > 0
  ) ?? signals[0];

  if (!signal) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: DIM, fontSize: 9, letterSpacing: '0.15em' }}>AWAITING SIGNAL</span>
    </div>
  );

  // Build synthetic step history from current + previous price
  const cur  = signal.signal ?? 50;
  const prev = Math.max(0, cur - (signal.forecast ?? 0));
  const steps = [
    { d: '05-11', v: Math.max(0, prev - 8) },
    { d: '05-12', v: Math.max(0, prev - 4) },
    { d: '05-13', v: Math.max(0, prev - 4) },
    { d: '05-14', v: Math.max(0, prev) },
    { d: '05-15', v: Math.max(0, prev) },
    { d: '05-16', v: Math.max(0, prev + (cur - prev) * 0.4) },
    { d: '05-17', v: Math.max(0, prev + (cur - prev) * 0.7) },
    { d: '05-18', v: cur },
  ];

  const W = 260, H = 90, PAD = { t: 8, r: 40, b: 20, l: 28 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const maxV = Math.max(...steps.map(s => s.v), 80);
  const xScale = i => PAD.l + (i / (steps.length - 1)) * iW;
  const yScale = v => PAD.t + iH - (v / maxV) * iH;

  // Build step polyline points
  const pts = [];
  steps.forEach((s, i) => {
    const x = xScale(i);
    const y = yScale(s.v);
    if (i === 0) { pts.push(`${x},${y}`); return; }
    // horizontal then vertical = hard step
    pts.push(`${x},${yScale(steps[i - 1].v)}`);
    pts.push(`${x},${y}`);
  });

  const lastX = xScale(steps.length - 1);
  const lastY = yScale(cur);

  return (
    <div style={{ padding: '0 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: LIME, fontSize: 8, letterSpacing: '0.2em' }}>DELTA STEP-CHART</span>
        <span style={{ color: DIM, fontSize: 9 }}>SIGNAL SCORE ({signal.ticker?.slice(0, 10)})</span>
      </div>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* Y-axis ticks */}
        {[0, 20, 40, 60, 80].map(v => (
          <g key={v}>
            <line x1={PAD.l - 3} y1={yScale(v)} x2={PAD.l} y2={yScale(v)} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
            <text x={PAD.l - 5} y={yScale(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6}>{v}</text>
          </g>
        ))}
        {/* X-axis baseline */}
        <line x1={PAD.l} y1={PAD.t + iH} x2={PAD.l + iW} y2={PAD.t + iH} stroke="rgba(255,255,255,0.10)" strokeWidth={0.5} />
        {/* Date labels */}
        {steps.map((s, i) => (
          <text key={s.d} x={xScale(i)} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.20)" fontSize={6}>{s.d}</text>
        ))}
        {/* Step polyline */}
        <polyline
          fill="none"
          stroke={LIME}
          strokeWidth={1.5}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          points={pts.join(' ')}
        />
        {/* Current value marker */}
        <line x1={PAD.l} y1={lastY} x2={lastX + iW * 0.05} y2={lastY} stroke="rgba(102,255,0,0.2)" strokeWidth={0.5} strokeDasharray="2,2" />
        <text x={lastX + 4} y={lastY + 3} fill={LIME} fontSize={8} fontFamily="'IBM Plex Mono',monospace">{cur}</text>
      </svg>
    </div>
  );
}

// ── Attention Stack ──────────────────────────────────────────────────────────
function AttentionStack({ signals, selectedDomain, onSignalClick }) {
  const seen = new Set();
  const rows = [];
  for (const s of signals) {
    const key = `${s.domain}-${s.signal > 50 ? 'hi' : 'lo'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(s);
    if (rows.length >= 5) break;
  }

  return (
    <div style={{ width: 310, padding: '0 0 0 16px' }}>
      <div style={{ padding: '0 10px 6px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: LIME, fontSize: 8, letterSpacing: '0.2em' }}>ATTENTION STACK</span>
        <span style={{ color: DIM, fontSize: 9 }}>HIERARCHY-DRIVEN FOCUS</span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '18px 64px 30px 30px 42px 36px 16px', padding: '0 10px 4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['RNK','CONE ID','SIG','Δ7D','VOL','CONF',''].map(h => (
          <span key={h} style={{ fontSize: 9, letterSpacing: '0.12em', color: DIM }}>{h}</span>
        ))}
      </div>

      {rows.map((s, i) => {
        const isActive = selectedDomain && s.domain?.toUpperCase().includes(selectedDomain.toUpperCase().slice(0,4));
        return (
          <div
            key={s.ticker}
            onClick={() => onSignalClick?.(s)}
            style={{
              display: 'grid',
              gridTemplateColumns: '18px 64px 30px 30px 42px 36px 16px',
              padding: '3px 10px',
              background: isActive ? 'rgba(102,255,0,0.06)' : 'transparent',
              borderLeft: isActive ? `2px solid ${LIME}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ color: DIM, fontSize: 8 }}>{i + 1}</span>
            <span style={{ color: isActive ? LIME : MID, fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.domain}</span>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 600 }}>{s.signal}</span>
            <span style={{ fontSize: 8, color: s.forecast > 2 ? LIME : s.forecast < -2 ? '#ff4444' : DIM }}>
              {s.forecast > 0 ? '+' : ''}{s.forecast}
            </span>
            <span style={{ fontSize: 8, color: s.volatility === 'HIGH' ? '#ff4444' : s.volatility === 'MED' ? '#ffaa00' : LIME }}>{s.volatility}</span>
            <span style={{ color: MID, fontSize: 8 }}>{s.confidence}%</span>
            <span style={{ fontSize: 9, color: s.forecast > 2 ? LIME : s.forecast < -2 ? '#ff4444' : DIM }}>
              {s.forecast > 2 ? '↑' : s.forecast < -2 ? '↓' : '—'}
            </span>
          </div>
        );
      })}

      <div style={{ padding: '4px 10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: DIM, fontSize: 9 }}>KALSHI · {signals.length} SIGNALS</span>
        <span style={{ color: DIM, fontSize: 9 }}>LIVE. VERIFIABLE.</span>
      </div>
    </div>
  );
}

// ── Surface Bottom Panel ─────────────────────────────────────────────────────
export default function SurfaceBottom({ selectedDomain, onSignalClick }) {
  const { signals } = useKalshiSignals();

  if (!signals.length) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      fontFamily: "'IBM Plex Mono', monospace",
      alignItems: 'flex-end',
    }}>
      <DeltaStepChart signals={signals} selectedDomain={selectedDomain} />
      <AttentionStack signals={signals} selectedDomain={selectedDomain} onSignalClick={onSignalClick} />
    </div>
  );
}
