// src/components/tenkvault.jsx
// WO-251 — KRYL-284: 10K Vault — Expert forensic table, Ablinq
// KRYL-284 — Paginated (50/page), filter by status, sort by any column
//            Columns: ID, Title, Fs, Age, Status, Tags
//            Row click → AuditWorkspace modal
// WO-277 — Audit Desk Metrics: five operator metrics in header
//           (Heartbeat, Velocity, Headroom, Reaction, Signal Strength)

import React, { useState, useMemo } from 'react';
import auditworkspace from './audit/auditworkspace.jsx';
import {
  evaluateThresholds,
  THRESHOLD_COLORS,
} from '../engine/thresholdevaluator.js';

// ── WO-1029 — Signal Foresight Layer ─────────────────────────────────────────
// Phase A: mock IPO event template
// ForesightScore = Σ(precursor_confidence × timing_weight) / detected_count
// Threshold: score >= 0.65 AND 3+ detected precursors

const IPO_PRECURSORS = [
  { tier: 1, label: 'ERP UPGRADE',     confidence: 0.72, timing_weight: 0.65, detected: true,  offset_days: -180 },
  { tier: 1, label: 'AUDIT COMMITTEE', confidence: 0.75, timing_weight: 0.78, detected: true,  offset_days: -150 },
  { tier: 1, label: 'BIG 4 RETAINED',  confidence: 0.88, timing_weight: 0.82, detected: true,  offset_days: -120 },
  { tier: 3, label: 'IPO COUNSEL',     confidence: 0.92, timing_weight: 0.92, detected: true,  offset_days: -90  },
  { tier: 0, label: 'CFO HIRE',        confidence: 0.85, timing_weight: 0.80, detected: true,  offset_days: -60  },
  { tier: 0, label: 'EXEC SILENCE',    confidence: 0.0,  timing_weight: 0.70, detected: false, offset_days: -20  },
  { tier: 4, label: 'S-1 FILING',      confidence: 0.0,  timing_weight: 1.0,  detected: false, offset_days: 0    },
];

const FORESIGHT_THRESHOLD   = 0.65;
const FORESIGHT_MIN_SIGNALS = 3;
const TIMELINE_SPAN         = 200; // days, from earliest precursor slot to terminus
const NOW_OFFSET            = -15; // days before terminus — current position in mock

function computeForesightScore(precursors) {
  const detected = precursors.filter(p => p.detected && p.confidence > 0);
  if (!detected.length) return 0;
  return detected.reduce((acc, p) => acc + p.confidence * p.timing_weight, 0) / detected.length;
}

function ForesightPanel({ precursors = IPO_PRECURSORS }) {
  const [open, setOpen] = useState(true);

  const score         = computeForesightScore(precursors);
  const detectedCount = precursors.filter(p => p.detected).length;
  const isTriggered   = score >= FORESIGHT_THRESHOLD && detectedCount >= FORESIGHT_MIN_SIGNALS;

  const W = 1000, H = 114;
  const railY  = 56;
  const xLeft  = 80, xRight = 940;
  const xRange = xRight - xLeft;

  const toX = (offset) => xLeft + ((offset + TIMELINE_SPAN) / TIMELINE_SPAN) * xRange;

  const nowX    = toX(NOW_OFFSET);
  const termX   = toX(0);
  const spread  = (1 - score) * 20;

  const bandPoly = [
    `${nowX},${railY - spread}`,
    `${termX},${railY - 4}`,
    `${termX},${railY + 4}`,
    `${nowX},${railY + spread}`,
  ].join(' ');

  const accentColor  = isTriggered ? '#66FF00'                  : 'rgba(255,255,255,0.4)';
  const accentFaint  = isTriggered ? 'rgba(102,255,0,0.08)'     : 'rgba(255,255,255,0.04)';
  const accentBorder = isTriggered ? 'rgba(102,255,0,0.3)'      : 'rgba(255,255,255,0.12)';
  const bandFill     = isTriggered ? 'rgba(102,255,0,0.06)'     : 'rgba(255,255,255,0.03)';

  return (
    <div style={{ borderBottom: '1px solid rgba(232,244,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 28px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(232,244,255,0.3)' }}>
            FORESIGHT
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', letterSpacing: '0.16em', padding: '2px 8px', border: `1px solid ${accentBorder}`, borderRadius: '2px', color: accentColor, background: accentFaint }}>
            {isTriggered ? 'TRIGGERED' : 'SCANNING'}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: 'rgba(232,244,255,0.25)', letterSpacing: '0.1em' }}>
            IPO HORIZON · {detectedCount}/{precursors.length} PRECURSORS · {(score * 100).toFixed(0)}% CONFIDENCE
          </span>
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: 'rgba(232,244,255,0.2)' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{ padding: '0 28px 18px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>

            {/* Confidence band */}
            <polygon points={bandPoly} fill={bandFill} stroke="none" />

            {/* Base rail */}
            <line x1={xLeft} y1={railY} x2={xRight} y2={railY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Projection: NOW → terminus */}
            <line x1={nowX} y1={railY} x2={termX} y2={railY} stroke={accentColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.35" />

            {/* NOW marker */}
            <line x1={nowX} y1={railY - 22} x2={nowX} y2={railY + 22} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x={nowX} y={railY - 26} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="IBM Plex Mono, monospace" letterSpacing="1">NOW</text>

            {/* Terminus marker */}
            <line x1={termX} y1={railY - 22} x2={termX} y2={railY + 22} stroke={accentColor} strokeWidth="1" opacity="0.45" />
            <text x={termX} y={railY - 26} textAnchor="middle" fill={accentColor} fontSize="7" fontFamily="IBM Plex Mono, monospace" letterSpacing="1" opacity="0.65">S-1</text>

            {/* Precursor nodes */}
            {precursors.map((p, i) => {
              const x      = toX(p.offset_days);
              const r      = p.detected ? 5 + p.confidence * 7 : 4;
              const fill   = p.detected ? accentColor : 'none';
              const stroke = p.detected ? accentColor : 'rgba(255,255,255,0.18)';
              const alpha  = p.detected ? 0.85 : 0.3;
              return (
                <g key={i} opacity={alpha}>
                  {p.detected && <circle cx={x} cy={railY} r={r + 5} fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.22" />}
                  <circle cx={x} cy={railY} r={r} fill={fill} stroke={stroke} strokeWidth="1" />
                  <text x={x} y={railY + r + 11} textAnchor="middle" fill="rgba(232,244,255,0.38)" fontSize="6" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">{p.label}</text>
                </g>
              );
            })}

            {/* Score progress bar */}
            <rect x={xLeft} y={railY + 34} width={xRange} height="3" fill="rgba(255,255,255,0.05)" rx="1.5" />
            <rect x={xLeft} y={railY + 34} width={xRange * Math.min(score, 1)} height="3" fill={accentColor} rx="1.5" opacity="0.65" />

            {/* Threshold tick */}
            <line x1={xLeft + xRange * FORESIGHT_THRESHOLD} y1={railY + 30} x2={xLeft + xRange * FORESIGHT_THRESHOLD} y2={railY + 40} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
            <text x={xLeft + xRange * FORESIGHT_THRESHOLD} y={railY + 49} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6" fontFamily="IBM Plex Mono, monospace">THRESHOLD</text>

          </svg>
        </div>
      )}
    </div>
  );
}

const AuditWorkspace = auditworkspace;

const PAGE_SIZE = 50;

const STATUS_FILTERS = ['ALL', 'CALM', 'WATCH', 'HARDENED', 'ALERT', 'CONFIRMED'];

const STATUS_COLORS = {
  CONFIRMED: '#00D4FF',
  ALERT:     '#FF6B6B',
  HARDENED:  '#E8F4FF',
  WATCH:     '#0096FF',
  CALM:      '#F5A623',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusFromFs(fs) {
  if (fs >= 0.844) return 'CONFIRMED';
  if (fs >= 0.70)  return 'HARDENED';
  if (fs >= 0.40)  return 'WATCH';
  return 'CALM';
}

function tagsFor(record) {
  const tags = [];
  if (record.source_type) tags.push(record.source_type.toUpperCase());
  const s = statusFromFs(record.fs ?? 0);
  if (s !== 'CALM') tags.push(s);
  return tags;
}

function ageLabel(record) {
  const ts = record.ingested_at ?? record.timestamp;
  if (!ts) return '—';
  const delta = Date.now() - new Date(ts).getTime();
  const m = Math.floor(delta / 60000);
  if (m < 1)  return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── WO-277 — Five Operator Metrics ────────────────────────────────────────────
//
// Heartbeat    — avg Fs across all records (resonance of the field)
// Velocity     — fraction of records at WATCH or above (active signal density)
// Headroom     — vault capacity remaining (%)
// Reaction     — confirmed / hardened ratio (how fast signals crystallize)
// Signal Strength — hardened + confirmed count (total high-fidelity records)

function computeOperatorMetrics(records) {
  const count = records.length;
  if (count === 0) {
    return {
      heartbeat:      null,
      velocity:       null,
      headroom:       100,
      reaction:       null,
      signalStrength: 0,
    };
  }

  const avgFs         = records.reduce((acc, r) => acc + (r.fs ?? 0), 0) / count;
  const activeCount   = records.filter(r => (r.fs ?? 0) >= 0.40).length;
  const hardenedCount = records.filter(r => (r.fs ?? 0) >= 0.70).length;
  const confirmedCount = records.filter(r => (r.fs ?? 0) >= 0.844).length;
  const headroom      = Math.max(0, 100 - (count / 10000) * 100);
  const velocity      = count > 0 ? activeCount / count : 0;
  const reaction      = hardenedCount > 0 ? confirmedCount / hardenedCount : 0;

  return {
    heartbeat:      avgFs,
    velocity,
    headroom,
    reaction,
    signalStrength: confirmedCount + hardenedCount,
  };
}

// ── Operator Metric Pill ───────────────────────────────────────────────────────
function MetricPill({ label, value, valueColor, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '110px' }}>
      <span style={{
        fontSize:      '8px',
        fontFamily:    'IBM Plex Mono, monospace',
        letterSpacing: '0.18em',
        color:         'rgba(232,244,255,0.22)',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontSize:      '14px',
        fontFamily:    'IBM Plex Mono, monospace',
        fontWeight:    700,
        color:         valueColor ?? 'rgba(232,244,255,0.85)',
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      {sub && (
        <span style={{
          fontSize:      '8px',
          fontFamily:    'IBM Plex Mono, monospace',
          color:         'rgba(232,244,255,0.2)',
          letterSpacing: '0.1em',
        }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────
const thStyle = {
  padding:       '10px 14px',
  fontSize:      '9px',
  fontWeight:    700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  borderBottom:  '1px solid rgba(255,255,255,0.07)',
  textAlign:     'left',
  whiteSpace:    'nowrap',
  fontFamily:    'IBM Plex Mono, monospace',
  cursor:        'pointer',
  userSelect:    'none',
};

const tdStyle = {
  padding:    '12px 14px',
  fontSize:   '11px',
  fontFamily: 'IBM Plex Mono, monospace',
  color:      'rgba(232,244,255,0.82)',
};

function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      style={{ ...thStyle, color: active ? 'rgba(232,244,255,0.6)' : 'rgba(255,255,255,0.22)' }}
      onClick={() => onSort(field)}
    >
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function TagPill({ tag }) {
  const color = STATUS_COLORS[tag] ?? 'rgba(232,244,255,0.25)';
  return (
    <span style={{
      fontFamily:    'IBM Plex Mono, monospace',
      fontSize:      '8px',
      letterSpacing: '0.1em',
      color,
      padding:       '2px 6px',
      border:        `1px solid ${color}44`,
      borderRadius:  '2px',
      marginRight:   '4px',
    }}>
      {tag}
    </span>
  );
}

// ── Vault Row ─────────────────────────────────────────────────────────────────
function VaultRow({ record, onSelect, isHovered, onHover, onLeave }) {
  const fs     = record.fs ?? 0;
  const status = statusFromFs(fs);
  const color  = STATUS_COLORS[status] ?? '#F5A623';
  const tags   = tagsFor(record);
  const title  = record.truth_statement ?? record.title ?? record.id ?? '—';

  return (
    <tr
      onClick={() => onSelect(record)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background:   isHovered ? 'rgba(0,150,255,0.06)' : 'transparent',
        cursor:       'pointer',
        transition:   'background 0.12s',
      }}
    >
      <td style={{ ...tdStyle, color: '#0096FF', fontWeight: 700 }}>{record.id}</td>
      <td style={{ ...tdStyle, color: 'rgba(232,244,255,0.65)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </td>
      <td style={{ ...tdStyle, color, fontVariantNumeric: 'tabular-nums' }}>
        {fs.toFixed(3)}
      </td>
      <td style={{ ...tdStyle, color: 'rgba(232,244,255,0.4)' }}>{ageLabel(record)}</td>
      <td style={tdStyle}>
        <span style={{
          fontSize:      '9px',
          fontWeight:    700,
          letterSpacing: '0.12em',
          color,
          padding:       '2px 8px',
          border:        `1px solid ${color}33`,
          borderRadius:  '3px',
        }}>
          {status}
        </span>
      </td>
      <td style={tdStyle}>
        {tags.map(t => <TagPill key={t} tag={t} />)}
      </td>
    </tr>
  );
}

// ── 10K Vault ─────────────────────────────────────────────────────────────────
export default function TenKVault({ score, data, records = [], onReturn }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filter,         setFilter]         = useState('ALL');
  const [sortField,      setSortField]      = useState('fs');
  const [sortDir,        setSortDir]        = useState('desc');
  const [page,           setPage]           = useState(0);
  const [hoveredIdx,     setHoveredIdx]     = useState(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleFilter = (f) => {
    setFilter(f);
    setPage(0);
    setHoveredIdx(null);
  };

  // WO-277 — Five operator metrics computed over all records
  const metrics = useMemo(() => computeOperatorMetrics(records), [records]);

  // Threshold coloring for heartbeat and velocity
  const thresholdStates = useMemo(() => {
    return evaluateThresholds({
      heartbeat:            metrics.heartbeat ?? 0,
      velocity:             metrics.velocity  ?? 0,
      velocityNegDuration:  0,
      headroom:             metrics.headroom,
    });
  }, [metrics]);

  // Filtered
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filter === 'ALL') return true;
      const s = statusFromFs(r.fs ?? 0);
      if (filter === 'ALERT') return s === 'CONFIRMED';
      return s === filter;
    });
  }, [records, filter]);

  // Sorted
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'id':     av = a.id    ?? ''; bv = b.id    ?? ''; break;
        case 'title':  av = (a.truth_statement ?? a.title ?? ''); bv = (b.truth_statement ?? b.title ?? ''); break;
        case 'age':    av = a.ingested_at ?? ''; bv = b.ingested_at ?? ''; break;
        case 'status': av = a.fs   ?? 0;  bv = b.fs    ?? 0;  break;
        default:       av = a.fs   ?? 0;  bv = b.fs    ?? 0;
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRecords = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{
      background:  '#111425',
      minHeight:   '100vh',
      width:       '100%',
      color:       'rgba(232,244,255,0.85)',
      fontFamily:  'IBM Plex Mono, monospace',
    }}>

      {/* Return button — top-right, returns to Layer 2 */}
      {onReturn && (
        <button
          onClick={onReturn}
          style={{
            position:      'fixed',
            top:           '20px',
            right:         '20px',
            zIndex:        20,
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '0.75rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            background:    '#fff',
            color:         '#1A1A1A',
            border:        '1px solid #1A1A1A',
            padding:       '8px 16px',
            cursor:        'pointer',
          }}
        >
          ← RETURN
        </button>
      )}

      {/* WO-277 — Five Operator Metrics Header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '20px 28px',
        borderBottom:   '1px solid rgba(232,244,255,0.07)',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(232,244,255,0.3)' }}>
          10K VAULT
        </span>
        <div style={{ display: 'flex', gap: '36px', alignItems: 'flex-start' }}>

          {/* Heartbeat — avg Fs (resonance) */}
          <MetricPill
            label="Heartbeat"
            value={metrics.heartbeat !== null ? metrics.heartbeat.toFixed(3) : '—'}
            valueColor={THRESHOLD_COLORS[thresholdStates.heartbeat]}
            sub="Avg Fs"
          />

          {/* Velocity — active signal ratio */}
          <MetricPill
            label="Velocity"
            value={metrics.velocity !== null ? `${Math.round(metrics.velocity * 100)}%` : '—'}
            valueColor={THRESHOLD_COLORS[thresholdStates.velocity]}
            sub="Active signals"
          />

          {/* Headroom — vault capacity */}
          <MetricPill
            label="Headroom"
            value={`${metrics.headroom.toFixed(1)}%`}
            valueColor={THRESHOLD_COLORS[thresholdStates.headroom]}
            sub="Vault capacity"
          />

          {/* Reaction — confirmed / hardened ratio */}
          <MetricPill
            label="Reaction"
            value={metrics.reaction !== null ? `${Math.round(metrics.reaction * 100)}%` : '—'}
            valueColor={
              metrics.reaction !== null
                ? metrics.reaction >= 0.5 ? THRESHOLD_COLORS.green
                : metrics.reaction >= 0.2 ? THRESHOLD_COLORS.amber
                : THRESHOLD_COLORS.red
                : undefined
            }
            sub="Confirmed / Hardened"
          />

          {/* Signal Strength — total confirmed + hardened */}
          <MetricPill
            label="Signal Strength"
            value={metrics.signalStrength}
            valueColor={
              metrics.signalStrength >= 10 ? THRESHOLD_COLORS.green
              : metrics.signalStrength >= 3 ? THRESHOLD_COLORS.amber
              : THRESHOLD_COLORS.red
            }
            sub="HARDENED + CONFIRMED"
          />

        </div>
      </div>

      {/* WO-1029 — Signal Foresight Layer */}
      <ForesightPanel />

      {/* Filter bar */}
      <div style={{
        display:    'flex',
        gap:        '6px',
        padding:    '14px 28px',
        borderBottom: '1px solid rgba(232,244,255,0.05)',
      }}>
        {STATUS_FILTERS.map(f => {
          const active = filter === f;
          const color  = STATUS_COLORS[f] ?? 'rgba(232,244,255,0.4)';
          return (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              style={{
                fontFamily:    'IBM Plex Mono, monospace',
                fontSize:      '9px',
                fontWeight:    active ? 700 : 400,
                letterSpacing: '0.12em',
                padding:       '4px 12px',
                borderRadius:  '3px',
                border:        `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
                background:    active ? `${color}15` : 'transparent',
                color:         active ? color : 'rgba(232,244,255,0.28)',
                cursor:        'pointer',
              }}
            >
              {f}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(232,244,255,0.2)', alignSelf: 'center' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{
            fontFamily:    'IBM Plex Mono, monospace',
            fontSize:      '11px',
            color:         'rgba(232,244,255,0.3)',
            letterSpacing: '0.2em',
            textAlign:     'center',
            padding:       '80px 0',
          }}>
            AWAITING SIGNAL
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <SortTh label="ID"     field="id"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Title"  field="title"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Fs"     field="fs"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Age"    field="age"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th style={{ ...thStyle, color: 'rgba(255,255,255,0.22)', cursor: 'default' }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, i) => (
                <VaultRow
                  key={record.id ?? i}
                  record={record}
                  onSelect={setSelectedRecord}
                  isHovered={hoveredIdx === i}
                  onHover={() => setHoveredIdx(i)}
                  onLeave={() => setHoveredIdx(null)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          alignItems:     'center',
          gap:            '12px',
          padding:        '20px',
          borderTop:      '1px solid rgba(232,244,255,0.05)',
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize:   '10px',
              background: 'transparent',
              border:     '1px solid rgba(232,244,255,0.12)',
              borderRadius: '3px',
              color:      page === 0 ? 'rgba(232,244,255,0.15)' : 'rgba(232,244,255,0.55)',
              padding:    '5px 12px',
              cursor:     page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← PREV
          </button>
          <span style={{ fontSize: '10px', color: 'rgba(232,244,255,0.3)', letterSpacing: '0.1em' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize:   '10px',
              background: 'transparent',
              border:     '1px solid rgba(232,244,255,0.12)',
              borderRadius: '3px',
              color:      page >= totalPages - 1 ? 'rgba(232,244,255,0.15)' : 'rgba(232,244,255,0.55)',
              padding:    '5px 12px',
              cursor:     page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            NEXT →
          </button>
        </div>
      )}

      {/* Audit Workspace modal */}
      {selectedRecord && (
        <AuditWorkspace
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

    </div>
  );
}
