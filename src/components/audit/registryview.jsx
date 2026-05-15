// src/components/audit/registryview.jsx
// WO-251 — KRYL-304: Registry View — Live Forensic Table
// KRYL-304 rev — Columns: ID, Fs, Sentiment, Velocity, Contamination, Status
//                Sortable per-column. Pulls from SharedSignalBus (records prop).
//                No pagination in v1.

import React, { useState, useMemo } from 'react';

// ── Label helpers ─────────────────────────────────────────────────────────────
function sentimentLabel(fs) {
  if (fs >= 0.80) return 'Confirmed';
  if (fs >= 0.60) return 'Aligned';
  if (fs >= 0.40) return 'Mixed';
  if (fs >= 0.20) return 'Weak';
  return 'Contested';
}

function velocityLabel(eViral) {
  if (eViral >= 0.80) return 'Surging';
  if (eViral >= 0.60) return 'Rising';
  if (eViral >= 0.40) return 'Stable';
  if (eViral >= 0.20) return 'Cooling';
  return 'Dormant';
}

function contaminationLabel(eViral) {
  if (eViral >= 0.80) return 'Critical';
  if (eViral >= 0.60) return 'High';
  if (eViral >= 0.40) return 'Moderate';
  if (eViral >= 0.20) return 'Low';
  return 'Clean';
}

function statusLabel(fs) {
  if (fs >= 0.844) return 'CONFIRMED';
  if (fs >= 0.70)  return 'HARDENED';
  if (fs >= 0.40)  return 'WATCH';
  return 'CALM';
}

const STATUS_COLORS = {
  CONFIRMED: '#E8F4FF',
  HARDENED:  '#E8F4FF',
  WATCH:     '#0096FF',
  CALM:      '#F5A623',
};

// ── Fs bar ────────────────────────────────────────────────────────────────────
function FsBar({ fs }) {
  const status = statusLabel(fs);
  const color  = STATUS_COLORS[status] ?? '#F5A623';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '56px', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', flexShrink: 0 }}>
        <div style={{ width: `${(fs ?? 0) * 100}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color, fontVariantNumeric: 'tabular-nums' }}>
        {(fs ?? 0).toFixed(3)}
      </span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ fs }) {
  const status = statusLabel(fs);
  const color  = STATUS_COLORS[status] ?? '#F5A623';
  return (
    <span style={{
      fontFamily:    'IBM Plex Mono, monospace',
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
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────
function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        ...th,
        cursor:    'pointer',
        color:     active ? 'rgba(232,244,255,0.6)' : 'rgba(255,255,255,0.22)',
        userSelect: 'none',
      }}
    >
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function RegistryRow({ record, onSelect, isHovered, onHover, onLeave }) {
  const fs     = record.fs ?? 0;
  const eViral = record.fidelity_components?.e_viral ?? 0;
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
      <td style={{ ...td, color: '#0096FF', fontWeight: 700 }}>{record.id}</td>
      <td style={td}><FsBar fs={fs} /></td>
      <td style={{ ...td, color: 'rgba(232,244,255,0.65)' }}>{sentimentLabel(fs)}</td>
      <td style={{ ...td, color: 'rgba(232,244,255,0.65)' }}>{velocityLabel(eViral)}</td>
      <td style={{ ...td, color: eViral >= 0.6 ? '#F5A623' : 'rgba(232,244,255,0.45)' }}>{contaminationLabel(eViral)}</td>
      <td style={td}><StatusBadge fs={fs} /></td>
    </tr>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const th = {
  padding:       '10px 16px',
  fontSize:      '9px',
  fontWeight:    700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color:         'rgba(255,255,255,0.22)',
  borderBottom:  '1px solid rgba(255,255,255,0.07)',
  textAlign:     'left',
  whiteSpace:    'nowrap',
  fontFamily:    'IBM Plex Mono, monospace',
};

const td = {
  padding:    '13px 16px',
  fontSize:   '11px',
  fontFamily: 'IBM Plex Mono, monospace',
  color:      'rgba(232,244,255,0.85)',
};

// ── Registry View ─────────────────────────────────────────────────────────────
export default function RegistryView({ records = [], onSelectRecord }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [sortField,  setSortField]  = useState('fs');
  const [sortDir,    setSortDir]    = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const getVal = (r) => {
      if (sortField === 'fs')            return r.fs ?? 0;
      if (sortField === 'sentiment')     return r.fs ?? 0;
      if (sortField === 'velocity')      return r.fidelity_components?.e_viral ?? 0;
      if (sortField === 'contamination') return r.fidelity_components?.e_viral ?? 0;
      if (sortField === 'status')        return r.fs ?? 0;
      if (sortField === 'id')            return r.id ?? '';
      return 0;
    };
    return [...records].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [records, sortField, sortDir]);

  if (!sorted.length) {
    return (
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
    );
  }

  return (
    <div style={{ background: '#000', width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
        <thead>
          <tr>
            <SortTh label="ID"            field="id"            sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Fs"            field="fs"            sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Sentiment"     field="sentiment"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Velocity"      field="velocity"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Contamination" field="contamination" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Status"        field="status"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((record, i) => (
            <RegistryRow
              key={record.id}
              record={record}
              onSelect={onSelectRecord ?? (() => {})}
              isHovered={hoveredIdx === i}
              onHover={() => setHoveredIdx(i)}
              onLeave={() => setHoveredIdx(null)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
