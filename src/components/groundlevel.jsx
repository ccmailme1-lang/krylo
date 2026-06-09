// src/components/groundlevel.jsx
// WO-264 — Dashboard components: ArcGauge, DonutRing, GapKPI,
//           VelocityBars, SegmentBars, DecayBar
// WO-288 — onReset prop: ← RETURN TO SIGNAL

import React from 'react';

/* ── Helpers ─────────────────────────────────────────────── */
function clamp(n, lo = 0, hi = 100) { return Math.min(hi, Math.max(lo, n ?? 0)); }

/* ── ArcGauge ────────────────────────────────────────────── */
function ArcGauge({ label, value }) {
  const pct  = clamp(value);
  const r    = 28;
  const circ = Math.PI * r; // half-circle
  const dash = (pct / 100) * circ;

  return (
    <div style={{ textAlign: 'center', flex: '1 1 80px' }}>
      <svg width="80" height="48" viewBox="0 0 80 48">
        <path
          d="M 8 44 A 32 32 0 0 1 72 44"
          fill="none" stroke="#E0E0E0" strokeWidth="6" strokeLinecap="round"
        />
        <path
          d="M 8 44 A 32 32 0 0 1 72 44"
          fill="none" stroke="#66FF00" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
        <text x="40" y="42" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono" fill="#1A1A1A">
          {pct}
        </text>
      </svg>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

/* ── DonutRing ───────────────────────────────────────────── */
function DonutRing({ label, value }) {
  const pct  = clamp(value);
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ textAlign: 'center', flex: '1 1 72px' }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#E0E0E0" strokeWidth="8" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="#66FF00" strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="36" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono" fill="#1A1A1A">
          {pct}
        </text>
      </svg>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

/* ── GapKPI ──────────────────────────────────────────────── */
function GapKPI({ label, value }) {
  const pct = clamp(value);
  return (
    <div style={{ flex: '1 1 100px', fontFamily: 'IBM Plex Mono' }}>
      <div style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', color: '#1A1A1A', lineHeight: 1 }}>{pct}<span style={{ fontSize: '0.8rem', color: '#999' }}>%</span></div>
      <div style={{ marginTop: '6px', height: '4px', background: '#E0E0E0', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#66FF00', borderRadius: '2px', transition: 'width 600ms ease' }} />
      </div>
    </div>
  );
}

/* ── VelocityBars ────────────────────────────────────────── */
function VelocityBars({ label, value }) {
  const pct  = clamp(value);
  const bars = 8;
  const lit  = Math.round((pct / 100) * bars);

  return (
    <div style={{ flex: '1 1 100px', fontFamily: 'IBM Plex Mono' }}>
      <div style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '28px' }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${40 + i * 8}%`,
              background: i < lit ? '#66FF00' : '#E0E0E0',
              borderRadius: '1px',
              transition: 'background 300ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── SegmentBars ─────────────────────────────────────────── */
function SegmentBars({ label, value }) {
  const pct      = clamp(value);
  const segments = 10;
  const lit      = Math.round((pct / 100) * segments);

  return (
    <div style={{ flex: '1 1 100%', fontFamily: 'IBM Plex Mono' }}>
      <div style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '3px' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '8px',
              background: i < lit ? '#66FF00' : '#E0E0E0',
              borderRadius: '1px',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── DecayBar ────────────────────────────────────────────── */
function DecayBar({ label, value }) {
  const pct = clamp(value);
  const hue = Math.round((pct / 100) * 80); // green → yellow as it decays

  return (
    <div style={{ flex: '1 1 100%', fontFamily: 'IBM Plex Mono' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '0.6rem', color: '#999' }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: '#E0E0E0', borderRadius: '3px' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `hsl(${hue}, 100%, 50%)`,
            borderRadius: '3px',
            transition: 'width 600ms ease, background 600ms ease',
          }}
        />
      </div>
    </div>
  );
}

/* ── GroundLevel ─────────────────────────────────────────── */
export default function GroundLevel({ ground, tags, onReset }) {
  if (!ground) return null;

  const trust      = clamp(ground.trust      ?? ground.fs_score       ?? 50);
  const accuracy   = clamp(ground.accuracy   ?? ground.m_checksum     ?? 50);
  const gap        = clamp(ground.gap        ?? ground.e_viral        ?? 50);
  const velocity   = clamp(ground.velocity   ?? ground.t_telemetry    ?? 50);
  const expiration = clamp(ground.expiration ?? ground.expiration_score ?? 50);
  const strength   = clamp(ground.strength   ?? ground.signal_count   ?? 50);
  const alignment  = clamp(ground.alignment  ?? ground.convergence    ?? 50);

  return (
    <div style={{ padding: '24px', background: '#6a6c7a', minHeight: '100%', fontFamily: 'IBM Plex Mono' }}>

      {/* WO-288 — Return trigger */}
      <div
        onClick={onReset}
        style={{
          fontFamily:    'IBM Plex Mono',
          color:         '#1A1A1A',
          fontSize:      '0.7rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor:        'pointer',
          marginBottom:  '24px',
          opacity:       0.6,
        }}
      >
        ← RETURN TO SIGNAL
      </div>

      {/* Row 1 — Arcs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <ArcGauge   label="Trust"    value={trust} />
        <ArcGauge   label="Accuracy" value={accuracy} />
        <DonutRing  label="Align"    value={alignment} />
      </div>

      {/* Row 2 — KPIs */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <GapKPI      label="Gap"      value={gap} />
        <VelocityBars label="Velocity" value={velocity} />
      </div>

      {/* Row 3 — Full-width bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <SegmentBars label="Strength"   value={strength} />
        <DecayBar    label="Expiration" value={expiration} />
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {tags.map(t => (
            <span
              key={t}
              style={{
                fontFamily:    'IBM Plex Mono',
                fontSize:      '0.65rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                border:        '1px solid #1A1A1A',
                borderRadius:  '2px',
                padding:       '2px 8px',
                color:         '#1A1A1A',
                opacity:       0.6,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
