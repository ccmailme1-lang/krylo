// WO-1322 — History Bay: telemetry log as audit trail (SAB Architect_03 patch)
// Source of truth: getTelemetryLog() — session_open events + per-session traversal chain.
import React, { useState, useEffect, useCallback } from 'react';
import HelpMark from '../shared/helpmark.jsx';
import { useUIStore }        from '../../store/useuistore.js';
import { useAnalysisStore }  from '../../store/useanalysisstore.js';
import { getTelemetryLog }   from '../../engine/telemetry.js';
import { shouldPersist }     from '../../engine/persistencepolicy.js';
import { getDriftLog }       from '../../engine/driftmonitor.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Playfair Display', serif";
const LIME   = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

// Canonical lifecycle order for traversal display
const LIFECYCLE = [
  'session_open',
  'ingestion_start',
  'ingestion_complete',
  'projection_generated',
  'action_dispatched',
  'action_resolved',
];

const LABELS = {
  session_open:         'OPEN',
  ingestion_start:      'INGEST↑',
  ingestion_complete:   'INGEST✓',
  projection_generated: 'PROJ',
  action_dispatched:    'DISPATCH',
  action_resolved:      'RESOLVE',
};

const LENS_TYPE = {
  '10K View':    'ORACLE',
  'Ground Level':'ORACLE',
  'Signal Map':  'SIGNAL',
  'Analysis':    'ANALYSIS',
};

// ts = creation timestamp (epoch ms) — same default field live sessions already carry via s.createdAt.
// Seeded here across ~12 days so the date-range filter has something real to filter.
const NOW = Date.now();
const DAY = 86400000;
const SEED_TRANSACTIONS = [
  { type: 'SEARCH',         subject: 'Series B cap table restructuring signals', context: 'INVESTOR',  horizon: 'SHORT',      ts: NOW - 0.4 * DAY, status: 'COMPLETE' },
  { type: 'ORACLE',         subject: 'Acme Corp — 10K audit desk opened',        context: 'INVESTOR',  horizon: 'MEDIUM',     ts: NOW - 0.5 * DAY, status: 'COMPLETE' },
  { type: 'MODEL',          subject: 'Revenue recognition divergence',            context: 'LEGAL',     horizon: 'IMMEDIATE',  ts: NOW - 1.1 * DAY, status: 'COMPLETE' },
  { type: 'PROFILE UPDATE', subject: 'Default lens → INVESTOR',                  context: 'SETTINGS',  horizon: '—',          ts: NOW - 2   * DAY, status: 'SAVED'    },
  { type: 'SEARCH',         subject: 'Debt instrument SPV trace',                 context: 'LEGAL',     horizon: 'MEDIUM',     ts: NOW - 3.4 * DAY, status: 'COMPLETE' },
  { type: 'LENS CHANGE',    subject: 'RETIREMENT → INVESTOR',                    context: 'SESSION',   horizon: '—',          ts: NOW - 4   * DAY, status: 'APPLIED'  },
  { type: 'SEARCH',         subject: 'Labor market tightening — CAREER vertical', context: 'CAREER',    horizon: 'LONG',       ts: NOW - 5.5 * DAY, status: 'COMPLETE' },
  { type: 'SYSTEM',         subject: 'Signal Map session closed — 12 nodes',      context: 'SURFACE',   horizon: '—',          ts: NOW - 6   * DAY, status: 'LOGGED'   },
  { type: 'ORACLE',         subject: 'Benchmark Holdings — ground level view',    context: 'INVESTOR',  horizon: 'SHORT',      ts: NOW - 8   * DAY, status: 'COMPLETE' },
  { type: 'PROFILE UPDATE', subject: 'Temporal horizon default → SHORT',          context: 'SETTINGS',  horizon: '—',          ts: NOW - 9.5 * DAY, status: 'SAVED'    },
  { type: 'SYSTEM',         subject: 'Premium brief unlocked',                    context: 'TIER',      horizon: '—',          ts: NOW - 12  * DAY, status: 'ACTIVE'   },
];

function buildTransactions(sessions) {
  const live = Object.values(sessions)
    .filter(s => s.query)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .map(s => ({
      type:    LENS_TYPE[s.lens] ?? 'SEARCH',
      subject: s.query,
      context: s.lens ?? '—',
      horizon: s.tensor?.temporal_horizon?.horizon ?? '—',
      ts:      s.createdAt ?? Date.now(),
      status:  'COMPLETE',
      signal:  s.tensor ?? null,
    }))
    .filter(e => shouldPersist(e));
  return live.length > 0 ? live : SEED_TRANSACTIONS;
}

const SOURCE_LABEL = {
  'krylo-submit':      'SUBMIT',
  'cone-search':       'CONE',
  'arc-interaction':   'ARC',
  'ingestion-builder': 'ANALYSIS',
};

function formatTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeOnly(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z';
}

// RANGE_PRESETS — shared date-range filter for both tables on this page
const RANGE_PRESETS = {
  today: { label: 'TODAY',       ms: 1  * DAY },
  '7d':  { label: 'LAST 7D',    ms: 7  * DAY },
  '30d': { label: 'LAST 30D',   ms: 30 * DAY },
  all:   { label: 'ALL TIME',   ms: Infinity },
};

// customRange = { start: epoch ms (start of day), end: epoch ms (end of day) } | null
function inRange(ts, rangeKey, customRange) {
  if (customRange) {
    const t = ts ?? 0;
    return t >= customRange.start && t <= customRange.end;
  }
  const preset = RANGE_PRESETS[rangeKey];
  if (!preset || preset.ms === Infinity) return true;
  return (ts ?? 0) >= Date.now() - preset.ms;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function startOfDay(d)  { const x = new Date(d); x.setHours(0,0,0,0);       return x.getTime(); }
function endOfDay(d)    { const x = new Date(d); x.setHours(23,59,59,999);   return x.getTime(); }
function sameDay(a, b)  { if (!a || !b) return false; const da = new Date(a), db = new Date(b); return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate(); }

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_NAMES   = ['M','T','W','T','F','S','S'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  // 0=Sun…6=Sat → convert to Mon-based: Mon=0…Sun=6
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function CalendarPanel({ rangeKey, setRangeKey, customRange, setCustomRange }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pickStart, setPickStart] = useState(null); // epoch ms of first click
  const [hovDay,    setHovDay]    = useState(null); // epoch ms of hovered day

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const handleDayClick = (dayMs) => {
    if (!pickStart) {
      setPickStart(dayMs);
      setCustomRange(null);
    } else {
      const s = Math.min(pickStart, dayMs);
      const e = Math.max(pickStart, dayMs);
      setCustomRange({ start: startOfDay(s), end: endOfDay(e) });
      setPickStart(null);
      setRangeKey(null);
    }
  };

  const selectPreset = (key) => {
    setRangeKey(key);
    setCustomRange(null);
    setPickStart(null);
  };

  // Determine range highlight bounds for rendering
  const rangeStart = customRange?.start ?? (pickStart && hovDay ? Math.min(pickStart, hovDay) : pickStart);
  const rangeEnd   = customRange?.end   ?? (pickStart && hovDay ? Math.max(pickStart, hovDay) : null);

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear, viewMonth, d).getTime());
  }

  const isToday   = (ms) => ms && sameDay(ms, today.getTime());
  const isStart   = (ms) => ms && (sameDay(ms, rangeStart) || sameDay(ms, pickStart));
  const isEnd     = (ms) => ms && rangeEnd && sameDay(ms, rangeEnd);
  const inSelRange = (ms) => ms && rangeStart && rangeEnd && ms >= startOfDay(rangeStart) && ms <= endOfDay(rangeEnd);
  const isPicking = !!pickStart;

  const rangeLabel = (() => {
    if (customRange) {
      const fmt = (ms) => new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `${fmt(customRange.start)} → ${fmt(customRange.end)}`;
    }
    if (pickStart) return 'SELECT END DATE';
    return null;
  })();

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'16px 14px', gap:0 }}>

      {/* Preset pills */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:16 }}>
        {Object.entries(RANGE_PRESETS).map(([key, p]) => {
          const active = !customRange && !pickStart && rangeKey === key;
          return (
            <button key={key} onClick={() => selectPreset(key)} style={{
              fontFamily: MONO, fontSize: 9, letterSpacing:'0.16em',
              background: 'transparent',
              border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.1)'}`,
              color: active ? LIME : 'rgba(255,255,255,0.35)',
              padding:'4px 8px', cursor:'pointer',
            }}>{p.label}</button>
          );
        })}
      </div>

      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick={prevMonth} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontFamily:MONO, fontSize:10, padding:'0 4px' }}>‹</button>
        <span style={{ fontFamily:MONO, fontSize:8, letterSpacing:'0.2em', color:'rgba(255,255,255,0.55)' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontFamily:MONO, fontSize:10, padding:'0 4px' }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
        {DAY_NAMES.map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontFamily:MONO, fontSize:6, letterSpacing:'0.1em', color:'rgba(255,255,255,0.22)', paddingBottom:4 }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px 0' }}>
        {cells.map((ms, i) => {
          if (!ms) return <div key={i} />;
          const start   = isStart(ms);
          const end     = isEnd(ms);
          const inRange = inSelRange(ms);
          const todayDay = isToday(ms);
          const future  = ms > endOfDay(today.getTime());
          return (
            <div
              key={i}
              onClick={() => !future && handleDayClick(ms)}
              onMouseEnter={() => isPicking && setHovDay(ms)}
              onMouseLeave={() => isPicking && setHovDay(null)}
              style={{
                textAlign:'center', padding:'4px 0', cursor: future ? 'default' : 'pointer',
                background: (start || end) ? LIME : inRange ? 'rgba(102,255,0,0.08)' : 'transparent',
                borderRadius: 1,
              }}
            >
              <span style={{
                fontFamily: MONO, fontSize: 8,
                color: (start || end) ? '#000' : inRange ? 'rgba(102,255,0,0.8)' : future ? 'rgba(255,255,255,0.12)' : todayDay ? LIME : 'rgba(255,255,255,0.45)',
                fontWeight: todayDay && !(start||end) ? 'bold' : 'normal',
              }}>
                {new Date(ms).getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Range label / instruction */}
      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        {rangeLabel ? (
          <div style={{ fontFamily:MONO, fontSize:7, letterSpacing:'0.12em', color: customRange ? LIME : 'rgba(255,255,255,0.35)' }}>
            {rangeLabel}
          </div>
        ) : (
          <div style={{ fontFamily:MONO, fontSize:7, letterSpacing:'0.12em', color:'rgba(255,255,255,0.18)' }}>
            CLICK A DAY TO START
          </div>
        )}
        {customRange && (
          <button onClick={() => { setCustomRange(null); setRangeKey('7d'); }} style={{
            marginTop:8, fontFamily:MONO, fontSize:6, letterSpacing:'0.14em',
            background:'transparent', border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.3)', padding:'3px 8px', cursor:'pointer',
          }}>CLEAR</button>
        )}
      </div>

    </div>
  );
}

// Generic column sort — toggles asc/desc on repeat clicks of the same key
function sortRows(rows, sortState, accessors) {
  const get = accessors[sortState.key];
  if (!get) return rows;
  const dir = sortState.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = get(a), bv = get(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
    return 0;
  });
}

function nextSortState(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: 'desc' };
}

// CSV export — audit-grade ISO timestamps, ASCII-safe quoting
function buildTransactionsCSV(rows) {
  const header = ['Date', 'Type', 'Subject', 'Context', 'Horizon', 'Status'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(esc).join(',')];
  for (const r of rows) {
    lines.push([
      r.ts ? new Date(r.ts).toISOString() : '',
      r.type, r.subject, r.context, r.horizon, r.status,
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

function downloadTransactionsCSV(rows) {
  const blob = new Blob(['﻿' + buildTransactionsCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `krylo-transaction-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({ columns, sort, onSort, gridTemplateColumns }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns, alignItems: 'center', gap: 12,
      padding: '0 0 8px', marginBottom: 4, borderBottom: `1px solid ${BORDER}`,
    }}>
      {columns.map(col => (
        <div
          key={col.label}
          onClick={col.key ? () => onSort(col.key) : undefined}
          style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em',
            color: sort.key === col.key ? LIME : 'rgba(255,255,255,0.3)',
            cursor: col.key ? 'pointer' : 'default',
            textAlign: col.align ?? 'left', userSelect: 'none',
          }}
        >
          {col.label}{col.key && sort.key === col.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
        </div>
      ))}
    </div>
  );
}

// Build per-session entries from the raw telemetry log
function buildHistory(log) {
  const sessionMap = new Map(); // sessionId → { open event, events[] }

  for (const ev of log) {
    if (!ev.sessionId) continue;
    if (!sessionMap.has(ev.sessionId)) {
      sessionMap.set(ev.sessionId, { open: null, events: [] });
    }
    const entry = sessionMap.get(ev.sessionId);
    if (ev.type === 'session_open') entry.open = ev;
    entry.events.push(ev.type);
  }

  return Array.from(sessionMap.values())
    .filter(e => e.open)
    .map(e => {
      const traversal = LIFECYCLE.filter(step => e.events.includes(step));
      const complete  = LIFECYCLE.every(step => e.events.includes(step));
      const driftCount = getDriftLog(e.open.sessionId).length;
      return {
        sessionId:  e.open.sessionId,
        query:      e.open.query ?? '—',
        source:     e.open.source ?? 'unknown',
        ts:         e.open.timestamp ?? e.open._emittedAt,
        traversal,
        eventCount: e.events.length,
        complete,
        driftCount,
      };
    })
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
}

// ── Traversal Chain ───────────────────────────────────────────────────────────

function TraversalChain({ traversal }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
      {LIFECYCLE.map((step, i) => {
        const hit = traversal.includes(step);
        return (
          <React.Fragment key={step}>
            <span style={{
              fontFamily: MONO, fontSize: 6, letterSpacing: '0.1em',
              color: hit ? LIME : 'rgba(255,255,255,0.15)',
              transition: 'color 150ms',
            }}>
              {LABELS[step]}
            </span>
            {i < LIFECYCLE.length - 1 && (
              <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 6 }}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Type icon box ─────────────────────────────────────────────────────────────

function TypeBox({ code }) {
  return (
    <div style={{
      width: 38, height: 38, flexShrink: 0,
      border: `1px solid rgba(255,255,255,0.08)`,
      background: 'rgba(255,255,255,0.03)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
        {code}
      </span>
    </div>
  );
}

// ── Shared grid column template ───────────────────────────────────────────────
const GRID_COLS = '48px 72px 52px 1fr 110px 80px 96px';
const CELL = { fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// cols: array of { label, key } — key null = not sortable
function ColHeaders({ cols, sort, onSort }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: GRID_COLS, gap: '0 16px',
      padding: '0 0 7px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 2,
    }}>
      {cols.map(({ label, key }) => {
        const active = sort && key && sort.key === key;
        const sortable = !!key;
        return (
          <span
            key={label}
            onClick={sortable ? () => onSort(key) : undefined}
            style={{
              ...CELL, fontSize: 9, letterSpacing: '0.18em',
              color: active ? LIME : 'rgba(255,255,255,0.18)',
              cursor: sortable ? 'pointer' : 'default',
              userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {label}
            {sortable && (
              <span style={{ opacity: active ? 1 : 0.3 }}>
                {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▽'}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────

function HistoryRow({ entry, index, active, onHover, onRerun }) {
  const srcLabel = SOURCE_LABEL[entry.source] ?? (entry.source ?? 'UNK').toUpperCase();
  const typeCode = srcLabel.slice(0, 3);
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_COLS, gap: '0 16px',
        alignItems: 'center', padding: '8px 0',
        background: active ? 'rgba(102,255,0,0.03)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
      }}
    >
      <TypeBox code={typeCode} />
      <span style={{ ...CELL, color: 'rgba(255,255,255,0.38)' }}>{formatDate(entry.ts)}</span>
      <span style={{ ...CELL, color: 'rgba(255,255,255,0.25)' }}>{formatTimeOnly(entry.ts)}</span>
      <span style={{ fontFamily: SERIF, fontSize: 13, color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 150ms' }}>
        {entry.query}
      </span>
      {/* traversal */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', overflow: 'hidden' }}>
        {LIFECYCLE.map((step, i) => {
          const hit = entry.traversal.includes(step);
          return (
            <React.Fragment key={step}>
              <span style={{ fontFamily: MONO, fontSize: 6, color: hit ? 'rgba(102,255,0,0.65)' : 'rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                {LABELS[step]}
              </span>
              {i < LIFECYCLE.length - 1 && <span style={{ color: 'rgba(255,255,255,0.06)', fontSize: 6 }}>›</span>}
            </React.Fragment>
          );
        })}
      </div>
      {/* drift */}
      <div>
        {entry.driftCount > 0 && (
          <span style={{ ...CELL, fontSize: 9, color: '#007FFF', border: '1px solid rgba(0,127,255,0.25)', padding: '1px 5px' }}>
            DRIFT {entry.driftCount}
          </span>
        )}
      </div>
      {/* status + rerun */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...CELL, color: LIME, letterSpacing: '0.1em' }}>
          {entry.complete ? 'COMPLETE' : 'INCOMPLETE'}
        </span>
        {active && (
          <button onClick={() => onRerun(entry)} style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
            background: 'transparent', border: `1px solid ${LIME}`,
            color: LIME, padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
          }}>RE-RUN</button>
        )}
      </div>
    </div>
  );
}

// ── HistoryBay ────────────────────────────────────────────────────────────────

export default function HistoryBay({ onRerunNavigate }) {
  const [hoveredIdx,   setHovered]     = useState(null);
  const [history,      setHistory]     = useState(() => buildHistory(getTelemetryLog()));
  const [rangeKey,     setRangeKey]    = useState('7d');
  const [customRange,  setCustomRange] = useState(null);
  const [histSort,     setHistSort]    = useState({ key: 'ts', dir: 'desc' });
  const [txSort,       setTxSort]      = useState({ key: 'ts', dir: 'desc' });

  const setSwipeIndex  = useUIStore(s => s.setSwipeIndex);
  const createSession  = useAnalysisStore(s => s.createSession);
  const sessions       = useAnalysisStore(s => s.sessions);
  const transactions   = buildTransactions(sessions);

  // Poll telemetry log every 2s — module-level array, not React state
  useEffect(() => {
    const id = setInterval(() => {
      setHistory(buildHistory(getTelemetryLog()));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const handleRerun = useCallback((entry) => {
    const id = `session-${Date.now()}`;
    createSession(id, 'OPEN', entry.query);
    setSwipeIndex(1);
    onRerunNavigate?.();
  }, [createSession, setSwipeIndex, onRerunNavigate]);

  const visibleHistory = sortRows(
    history.filter(e => inRange(e.ts, rangeKey, customRange)),
    histSort,
    { ts: e => e.ts ?? 0, date: e => { const d = new Date(e.ts ?? 0); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }, time: e => { const d = new Date(e.ts ?? 0); return d.getHours() * 60 + d.getMinutes(); }, type: e => (SOURCE_LABEL[e.source] ?? (e.source ?? '')).toUpperCase(), query: e => (e.query ?? '').toLowerCase(), status: e => e.complete ? 1 : 0 },
  );

  const visibleTransactions = sortRows(
    transactions.filter(t => inRange(t.ts, rangeKey, customRange)),
    txSort,
    { ts: t => t.ts ?? 0, date: t => { const d = new Date(t.ts ?? 0); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }, time: t => { const d = new Date(t.ts ?? 0); return d.getHours() * 60 + d.getMinutes(); }, type: t => t.type, status: t => t.status },
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO,
    }}>

      {/* Header — columns mirror body layout */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}>
        {/* Align with calendar left panel */}
        <div style={{ width: 296, flexShrink: 0 }} />
        {/* Align with center records panel */}
        <div style={{ flex: 1, padding: '16px 24px 12px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: 4, display:'flex', alignItems:'center' }}>
            INVESTIGATION HISTORY<HelpMark text="Every search you've run before, saved here so you can revisit or re-run it." />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 16 }}>
            {visibleHistory.length} SESSION{visibleHistory.length !== 1 ? 'S' : ''} · AUDIT TRAIL
          </div>
          {/* Big stats */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 24 }}>
            {[
              { value: visibleHistory.length,                                                                                            label: 'SESSIONS'     },
              { value: visibleTransactions.length,                                                                                       label: 'TRANSACTIONS' },
              { value: [...visibleHistory.filter(e => e.complete), ...visibleTransactions.filter(t => t.status === 'COMPLETE')].length,  label: 'COMPLETE'     },
              { value: visibleHistory.reduce((acc, e) => acc + (e.driftCount ?? 0), 0),                                                 label: 'DRIFT EVENTS' },
            ].map(({ value, label }, i) => (
              <div key={label} style={{
                flex: '0 0 auto', background: '#000000', border: `1px solid ${BORDER}`,
                padding: '14px 18px',
              }}>
                <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", fontSize: 36, fontWeight: 700, color: i % 2 === 0 ? LIME : '#007FFF', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {String(value).padStart(2, '0')}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.12em', marginTop: 5 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Align with right export panel */}
        <div style={{ width: 264, flexShrink: 0, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.18em' }}>
            LIVE · 2s
          </div>
        </div>
      </div>

      {/* Body row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — calendar date filter */}
        <div style={{
          width: 296, flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto',
        }}>
          <CalendarPanel
            rangeKey={rangeKey}
            setRangeKey={setRangeKey}
            customRange={customRange}
            setCustomRange={setCustomRange}
          />
        </div>

        {/* Main list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          <div>

          {visibleHistory.length === 0 ? (
            <div style={{ paddingTop: 16, display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.22em' }}>
                NO TELEMETRY RECORDED
              </div>
              <span
                onClick={() => setSwipeIndex(0)}
                style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: LIME, cursor: 'pointer', opacity: 0.7 }}
              >
                GO TO ANALYSIS →
              </span>
            </div>
          ) : (
            <div>
              <ColHeaders
                cols={[
                  { label: 'TYPE',      key: 'type' },
                  { label: 'DATE',      key: 'date' },
                  { label: 'TIME',      key: 'time' },
                  { label: 'QUERY',     key: null   },
                  { label: 'TRAVERSAL', key: null   },
                  { label: 'DRIFT',     key: null   },
                  { label: 'STATUS',    key: null   },
                ]}
                sort={histSort}
                onSort={k => setHistSort(s => nextSortState(s, k))}
              />
              {visibleHistory.map((entry, i) => (
                <HistoryRow
                  key={entry.sessionId}
                  entry={entry}
                  index={i}
                  active={hoveredIdx === i}
                  onHover={v => setHovered(v ? i : null)}
                  onRerun={handleRerun}
                />
              ))}
            </div>
          )}

          {/* Transaction History */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: 14, display:'flex', alignItems:'center' }}>
              TRANSACTION HISTORY<HelpMark text="A record of any paid or credit-based actions you've made." />
            </div>
            {visibleTransactions.length === 0 ? (
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em', paddingTop: 12 }}>
                NO TRANSACTIONS RECORDED
              </div>
            ) : (
              <>
                <ColHeaders
                  cols={[
                    { label: 'TYPE',    key: 'type' },
                    { label: 'DATE',    key: 'date' },
                    { label: 'TIME',    key: 'time' },
                    { label: 'SUBJECT', key: null   },
                    { label: 'CONTEXT', key: null   },
                    { label: 'HORIZON', key: null   },
                    { label: 'STATUS',  key: null   },
                  ]}
                  sort={txSort}
                  onSort={k => setTxSort(s => nextSortState(s, k))}
                />
                {visibleTransactions.map((item, i) => {
                  const typeCode = item.type.slice(0, 3);
                  const statusColor = LIME;
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: GRID_COLS, gap: '0 16px',
                      alignItems: 'center', padding: '8px 0',
                    }}>
                      <TypeBox code={typeCode} />
                      <span style={{ ...CELL, color: 'rgba(255,255,255,0.38)' }}>{formatDate(item.ts)}</span>
                      <span style={{ ...CELL, color: 'rgba(255,255,255,0.25)' }}>{formatTimeOnly(item.ts)}</span>
                      <span style={{ fontFamily: SERIF, fontSize: 13, color: 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subject}
                      </span>
                      <span style={{ ...CELL, color: 'rgba(255,255,255,0.35)' }}>{item.context !== '—' ? item.context : ''}</span>
                      <span style={{ ...CELL, color: 'rgba(255,255,255,0.25)' }}>{item.horizon !== '—' ? item.horizon : ''}</span>
                      <span style={{ ...CELL, color: statusColor, letterSpacing: '0.1em' }}>{item.status}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

        </div>{/* /centering wrapper */}
        </div>{/* /main list */}

        {/* Right panel — Export utility */}
        <div style={{
          width: 264, flexShrink: 0,
          borderLeft: `1px solid ${BORDER}`,
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase', display:'flex', alignItems:'center' }}>
              Export & Save<HelpMark text="Download your history or save it, so you don't lose it." />
            </div>
          </div>

          <div style={{ padding: '16px 18px 24px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.16em', marginBottom: 10 }}>
              EXPORT TRANSACTIONS
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, marginBottom: 16 }}>
              {visibleTransactions.length} record{visibleTransactions.length !== 1 ? 's' : ''} in view.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => downloadTransactionsCSV(visibleTransactions)}
                disabled={visibleTransactions.length === 0}
                style={{
                  flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                  background: 'transparent', border: `1px solid rgba(102,255,0,0.35)`,
                  color: LIME, padding: '9px 0', cursor: visibleTransactions.length === 0 ? 'default' : 'pointer',
                  opacity: visibleTransactions.length === 0 ? 0.35 : 1,
                }}
              >⬇ EXPORT</button>
              <button
                onClick={() => { if (navigator.share) { navigator.share({ title: 'KRYLO History', text: `${visibleTransactions.length} transactions` }); } else { navigator.clipboard?.writeText(window.location.href); } }}
                style={{
                  flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: 'rgba(255,255,255,0.55)', padding: '9px 0', cursor: 'pointer',
                }}
              >SHARE ↗</button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
