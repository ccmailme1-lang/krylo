import React, { useState } from "react";
import { BAY_MAP } from "../../engine/cones.js";
import { useBayStore } from "../../store/usebaystore.js";

const MODES   = ['metrics', 'graphics', 'alerts', 'color'];
const PALETTE = ['#66FF00', '#007FFF', '#8A2BE2'];
const MONO    = "'IBM Plex Mono', monospace";
const LIME    = '#66FF00';
const DIM     = 'rgba(255,255,255,0.22)';
const MID     = 'rgba(255,255,255,0.50)';
const BRT     = 'rgba(255,255,255,0.85)';

const domains = [
  { id: "C01", name: "FINANCIAL",  type: "CAPITAL"      },
  { id: "C02", name: "OPERATING",  type: "EXECUTION"    },
  { id: "C03", name: "TIME",       type: "TEMPORAL"     },
  { id: "C04", name: "PERSONAL",   type: "IDENTITY"     },
  { id: "C05", name: "MARKET",     type: "SIGNAL"       },
  { id: "C06", name: "KNOWLEDGE",  type: "INTELLIGENCE" },
];

/* ── CORNER RETICLES ─────────────────────────────────────────────────────── */
function Reticles({ color = 'rgba(255,255,255,0.25)', size = 7, thickness = 1 }) {
  const s = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const h = { position: 'absolute', background: color, height: thickness };
  const v = { position: 'absolute', background: color, width: thickness };
  return (
    <>
      {/* TL */}
      <div style={{ ...s, top: 0, left: 0 }}>
        <div style={{ ...h, top: 0, left: 0, width: size }} />
        <div style={{ ...v, top: 0, left: 0, height: size }} />
      </div>
      {/* TR */}
      <div style={{ ...s, top: 0, right: 0 }}>
        <div style={{ ...h, top: 0, right: 0, width: size }} />
        <div style={{ ...v, top: 0, right: 0, height: size }} />
      </div>
      {/* BL */}
      <div style={{ ...s, bottom: 0, left: 0 }}>
        <div style={{ ...h, bottom: 0, left: 0, width: size }} />
        <div style={{ ...v, bottom: 0, left: 0, height: size }} />
      </div>
      {/* BR */}
      <div style={{ ...s, bottom: 0, right: 0 }}>
        <div style={{ ...h, bottom: 0, right: 0, width: size }} />
        <div style={{ ...v, bottom: 0, right: 0, height: size }} />
      </div>
    </>
  );
}

/* ── RESONANCE WAVEFORM ──────────────────────────────────────────────────── */
function Wave({ color }) {
  return (
    <svg viewBox="0 0 600 80" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      {/* Primary resonance path */}
      <path
        d="M0,40 C50,6 100,74 150,40 C200,6 250,74 300,40 C350,6 400,74 450,40 C500,6 550,74 600,40"
        stroke={color} strokeWidth="2" fill="none" opacity="1"
      />
      {/* Secondary crossing path */}
      <path
        d="M0,40 C50,72 100,8 150,40 C200,72 250,8 300,40 C350,72 400,8 450,40 C500,72 550,8 600,40"
        stroke={color} strokeWidth="1" fill="none" opacity="0.45"
      />
      {/* Baseline */}
      <line x1="0" y1="40" x2="600" y2="40" stroke={color} strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

/* ── ALERTS MODE ─────────────────────────────────────────────────────────── */
function AlertsMode({ isPremium }) {
  const [input,   setInput]   = useState('');
  const [trigger, setTrigger] = useState(null);

  if (!isPremium) {
    return (
      <div style={{ position: 'relative', height: 28, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ filter: 'blur(2px)', pointerEvents: 'none', padding: '6px 10px', fontFamily: MONO, fontSize: 7, color: DIM }}>
          when signal exceeds...
        </div>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.80)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.2em' }}>ALERTS</span>
          <span style={{
            fontFamily: MONO, fontSize: 6, color: LIME,
            border: '1px solid rgba(102,255,0,0.35)', padding: '2px 8px',
            letterSpacing: '0.18em', cursor: 'pointer',
          }}>UPGRADE</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 28, borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
      {trigger ? (
        <>
          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.1em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ● {trigger}
          </span>
          <button onClick={e => { e.stopPropagation(); setTrigger(null); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,60,60,0.7)', fontFamily: MONO, fontSize: 6, cursor: 'pointer', letterSpacing: '0.12em' }}>
            CLEAR
          </button>
        </>
      ) : (
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { e.stopPropagation(); setTrigger(input.trim()); setInput(''); }}}
          onClick={e => e.stopPropagation()}
          placeholder="when signal exceeds..."
          style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.12)', outline: 'none', color: MID, fontFamily: MONO, fontSize: 7, letterSpacing: '0.06em' }}
        />
      )}
    </div>
  );
}

/* ── CONSOLE MODULE ──────────────────────────────────────────────────────── */
function Module({ d, cone, assignment, isPremium = false }) {
  const [modeIdx,       setModeIdx]       = useState(0);
  const [velMetric,     setVelMetric]     = useState('VALUE');
  const [colorOverride, setColorOverride] = useState(null);

  const baseColor = cone?.color ?? LIME;
  const color     = colorOverride ?? baseColor;
  const pct       = Math.round((cone?.value ?? 0) * 100);
  const mainLabel = assignment?.title ?? d.name;
  const subLabel  = assignment?.title ? d.name : d.type;
  const mode      = MODES[modeIdx];
  const isLoaded  = !!assignment;

  const velocity = (() => {
    const t = cone?.trend;
    if (!t || t.length < 2) return '—';
    return (t[t.length - 1] - t[t.length - 2]).toFixed(3);
  })();

  const cycle = (dir, e) => {
    e.stopPropagation();
    setModeIdx(i => (i + dir + MODES.length) % MODES.length);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: 112,
      background: '#000',
      border: `0.5px solid ${isLoaded ? 'rgba(102,255,0,0.18)' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Corner reticles */}
      <Reticles color={isLoaded ? 'rgba(102,255,0,0.4)' : 'rgba(255,255,255,0.2)'} />

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 10px 4px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.22em' }}>{d.id}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: isLoaded ? color : MID, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {mainLabel}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{subLabel}</span>
      </div>

      {/* ── WAVEFORM + MODE SELECTOR ── */}
      <div style={{ flex: 1, position: 'relative', padding: '2px 8px', minHeight: 0, height: 38 }}>
        <div style={{ width: '100%', height: '100%' }}>
          <Wave color={isLoaded ? color : 'rgba(255,255,255,0.18)'} />
        </div>
        {/* Mode selector — top right */}
        <div style={{ position: 'absolute', top: 3, right: 10, display: 'flex', alignItems: 'center', gap: 3, zIndex: 2 }}>
          <button onClick={e => cycle(-1, e)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: MONO, fontSize: 8, padding: 0, lineHeight: 1 }}>←</button>
          <span style={{ fontFamily: MONO, fontSize: 5, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{mode}</span>
          <button onClick={e => cycle(1, e)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: MONO, fontSize: 8, padding: 0, lineHeight: 1 }}>→</button>
        </div>
      </div>

      {/* ── MODE CONTENT ── */}
      {mode === 'metrics' && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          padding: '4px 10px', gap: '1px 0',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {[
            ['VAL', cone?.value ?? '—'],
            ['TRD', cone?.trend?.length ?? 0],
            ['ALT', cone?.alerts?.length ?? 0],
            ['MIN', cone?.trend?.length ? Math.min(...cone.trend) : '—'],
            ['MAX', cone?.trend?.length ? Math.max(...cone.trend) : '—'],
            ['PCT', `${pct}%`],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: 6, color: lbl === 'ALT' && cone?.alerts?.length ? LIME : DIM, letterSpacing: '0.14em' }}>{lbl}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: BRT, letterSpacing: '0.04em' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {mode === 'graphics' && (
        <div style={{ height: 28, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.2em' }}>VEL</span>
          <select value={velMetric} onChange={e => setVelMetric(e.target.value)} onClick={e => e.stopPropagation()}
            style={{ background: '#000', border: '0.5px solid rgba(255,255,255,0.12)', color: MID, fontFamily: MONO, fontSize: 6, outline: 'none', padding: '1px 3px', letterSpacing: '0.1em' }}>
            <option value="VALUE">VALUE</option>
            <option value="TREND">TREND</option>
            <option value="ALERTS">ALERTS</option>
          </select>
          <span style={{ fontFamily: MONO, fontSize: 9, color, marginLeft: 'auto', letterSpacing: '0.06em' }}>{velocity}</span>
        </div>
      )}

      {mode === 'alerts' && <AlertsMode isPremium={isPremium} />}

      {mode === 'color' && (
        <div style={{ height: 28, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', flexShrink: 0 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={e => { e.stopPropagation(); setColorOverride(colorOverride === c ? null : c); }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: colorOverride === c ? '1.5px solid #fff' : '1.5px solid transparent', opacity: colorOverride === c ? 1 : 0.4, cursor: 'pointer', padding: 0 }} />
          ))}
          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, marginLeft: 'auto', letterSpacing: '0.14em' }}>{colorOverride ?? 'AUTO'}</span>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {/* Signal cluster circle */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `1px solid ${isLoaded ? color : 'rgba(255,255,255,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: MONO, fontSize: 6, color: isLoaded ? color : DIM,
        }}>{pct}%</div>
        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.2em' }}>{d.id} · SYNCED</span>
      </div>
    </div>
  );
}

/* ── DASHBOARD ───────────────────────────────────────────────────────────── */
export default function ConsoleDashboard({ cones = {}, isPremium = false }) {
  const bays = useBayStore(s => s.bays);

  return (
    <div style={{ width: '100%', background: '#000', padding: '3px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 3 }}>
        {domains.map(d => {
          const bayNum     = Number(d.id.slice(1));
          const assignment = bays[bayNum]?.assignment;
          return (
            <Module
              key={d.id}
              d={d}
              cone={cones[BAY_MAP[d.id]]}
              assignment={assignment}
              isPremium={isPremium}
            />
          );
        })}
      </div>
    </div>
  );
}
