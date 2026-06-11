// BayVisor — six independent floating HUD panels
// Posture: COLLAPSED (26px header strip) → EXPANDED (180px full HUD)
// Replaces ConsoleDashboard bar. Same data binding.

import React, { useState } from "react";
import { BAY_MAP } from "../../engine/cones.js";
import { useBayStore, MODULE_TYPES } from "../../store/usebaystore.js";

const MODES   = ['metrics', 'graphics', 'alerts', 'color'];
const PALETTE = ['#66FF00', '#007FFF', '#8A2BE2'];
const MONO    = "'IBM Plex Mono', monospace";
const LIME    = '#66FF00';
const DIM     = 'rgba(255,255,255,0.22)';
const MID     = 'rgba(255,255,255,0.50)';
const BRT     = 'rgba(255,255,255,0.88)';

const COLLAPSED_H = 26;
const EXPANDED_H  = 182;

const domains = [
  { id: "B01", name: "FINANCIAL",  type: "CAPITAL"      },
  { id: "B02", name: "OPERATING",  type: "EXECUTION"    },
  { id: "B03", name: "TIME",       type: "TEMPORAL"     },
  { id: "B04", name: "PERSONAL",   type: "IDENTITY"     },
  { id: "B05", name: "MARKET",     type: "SIGNAL"       },
  { id: "B06", name: "KNOWLEDGE",  type: "INTELLIGENCE" },
];

/* ── CORNER RETICLES ─────────────────────────────────────────────────────── */
function Reticles({ color }) {
  const L = 7;
  const T = 1;
  const corners = [
    { top: 0, left: 0,  borderTop: `${T}px solid ${color}`, borderLeft:  `${T}px solid ${color}` },
    { top: 0, right: 0, borderTop: `${T}px solid ${color}`, borderRight: `${T}px solid ${color}` },
    { bottom: 0, left: 0,  borderBottom: `${T}px solid ${color}`, borderLeft:  `${T}px solid ${color}` },
    { bottom: 0, right: 0, borderBottom: `${T}px solid ${color}`, borderRight: `${T}px solid ${color}` },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div key={i} style={{ position: 'absolute', width: L, height: L, pointerEvents: 'none', ...c }} />
      ))}
    </>
  );
}

/* ── RESONANCE WAVE ──────────────────────────────────────────────────────── */
const WAVE_CSS = `
  @keyframes wave-fwd { from { transform: translateX(0); } to { transform: translateX(-600px); } }
  @keyframes wave-rev { from { transform: translateX(0); } to { transform: translateX(600px);  } }
`;

const P1 = "M0,40 C50,6 100,74 150,40 C200,6 250,74 300,40 C350,6 400,74 450,40 C500,6 550,74 600,40 C650,6 700,74 750,40 C800,6 850,74 900,40 C950,6 1000,74 1050,40 C1100,6 1150,74 1200,40";
const P2 = "M0,40 C50,72 100,8 150,40 C200,72 250,8 300,40 C350,72 400,8 450,40 C500,72 550,8 600,40 C650,72 700,8 750,40 C800,72 850,8 900,40 C950,72 1000,8 1050,40 C1100,72 1150,8 1200,40";

function Wave({ color }) {
  return (
    <>
      <style>{WAVE_CSS}</style>
      <svg viewBox="0 0 600 80" style={{ width: '100%', height: '100%', overflow: 'hidden' }} preserveAspectRatio="none">
        <line x1="0" y1="40" x2="600" y2="40" stroke={color} strokeWidth="0.5" opacity="0.12" />
        <g style={{ animation: 'wave-fwd 4s linear infinite' }}>
          <path d={P1} stroke={color} strokeWidth="2" fill="none" opacity="0.9" />
        </g>
        <g style={{ animation: 'wave-rev 6s linear infinite' }}>
          <path d={P2} stroke={color} strokeWidth="1" fill="none" opacity="0.38" />
        </g>
      </svg>
    </>
  );
}

/* ── ALERTS MODE ─────────────────────────────────────────────────────────── */
function AlertsMode({ isPremium }) {
  const [input,   setInput]   = useState('');
  const [trigger, setTrigger] = useState(null);

  if (!isPremium) {
    return (
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
        <div style={{ filter: 'blur(2px)', fontFamily: MONO, fontSize: 7, color: DIM, pointerEvents: 'none' }}>
          when signal exceeds...
        </div>
        <div style={{
          position: 'absolute', inset: 0, backdropFilter: 'blur(6px)',
          background: 'rgba(0,0,0,0.80)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 10px',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.2em' }}>ALERTS</span>
          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, border: '1px solid rgba(102,255,0,0.35)', padding: '2px 8px', letterSpacing: '0.16em', cursor: 'pointer' }}>
            UPGRADE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
      {trigger ? (
        <>
          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>● {trigger}</span>
          <button onClick={e => { e.stopPropagation(); setTrigger(null); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,60,60,0.7)', fontFamily: MONO, fontSize: 6, cursor: 'pointer', letterSpacing: '0.1em' }}>CLEAR</button>
        </>
      ) : (
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { e.stopPropagation(); setTrigger(input.trim()); setInput(''); }}}
          onClick={e => e.stopPropagation()}
          placeholder="when signal exceeds..."
          style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.12)', outline: 'none', color: MID, fontFamily: MONO, fontSize: 7, letterSpacing: '0.06em' }}
        />
      )}
    </div>
  );
}

/* ── MODULE CONTENT RENDERERS (WO-1713) ──────────────────────────────────── */
function ModuleHeadline({ assignment, d, color }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px', gap: 3 }}>
      <div style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.22em' }}>{d.type}</div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: assignment ? color : DIM, letterSpacing: '0.1em', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {assignment?.title ?? '— NO SIGNAL —'}
      </div>
    </div>
  );
}

function ModuleMetrics({ cone, pct }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', padding: '5px 10px', gap: '2px 0', flex: 1, alignContent: 'center' }}>
      {[
        ['VAL', cone?.value ?? '—'],
        ['TRD', cone?.trend?.length ?? 0],
        ['ALT', cone?.alerts?.length ?? 0],
        ['MIN', cone?.trend?.length ? Math.min(...cone.trend).toFixed(2) : '—'],
        ['MAX', cone?.trend?.length ? Math.max(...cone.trend).toFixed(2) : '—'],
        ['PCT', `${pct}%`],
      ].map(([lbl, val]) => (
        <div key={lbl} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
          <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.14em' }}>{lbl}</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: BRT }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function ModuleSparkline({ cone, color }) {
  const trend = cone?.trend ?? [];
  if (!trend.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.18em' }}>NO TREND DATA</span>
    </div>
  );
  const min = Math.min(...trend), max = Math.max(...trend), range = max - min || 1;
  const W = 120, H = 36;
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '4px 10px' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" opacity="0.85" />
      </svg>
    </div>
  );
}

function ModuleFidelity({ assignment, color }) {
  const fs = assignment?.fs ?? null;
  const pct = fs !== null ? Math.round(fs * 100) : null;
  const tier = pct === null ? '—' : pct >= 85 ? 'VALIDATED' : pct >= 50 ? 'ESTIMATED' : 'LOW FIDELITY';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.18em' }}>FIDELITY</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: pct !== null ? color : DIM }}>{pct !== null ? `${pct}%` : '—'}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
        {pct !== null && <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 1, transition: 'width 400ms ease' }} />}
      </div>
      <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.16em' }}>{tier}</span>
    </div>
  );
}

function ModulePlaceholder({ label }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em' }}>{label} · PENDING</span>
    </div>
  );
}

/* ── BAY PANEL ───────────────────────────────────────────────────────────── */
function BayPanel({ d, cone, assignment, isPremium, isExpanded, onToggle, bayNum }) {
  const [titleHovered, setTitleHovered] = useState(false);

  const coneColorOverrides = useBayStore(s => s.coneColorOverrides ?? {});
  const setConeColor       = useBayStore(s => s.setConeColor ?? (() => {}));
  const activeModule       = useBayStore(s => s.bays[bayNum]?.module ?? 'HEADLINE');
  const setModule          = useBayStore(s => s.setModule);

  const colorOverride = coneColorOverrides[bayNum] ?? null;
  const baseColor     = cone?.color ?? LIME;
  const color         = colorOverride ?? baseColor;
  const pct       = Math.round((cone?.value ?? 0) * 100);
  const mainLabel = assignment?.title ?? d.name;
  const isLoaded  = !!assignment;

  const borderColor = isExpanded
    ? (isLoaded ? 'rgba(102,255,0,0.30)' : 'rgba(255,255,255,0.18)')
    : 'rgba(255,255,255,0.09)';

  const reticleColor = isExpanded
    ? (isLoaded ? 'rgba(102,255,0,0.45)' : 'rgba(255,255,255,0.25)')
    : 'rgba(255,255,255,0.15)';

  return (
    <div style={{
      flex: 1,
      height: isExpanded ? EXPANDED_H : COLLAPSED_H,
      minWidth: 0,
      position: 'relative',
      background: '#000',
      border: `0.5px solid ${borderColor}`,
      overflow: 'hidden',
      transition: 'height 320ms cubic-bezier(0.4,0,0.2,1), border-color 320ms ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Reticles color={reticleColor} />

      {/* ── HEADER (always visible, clickable) ── */}
      <div onClick={onToggle} style={{
        height: COLLAPSED_H,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
        cursor: 'pointer',
        borderBottom: isExpanded ? '0.5px solid rgba(255,255,255,0.07)' : 'none',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: LIME, letterSpacing: '0.22em', flexShrink: 0 }}>{d.id}</span>
        <span
          onMouseEnter={() => setTitleHovered(true)}
          onMouseLeave={() => setTitleHovered(false)}
          style={{ fontFamily: MONO, fontSize: 9, color: titleHovered ? '#ffffff' : (isLoaded ? color : MID), letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0, transition: 'color 150ms ease', cursor: 'pointer' }}>
          {mainLabel}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0 }}>
          {d.type}
        </span>
      </div>

      {/* ── WAVEFORM ── */}
      <div style={{ height: 48, padding: '3px 8px', flexShrink: 0 }}>
        <Wave color={color} />
      </div>


      {/* ── MODULE CONTENT ── */}
      <div style={{ flex: 1, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'stretch' }}>
        {activeModule === 'HEADLINE' && <ModuleHeadline assignment={assignment} d={d} color={color} />}
        {activeModule === 'METRICS'  && <ModuleMetrics  cone={cone} pct={pct} />}
        {activeModule === 'SPARKLINE'&& <ModuleSparkline cone={cone} color={color} />}
        {activeModule === 'FIDELITY' && <ModuleFidelity  assignment={assignment} color={color} />}
        {(activeModule === 'VIDEO' || activeModule === 'AUDIO') && <ModulePlaceholder label={activeModule} />}
      </div>


      {/* ── FOOTER ── */}
      <div style={{
        height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, color: LIME, letterSpacing: '0.04em' }}>{pct}%</span>
        {/* Module selector — replaces legacy mode arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', maxWidth: '60%' }}>
          {MODULE_TYPES.map(m => (
            <button key={m} onClick={e => { e.stopPropagation(); setModule(bayNum, m); }}
              style={{ background: activeModule === m ? 'rgba(102,255,0,0.14)' : 'none', border: `0.5px solid ${activeModule === m ? 'rgba(102,255,0,0.45)' : 'rgba(255,255,255,0.10)'}`, color: activeModule === m ? LIME : DIM, fontFamily: MONO, fontSize: 5.5, letterSpacing: '0.14em', padding: '2px 5px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms ease', flexShrink: 0 }}>
              {m}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.2em' }}>{d.id} · SYNCED</span>
      </div>
    </div>
  );
}

/* ── VISOR FIELD ─────────────────────────────────────────────────────────── */
export default function BayVisor({ cones = {}, isPremium = false }) {
  const bays = useBayStore(s => s.bays);
  const [expanded, setExpanded] = useState({});

  const toggle = (bayNum) => setExpanded(e => ({ ...e, [bayNum]: !e[bayNum] }));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', padding: '0 4px' }}>
      {domains.map(d => {
        const bayNum = Number(d.id.slice(1));
        return (
          <BayPanel
            key={d.id}
            d={d}
            cone={cones[BAY_MAP[d.id]]}
            assignment={bays[bayNum]?.assignment}
            isPremium={isPremium}
            isExpanded={!!expanded[bayNum]}
            onToggle={() => toggle(bayNum)}
            bayNum={bayNum}
          />
        );
      })}
    </div>
  );
}
