// src/components/tenkvault.jsx
// WO-251 — KRYL-284: 10K Vault — Expert forensic table, Ablinq
// KRYL-284 — Paginated (50/page), filter by status, sort by any column
//            Columns: ID, Title, Fs, Age, Status, Tags
//            Row click → AuditWorkspace modal

import React, { useState, useMemo } from 'react';
import auditworkspace from './audit/auditworkspace.jsx';

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

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{
        fontSize:      '8px',
        fontFamily:    'IBM Plex Mono, monospace',
        letterSpacing: '0.18em',
        color:         'rgba(232,244,255,0.22)',
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
export default function TenKVault({ score, data, records = [] }) {
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

  // Stats — computed over all records
  const stats = useMemo(() => {
    const count         = records.length;
    const avgFs         = count
      ? records.reduce((acc, r) => acc + (r.fs ?? 0), 0) / count
      : null;
    const hardenedCount = records.filter(r => (r.fs ?? 0) >= 0.70).length;
    const headroom      = Math.max(0, 100 - (count / 10000) * 100);
    return { count, avgFs, hardenedCount, headroom };
  }, [records]);

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

  const totalPages   = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRecords  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{
      background:  '#000',
      minHeight:   '100vh',
      width:       '100%',
      color:       'rgba(232,244,255,0.85)',
      fontFamily:  'IBM Plex Mono, monospace',
    }}>

      {/* Stats header */}
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
        <div style={{ display: 'flex', gap: '44px' }}>
          <StatPill label="ETR COUNT" value={stats.count} />
          <StatPill
            label="AVG Fs"
            value={stats.avgFs !== null ? stats.avgFs.toFixed(3) : '—'}
          />
          <StatPill label="HARDENED" value={stats.hardenedCount} />
          <StatPill
            label="HEADROOM"
            value={`${stats.headroom.toFixed(1)}%`}
            valueColor={stats.headroom > 30 ? '#00b894' : stats.headroom > 10 ? '#F5A623' : '#FF6B6B'}
          />
        </div>
      </div>

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
