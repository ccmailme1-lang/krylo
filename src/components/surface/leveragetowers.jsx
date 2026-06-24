// leveragetowers.jsx — WO-1718A Phase 1: Stable Towers
// SVG renderer. All formulas locked per SAB spec. No audio. No shaders.
import React, { useState, useEffect, useRef } from 'react';
import { useKalshiSignals } from '../../hooks/usekalshisignals.js';

const LIME   = '#66FF00';
const DOMAINS = ['FINANCIAL', 'MARKET', 'HOME', 'TECHNOLOGY', 'HEALTH', 'SIGNAL'];

// ── Tower State Registry ─────────────────────────────────────────────────────
function getPotentialState(norm) {
  if (norm >= 0.67) return 'POTENTIAL_HIGH';
  if (norm >= 0.33) return 'POTENTIAL_MEDIUM';
  return 'POTENTIAL_LOW';
}
function getFrictionState(score, prev = 'FRICTION_ALIGNED') {
  // Hysteresis ±0.02 on boundaries 0.25 and 0.75
  const lo = prev === 'FRICTION_DRIFTING' || prev === 'FRICTION_HIGH' ? 0.23 : 0.27;
  const hi = prev === 'FRICTION_HIGH' ? 0.73 : 0.77;
  if (score >= hi) return 'FRICTION_HIGH';
  if (score >= lo) return 'FRICTION_DRIFTING';
  return 'FRICTION_ALIGNED';
}
function getVolatilityState(score) {
  if (score >= 0.67) return 'VOLATILITY_HIGH';
  if (score >= 0.33) return 'VOLATILITY_MEDIUM';
  return 'VOLATILITY_LOW';
}

// ── Locked formulas ──────────────────────────────────────────────────────────
function frictionToWaist(f) {
  const pts = [[0,1.00],[0.25,0.92],[0.50,0.78],[0.75,0.60],[1.00,0.40]];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) {
      const t = (f - pts[i-1][0]) / (pts[i][0] - pts[i-1][0]);
      return pts[i-1][1] + t * (pts[i][1] - pts[i-1][1]);
    }
  }
  return 0.40;
}

function volToDeform(v) {
  const pts = [[0,0],[0.25,1],[0.50,3],[0.75,6],[1.00,10]];
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) {
      const t = (v - pts[i-1][0]) / (pts[i][0] - pts[i-1][0]);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      return pts[i-1][1] + ease * (pts[i][1] - pts[i-1][1]);
    }
  }
  return 10;
}

// Log easing — presentation layer only. Backend contract stays linear.
function logEase(norm) {
  return Math.log10(1 + 9 * norm);
}

// EMA — 3s half-life
const EMA_ALPHA = 1 - Math.pow(2, -0.1 / 3.0); // per 100ms tick ≈ 0.023

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// ── Volatility score from Kalshi volatility field ────────────────────────────
function volScore(v) {
  if (v === 'HIGH') return 0.85;
  if (v === 'MED')  return 0.50;
  return 0.15;
}

// ── Tower SVG path with pinched waist ────────────────────────────────────────
function towerPath(cx, baseY, height, towerW, waistPct, deformX) {
  if (height < 2) return '';
  const topY   = baseY - height;
  const midY   = baseY - height * 0.5;
  const hw     = towerW / 2;
  const waistH = (towerW * waistPct) / 2;
  const dx     = deformX; // horizontal deformation at waist

  // Cubic bezier hourglass: smooth pinch at midpoint
  return [
    `M ${cx - hw} ${baseY}`,
    `C ${cx - hw} ${midY} ${cx - waistH + dx} ${midY} ${cx - waistH + dx} ${midY}`,
    `C ${cx - waistH + dx} ${midY} ${cx - hw} ${topY} ${cx - hw} ${topY}`,
    `L ${cx + hw} ${topY}`,
    `C ${cx + hw} ${topY} ${cx + waistH + dx} ${midY} ${cx + waistH + dx} ${midY}`,
    `C ${cx + waistH + dx} ${midY} ${cx + hw} ${baseY} ${cx + hw} ${baseY}`,
    'Z',
  ].join(' ');
}

// ── Single tower ─────────────────────────────────────────────────────────────
function Tower({ domain, signal, friction, volatility, isActive, onClick }) {
  const MAX_H   = 200;
  const TOWER_W = 30;
  const BASE_Y  = 240;
  const cx      = TOWER_W / 2 + 8;

  // EMA-smoothed height
  const emaRef        = useRef(0);
  const [dispH, setDispH] = useState(0);

  // Volatility deformation — moves toward target, never random
  const deformTargetRef = useRef(0);
  const [deformX, setDeformX] = useState(0);

  // Friction state with hysteresis
  const frictionStateRef = useRef('FRICTION_ALIGNED');

  useEffect(() => {
    const rawNorm = clamp01(signal / 100);
    const f       = clamp01(friction);
    const v       = clamp01(volatility);

    // EMA on height
    const target  = logEase(rawNorm) * MAX_H;
    emaRef.current = emaRef.current + EMA_ALPHA * (target - emaRef.current);
    setDispH(emaRef.current);

    // Deformation target (updated every 2s in parent, eased here)
    const newDeform = (Math.random() > 0.5 ? 1 : -1) * volToDeform(v);
    deformTargetRef.current = newDeform;

    // Hysteresis friction state
    frictionStateRef.current = getFrictionState(f, frictionStateRef.current);
  });

  // Deform eases toward target every frame (not randomized)
  const deformRef = useRef(0);
  useEffect(() => {
    let raf;
    function ease() {
      deformRef.current += 0.05 * (deformTargetRef.current - deformRef.current);
      setDeformX(deformRef.current);
      raf = requestAnimationFrame(ease);
    }
    raf = requestAnimationFrame(ease);
    return () => cancelAnimationFrame(raf);
  }, []);

  const signalNorm   = clamp01(signal / 100);
  const f            = clamp01(friction);
  const waistPct     = frictionToWaist(f);
  const crownOpacity = clamp01(signalNorm * f);
  const potState     = getPotentialState(signalNorm);

  const towerColor =
    potState === 'POTENTIAL_HIGH'   ? LIME :
    potState === 'POTENTIAL_MEDIUM' ? 'rgba(102,255,0,0.55)' :
                                      'rgba(102,255,0,0.18)';

  const path = towerPath(cx, BASE_Y, dispH, TOWER_W, waistPct, deformX);

  const SVG_H = 268;
  const SVG_W = cx * 2 + 4;

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      <svg width={SVG_W} height={SVG_H} style={{ overflow: 'visible' }}>
        <defs>
          <filter id={`crown-${domain}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Tower body */}
        {path && (
          <path
            d={path}
            fill={towerColor}
            opacity={isActive ? 1 : 0.75}
            style={{ transition: 'opacity 200ms' }}
          />
        )}

        {/* Crown bloom */}
        {crownOpacity > 0.05 && dispH > 10 && (
          <ellipse
            cx={cx}
            cy={BASE_Y - dispH}
            rx={TOWER_W * 0.7}
            ry={TOWER_W * 0.25}
            fill={LIME}
            opacity={crownOpacity * 0.6}
            filter={`url(#crown-${domain})`}
          />
        )}

        {/* Signal label inside tower */}
        {dispH > 30 && (
          <text
            x={cx}
            y={BASE_Y - dispH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(0,0,0,0.85)"
            fontSize={9}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="600"
            letterSpacing="0.05em"
          >
            {signal}
          </text>
        )}
      </svg>

      {/* Domain label */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.18em',
        color: isActive ? LIME : 'rgba(255,255,255,0.4)',
        marginTop: 4,
        textAlign: 'center',
        transition: 'color 200ms',
      }}>
        {domain.slice(0, 6)}
      </div>

      {/* State indicator */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 6,
        letterSpacing: '0.1em',
        color: frictionStateRef.current === 'FRICTION_HIGH' ? '#ff4444' :
               frictionStateRef.current === 'FRICTION_DRIFTING' ? '#ffaa00' :
               'rgba(102,255,0,0.5)',
        marginTop: 2,
      }}>
        {frictionStateRef.current === 'FRICTION_HIGH' ? 'HIGH ⊥' :
         frictionStateRef.current === 'FRICTION_DRIFTING' ? 'DRIFT ~' : 'ALIGNED ↑'}
      </div>
    </div>
  );
}

// ── Leverage Towers container ─────────────────────────────────────────────────
export default function LeverageTowers({ selectedDomain, onDomainClick }) {
  const { signals } = useKalshiSignals();

  // Build domain → signal map
  const sigMap = {};
  for (const s of signals) {
    const d = s.domain?.toUpperCase();
    if (!sigMap[d] || s.oi > (sigMap[d]?.oi ?? 0)) sigMap[d] = s;
  }

  // Volatility deform target refreshes every 2s per spec
  const [deformTick, setDeformTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDeformTick(n => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      alignItems: 'flex-end',
      padding: '0 12px 8px',
      background: 'rgba(0,0,0,0)',
    }}>
      {DOMAINS.map(domain => {
        const s   = sigMap[domain];
        const sig = s?.signal ?? 0;
        const f   = s?.volatility === 'HIGH' ? 0.85 : s?.volatility === 'MED' ? 0.45 : 0.12;
        const v   = volScore(s?.volatility);
        return (
          <Tower
            key={domain}
            domain={domain}
            signal={sig}
            friction={f}
            volatility={v}
            isActive={selectedDomain?.toUpperCase() === domain}
            onClick={() => onDomainClick?.(domain.toLowerCase())}
          />
        );
      })}
    </div>
  );
}
