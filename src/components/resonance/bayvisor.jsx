// BayVisor — six independent floating HUD panels
// Posture: COLLAPSED (26px header strip) → EXPANDED (180px full HUD)
// Replaces ConsoleDashboard bar. Same data binding.

import React, { useState, useRef } from "react";
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

/* ── A/V MODULE ──────────────────────────────────────────────────────────── */
const AV_MAX_BYTES = 100 * 1024 * 1024; // 100MB

function AVModule() {
  const [src,     setSrc]     = useState(null);
  const [error,   setError]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const fileRef = useRef();
  const vidRef  = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > AV_MAX_BYTES) { setError('FILE EXCEEDS 100MB LIMIT'); return; }
    if (!file.type.startsWith('video/')) { setError('MP4 FILES ONLY'); return; }
    setError(null);
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(file));
    setPlaying(false);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!vidRef.current) return;
    if (vidRef.current.paused) { vidRef.current.play(); setPlaying(true); }
    else { vidRef.current.pause(); setPlaying(false); }
  };

  const eject = (e) => {
    e.stopPropagation();
    if (vidRef.current) vidRef.current.pause();
    if (src) URL.revokeObjectURL(src);
    setSrc(null); setPlaying(false); setError(null);
    fileRef.current.value = '';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }} onClick={e => e.stopPropagation()}>
      {src ? (
        <>
          <video ref={vidRef} src={src} onEnded={() => setPlaying(false)}
            style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000', display: 'block' }} />
          <div style={{ height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: LIME, fontFamily: MONO, fontSize: 9, cursor: 'pointer', letterSpacing: '0.14em', padding: 0 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={eject} style={{ background: 'none', border: 'none', color: DIM, fontFamily: MONO, fontSize: 6, cursor: 'pointer', letterSpacing: '0.18em', padding: 0, marginLeft: 'auto' }}>
              EJECT
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {error && <span style={{ fontFamily: MONO, fontSize: 6, color: '#FF3B3B', letterSpacing: '0.16em' }}>{error}</span>}
          <button onClick={e => { e.stopPropagation(); fileRef.current.click(); }}
            style={{ background: 'none', border: '0.5px solid rgba(102,255,0,0.35)', color: LIME, fontFamily: MONO, fontSize: 6, letterSpacing: '0.20em', padding: '4px 12px', cursor: 'pointer' }}>
            IMPORT MP4
          </button>
          <span style={{ fontFamily: MONO, fontSize: 5.5, color: DIM, letterSpacing: '0.14em' }}>MAX 100MB</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ── MODULE BODY — each module owns the full bay body (label row + waveform + content) ── */
function ModuleBody({ module, d, cone, assignment, color, pct }) {
  const label = { HEADLINE: d.type, METRICS: 'METRICS', SPARKLINE: 'TREND', FIDELITY: 'FIDELITY SCORE', 'A/V': 'A/V' }[module] ?? module;
  const sublabel = { HEADLINE: assignment?.title ?? '— NO SIGNAL —', METRICS: null, SPARKLINE: null, FIDELITY: null, 'A/V': null }[module];

  /* wave for headline + fidelity; sparkline data for sparkline; none for metrics/video/audio */
  const showWave     = module === 'HEADLINE' || module === 'FIDELITY';
  const showSparkline = module === 'SPARKLINE';
  const trend        = cone?.trend ?? [];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>

      {/* label row */}
      <div style={{ padding: '6px 10px 2px', flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.22em' }}>{label}</div>
        {sublabel && <div style={{ fontFamily: MONO, fontSize: 9, color: assignment ? color : DIM, letterSpacing: '0.1em', lineHeight: 1.4, marginTop: 3 }}>{sublabel}</div>}
      </div>

      {/* waveform or sparkline — hidden when unused */}
      <div style={{ height: (showWave || showSparkline) ? 48 : 0, padding: (showWave || showSparkline) ? '3px 8px' : 0, flexShrink: 0, background: '#000', overflow: 'hidden' }}>
        {showWave && <Wave color={color} />}
        {showSparkline && trend.length > 1 && (() => {
          const min = Math.min(...trend), max = Math.max(...trend), range = max - min || 1;
          const W = 200, H = 42;
          const pts = trend.map((v, i) => ({
            x: (i / (trend.length - 1)) * W,
            y: H - ((v - min) / range) * (H - 4) - 2,
          }));
          // segment colors: each segment is rising(lime), falling(red), or flat(dim)
          const segments = pts.slice(1).map((p, i) => {
            const prev = pts[i];
            const rising  = p.y < prev.y;
            const falling = p.y > prev.y;
            const segColor = rising ? '#66FF00' : falling ? '#FF3B3B' : 'rgba(255,255,255,0.25)';
            return { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color: segColor };
          });
          return (
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              {/* Y-axis labels */}
              <text x="1" y="7" fontSize="5" fill="rgba(255,255,255,0.25)" fontFamily="monospace">{max.toFixed(0)}%</text>
              <text x="1" y={H - 1} fontSize="5" fill="rgba(255,255,255,0.25)" fontFamily="monospace">{min.toFixed(0)}%</text>
              {segments.map((s, i) => (
                <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth="1.8" strokeLinecap="round" />
              ))}
              {/* endpoint dot */}
              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2"
                fill={segments.length ? segments[segments.length - 1].color : LIME} />
            </svg>
          );
        })()}
        {showSparkline && !trend.length && <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}><span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.18em' }}>NO TREND DATA</span></div>}
      </div>

      {/* content area */}
      <div style={{ flex: 1, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'stretch', background: '#000' }}>
        {module === 'HEADLINE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px' }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', marginBottom: 4 }}>SIGNAL SCORE</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 64, lineHeight: 1, color: color, letterSpacing: '-0.04em' }}>{pct}</span>
              <span style={{ fontFamily: MONO, fontSize: 18, color: color, opacity: 0.6 }}>%</span>
            </div>
          </div>
        )}
        {module === 'METRICS' && (() => {
          const t = cone?.trend ?? [];
          const velocity = t.length >= 2 ? (t[t.length - 1] - t[t.length - 2]).toFixed(3) : null;
          const trendUp  = t.length >= 2 ? t[t.length - 1] > t[t.length - 2] : null;
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 10 }}>
              {/* Signal Score */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.20em' }}>SIGNAL SCORE</span>
                <span style={{ fontFamily: MONO, fontSize: 18, color: LIME, letterSpacing: '0.04em' }}>{pct}<span style={{ fontSize: 9 }}>%</span></span>
              </div>
              {/* Velocity */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.20em' }}>VELOCITY</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: BRT, letterSpacing: '0.06em' }}>
                  {velocity ?? '—'}<span style={{ fontSize: 6, color: DIM, marginLeft: 2 }}>pts/tick</span>
                </span>
              </div>
              {/* Trend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.20em' }}>TREND</span>
                <span style={{ fontSize: 16, lineHeight: 1, color: trendUp === null ? DIM : trendUp ? '#66FF00' : '#FF3B3B' }}>
                  {trendUp === null ? '—' : trendUp ? '↑' : '↓'}
                </span>
              </div>
            </div>
          );
        })()}
        {module === 'SPARKLINE' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 5, color: DIM, letterSpacing: '0.14em' }}>MIN</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: BRT, letterSpacing: '0.06em' }}>
                {trend.length ? Math.min(...trend).toFixed(1) : '—'}<span style={{ fontSize: 5, color: DIM, marginLeft: 1 }}>%</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 5, color: DIM, letterSpacing: '0.14em' }}>RANGE</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.06em' }}>
                {trend.length ? (Math.max(...trend) - Math.min(...trend)).toFixed(1) : '—'}<span style={{ fontSize: 5, color: DIM, marginLeft: 1 }}>pts</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontFamily: MONO, fontSize: 5, color: DIM, letterSpacing: '0.14em' }}>MAX</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: BRT, letterSpacing: '0.06em' }}>
                {trend.length ? Math.max(...trend).toFixed(1) : '—'}<span style={{ fontSize: 5, color: DIM, marginLeft: 1 }}>%</span>
              </span>
            </div>
          </div>
        )}
        {module === 'FIDELITY' && (() => {
          const fs = assignment?.fs ?? null;
          const fpct = fs !== null ? Math.round(fs * 100) : null;
          const tier = fpct === null ? '—' : fpct >= 85 ? 'VALIDATED' : fpct >= 50 ? 'ESTIMATED' : 'LOW FIDELITY';
          const tierColor = fpct === null ? DIM : fpct >= 85 ? '#66FF00' : fpct >= 50 ? '#007FFF' : '#FF3B3B';
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.18em' }}>TRUST</span>
                <span style={{ fontFamily: MONO, fontSize: 18, color: tierColor }}>{fpct !== null ? `${fpct}%` : '—'}</span>
              </div>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
                {fpct !== null && <div style={{ height: '100%', width: `${fpct}%`, background: tierColor, borderRadius: 1, transition: 'width 400ms ease, background 400ms ease' }} />}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 6, color: tierColor, letterSpacing: '0.16em' }}>{tier}</span>
            </div>
          );
        })()}
        {module === 'A/V' && <AVModule />}
      </div>
    </div>
  );
}

/* ── BAY PANEL ───────────────────────────────────────────────────────────── */
function BayPanel({ d, cone, assignment, isPremium, isExpanded, onToggle, bayNum }) {
  const [titleHovered, setTitleHovered] = useState(false);
  const [modIdx, setModIdx] = useState(0);

  const coneColorOverrides = useBayStore(s => s.coneColorOverrides ?? {});
  const setConeColor       = useBayStore(s => s.setConeColor ?? (() => {}));

  const activeModule = MODULE_TYPES[modIdx];

  const cycleModule = (dir, e) => {
    e.stopPropagation();
    setModIdx(i => (i + dir + MODULE_TYPES.length) % MODULE_TYPES.length);
  };

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

      {/* ── COLLAPSED HEADER (click to expand) ── */}
      <div onClick={onToggle} style={{
        height: COLLAPSED_H, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', cursor: 'pointer',
        borderBottom: isExpanded ? '0.5px solid rgba(255,255,255,0.07)' : 'none',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: LIME, letterSpacing: '0.22em', flexShrink: 0 }}>{d.id}</span>
        <span onMouseEnter={() => setTitleHovered(true)} onMouseLeave={() => setTitleHovered(false)}
          style={{ fontFamily: MONO, fontSize: 9, color: titleHovered ? '#ffffff' : (isLoaded ? color : MID), letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0, transition: 'color 150ms ease', cursor: 'pointer' }}>
          {mainLabel}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0 }}>{d.type}</span>
      </div>

      {/* ── MODULE BODY — full body changes with selector ── */}
      <ModuleBody module={activeModule} d={d} cone={cone} assignment={assignment} color={color} pct={pct} />


      {/* ── FOOTER ── */}
      <div style={{
        height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, color: LIME, letterSpacing: '0.04em' }}>{pct}%</span>
        {/* Module arrow selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button onClick={e => cycleModule(-1, e)} style={{ background: 'none', border: 'none', color: LIME, cursor: 'pointer', fontFamily: MONO, fontSize: 10, padding: '0 4px', lineHeight: 1 }}>{'<'}</button>
          <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase', minWidth: 72, textAlign: 'center' }}>{activeModule ?? 'HEADLINE'}</span>
          <button onClick={e => cycleModule(1, e)} style={{ background: 'none', border: 'none', color: LIME, cursor: 'pointer', fontFamily: MONO, fontSize: 10, padding: '0 4px', lineHeight: 1 }}>{'>'}</button>
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
