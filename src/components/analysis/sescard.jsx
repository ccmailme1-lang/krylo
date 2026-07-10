// KRYL-1010 — Search Environment State (SES) — pre-flight checklist container.
//
// A landscape panel read BEFORE a search: a weather + time header over a row of three
// big instrument gauges. Default triad (KRYL-1024: each dial is guest-configurable — tap
// to swap its metric from the pool; loadout persists per-guest):
//   1) SIGNAL ACTIVITY    — is anything moving?       (world)
//   2) OBSERVATION HEALTH  — can I see reliably?        (observer)
//   3) OPPORTUNITY CLIMATE — is there leverage here?    (interaction)
//
// Each gauge reads LIVE from computeSES() (passed as `ses`). A field that is not
// GROUNDED shows a needle-less gauge and "—" — never a fabricated number (§19/§22).
// OPPORTUNITY CLIMATE has no engine source yet → stays "—". WEATHER is placeholder until
// the real feed (geolocation / city+state → weather API) is wired; labeled as such. TIME
// is real (live clock). Locked palette only (§6). CRISP — no blur/bloom.
//
// SIZE: everything scales from a single `width` prop. s = width / BASE_WIDTH. The gauge
// SVG is 100%-width (auto-scales); header fixed sizes are multiplied by s (small labels
// keep a legibility floor). Change `width` in one place to resize the whole panel.

import React, { useState, useEffect, useMemo } from 'react';

const BASE_WIDTH = 620;
const LIME     = '#66FF00';
const TEXT     = '#ededea';
const TEXT_DIM = 'rgba(224,224,220,0.55)';
const FAINT    = 'rgba(255,255,255,0.4)';
const EDGE     = 'rgba(255,255,255,0.09)';
const EDGE2    = 'rgba(255,255,255,0.06)';
const DISPLAY  = "'Space Grotesk','IBM Plex Sans',system-ui,sans-serif";
const MONO     = "'IBM Plex Mono',ui-monospace,monospace";

const isWithheld = (v) => v == null || v === 'WITHHELD';
const readField  = (f) => (f && f.status === 'GROUNDED' && f.value != null) ? Math.round(f.value) : null;
const pad2 = (n) => String(n).padStart(2, '0');

// ── one big flat instrument gauge (270° tick arc + numbered graduations + needle) ──
function gaugeElements(cx, cy, R, value, keyBase) {
  const A0 = 225, SWEEP = 270;
  const XY = (theta, r) => {
    const t = (theta * Math.PI) / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  };
  const majLen = R * 0.14, minLen = R * 0.08, tail = R * 0.2, numFs = R * 0.11;
  const has = !isWithheld(value);
  const els = [];
  els.push(<circle key={`${keyBase}-bez`} cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />);
  for (let k = 0; k <= 50; k++) {
    const theta = A0 + (k / 50) * SWEEP, major = k % 5 === 0;
    const [x1, y1] = XY(theta, R), [x2, y2] = XY(theta, R - (major ? majLen : minLen));
    els.push(<line key={`${keyBase}-t${k}`} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)}
                   stroke={`rgba(255,255,255,${major ? 0.6 : 0.22})`} strokeWidth={major ? 1.6 : 0.8} />);
  }
  [0, 20, 40, 60, 80, 100].forEach((v) => {
    const [nx, ny] = XY(A0 + (v / 100) * SWEEP, R - majLen - numFs);
    els.push(<text key={`${keyBase}-n${v}`} x={nx.toFixed(1)} y={(ny + numFs * 0.35).toFixed(1)} textAnchor="middle"
                   fill="rgba(255,255,255,0.42)" fontFamily={MONO} fontSize={numFs.toFixed(1)}>{v}</text>);
  });
  if (has) {
    const theta = A0 + (value / 100) * SWEEP;
    const [px, py] = XY(theta, R - R * 0.18), [tx, ty] = XY(theta + 180, tail);
    els.push(<line key={`${keyBase}-ndl`} x1={tx.toFixed(1)} y1={ty.toFixed(1)} x2={px.toFixed(1)} y2={py.toFixed(1)}
                   stroke={TEXT} strokeWidth="2.4" strokeLinecap="round" />);
    els.push(<circle key={`${keyBase}-hub`} cx={cx} cy={cy} r={(R * 0.05).toFixed(1)} fill="#0a0a0a" stroke={TEXT} strokeWidth="1.4" />);
  }
  const fs = R * 0.34;
  els.push(<text key={`${keyBase}-val`} x={cx} y={(cy + fs * 0.34).toFixed(1)} textAnchor="middle"
                 fill={has ? LIME : TEXT_DIM} fontFamily={DISPLAY} fontSize={fs.toFixed(1)} fontWeight="700">
             {has ? `${value}%` : '—'}
           </text>);
  return els;
}

const CloudIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ stroke: TEXT, strokeWidth: 1.5, fill: 'none', opacity: 0.82 }}>
    <path d="M7 18h9a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6 10.5 3.5 3.5 0 0 0 7 18z" />
  </svg>
);

const FORECAST = [['TUE', '6', '2'], ['WED', '8', '3'], ['THU', '6', '2'], ['FRI', '9', '4'], ['SAT', '10', '2']];

// KRYL-1024 — configurable dial pool (the DNA-card swap pattern). Each of the 3 slots
// points at a metricKey; tapping a dial swaps it. `live` = has a feeding engine source
// today; a metric with no source reads "—" honestly (§22). read(ses) → 0-100 | null.
const SES_METRICS = [
  { key: 'signalDensity',       label: 'SIGNAL ACTIVITY',     live: true,  read: (ses) => readField(ses?.signalDensity) },
  { key: 'observationHealth',   label: 'OBSERVATION HEALTH',  live: true,  read: (ses) => readField(ses?.observationHealth) },
  { key: 'sourceIntegrity',     label: 'SOURCE AVAILABILITY', live: true,  read: (ses) => readField(ses?.sourceIntegrity) },
  { key: 'evidenceFreshness',   label: 'EVIDENCE FRESHNESS',  live: true,  read: (ses) => readField(ses?.evidenceFreshness) },
  { key: 'narrativeStability',  label: 'NARRATIVE STABILITY', live: false, read: (ses) => (ses?.narrativeVolatility?.status === 'GROUNDED' ? Math.round(100 - ses.narrativeVolatility.value) : null) },
  { key: 'opportunityClimate',  label: 'OPPORTUNITY CLIMATE', live: false, read: () => null },
  { key: 'causalVisibility',    label: 'CAUSAL VISIBILITY',   live: false, read: (ses) => readField(ses?.causalVisibility) },
  { key: 'dependencyComplexity',label: 'DEPENDENCY LOAD',     live: false, read: (ses) => readField(ses?.dependencyComplexity) },
];
const METRIC_MAP = Object.fromEntries(SES_METRICS.map((m) => [m.key, m]));
const DEFAULT_SLOTS = ['signalDensity', 'observationHealth', 'opportunityClimate'];

export default function SESCard({ ses = null, width = 300 }) {
  const s = width / BASE_WIDTH;                 // single scale factor
  const px = (v, floor = 0) => Math.max(floor, Math.round(v * s * 10) / 10);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // fold/unfold — collapses the panel to a slim glance bar; state persists.
  const [folded, setFolded] = useState(() => {
    try { const v = localStorage.getItem('krylo_ses_folded'); return v == null ? true : v === '1'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('krylo_ses_folded', folded ? '1' : '0'); } catch {}
  }, [folded]);

  // KRYL-1024 — configurable loadout: which metric each of the 3 dials monitors. Persists
  // per-guest (localStorage); schema-guarded so a stale/unknown key falls back to default.
  const [slots, setSlots] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('krylo_ses_slots_v1') || 'null');
      if (Array.isArray(saved) && saved.length === 3 && saved.every((k) => METRIC_MAP[k])) return saved;
    } catch {}
    return DEFAULT_SLOTS;
  });
  useEffect(() => {
    try { localStorage.setItem('krylo_ses_slots_v1', JSON.stringify(slots)); } catch {}
  }, [slots]);
  const [pickerSlot, setPickerSlot] = useState(null); // which dial's metric picker is open

  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const dateLine = now.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }).toUpperCase()
                 + ' · ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });

  // gauges derived from the configurable loadout; each reads live from `ses` (or "—").
  const gauges = slots.map((key) => {
    const m = METRIC_MAP[key] || METRIC_MAP[DEFAULT_SLOTS[0]];
    return [m.label, m.read(ses)];
  });

  // dial-row SVG geometry (viewBox units — auto-scales to the panel width)
  const R = 92, cellW = 220, cx0 = 110, topLabel = 28, cyDial = topLabel + 20 + R;
  const vbW = cellW * 3, vbH = cyDial + R + 16;
  const rowEls = useMemo(() => gauges.map(([label, value], i) => {
    const cx = cx0 + i * cellW;
    return (
      <g key={`slot${i}`}>
        <text x={cx} y={topLabel} textAnchor="middle" fill={TEXT} fontFamily={DISPLAY} fontSize="13" fontWeight="700" letterSpacing="0.4">{label}</text>
        {gaugeElements(cx, cyDial, R, value, `g${i}`)}
        {/* KRYL-1024 — transparent hit target: tap the dial to swap its metric */}
        <rect x={i * cellW} y={0} width={cellW} height={vbH} fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => setPickerSlot(i)} onMouseDown={(e) => e.stopPropagation()}>
          <title>Tap to change metric</title>
        </rect>
      </g>
    );
  }), [JSON.stringify(gauges)]);

  return (
    <div style={{ width: '100%', position: 'relative', fontFamily: DISPLAY, color: TEXT }}>
      {/* ── header: weather + time (scales with s) ── */}
      <div style={{ padding: `${px(16, 10)}px ${px(20, 12)}px ${px(14, 9)}px`, borderBottom: `1px solid ${EDGE}`, background: 'linear-gradient(180deg,rgba(255,255,255,0.02),transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(8, 4) }}>
            <svg width={px(28, 18)} height={px(28, 18)} viewBox="0 0 24 24" style={{ stroke: TEXT, strokeWidth: 1.5, fill: 'none', opacity: 0.82 }}>
              <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M5 3 2 6M19 3l3 3" />
            </svg>
            <div style={{ width: px(44, 30), height: px(24, 16), borderRadius: px(14, 8), background: LIME, position: 'relative' }}>
              <span style={{ position: 'absolute', top: '9%', right: '9%', width: px(20, 13), height: px(20, 13), borderRadius: '50%', background: '#0a0a0a' }} />
            </div>
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: px(64, 30), lineHeight: 0.82, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
        </div>
        <div style={{ display: 'flex', gap: px(14, 10), marginTop: px(14, 9), alignItems: 'flex-start' }}>
          <div style={{ flex: '0 1 auto', minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: px(10, 8.5), letterSpacing: '0.12em', color: FAINT, textTransform: 'uppercase' }}>{dateLine}</div>
            <div style={{ fontWeight: 700, fontSize: px(22, 14), marginTop: 2 }}>{weekday}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(10, 6), marginTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: px(40, 24), lineHeight: 1 }}>2<sup style={{ fontSize: px(15, 10), fontWeight: 400, color: TEXT_DIM }}>°C</sup></div>
              <CloudIcon size={px(34, 22)} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: px(10.5, 9), color: TEXT_DIM, marginTop: 4, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>12°/0° · REALFEEL 1°</div>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: px(15, 11), marginBottom: px(8, 6) }}>⌖ Location</div>
            <div style={{ display: 'flex', gap: px(4, 3) }}>
              {FORECAST.map(([d, hi, lo]) => (
                <div key={d} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: `${px(8, 5)}px 1px`, background: 'rgba(255,255,255,0.04)', border: `1px solid ${EDGE2}`, borderRadius: px(11, 7), fontFamily: MONO }}>
                  <div style={{ fontSize: px(9, 7.5), letterSpacing: '0.04em', color: FAINT }}>{d}</div>
                  <div style={{ margin: '3px 0' }}><CloudIcon size={px(18, 12)} /></div>
                  <div style={{ fontSize: px(10, 8), color: TEXT_DIM }}><b style={{ color: TEXT, fontWeight: 400 }}>{hi}°</b>/{lo}°</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ── fold handle: a little lime staple. Weather/time header stays; the dials fold
             DOWN. The staple persists when folded so you know the gauges are still there. ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end',
                    padding: `0 ${px(14, 10)}px ${folded ? px(4, 3) : 0}px` }}>
        <span
          onClick={() => setFolded((f) => !f)}
          onMouseDown={(e) => e.stopPropagation()}
          role="button" aria-label={folded ? 'Expand gauges' : 'Fold gauges'}
          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                   padding: `${px(7, 6)}px ${px(8, 7)}px` }}
        >
          <span style={{ width: px(15, 11), height: px(2.5, 2), borderRadius: 2, background: LIME, opacity: 0.6 }} />
        </span>
      </div>

      {/* ── dial row (SVG auto-scales to width) — folds down ── */}
      {!folded && (
        <div style={{ padding: `0 ${px(8, 5)}px ${px(16, 10)}px` }}>
          <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" role="img" aria-label="Search Environment State gauges" style={{ display: 'block' }}>
            {rowEls}
          </svg>
        </div>
      )}

      {/* ── KRYL-1024 metric picker — tap a dial to choose what it monitors ── */}
      {pickerSlot != null && (
        <div
          onClick={() => setPickerSlot(null)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(5,5,6,0.95)',
                   display: 'flex', flexDirection: 'column', padding: `${px(16, 12)}px`, overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: px(9, 7) }}>
            <span style={{ fontFamily: MONO, fontSize: px(10, 9), letterSpacing: '0.16em', color: FAINT, textTransform: 'uppercase' }}>Dial {pickerSlot + 1} · monitor</span>
            <span style={{ fontFamily: MONO, fontSize: px(10, 9), letterSpacing: '0.14em', color: FAINT, cursor: 'pointer' }}>✕ CLOSE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(5, 4) }}>
            {SES_METRICS.map((m) => {
              const sel = slots[pickerSlot] === m.key;
              return (
                <div
                  key={m.key}
                  onClick={(e) => { e.stopPropagation(); setSlots((prev) => prev.map((k, idx) => (idx === pickerSlot ? m.key : k))); setPickerSlot(null); }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                           padding: `${px(8, 6)}px ${px(11, 9)}px`, borderRadius: px(8, 6),
                           background: sel ? 'rgba(102,255,0,0.09)' : 'transparent',
                           border: `1px solid ${sel ? 'rgba(102,255,0,0.4)' : EDGE2}`,
                           color: m.live ? TEXT : TEXT_DIM }}
                >
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: px(12.5, 10.5) }}>{m.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: px(8.5, 8), letterSpacing: '0.1em', color: m.live ? LIME : FAINT }}>{m.live ? 'LIVE' : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
