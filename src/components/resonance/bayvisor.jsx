// BayVisor — six independent floating HUD panels
// Posture: COLLAPSED (26px header strip) → EXPANDED (248px full HUD)

import React, { useState, useRef } from "react";
import { BAY_MAP } from "../../engine/cones.js";
import { useBayStore, MODULE_TYPES } from "../../store/usebaystore.js";

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.22)';
const MID  = 'rgba(255,255,255,0.50)';
const BRT  = 'rgba(255,255,255,0.88)';

const COLLAPSED_H = 23;
const EXPANDED_H  = 223;

const DOMAIN_METRIC = {
  B01: { label: 'FREE CASH FLOW', value: '+4.2K', unit: '$'  },
  B02: { label: 'TIME ROI',       value: '3.1',   unit: 'x'  },
  B03: { label: 'TIME ROI',       value: '2.8',   unit: 'x'  },
  B04: { label: 'CAC / CLV',      value: '0.18',  unit: ''   },
  B05: { label: 'RISK ADJ ROE',   value: '14.2',  unit: '%'  },
  B06: { label: 'COMPOSITE',      value: '—',     unit: ''   },
};

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
  const corners = [
    { top: 0,    left: 0,  borderTop:    `1px solid ${color}`, borderLeft:   `1px solid ${color}` },
    { top: 0,    right: 0, borderTop:    `1px solid ${color}`, borderRight:  `1px solid ${color}` },
    { bottom: 0, left: 0,  borderBottom: `1px solid ${color}`, borderLeft:   `1px solid ${color}` },
    { bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight:  `1px solid ${color}` },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div key={i} style={{ position: 'absolute', width: 7, height: 7, pointerEvents: 'none', ...c }} />
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
        <div style={{ filter: 'blur(2px)', fontFamily: MONO, fontSize: 9, color: DIM, pointerEvents: 'none' }}>
          when signal exceeds...
        </div>
        <div style={{
          position: 'absolute', inset: 0, backdropFilter: 'blur(6px)',
          background: 'rgba(0,0,0,0.80)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 10px',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em' }}>ALERTS</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, border: '1px solid rgba(102,255,0,0.35)', padding: '2px 8px', letterSpacing: '0.16em', cursor: 'pointer' }}>
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
          <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>● {trigger}</span>
          <button onClick={e => { e.stopPropagation(); setTrigger(null); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,60,60,0.7)', fontFamily: MONO, fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em' }}>CLEAR</button>
        </>
      ) : (
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { e.stopPropagation(); setTrigger(input.trim()); setInput(''); }}}
          onClick={e => e.stopPropagation()}
          placeholder="when signal exceeds..."
          style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.12)', outline: 'none', color: MID, fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em' }}
        />
      )}
    </div>
  );
}

/* ── A/V MODULE ──────────────────────────────────────────────────────────── */
const AV_MAX_BYTES = 100 * 1024 * 1024;

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
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: LIME, fontFamily: MONO, fontSize: 9, cursor: 'pointer', padding: 0 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={eject} style={{ background: 'none', border: 'none', color: DIM, fontFamily: MONO, fontSize: 9, cursor: 'pointer', letterSpacing: '0.18em', padding: 0, marginLeft: 'auto' }}>
              EJECT
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {error && <span style={{ fontFamily: MONO, fontSize: 9, color: '#FF3B3B', letterSpacing: '0.16em' }}>{error}</span>}
          <button onClick={e => { e.stopPropagation(); fileRef.current.click(); }}
            style={{ background: 'none', border: '0.5px solid rgba(102,255,0,0.35)', color: LIME, fontFamily: MONO, fontSize: 9, letterSpacing: '0.20em', padding: '4px 12px', cursor: 'pointer' }}>
            IMPORT MP4
          </button>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.14em' }}>MAX 100MB</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ── MODULE BODY ─────────────────────────────────────────────────────────── */
function ModuleBody({ module, d, cone, assignment, color, pct }) {
  const label = {
    HEADLINE:  'HEADLINE',
    METRICS:   'METRICS',
    SPARKLINE: 'SPARKLINE',
    FIDELITY:  'FIDELITY',
    'A/V':     'A/V',
  }[module] ?? module;

  const trend = cone?.trend ?? [];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>

      {/* ── LABEL ROW: 13px lime, letterSpacing 0.22em, padding 8 10 4 ── */}
      <div style={{ padding: '8px 10px 4px', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.22em' }}>{label}</span>
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={{ flex: 1, minHeight: 0, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#000' }}>

        {/* HEADLINE — score + two sub-cards */}
        {module === 'HEADLINE' && (() => {
          const t = trend;
          const trendUp    = t.length >= 2 ? t[t.length - 1] > t[t.length - 2] : null;
          const arrowColor = trendUp === null ? DIM : trendUp ? LIME : '#FF3B3B';
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 10px 8px', gap: 6 }}>

              {/* score row: left = 96% SIGNAL SCORE · right = domain metric fills empty space */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0 }}>
                {/* left: score */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 49, lineHeight: 0.85, color, letterSpacing: '-0.04em' }}>{pct}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color, opacity: 0.6, lineHeight: 0.85, alignSelf: 'flex-end', marginBottom: 6 }}>%</span>
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8, gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em', lineHeight: 1.3 }}>SIGNAL</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em', lineHeight: 1.3 }}>SCORE</span>
                  </div>
                </div>
                {/* right: domain metric fills remaining space */}
                {(() => {
                  const m = DOMAIN_METRIC[d.id];
                  if (!m) return null;
                  return (
                    <div style={{ flex: 1, marginLeft: 10, paddingLeft: 10, borderLeft: '0.5px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.16em', lineHeight: 1.4 }}>{m.label}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontFamily: MONO, fontSize: 18, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{m.value}</span>
                        {m.unit && <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{m.unit}</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* two sub-cards: VELOCITY (area chart) + 24H TREND (polyline + arrow) */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>

                <div style={{ flex: 1, border: '0.5px solid rgba(255,255,255,0.09)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em' }}>VELOCITY</span>
                  {t.length > 1 ? (() => {
                    const vels  = t.slice(1).map((v, i) => v - t[i]);
                    const vmin  = Math.min(...vels), vmax = Math.max(...vels), vrange = vmax - vmin || 1;
                    const W = 100, H = 38;
                    const pts   = vels.map((v, i) => ({
                      x: (i / (vels.length - 1)) * W,
                      y: H - ((v - vmin) / vrange) * (H - 4) - 2,
                    }));
                    const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const area  = line + ` L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
                    const gId   = `vg-${d.id}`;
                    return (
                      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={LIME} stopOpacity="0.45" />
                            <stop offset="100%" stopColor={LIME} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={area} fill={`url(#${gId})`} />
                        <path d={line} stroke={LIME} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    );
                  })() : <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>—</span>}
                </div>

                <div style={{ flex: 1, border: '0.5px solid rgba(255,255,255,0.09)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em' }}>24H TREND</span>
                  {t.length > 1 ? (() => {
                    const tmin  = Math.min(...t), tmax = Math.max(...t), trange = tmax - tmin || 1;
                    const W = 100, H = 38;
                    const pts   = t.map((v, i) => ({
                      x: (i / (t.length - 1)) * W,
                      y: H - ((v - tmin) / trange) * (H - 4) - 2,
                    }));
                    const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const last  = pts[pts.length - 1];
                    const prev  = pts[pts.length - 2];
                    const dx    = last.x - prev.x, dy = last.y - prev.y;
                    const len   = Math.sqrt(dx * dx + dy * dy) || 1;
                    const nx    = dx / len, ny = dy / len;
                    const tip   = { x: last.x + nx * 3, y: last.y + ny * 3 };
                    const aL    = 7, aW = 3;
                    const arrow = `M${(tip.x - nx*aL - ny*aW).toFixed(1)},${(tip.y - ny*aL + nx*aW).toFixed(1)} L${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${(tip.x - nx*aL + ny*aW).toFixed(1)},${(tip.y - ny*aL - nx*aW).toFixed(1)}`;
                    return (
                      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                        <path d={line}  stroke={arrowColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={arrow} stroke={arrowColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    );
                  })() : <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>—</span>}
                </div>


              </div>
            </div>
          );
        })()}

        {/* METRICS — three-row data table */}
        {module === 'METRICS' && (() => {
          const t        = trend;
          const velocity = t.length >= 2 ? (t[t.length - 1] - t[t.length - 2]).toFixed(3) : null;
          const trendUp  = t.length >= 2 ? t[t.length - 1] > t[t.length - 2] : null;
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.20em' }}>SIGNAL SCORE</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: LIME }}>{pct}<span style={{ fontSize: 9, color: DIM, marginLeft: 1 }}>%</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.20em' }}>VELOCITY</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: BRT }}>
                  {velocity ?? '—'}<span style={{ fontSize: 9, color: DIM, marginLeft: 2 }}>pts/tick</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.20em' }}>TREND</span>
                <span style={{ fontSize: 13, lineHeight: 1, color: trendUp === null ? DIM : trendUp ? LIME : '#FF3B3B' }}>
                  {trendUp === null ? '—' : trendUp ? '↑' : '↓'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* SPARKLINE — full-height multi-line chart + stats strip */}
        {module === 'SPARKLINE' && (() => {
          const min   = trend.length ? Math.min(...trend) : null;
          const max   = trend.length ? Math.max(...trend) : null;
          const range = min !== null ? max - min : null;
          return (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* chart */}
              <div style={{ flex: 1, minHeight: 0, padding: '4px 8px 0' }}>
                {trend.length > 1 ? (() => {
                  const vmin   = min, vmax = max, vrange = vmax - vmin || 1;
                  const W = 200, H = 80;
                  const pts    = trend.map((v, i) => ({
                    x: (i / (trend.length - 1)) * W,
                    y: H - ((v - vmin) / vrange) * (H - 4) - 2,
                  }));
                  const segs   = pts.slice(1).map((p, i) => ({
                    x1: pts[i].x, y1: pts[i].y, x2: p.x, y2: p.y,
                    color: p.y < pts[i].y ? LIME : p.y > pts[i].y ? '#FF3B3B' : 'rgba(255,255,255,0.25)',
                  }));
                  const endColor = segs.length ? segs[segs.length - 1].color : LIME;
                  return (
                    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      {segs.map((s, i) => (
                        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                          stroke={s.color} strokeWidth="1.5" strokeLinecap="round" />
                      ))}
                      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={endColor} />
                    </svg>
                  );
                })() : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>NO DATA</span>
                  </div>
                )}
              </div>
              {/* stats strip: MIN · RANGE · MAX */}
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderTop: '0.5px solid rgba(255,255,255,0.12)' }}>
                {[
                  { label: 'MIN',   value: min   !== null ? min.toFixed(1)   + '%'  : '—' },
                  { label: 'RANGE', value: range !== null ? range.toFixed(1) + 'pts': '—' },
                  { label: 'MAX',   value: max   !== null ? max.toFixed(1)   + '%'  : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.14em' }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: BRT }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* FIDELITY — animated wave + trust bar + tier */}
        {module === 'FIDELITY' && (() => {
          const fs       = assignment?.fs ?? null;
          const fpct     = fs !== null ? Math.round(fs * 100) : null;
          const tier     = fpct === null ? '—' : fpct >= 85 ? 'VALIDATED' : fpct >= 50 ? 'ESTIMATED' : 'LOW FIDELITY';
          const tierColor = fpct === null ? DIM : fpct >= 85 ? LIME : fpct >= 50 ? '#007FFF' : '#FF3B3B';
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* wave fills flex:1 */}
              <div style={{ flex: 1, minHeight: 0, padding: '4px 8px' }}>
                <Wave color={color} />
              </div>
              {/* trust bar + tier label */}
              <div style={{ flexShrink: 0, padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 5, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em' }}>TRUST PROGRESS BAR</span>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
                  {fpct !== null && (
                    <div style={{ height: '100%', width: `${fpct}%`, background: tierColor, borderRadius: 1, transition: 'width 400ms ease, background 400ms ease' }} />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.18em' }}>VALIDATED TIER</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: tierColor, letterSpacing: '0.16em' }}>{tier}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* A/V */}
        {module === 'A/V' && <AVModule />}

        {/* ALERTS */}
        {module === 'ALERTS' && <AlertsMode isPremium={false} />}

      </div>
    </div>
  );
}

/* ── BAY PANEL ───────────────────────────────────────────────────────────── */
function BayPanel({ d, cone, assignment, isPremium, isExpanded, onToggle, bayNum }) {
  const [titleHovered, setTitleHovered] = useState(false);
  const [modIdx, setModIdx] = useState(0);

  const coneColorOverrides = useBayStore(s => s.coneColorOverrides ?? {});

  const activeModule = MODULE_TYPES[modIdx];

  const cycleModule = (dir, e) => {
    e.stopPropagation();
    setModIdx(i => (i + dir + MODULE_TYPES.length) % MODULE_TYPES.length);
  };

  const colorOverride = coneColorOverrides[bayNum] ?? null;
  const baseColor     = cone?.color ?? LIME;
  const color         = colorOverride ?? baseColor;
  const pct           = Math.round((cone?.value ?? 0) * 100);
  const mainLabel     = assignment?.title ?? d.name;
  const isLoaded      = !!assignment;

  const borderColor   = isExpanded
    ? (isLoaded ? 'rgba(102,255,0,0.30)' : 'rgba(255,255,255,0.18)')
    : 'rgba(255,255,255,0.09)';

  const reticleColor  = isExpanded
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

      {/* ── COLLAPSED HEADER ── */}
      {/* B01: 13px lime | FINANCIAL: 13px white88% | CAPITAL: 11px white50% */}
      <div onClick={onToggle} style={{
        height: COLLAPSED_H, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', cursor: 'pointer',
        borderBottom: isExpanded ? '0.5px solid rgba(255,255,255,0.07)' : 'none',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.22em', flexShrink: 0 }}>{d.id}</span>
        <span
          onMouseEnter={() => setTitleHovered(true)}
          onMouseLeave={() => setTitleHovered(false)}
          style={{ fontFamily: MONO, fontSize: 9, color: titleHovered ? '#fff' : (isLoaded ? color : BRT), letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0, transition: 'color 150ms ease', cursor: 'pointer' }}>
          {mainLabel}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0 }}>{d.type}</span>
      </div>

      {/* ── MODULE BODY ── */}
      <ModuleBody module={activeModule} d={d} cone={cone} assignment={assignment} color={color} pct={pct} />

      {/* ── FOOTER ── */}
      {/* [<] 16px lime · MODULE NAME 13px lime · [>] 16px lime | B01·SYNCED 11px lime */}
      <div style={{
        height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.2em' }}>{d.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={e => cycleModule(-1, e)}
            style={{ background: 'none', border: 'none', color: LIME, cursor: 'pointer', fontFamily: MONO, fontSize: 11, padding: '0 2px', lineHeight: 1 }}>{'<'}</button>
          <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase', minWidth: 72, textAlign: 'center' }}>
            {activeModule ?? 'HEADLINE'}
          </span>
          <button onClick={e => cycleModule(1, e)}
            style={{ background: 'none', border: 'none', color: LIME, cursor: 'pointer', fontFamily: MONO, fontSize: 11, padding: '0 2px', lineHeight: 1 }}>{'>'}</button>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.2em' }}>SYNCED</span>
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
