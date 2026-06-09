// WO-1706 — Option Capital
// Chevron toggles expand/collapse. No checkbox.

import React, { useState, useEffect, useRef } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const LIME  = '#66FF00';
const RED   = '#FF3300';
const STORE = 'krylo_option_capital';

function load() {
  try { return JSON.parse(localStorage.getItem(STORE) ?? 'null'); } catch { return null; }
}

function persist(data) {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}

function NumInput({ value, onChange, placeholder, step = 500 }) {
  const adj = (dir) => {
    const cur = parseFloat(value) || 0;
    const next = Math.max(0, cur + dir * step);
    onChange({ target: { value: String(next) } });
  };
  return (
    <div style={{ display: 'flex', width: '100%', boxSizing: 'border-box' }}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        style={{
          flex: 1, minWidth: 0, boxSizing: 'border-box',
          background: '#050505', border: '1px solid rgba(255,255,255,0.08)',
          borderRight: 'none',
          color: 'rgba(255,255,255,0.8)', fontFamily: MONO, fontSize: 11,
          padding: '8px 10px', outline: 'none', letterSpacing: '0.04em',
        }}
      />
      <div style={{
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[1, -1].map(dir => (
          <button
            key={dir}
            type="button"
            onMouseDown={e => { e.preventDefault(); adj(dir); }}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: dir === 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
              padding: '0 7px', fontSize: 7, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {dir === 1 ? '▲' : '▼'}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OptionCapital({ capital = null, resetTrigger = 0 }) {
  const [burn,         setBurn]        = useState('');
  const [capOverride,  setCapOverride] = useState('');
  const [expanded,     setExpanded]    = useState(false);
  const [sessionStart, setSessionStart]= useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    const stored = load();
    if (!stored) return;
    if (stored.burn != null)        setBurn(String(stored.burn));
    if (stored.capOverride != null) setCapOverride(String(stored.capOverride));
    if (stored.runway != null)      setSessionStart(stored.runway);
  }, []);

  useEffect(() => {
    if (resetTrigger === 0) return;
    clearTimeout(saveTimer.current);
    localStorage.removeItem(STORE);
    setBurn('');
    setCapOverride('');
    setExpanded(false);
    setSessionStart(null);
  }, [resetTrigger]);

  const effectiveCap = parseFloat(capOverride) || 0;
  const burnN        = parseFloat(burn) || 0;
  const runway       = effectiveCap > 0 && burnN > 0 ? effectiveCap / burnN : null;
  const delta        = runway != null && sessionStart != null ? runway - sessionStart : null;

  useEffect(() => {
    if (runway == null) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ burn: burnN, capOverride: capOverride ? parseFloat(capOverride) : null, runway });
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [runway, burnN, capOverride]);

  const color = runway == null
    ? 'rgba(255,255,255,0.18)'
    : runway >= 6 ? LIME
    : runway < 3  ? RED
    : 'rgba(255,255,255,0.75)';

  const arrow      = delta == null ? '' : delta >= 0 ? ' ↑' : ' ↓';
  const deltaStr   = delta == null ? '' : (delta >= 0 ? '+' : '-') + Math.abs(delta).toFixed(1);
  const deltaColor = delta == null ? 'transparent' : delta >= 0 ? LIME : RED;
  const noData     = runway == null;

  return (
    <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 24px 12px' }}>

      {/* Header row — label left, chevron right */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
          OPTION CAPITAL
        </span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, userSelect: 'none' }}>
          {expanded ? '▴' : '▾'}
        </span>
      </div>

      {/* Expanded — metric + inputs inline */}
      {expanded && (
        <>
          {/* Metric */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
            {noData ? (
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(102,255,0,0.35)' }}>
                SET BURN RATE
              </span>
            ) : (
              <>
                <span style={{ fontFamily: MONO, color, lineHeight: 1 }}>
                  <span style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{runway.toFixed(1)}</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', marginLeft: 4 }}>mo</span>
                </span>
                {delta != null && (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: deltaColor, letterSpacing: '0.04em' }}>
                    {arrow}&nbsp;{deltaStr}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Inputs */}
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 14 }}>
            {!noData && (
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', marginBottom: 14 }}>
                ${effectiveCap.toLocaleString()} / ${burnN.toLocaleString()} mo
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 4 }}>
                LIQUID CAPITAL ($)
              </div>
              <NumInput
                value={capOverride}
                placeholder={capital ? String(capital) : '47000'}
                onChange={e => setCapOverride(e.target.value)}
                step={1000}
              />
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 4 }}>
                MONTHLY BURN ($)
              </div>
              <NumInput
                value={burn}
                placeholder="3200"
                onChange={e => setBurn(e.target.value)}
                step={100}
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
