import React, { useState, useEffect, useRef, useCallback } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const LIME  = '#66FF00';
const STORE = 'krylo_intent_magnitude';

function load()        { try { return JSON.parse(localStorage.getItem(STORE) ?? 'null'); } catch { return null; } }
function persist(data) { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {} }

const TIERS = [
  { max: 25,  capital: 500,    burn: 150,   capitalLabel: 'UNDER $1K',    horizon: 'NOW',   volatility: 'LOW',      meaning: 'EXPLORATORY'    },
  { max: 50,  capital: 5000,   burn: 833,   capitalLabel: '$1K – $10K',   horizon: 'SHORT', volatility: 'LOW-MED',  meaning: 'OPEN · LEANING'  },
  { max: 75,  capital: 50000,  burn: 4167,  capitalLabel: '$10K – $100K', horizon: 'MED',   volatility: 'MEDIUM',   meaning: 'FOCUSED'         },
  { max: 101, capital: 150000, burn: 12500, capitalLabel: '$100K+',        horizon: 'LONG',  volatility: 'HIGH',     meaning: 'HIGH CONVICTION' },
];
function getTier(m) { return TIERS.find(t => m < t.max) ?? TIERS[TIERS.length - 1]; }

// SVG chart constants
const CX = 22, CY = 8, CW = 88, CH = 52; // chart area origin + size in viewBox units

function chartX(v) { return CX + (v / 100) * CW; }
function chartY(v) { return CY + CH - (v / 100) * CH; } // y-inverted

export default function OptionCapital({ resetTrigger = 0, onIntentChange, resolvedThreshold = null, closestResolved = null, resolveScore = null }) {
  const [value,    setValue]    = useState(50);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    const stored = load();
    if (stored?.intentMagnitude != null) setValue(stored.intentMagnitude);
  }, []);

  useEffect(() => {
    if (resetTrigger === 0) return;
    localStorage.removeItem(STORE);
    setValue(50);
  }, [resetTrigger]);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist({ intentMagnitude: value }), 1500);
    return () => clearTimeout(saveTimer.current);
  }, [value]);

  const updateFromX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    setValue(next);
    onIntentChange?.(next);
  }, [onIntentChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => updateFromX(e.clientX);
    const onUp   = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, updateFromX]);

  const tier = getTier(value);
  const dotX = chartX(value);
  const dotY = chartY(value);

  // Tick marks for axes
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px 16px', userSelect: 'none' }}>

      {/* Header */}
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 10 }}>
        INTENT STRENGTH MAPPING
      </div>

      {/* SVG Chart */}
      <svg viewBox="0 0 120 75" style={{ width: '100%', display: 'block', marginBottom: 10 }}>
        {/* Grid lines */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={chartX(t)} y1={CY} x2={chartX(t)} y2={CY + CH} stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
            <line x1={CX} y1={chartY(t)} x2={CX + CW} y2={chartY(t)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
          </g>
        ))}

        {/* Axes */}
        <line x1={CX} y1={CY} x2={CX} y2={CY + CH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <line x1={CX} y1={CY + CH} x2={CX + CW} y2={CY + CH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

        {/* Axis labels */}
        {[0, 50, 100].map(t => (
          <g key={t}>
            <text x={chartX(t)} y={CY + CH + 6} textAnchor="middle" fontFamily={MONO} fontSize="4" fill="rgba(255,255,255,0.2)">{t}</text>
            <text x={CX - 3} y={chartY(t) + 1.5} textAnchor="end" fontFamily={MONO} fontSize="4" fill="rgba(255,255,255,0.2)">{t}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={CX + CW / 2} y={75} textAnchor="middle" fontFamily={MONO} fontSize="3.5" fill="rgba(255,255,255,0.15)">RAW INTENT SIGNAL →</text>
        <text x={CX - 14} y={CY + CH / 2} textAnchor="middle" fontFamily={MONO} fontSize="3.5" fill="rgba(255,255,255,0.15)" transform={`rotate(-90, ${CX - 14}, ${CY + CH / 2})`}>DOMAIN MAP %</text>

        {/* Mapping slope (dashed diagonal) */}
        <line x1={chartX(0)} y1={chartY(0)} x2={chartX(100)} y2={chartY(100)}
          stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeDasharray="2 1.5" />

        {/* Current target vertical line */}
        <line x1={dotX} y1={CY} x2={dotX} y2={CY + CH}
          stroke="rgba(102,255,0,0.5)" strokeWidth="0.7" />

        {/* Projection crosshair (read-only, derived from slider) */}
        <line x1={dotX - 3} y1={dotY} x2={dotX + 3} y2={dotY} stroke={LIME} strokeWidth="0.8" />
        <line x1={dotX} y1={dotY - 3} x2={dotX} y2={dotY + 3} stroke={LIME} strokeWidth="0.8" />
        <circle cx={dotX} cy={dotY} r="2.5" fill="none" stroke={LIME} strokeWidth="0.7" />
        {/* HUD counter — floats at crosshair, flips anchor near right edge */}
        <text
          x={value > 80 ? dotX - 3 : dotX + 3}
          y={dotY - 4}
          textAnchor={value > 80 ? 'end' : 'start'}
          fontFamily={MONO} fontSize="4.5"
          fill={LIME} letterSpacing="-0.02em"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >{value}</text>
        <text x={value > 80 ? dotX - 3 : dotX + 3} y={dotY - 4 + 4.5} textAnchor={value > 80 ? 'end' : 'start'} fontFamily={MONO} fontSize="2.8" fill="rgba(102,255,0,0.4)" letterSpacing="0.1em">PROJECTION</text>
      </svg>

      {/* Derived values table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, fontFamily: MONO, fontSize: 7, letterSpacing: '0.08em', marginBottom: 14, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'STATUS',     val: tier.meaning },
          { label: 'ENVELOPE', val: tier.capitalLabel },
          { label: 'HORIZON',    val: tier.horizon },
          { label: 'VOLATILITY', val: tier.volatility },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 6, letterSpacing: '0.2em' }}>{label}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* TARGET slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>TARGET</span>
        <div ref={trackRef} onMouseDown={e => { e.preventDefault(); setDragging(true); updateFromX(e.clientX); }}
          style={{ flex: 1, position: 'relative', height: 1, background: 'rgba(255,255,255,0.12)', cursor: 'pointer' }}>
          <div style={{ position: 'absolute', left: 0, width: `${value}%`, height: '100%', background: 'rgba(102,255,0,0.4)' }} />
          <div style={{ position: 'absolute', left: `${value}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, background: LIME, cursor: dragging ? 'grabbing' : 'grab' }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: LIME, letterSpacing: '0.06em', flexShrink: 0, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>{value}</span>
      </div>

      {/* Bay engine resolved output */}
      {resolvedThreshold != null && (
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: resolveScore != null && resolveScore < 0.60 ? 'rgba(102,255,0,0.35)' : 'rgba(102,255,0,0.55)' }}>
          ↓ RESOLVED AT {resolvedThreshold}
          {closestResolved != null && (
            <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>(REQUESTED {closestResolved})</span>
          )}
        </div>
      )}

    </div>
  );
}
