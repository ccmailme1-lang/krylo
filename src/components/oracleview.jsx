// src/components/oracleview.jsx
// WO-1127 — Convergence State Surface
// WO-226 — ETR Score-Weighted Entry Mechanics
// WO-227 — KineticGravity behind UI
// WO-228 — Particle layer isolation
// WO-232 — Signal Map condition + signalMapData prop
// WO-246 — isMap derived from lens
// WO-254 — Canvas wrapper compatibility
// WO-256 — Metric Lens Unification
// WO-275 — Metric Purge: no numeric values in guest view
// WO-276 — Ambient Signal Behavior: avgFs drives KineticGravity intensity
// WO-258 — 10K View Insight Architecture
// WO-267 — Ground Level: card layout
// WO-295 — 10K View rebuild: Oracle-White bg, dark text
// WO-1045 — Hydrate Oracle: instant mount, rAF reveal, Oracle-White surface

import "../styles/oracle.css";
import "../styles/groundlevel.css";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { normalizeToOracleSignal, toOracleViewModel } from "../engine/oraclesignal.js";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie,
  ResponsiveContainer, Cell,
} from 'recharts';

import KineticGravity   from "./spine/kineticgravity.jsx";
import SignalMap        from "./spine/spinemap.jsx";
import { usePrism }     from "../context/PrismContext.jsx";
import { getSynthesis } from "../utils/getSynthesis.js";
import { CATEGORY_MAP } from "../data/categoryMap.js";
import { FEATURES }     from "../config/features.js";
import VineCard         from "./vinecard.jsx";
import CommentSection  from "./commentsection.jsx";

/* ── helpers ─────────────────────────────────────────────────────── */

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// WO-1127 — theme token → hex (locked palette only)
const CONVERGENCE_COLORS = {
  void_gray:      '#1a1a1a',
  muted_slate:    '#3a3d4a',
  signal_lime:    '#66FF00',
  signal_blue:    '#007FFF',
  unicorn_purple: '#8A2BE2',
};

// Convergence badge pill styles — Oracle-White surface (light bg)
const CONVERGENCE_PILL = {
  void_gray:      { bg: 'rgba(58,61,74,0.10)',   border: 'rgba(58,61,74,0.30)',    text: '#3a3d4a' },
  muted_slate:    { bg: 'rgba(26,26,26,0.08)',   border: 'rgba(26,26,26,0.22)',    text: '#1a1a1a' },
  signal_lime:    { bg: 'rgba(102,255,0,0.10)',  border: 'rgba(102,255,0,0.40)',   text: '#66FF00' },
  signal_blue:    { bg: 'rgba(0,127,255,0.10)',  border: 'rgba(0,127,255,0.40)',   text: '#007FFF' },
  unicorn_purple: { bg: 'rgba(138,43,226,0.10)', border: 'rgba(138,43,226,0.40)', text: '#8A2BE2' },
};

// Convergence-state watch factors — 3 bullets per state
const CONVERGENCE_LOOKOUTS = {
  void_gray: [
    'Signal volume is below the confidence threshold — synthesis is unreliable.',
    'Verify domain sources are active and streaming before interpreting.',
    'Do not commit to a position until signal depth increases.',
  ],
  muted_slate: [
    'Weak signal present but below dominant threshold.',
    'Monitor for velocity change before drawing conclusions.',
    'Consider broadening query scope to attract cross-domain signal.',
  ],
  signal_lime: [
    'Signal coherence is building — trajectory is directional.',
    'Watch for cross-domain confirmation in the next observation window.',
    'Velocity is the key variable — monitor for acceleration or decay.',
  ],
  signal_blue: [
    'High volatility detected — contradictory sources are active simultaneously.',
    'Temporal alignment is weak. Signals may be offset in time.',
    'Do not commit to a position until turbulence resolves.',
  ],
  unicorn_purple: [
    'Multiple independent vectors converge — this is not noise.',
    'Confidence is high. The window for action is narrow.',
    'Prioritize this signal above current baseline operations.',
  ],
};

/* ── palette ─────────────────────────────────────────────────────── */
const MONO  = 'IBM Plex Mono, monospace';
const SERIF = 'Georgia, Charter, "Times New Roman", serif';

const LIME = '#66FF00';

// Oracle-White surface — dark text
const PILLAR_COLORS = [LIME, '#1A1A1A', 'rgba(26,26,26,0.7)', 'rgba(26,26,26,0.55)', 'rgba(26,26,26,0.4)', 'rgba(26,26,26,0.28)', 'rgba(26,26,26,0.18)'];

/* ── WO-507: Forensic Legend ─────────────────────────────────────── */

const LEGEND_TIERS = [
  { symbol: '◈', range: [91, 100], label: 'System Lock',  sub: 'Absolute consensus; immutable signal' },
  { symbol: '●', range: [61,  90], label: 'Forensic',     sub: 'High-confidence structured data' },
  { symbol: '◓', range: [26,  60], label: 'Mixed Data',   sub: 'Multi-source variance' },
  { symbol: 'ʘ', range: [0,   25], label: 'Unverified',   sub: 'High noise; raw signal data' },
];

const ForensicLegend = () => {
  const [hovered, setHovered] = React.useState(false);
  const [locked,  setLocked]  = React.useState(false);
  const visible = hovered || locked;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        onClick={() => setLocked(l => !l)}
        style={{ fontSize: '0.75rem', color: visible ? LIME : 'rgba(26,26,26,0.35)', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s' }}
      >◈</span>

      {visible && (
        <div style={{
          position:      'absolute',
          top:           '120%',
          left:          '50%',
          transform:     'translateX(-50%)',
          zIndex:        50,
          background:    'rgba(5,7,10,0.96)',
          border:        '1px solid rgba(255,255,255,0.1)',
          borderRadius:  '8px',
          padding:       '12px 16px',
          fontFamily:    MONO,
          width:         '220px',
          boxShadow:     '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {locked && (
            <button onClick={() => setLocked(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
          )}
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase' }}>Signal Tiers</div>
          {LEGEND_TIERS.map(({ symbol, range, label, sub }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', width: '16px', textAlign: 'center' }}>{symbol}</span>
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>{label}</div>
                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)' }}>{range[0]}–{range[1]} · {sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── WO-1123: UI State Map ─────────────────────────────────────────── */
const UI_STATE_MAP = {
  0: { name: 'UNCERTAIN', meshAlpha: 0.1,  meshDeformation: 0.0, nodeColor: 'rgba(26,26,26,0.4)',  stamp: 'INSUFFICIENT TELEMETRY'                  },
  1: { name: 'COLD',      meshAlpha: 1.0,  meshDeformation: 0.0, nodeColor: '#808080',              stamp: 'SYSTEMIC NOISE: NO ANOMALY'               },
  2: { name: 'WARNING',   meshAlpha: 1.0,  meshDeformation: 1.0, nodeColor: '#66FF00',              stamp: 'EMERGENT ANOMALY DETECTED'                },
  3: { name: 'IMPACT',    meshAlpha: 1.0,  meshDeformation: 1.5, nodeColor: '#8A2BE2',              stamp: 'TARGET LOCK: HIGH CONVICTION PRECURSORS'  },
};

/* ── WO-1045: Mock Signal — canonical hydration payload ── */
const MOCK_SIGNAL = {
  nodeId:           'LLM_COMPLIANCE_AGENT_V2',
  id:               'sig_8824',
  fs:               0.88,
  score:            0.88,
  sourceCount:      142,
  ltv:              8200,
  cac:              1100,
  leverageScore:    89,
  metrics: {
    inflowStrength: 0.85,
    timingWindow:   0.90,
    hopStability:   0.78,
    decayDominance: 0.82,
  },
  title:            'Signal Intelligence — Awaiting Target',
  truth_supporting: 'High-conviction pattern identified. Shannon floor cleared at 0.88. Vetted across 142 independent sources.',
  truth_statement:  'Signal confidence exceeds entropy threshold. AS-DIFF engine confirms dominant trajectory.',
  definition:       'A vetted intelligence signal that has cleared the 0.73 Shannon floor and survived the Tufte 5-source density check.',
  origin:           'AS-DIFF Engine · Port 4000',
  usage:            'Leverage Lattice → Oracle View → Ground Level',
  comments:         [],
};

/* ── 10K View — WO-295 ───────────────────────────────────────────── */

const TenKView = ({ data, categoryContext, loading, hostPayload, oracleSignal }) => {
  // WO-1045: resolvedData ensures Oracle always hydrates immediately — no empty state
  const resolvedData = data ?? MOCK_SIGNAL;
  const { state: prismState } = usePrism();
  const pillars = prismState.activeRefraction?.pillars ?? null;

  // WO-1300: score reads from OracleSignal boundary; pillars override for prism lens
  const score = useMemo(() => {
    if (pillars) {
      const vals = Object.values(pillars);
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    return Math.round((oracleSignal?.value ?? resolvedData?.fs ?? 0) * 100);
  }, [pillars, oracleSignal, resolvedData]);

  const convergenceVector = oracleSignal?.vector ?? null;
  const convergenceState  = oracleSignal ?? null;

  const anchorId   = categoryContext?.lens ?? prismState.activeRefraction?.metadata?.cat_id ?? 'SILENCE';
  const category   = CATEGORY_MAP[anchorId] ?? CATEGORY_MAP.SILENCE;
  const synthesis  = pillars
    ? getSynthesis(pillars, anchorId, CATEGORY_MAP)
    : (resolvedData?.truth_supporting ?? category.meaning ?? '—');
  const sourceText = resolvedData?.truth_statement ?? resolvedData?.title ?? '—';

  const D = {
    card:     { background: 'transparent', border: '1px solid rgba(26,26,26,0.08)', borderRadius: '10px', padding: '16px', marginBottom: '10px' },
    label:    { fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', marginBottom: '8px' },
    bodyText: { fontSize: '0.75rem', color: 'rgba(26,26,26,0.75)', lineHeight: 1.6 },
  };

  const definition = resolvedData?.definition ?? category.meaning  ?? '—';
  const origin     = resolvedData?.origin     ?? category.etymology ?? '—';
  const usage      = resolvedData?.usage      ?? '—';

  return (
    <div className="tenk-grit" style={{ background: 'transparent', padding: '24px 20px 48px', fontFamily: MONO, overflowY: 'auto', maxHeight: 'calc(100dvh - 160px)', minHeight: 0, width: '100%', maxWidth: '520px' }}>

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', fontSize: '5.5rem', fontWeight: 700, color: '#66FF00', lineHeight: 1, letterSpacing: '-0.04em' }}>{score}</div>
        <div style={{ ...D.label, marginBottom: 0, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Signal Score
          {FEATURES.FORENSIC_LEGEND && <ForensicLegend />}
        </div>

        {convergenceVector && convergenceState && (
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(26,26,26,0.06)' }}>
            {['D','V','A','T'].map(k => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(26,26,26,0.35)', marginBottom: '4px' }}>{k}</div>
                <div style={{ fontSize: '13px', color: CONVERGENCE_COLORS[convergenceState.theme] ?? '#66FF00' }}>
                  {(convergenceVector[k] ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WHY IT MATTERS — synthesis block */}
      {(() => {
        const theme    = convergenceState?.theme ?? 'muted_slate';
        const pill     = CONVERGENCE_PILL[theme]  ?? CONVERGENCE_PILL.muted_slate;
        const lookouts = CONVERGENCE_LOOKOUTS[theme] ?? CONVERGENCE_LOOKOUTS.muted_slate;
        const label    = convergenceState?.label ?? 'LOW SIGNAL YIELD';
        return (
          <div style={{ marginBottom: '20px', padding: '16px', border: `1px solid ${pill.border}`, borderRadius: '6px', background: pill.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                fontFamily: MONO, fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: '2px',
                background: pill.bg, border: `1px solid ${pill.border}`, color: pill.text,
                whiteSpace: 'nowrap',
              }}>{label}</span>
              <div style={{ fontFamily: MONO, fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.35)' }}>WHY IT MATTERS</div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '0.88rem', color: 'rgba(26,26,26,0.85)', lineHeight: 1.65, marginBottom: '14px' }}>
              {synthesis}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {lookouts.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: pill.text, flexShrink: 0, marginTop: '6px', opacity: 0.6 }} />
                  <div style={{ fontFamily: MONO, fontSize: '0.62rem', color: 'rgba(26,26,26,0.55)', lineHeight: 1.6, letterSpacing: '0.04em' }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {hostPayload?.data && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: UI_STATE_MAP[hostPayload.data.state]?.nodeColor ?? 'rgba(26,26,26,0.4)', borderLeft: `2px solid ${UI_STATE_MAP[hostPayload.data.state]?.nodeColor ?? 'rgba(26,26,26,0.15)'}`, paddingLeft: '10px', marginBottom: '12px' }}>
            {UI_STATE_MAP[hostPayload.data.state]?.stamp ?? '—'}
          </div>
          {hostPayload.data.state !== 0 && hostPayload.data.host?.output && (
            <div style={{ fontFamily: SERIF, fontSize: '0.85rem', color: 'rgba(26,26,26,0.82)', lineHeight: 1.6, marginBottom: '12px' }}>
              {hostPayload.data.host.output}
            </div>
          )}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'SCORE', value: hostPayload.data.telemetry.score },
              { label: 'ROI',   value: hostPayload.data.telemetry.roi   },
              { label: 'U',     value: hostPayload.data.telemetry.u_score },
              { label: 'Cs',    value: hostPayload.data.telemetry.coherence },
            ].map(({ label, value }) => (
              <div key={label} style={{ fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.14em' }}>
                <span style={{ color: 'rgba(26,26,26,0.4)', textTransform: 'uppercase' }}>{label} </span>
                <span style={{ color: 'rgba(26,26,26,0.75)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={D.card}>
        <div style={D.label}>Definition</div>
        <div style={{ fontFamily: SERIF, fontSize: '1rem', fontWeight: 400, color: 'rgba(26,26,26,0.92)', lineHeight: 1.55 }}>{definition}</div>
      </div>

      <div style={{ ...D.card, padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'Origin', value: origin },
          { label: 'Usage',  value: usage  },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', gap: '16px', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,26,26,0.06)' : 'none', alignItems: 'flex-start' }}>
            <div style={{ ...D.label, marginBottom: 0, minWidth: '90px', paddingTop: '2px', flexShrink: 0 }}>{row.label}</div>
            <div style={{ ...D.bodyText, fontSize: '0.72rem' }}>{row.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <VineCard etr={resolvedData} />
        {/* WO-1026: traceability span count indicator */}
        {(() => {
          const spans = resolvedData?.traceability ?? [];
          if (!spans.length) return null;
          return (
            <div style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.18em', color: 'rgba(26,26,26,0.35)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#0096FF', opacity: 0.7 }}>◆</span>
              {spans.length} source span{spans.length !== 1 ? 's' : ''} — character-level
            </div>
          );
        })()}
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label, marginBottom: '12px' }}>Comments</div>
        {(resolvedData?.comments ?? []).length === 0 ? (
          <div style={{ ...D.bodyText, fontSize: '0.72rem', color: 'rgba(26,26,26,0.35)' }}>No evidence on record.</div>
        ) : ((resolvedData?.comments ?? []).map((c, i, arr) => (
          <div key={c.id ?? i} style={{ ...D.bodyText, fontSize: '0.72rem', marginBottom: i < arr.length - 1 ? '12px' : 0, paddingBottom: i < arr.length - 1 ? '12px' : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(26,26,26,0.06)' : 'none' }}>
            {c.text}
            <div style={{ fontSize: '0.58rem', color: 'rgba(26,26,26,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{c.source} · {c.date ?? c.timestamp?.slice(0, 10)}</div>
          </div>
        )))}
      </div>

      <CommentSection />

    </div>
  );
};

/* ── Ground Level — proof layer dashboard ────────────────────────── */

const PILLAR_LABELS = {
  trust:      'Trust',
  accuracy:   'Accuracy',
  gap:        'Gap',
  velocity:   'Velocity',
  expiration: 'Expiration',
  strength:   'Strength',
  alignment:  'Alignment',
};

const HalfGauge = ({ value = 0, label = 'Signal Score' }) => {
  const r  = 70;
  const cx = 100;
  const cy = 88;
  const t  = Math.min(0.999, Math.max(0.001, value / 100));

  const ex = cx - r * Math.cos(t * Math.PI);
  const ey = cy - r * Math.sin(t * Math.PI);
  const largeArc = t > 0.5 ? 1 : 0;

  const bgPath   = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
  const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;

  return (
    <svg viewBox="0 0 200 100" width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }}>
      <path d={bgPath}   fill="none" stroke="rgba(26,26,26,0.1)" strokeWidth={12} strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke={LIME}               strokeWidth={12} strokeLinecap="round" />
      <text x={cx} y={cy - 14} textAnchor="middle" fill="#1A1A1A"                   fontSize={26} fontWeight={700} fontFamily="-apple-system, sans-serif">{value}</text>
      <text x={cx} y={cy +  2} textAnchor="middle" fill="rgba(26,26,26,0.4)"        fontSize={7}  fontFamily="IBM Plex Mono, monospace" letterSpacing="2">{label}</text>
    </svg>
  );
};

const GroundLevelOracle = ({ data, categoryContext, oracleSignal }) => {
  const { state: prismState } = usePrism();
  const pillars = prismState.activeRefraction?.pillars ?? null;

  const D = {
    card:  { background: 'transparent', border: '1px solid rgba(26,26,26,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '12px' },
    label: { fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', marginBottom: '14px' },
  };

  // WO-1300: trustValue reads from OracleSignal boundary
  const trustValue = pillars?.trust ?? Math.round((oracleSignal?.value ?? data?.fs ?? 0) * 100);
  const trustDelta = trustValue - 50;
  const trustSign  = trustDelta >= 0 ? '+' : '';

  const pillarData = useMemo(() => {
    const p = pillars ?? {
      trust:      Math.round((data?.fs ?? 0) * 100),
      accuracy:   Math.round((data?.fidelity_components?.m_checksum  ?? 0) * 100),
      gap:        Math.round((1 - (data?.fidelity_components?.e_viral ?? 0)) * 100),
      velocity:   Math.round((data?.fidelity_components?.t_telemetry ?? 0) * 100),
      expiration: 0,
      strength:   0,
      alignment:  60,
    };
    return Object.entries(PILLAR_LABELS).map(([key, label]) => ({
      name:  label,
      key,
      value: p[key] ?? 0,
    }));
  }, [pillars, data]);

  const rankedData = useMemo(() =>
    [...pillarData].sort((a, b) => b.value - a.value),
  [pillarData]);

  const signalScore = useMemo(() => {
    const vals = pillarData.map(p => p.value);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [pillarData]);

  const dominant = rankedData[0];

  const tooltipStyle = {
    contentStyle: { background: '#F5F5F7', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 6, fontFamily: MONO, fontSize: 11 },
    labelStyle:   { color: 'rgba(26,26,26,0.5)' },
    itemStyle:    { color: LIME },
    cursor:       { fill: 'rgba(26,26,26,0.04)' },
  };

  // WO-1300: convergence state sourced from OracleSignal — no local re-derivation
  const groundConvergence = oracleSignal ?? { label: '—', theme: 'void_gray' };

  return (
    <div style={{ background: 'transparent', padding: '24px 20px 48px', fontFamily: MONO, overflowY: 'auto', maxHeight: 'calc(100dvh - 160px)', minHeight: 0, width: '100%', maxWidth: '520px', margin: '0 auto' }}>

      <div style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: CONVERGENCE_COLORS[groundConvergence.theme] ?? '#66FF00', marginBottom: '20px', opacity: 0.85 }}>
        {groundConvergence.label}
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label }}>Trust</div>
        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', fontSize: '2.8rem', fontWeight: 700, color: trustDelta >= 0 ? LIME : 'rgba(200,50,50,0.9)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {trustSign}{trustDelta}
        </div>
        <div style={{ ...D.label, marginTop: '10px', marginBottom: 0 }}>vs Neutral Baseline</div>
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label }}>Pillar Breakdown</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={pillarData} barCategoryGap="28%">
            <XAxis dataKey="name" tick={{ fontFamily: MONO, fontSize: 7.5, fill: 'rgba(26,26,26,0.45)', letterSpacing: '0.04em' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontFamily: MONO, fontSize: 8, fill: 'rgba(26,26,26,0.3)' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip cursor={tooltipStyle.cursor} contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} itemStyle={tooltipStyle.itemStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {pillarData.map((p, i) => (
                <Cell key={i} fill={p.key === dominant?.key ? LIME : 'rgba(26,26,26,0.14)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label }}>Pillar Ranking</div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={rankedData} layout="vertical" barCategoryGap="22%">
            <XAxis type="number" domain={[0, 100]} tick={{ fontFamily: MONO, fontSize: 8, fill: 'rgba(26,26,26,0.3)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontFamily: MONO, fontSize: 8, fill: 'rgba(26,26,26,0.45)' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={tooltipStyle.cursor} contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} itemStyle={tooltipStyle.itemStyle} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {rankedData.map((p, i) => (
                <Cell key={i} fill={i === 0 ? LIME : `rgba(26,26,26,${Math.max(0.08, 0.18 - i * 0.02)})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label }}>Signal Geometry</div>
        <ResponsiveContainer width="100%" height={210}>
          <RadarChart data={pillarData}>
            <PolarGrid stroke="rgba(26,26,26,0.08)" />
            <PolarAngleAxis dataKey="name" tick={{ fontFamily: MONO, fontSize: 8, fill: 'rgba(26,26,26,0.45)' }} />
            <Radar dataKey="value" stroke={LIME} fill={LIME} fillOpacity={0.12} dot={{ fill: LIME, r: 3 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...D.card }}>
        <div style={{ ...D.label }}>Pillar Share</div>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={pillarData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
            >
              {pillarData.map((p, i) => (
                <Cell key={i} fill={PILLAR_COLORS[i]} opacity={p.value === 0 ? 0.15 : 1} stroke={LIME} strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle.contentStyle} labelStyle={tooltipStyle.labelStyle} itemStyle={tooltipStyle.itemStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '8px', justifyContent: 'center' }}>
          {pillarData.map((p, i) => (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[i], flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: '0.58rem', color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em' }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...D.card, textAlign: 'center', marginBottom: 0 }}>
        <div style={{ ...D.label, textAlign: 'left' }}>Signal Strength</div>
        <HalfGauge value={signalScore} label="SIGNAL SCORE" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(26,26,26,0.06)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: '-apple-system, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#1A1A1A' }}>{dominant?.name ?? '—'}</div>
            <div style={{ fontFamily: MONO, fontSize: '0.52rem', color: 'rgba(26,26,26,0.35)', letterSpacing: '0.15em', marginTop: '4px' }}>Dominant Pillar</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: '-apple-system, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: LIME }}>{dominant?.value ?? 0}</div>
            <div style={{ fontFamily: MONO, fontSize: '0.52rem', color: 'rgba(26,26,26,0.35)', letterSpacing: '0.15em', marginTop: '4px' }}>Peak Value</div>
          </div>
        </div>
      </div>

    </div>
  );
};


/* ── Main Oracle View ────────────────────────────────────────────── */

// Signal is valid when it carries the raw fs/score field expected by sub-components.
const isValidSignal = (s) => s != null && typeof s === 'object' && ('fs' in s || 'score' in s);

function Oracleview({ query, canonical, data, signalMapData, lens, onLensSwitch, categoryContext, onReturn, hostPayload }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Resolve signal: valid raw signal → MOCK_SIGNAL. Never passes canonical shape through.
  const resolvedSignal = isValidSignal(data) ? data : MOCK_SIGNAL;

  // Unified view model — canonical-first, signal fallback, deterministic precedence.
  const view = useMemo(() => toOracleViewModel(canonical, resolvedSignal), [canonical, resolvedSignal]);

  const title   = view.title;
  const isMap   = lens === "Signal Map";
  const signals = signalMapData?.signals ?? [];

  // WO-1300 — single normalization boundary; applyHysteresis:true for display context
  const oracleSignal = useMemo(() => normalizeToOracleSignal(resolvedSignal, { applyHysteresis: true }), [resolvedSignal]);

  const avgFs = useMemo(() => {
    if (!signals.length) return 0;
    return signals.reduce((acc, s) => acc + (s.fs ?? 0), 0) / signals.length;
  }, [signals]);

  return (
    <div className={`oracle-viewport oracle-surface-panel${hydrated ? ' hydrated' : ''}`}>

      <div className="oracle-particle-layer">
        {!isMap && <KineticGravity isPaused={false} avgFs={avgFs} />}
      </div>

      <div className="oracle-ui-layer" style={
        isMap                    ? { background: 'transparent', pointerEvents: 'none', zIndex: 20, paddingTop: 'calc(4dvh + 130px)' } :
        lens === 'Ground Level'  ? { paddingTop: 'calc(4dvh + 130px)' } :
                                   { paddingTop: 'calc(4dvh + 130px)' }
      }>

        {lens === "10K View" && onReturn && (
          <div onClick={onReturn} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 30, padding: '10px 22px', background: 'transparent', border: '1px solid rgba(102,255,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(102,255,0,0.55)', cursor: 'pointer', borderRadius: '0', transition: 'border-color 150ms, color 150ms, background 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#66FF00'; e.currentTarget.style.color='#66FF00'; e.currentTarget.style.background='rgba(102,255,0,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(102,255,0,0.28)'; e.currentTarget.style.color='rgba(102,255,0,0.55)'; e.currentTarget.style.background='transparent'; }}
          >Reset</div>
        )}

        <div className="oracle-hero" style={{ position: 'fixed', top: '4dvh', left: '50%', transform: 'translateX(-50%)', zIndex: 30, textAlign: 'center' }}>
          <div style={{
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:         CONVERGENCE_COLORS[oracleSignal?.theme] ?? '#66FF00',
            marginBottom:  '6px',
            opacity:       0.9,
          }}>
            {oracleSignal?.state ?? '—'}
          </div>
          <h1 className="oracle-title">{title}</h1>
        </div>

        <div className="oracle-nav-wrapper" style={{ position: 'fixed', top: 'calc(4dvh + 36px)', left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'auto' }}>
          <div className="oracle-nav-track oracle-nav-track--light">
            {["10K View", "Ground Level", "Signal Map"].map((tab) => (
              <button
                key={tab}
                className={`oracle-nav-btn ${lens === tab ? "active" : ""}`}
                onClick={() => onLensSwitch(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {lens === "10K View" && (
          <TenKView
            data={resolvedSignal}
            categoryContext={categoryContext}
            loading={signalMapData?.loading}
            hostPayload={hostPayload}
            oracleSignal={oracleSignal}
          />
        )}

        {lens === "Ground Level" && (
          <GroundLevelOracle
            data={resolvedSignal}
            categoryContext={categoryContext}
            oracleSignal={oracleSignal}
          />
        )}

      </div>

      <div style={{ visibility: isMap ? 'visible' : 'hidden', pointerEvents: isMap ? 'auto' : 'none', position: 'fixed', inset: 0, zIndex: isMap ? 15 : -1 }}>
        <SignalMap signalMapData={signalMapData} data={data} isActive={isMap} />
      </div>

      <div style={{
        position:      'fixed',
        bottom:        '16px',
        right:         '20px',
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '12px',
        letterSpacing: '0.2em',
        color:         'rgba(26,26,26,0.2)',
        pointerEvents: 'none',
        zIndex:        50,
      }}>
        v78
      </div>

    </div>
  );
}

export default Oracleview;
