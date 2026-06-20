// src/components/surfacedashboard.jsx
// TEMPLATE — all layout constants locked at top. Center slot is the only interchangeable section.

import React, { useState, useEffect } from 'react';

// ── LAYOUT CONSTANTS (measured from reference) ─────────────────────────────
const LAYOUT = {
  navWidth:        76,
  topBarHeight:    44,
  rightPanelWidth: 315,
  bottomBarHeight: 150,
};

const BORDER  = '1px solid rgba(255,255,255,0.08)';
const DIVIDER = '1px solid rgba(255,255,255,0.05)';
const NAV_BG  = 'rgba(0,0,0,0.8)';
const NAV_BLUR = 'blur(12px)';
const MONO    = 'IBM Plex Mono, monospace';
const BEBAS   = "'Bebas Neue', sans-serif";

// ── NAV ITEMS ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'surface',  label: 'SURFACE',  icon: <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><line x1="9" y1="2" x2="9" y2="0"/><line x1="9" y1="18" x2="9" y2="16"/><line x1="2" y1="9" x2="0" y2="9"/><line x1="18" y1="9" x2="16" y2="9"/></svg> },
  { id: 'oracle',   label: 'ORACLE',   icon: <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="9" cy="9" rx="8" ry="5"/><circle cx="9" cy="9" r="2"/></svg> },
  { id: 'feed',     label: 'FEED',     icon: <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="5" x2="16" y2="5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13" x2="11" y2="13"/></svg> },
  { id: 'analysis', label: 'ANALYSIS', icon: <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5"/><line x1="12" y1="12" x2="16" y2="16"/></svg> },
  { id: 'history',  label: 'HISTORY',  icon: <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7"/><polyline points="9,5 9,9 12,11"/></svg> },
];

const SETTINGS_ICON = (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="9" r="3"/>
    <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4"/>
  </svg>
);

// ── MOCK DATA (replace with live props when ready) ─────────────────────────
const METRICS = [
  { label: 'ACTIVE POSITIONS', value: '4014', delta: '+04 vs last update' },
  { label: 'IN ANALYSIS',      value: '028',  delta: '-2 vs last update'  },
  { label: 'PROCESSING',       value: '009',  delta: '-1 vs last update'  },
  { label: 'POST',             value: '443',  delta: '+00 vs last update' },
];

const TELEMETRY = [
  { label: 'SYSTEM TELEMETRY',  value: 'All systems operational', color: '#66FF00' },
  { label: 'ORACLE NETWORK',    value: 'Online',   color: '#66FF00' },
  { label: 'VECTOR DB',         value: 'Synced',   color: '#66FF00' },
  { label: 'DATA STREAMS',      value: '12 Active', color: '#ffffff' },
  { label: 'LATENCY',           value: '42ms',     color: '#ffffff' },
  { label: 'CONFIDENCE INDEX',  value: '0.78',     color: '#ffffff' },
  { label: 'DATA INTEGRITY',    value: '━━━━',     color: '#66FF00' },
];

// ── SPARKLINE PATHS (static — replace with live data when ready) ───────────
const SPARKLINES = [
  '0,7 10,5 20,8 30,3 40,6 50,4 60,2',
  '0,5 10,7 20,4 30,8 40,5 50,7 60,6',
  '0,8 10,6 20,7 30,4 40,5 50,3 60,4',
  '0,4 10,6 20,5 30,7 40,4 50,6 60,7',
];

// ── SYSTEM CLOCK ───────────────────────────────────────────────────────────
function SystemClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', color: '#ffffff' }}>
      SYSTEM TIME <strong style={{ letterSpacing: '0.05em' }}>{time}</strong> EST
    </span>
  );
}

// ── SURFACE DASHBOARD ──────────────────────────────────────────────────────
// children = interchangeable center slot only. Everything else is constant.
export default function SurfaceDashboard({ activeNav = 'surface', onNav, onBack, onNext, feedSignals = [], children }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#000000', display: 'flex', fontFamily: MONO }}>

      {/* ── LEFT NAV — full height, constant ─────────────────────── */}
      <nav style={{
        width: LAYOUT.navWidth, flexShrink: 0,
        background: NAV_BG, backdropFilter: NAV_BLUR, WebkitBackdropFilter: NAV_BLUR,
        borderRight: BORDER,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 24, paddingBottom: 24, boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
          {NAV_ITEMS.map(item => {
            const active = activeNav === item.id;
            return (
              <div key={item.id} onClick={() => onNav?.(item.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 0', width: '100%', cursor: 'pointer',
                color: active ? '#66FF00' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s',
                borderLeft: active ? '2px solid #66FF00' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                {item.icon}
                <span style={{ fontSize: 7, letterSpacing: '0.12em' }}>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div onClick={() => onNav?.('settings')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          padding: '10px 0', width: '100%', cursor: 'pointer',
          color: activeNav === 'settings' ? '#66FF00' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = activeNav === 'settings' ? '#66FF00' : 'rgba(255,255,255,0.3)'}>
          {SETTINGS_ICON}
          <span style={{ fontSize: 7, letterSpacing: '0.12em' }}>SETTINGS</span>
        </div>
      </nav>

      {/* ── RIGHT COLUMN — top bar + center row + bottom bar ─────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP BAR */}
        <div style={{
          height: LAYOUT.topBarHeight, flexShrink: 0,
          borderBottom: BORDER,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 0 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: BEBAS, fontSize: 16, color: '#ffffff', letterSpacing: '0.08em' }}>krylo</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>|</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>SIGNAL / INTELLIGENCE</span>
          </div>
          <SystemClock />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.15em', color: '#66FF00', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#66FF00', display: 'inline-block' }} />
              LIVE
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>SEUCHEMENS</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', userSelect: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >A / B</span>
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" style={{ cursor: 'pointer' }}
              onClick={() => window.dispatchEvent(new CustomEvent('krylo-disk-click'))}
              onMouseEnter={e => e.currentTarget.setAttribute('stroke','rgba(255,255,255,0.7)')}
              onMouseLeave={e => e.currentTarget.setAttribute('stroke','rgba(255,255,255,0.3)')}>
              <path d="M3 2h9l3 3v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
              <rect x="6" y="2" width="4" height="4"/>
              <rect x="5" y="10" width="8" height="5" rx="0.5"/>
            </svg>
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <circle cx="9" cy="9" r="3"/>
              <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4"/>
            </svg>
          </div>
        </div>

        {/* CENTER ROW — interchangeable slot + right panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── CENTER SLOT — only section that changes ────────── */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {children}
            <div style={{ position: 'absolute', bottom: 16, right: 20, zIndex: 20, display: 'flex', gap: 14, pointerEvents: 'auto' }}>
              <span onClick={onBack} style={{ fontFamily: BEBAS, fontSize: 18, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>←</span>
              <span onClick={onNext} style={{ fontFamily: BEBAS, fontSize: 18, color: onNext ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', cursor: onNext ? 'pointer' : 'default', userSelect: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => { if (onNext) e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={e => { if (onNext) e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}>→</span>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: LAYOUT.rightPanelWidth, flexShrink: 0, borderLeft: BORDER, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: DIVIDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>LIVE CONVERGENCE FEED</span>
              <span style={{ fontSize: 8, letterSpacing: '0.12em', color: '#66FF00' }}>● LIVE</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {feedSignals.slice(0, 20).map((sig, i) => (
                <div key={sig.id ?? i} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: 0, animation: 'krylo-fade-in 0.3s ease forwards', animationDelay: `${i * 60}ms` }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 3 }}>
                    {(sig.source ?? 'SIGNAL').toUpperCase()} · FS {((sig.fs ?? 0) * 100).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sig.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: DIVIDER, borderBottom: DIVIDER }}>
              <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>VIEW ALL FEED EVENTS →</span>
            </div>
            <div style={{ padding: '14px' }}>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}>PRESSURE VECTOR</span>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR — 3 sections, constant */}
        <div style={{ height: LAYOUT.bottomBarHeight, flexShrink: 0, borderTop: BORDER, display: 'flex', flexDirection: 'column' }}>

          {/* Section 1 — labels */}
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: DIVIDER }}>
            {METRICS.map((m, i) => (
              <div key={i} style={{ flex: 1, padding: '4px 16px', borderRight: DIVIDER, fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)' }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Section 2 — values + sparklines + deltas */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {METRICS.map((m, i) => (
              <div key={i} style={{ flex: 1, padding: '4px 16px', borderRight: DIVIDER, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: BEBAS, fontSize: 30, color: '#66FF00', lineHeight: 1 }}>{m.value}</div>
                <svg width="60" height="10" viewBox="0 0 60 10" style={{ display: 'block' }}>
                  <polyline points={SPARKLINES[i]} fill="none" stroke="#66FF00" strokeWidth="1" opacity="0.4" />
                </svg>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>{m.delta}</div>
              </div>
            ))}
          </div>

          {/* Section 3 — telemetry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, padding: '12px 16px', borderTop: DIVIDER, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)' }}>
            {TELEMETRY.map((t, i) => (
              <span key={i}>{t.label} <span style={{ color: t.color }}>{t.value}</span></span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
