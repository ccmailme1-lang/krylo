// src/components/audit/auditworkspace.jsx
// WO-251 — KRYL-305: Audit Workspace — Deep Interrogation Panel
// KRYL-305 rev — ESC close, Fs history sparkline, corroboration links, challenge status

import React, { useEffect, useState } from 'react';

const FIDELITY_FIELDS = [
  { key: 'm_checksum',  label: 'M_CHECKSUM',  pct: '40%' },
  { key: 't_telemetry', label: 'T_TELEMETRY', pct: '30%' },
  { key: 'd_docs',      label: 'D_DOCS',      pct: '20%' },
  { key: 'v_voice',     label: 'V_VOICE',     pct: '9%'  },
  { key: 'e_viral',     label: 'E_VIRAL',     pct: '1%'  },
];

const POSTURE_STAGES = ['CALM', 'WATCH', 'HARDENED'];

const POSTURE_COLORS = {
  HARDENED:  '#E8F4FF',
  WATCH:     '#0096FF',
  CALM:      '#F5A623',
  CONFIRMED: '#00D4FF',
};

// ── Fidelity component bar ────────────────────────────────────────────────────
function FidelityBar({ field, value }) {
  const v     = value ?? 0;
  const color = v >= 0.70 ? '#E8F4FF' : v >= 0.40 ? '#0096FF' : '#F5A623';
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '108px 26px 1fr 44px',
      gap:                 '0 10px',
      alignItems:          'center',
      marginBottom:        '11px',
    }}>
      <span style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.38)', letterSpacing: '0.1em' }}>
        {field.label}
      </span>
      <span style={{ fontSize: '8px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.22)' }}>
        {field.pct}
      </span>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px' }}>
        <div style={{ width: `${v * 100}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {v.toFixed(2)}
      </span>
    </div>
  );
}

// ── Posture timeline ──────────────────────────────────────────────────────────
function PostureTimeline({ posture }) {
  const activeIdx = POSTURE_STAGES.indexOf(posture ?? 'CALM');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
      {POSTURE_STAGES.map((stage, i) => {
        const active  = i <= activeIdx;
        const current = i === activeIdx;
        const color   = POSTURE_COLORS[stage];
        return (
          <React.Fragment key={stage}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width:        '10px',
                height:       '10px',
                borderRadius: '50%',
                background:   active ? color : 'rgba(255,255,255,0.09)',
                border:       `2px solid ${current ? color : 'transparent'}`,
                boxShadow:    current ? `0 0 8px ${color}55` : 'none',
                transition:   'all 0.3s',
              }} />
              <span style={{
                fontSize:      '8px',
                fontFamily:    'IBM Plex Mono, monospace',
                letterSpacing: '0.1em',
                color:         current ? color : 'rgba(255,255,255,0.18)',
                fontWeight:    current ? 700 : 400,
              }}>
                {stage}
              </span>
            </div>
            {i < POSTURE_STAGES.length - 1 && (
              <div style={{
                flex:         1,
                height:       '1px',
                background:   i < activeIdx ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                margin:       '0 6px',
                marginBottom: '22px',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Fs History Sparkline (KRYL-305) ──────────────────────────────────────────
// Synthetic progression derived from fidelity components: each component
// contributes cumulatively as if data arrived in weighted order.
function FsSparkline({ fc }) {
  const weights  = [0.40, 0.30, 0.20, 0.09, 0.01];
  const keys     = ['m_checksum', 't_telemetry', 'd_docs', 'v_voice', 'e_viral'];
  const points   = keys.map((_, i) => {
    let sum = 0;
    for (let j = 0; j <= i; j++) sum += (fc[keys[j]] ?? 0) * weights[j];
    return sum;
  });
  const W = 200, H = 36, PAD = 4;
  const max = Math.max(...points, 0.01);
  const y   = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * W},${y(v).toFixed(1)}`).join(' ');
  const lastX = W, lastY = y(points[points.length - 1]);
  return (
    <div>
      <div style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.22)', letterSpacing: '0.2em', marginBottom: '10px' }}>
        Fs HISTORY
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke="#0096FF" strokeWidth="1.5" opacity="0.6" />
        <circle cx={lastX} cy={lastY} r="3" fill="#0096FF" />
      </svg>
    </div>
  );
}

// ── Corroboration Links (KRYL-305) ────────────────────────────────────────────
function CorroborationLinks({ fc }) {
  const sources = [
    { key: 'm_checksum',  label: 'Metadata Integrity' },
    { key: 't_telemetry', label: 'Telemetry Signal'   },
    { key: 'd_docs',      label: 'Document Chain'     },
    { key: 'v_voice',     label: 'Voice Corroboration' },
    { key: 'e_viral',     label: 'Viral Signal'       },
  ];
  return (
    <div>
      <div style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.22)', letterSpacing: '0.2em', marginBottom: '14px' }}>
        CORROBORATION LINKS
      </div>
      {sources.map(s => {
        const v          = fc[s.key] ?? 0;
        const corroborated = v >= 0.70;
        return (
          <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.5)' }}>
              {s.label}
            </span>
            <span style={{
              fontSize:      '9px',
              fontFamily:    'IBM Plex Mono, monospace',
              fontWeight:    corroborated ? 700 : 400,
              color:         corroborated ? '#0096FF' : 'rgba(232,244,255,0.2)',
              letterSpacing: '0.1em',
            }}>
              {corroborated ? '✓ CORROBORATED' : '○ PENDING'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Challenge Status (KRYL-305) ───────────────────────────────────────────────
function ChallengeStatus({ posture, fs }) {
  const entries = {
    CONFIRMED: { label: 'CONFIRMED',                detail: 'Forensically confirmed — immutable record', color: '#00D4FF' },
    HARDENED:  { label: 'CHALLENGE GATE PASSED',    detail: 'Signal hardened — awaiting confirmation',   color: '#E8F4FF' },
    WATCH:     { label: 'UNDER OBSERVATION',         detail: 'Signal flagged — challenge window open',    color: '#0096FF' },
    CALM:      { label: 'NO CHALLENGE ACTIVE',       detail: 'Signal below threshold',                   color: '#F5A623' },
  };
  const key    = fs >= 0.844 ? 'CONFIRMED' : (entries[posture] ? posture : 'CALM');
  const entry  = entries[key];
  return (
    <div>
      <div style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.22)', letterSpacing: '0.2em', marginBottom: '12px' }}>
        CHALLENGE STATUS
      </div>
      <div style={{
        padding:      '12px 14px',
        borderRadius: '4px',
        border:       `1px solid ${entry.color}22`,
        background:   `${entry.color}08`,
      }}>
        <div style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, letterSpacing: '0.12em', color: entry.color, marginBottom: '5px' }}>
          {entry.label}
        </div>
        <div style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(232,244,255,0.4)' }}>
          {entry.detail}
        </div>
      </div>
    </div>
  );
}

// ── Audit Workspace ───────────────────────────────────────────────────────────
export default function AuditWorkspace({ record, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // KRYL-305 — ESC key to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!record) return null;

  const fc           = record.fidelity_components ?? {};
  const fs           = record.fs ?? 0;
  const posture      = record.posture ?? 'CALM';
  const postureColor = POSTURE_COLORS[posture] ?? '#F5A623';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position:   'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.55)',
          opacity:    visible ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position:      'fixed', top: 0, right: 0, bottom: 0,
        width:         '480px',
        background:    '#000',
        borderLeft:    '1px solid rgba(232,244,255,0.08)',
        zIndex:        51,
        display:       'flex',
        flexDirection: 'column',
        transform:     visible ? 'translateX(0)' : 'translateX(100%)',
        transition:    'transform 300ms ease-in',
        overflowY:     'auto',
        fontFamily:    'IBM Plex Mono, monospace',
      }}>

        {/* 1. ETR Header */}
        <div style={{
          padding:       '24px 24px 20px',
          borderBottom:  '1px solid rgba(232,244,255,0.07)',
          display:       'flex',
          justifyContent: 'space-between',
          alignItems:    'flex-start',
        }}>
          <div style={{ flex: 1, marginRight: '12px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(232,244,255,0.28)', letterSpacing: '0.18em', marginBottom: '6px' }}>
              {(record.source_type ?? 'unknown').toUpperCase()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0096FF', letterSpacing: '0.08em', marginBottom: '10px' }}>
              {record.id}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(232,244,255,0.7)', lineHeight: 1.6, maxWidth: '360px' }}>
              {record.truth_statement ?? record.title ?? '—'}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none',
              color:      'rgba(232,244,255,0.35)',
              fontSize:   '16px', cursor: 'pointer',
              padding:    '2px 4px', lineHeight: 1,
              fontFamily: 'IBM Plex Mono, monospace',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* 2. Signal Score */}
        <div style={{
          padding:      '28px 24px 22px',
          borderBottom: '1px solid rgba(232,244,255,0.07)',
          display:      'flex',
          alignItems:   'center',
          gap:          '22px',
        }}>
          <div style={{
            fontSize:    '52px',
            fontWeight:  700,
            color:       postureColor,
            letterSpacing: '-0.02em',
            lineHeight:  1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fs.toFixed(3)}
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(232,244,255,0.28)', letterSpacing: '0.18em', marginBottom: '8px' }}>
              Fs SCORE
            </div>
            <span style={{
              fontSize:      '10px',
              fontWeight:    700,
              letterSpacing: '0.12em',
              color:         postureColor,
              padding:       '3px 10px',
              border:        `1px solid ${postureColor}33`,
              borderRadius:  '3px',
            }}>
              {posture}
            </span>
          </div>
        </div>

        {/* 3. Fidelity Breakdown */}
        <div style={{ padding: '24px 24px 8px', borderBottom: '1px solid rgba(232,244,255,0.07)' }}>
          <div style={{ fontSize: '9px', color: 'rgba(232,244,255,0.22)', letterSpacing: '0.2em', marginBottom: '18px' }}>
            FIDELITY BREAKDOWN
          </div>
          {FIDELITY_FIELDS.map(field => (
            <FidelityBar key={field.key} field={field} value={fc[field.key] ?? 0} />
          ))}
        </div>

        {/* 4. Fs History Sparkline */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(232,244,255,0.07)' }}>
          <FsSparkline fc={fc} />
        </div>

        {/* 5. Corroboration Links */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(232,244,255,0.07)' }}>
          <CorroborationLinks fc={fc} />
        </div>

        {/* 6. Challenge Status */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(232,244,255,0.07)' }}>
          <ChallengeStatus posture={posture} fs={fs} />
        </div>

        {/* 7. Posture Timeline */}
        <div style={{ padding: '22px 24px 32px' }}>
          <div style={{ fontSize: '9px', color: 'rgba(232,244,255,0.22)', letterSpacing: '0.2em', marginBottom: '18px' }}>
            POSTURE TIMELINE
          </div>
          <PostureTimeline posture={posture} />
        </div>

      </div>
    </>
  );
}
