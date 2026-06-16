// WO-1322 — History Bay: telemetry log as audit trail (SAB Architect_03 patch)
// Source of truth: getTelemetryLog() — session_open events + per-session traversal chain.
import React, { useState, useEffect, useCallback } from 'react';
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

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z';
}

// RANGE_PRESETS — shared date-range filter for both tables on this page
const RANGE_PRESETS = {
  today: { label: 'Today',        ms: 1  * DAY },
  '7d':  { label: 'Last 7 Days',  ms: 7  * DAY },
  '30d': { label: 'Last 30 Days', ms: 30 * DAY },
  all:   { label: 'All Time',     ms: Infinity },
};

function inRange(ts, rangeKey) {
  const preset = RANGE_PRESETS[rangeKey];
  if (!preset || preset.ms === Infinity) return true;
  return (ts ?? 0) >= Date.now() - preset.ms;
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
  const blob = new Blob([buildTransactionsCSV(rows)], { type: 'text/csv;charset=utf-8;' });
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
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em',
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

// ── History Row ───────────────────────────────────────────────────────────────

function HistoryRow({ entry, index, active, onHover, onRerun }) {
  const srcLabel = SOURCE_LABEL[entry.source] ?? entry.source.toUpperCase();
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        padding: '10px 0',
        borderBottom: `1px solid ${BORDER}`,
        background: active ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 90px', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        <span style={{
          fontFamily: SERIF, fontSize: 12,
          color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
          transition: 'color 150ms',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.query}
        </span>

        <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
          {formatTs(entry.ts)}
        </span>

        <span style={{
          fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', textAlign: 'right',
          color: entry.complete ? LIME : 'rgba(255,255,255,0.3)',
        }} title={entry.complete ? 'Pipeline complete' : 'Pipeline incomplete'}>
          {entry.complete ? 'COMPLETE' : 'INCOMPLETE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, paddingLeft: 40, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {LIFECYCLE.map((step, i) => {
            const hit = entry.traversal.includes(step);
            return (
              <React.Fragment key={step}>
                <span style={{
                  fontFamily: MONO, fontSize: 6, letterSpacing: '0.08em',
                  color: hit ? LIME : 'rgba(255,255,255,0.13)',
                  whiteSpace: 'nowrap',
                }}>
                  {LABELS[step]}
                </span>
                {i < LIFECYCLE.length - 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 6 }}>→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <span style={{
          fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em',
          color: 'rgba(102,255,0,0.7)', padding: '2px 8px',
          border: `1px solid rgba(102,255,0,0.2)`,
          whiteSpace: 'nowrap',
        }}>
          {srcLabel}
        </span>

        {entry.driftCount > 0 && (
          <span style={{
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em',
            color: '#007FFF',
            padding: '1px 5px', border: '1px solid rgba(0,127,255,0.3)',
          }} title={`${entry.driftCount} drift violation${entry.driftCount !== 1 ? 's' : ''}`}>
            DRIFT {entry.driftCount}
          </span>
        )}

        {active && (
          <button
            onClick={() => onRerun(entry)}
            style={{
              fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em',
              background: '#000000', border: `1px solid ${LIME}`,
              color: LIME, padding: '4px 12px',
              cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            RE-RUN
          </button>
        )}
      </div>
    </div>
  );
}

// ── HistoryBay ────────────────────────────────────────────────────────────────

export default function HistoryBay({ onRerunNavigate }) {
  const [hoveredIdx, setHovered] = useState(null);
  const [history, setHistory]    = useState(() => buildHistory(getTelemetryLog()));
  const [rangeKey, setRangeKey]  = useState('7d');
  const [histSort, setHistSort]  = useState({ key: 'ts', dir: 'desc' });
  const [txSort,   setTxSort]    = useState({ key: 'ts', dir: 'desc' });

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
    createSession(id, '10K View', entry.query);
    setSwipeIndex(1);
    onRerunNavigate?.();
  }, [createSession, setSwipeIndex, onRerunNavigate]);

  const visibleHistory = sortRows(
    history.filter(e => inRange(e.ts, rangeKey)),
    histSort,
    { ts: e => e.ts ?? 0, query: e => (e.query ?? '').toLowerCase(), status: e => e.complete ? 1 : 0 },
  );

  const visibleTransactions = sortRows(
    transactions.filter(t => inRange(t.ts, rangeKey)),
    txSort,
    { ts: t => t.ts ?? 0, type: t => t.type, status: t => t.status },
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO,
    }}>

      {/* Header — centered 900 well, same bumpers as the front page */}
      <div style={{
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        width: '100%', maxWidth: 900, margin: '0 auto',
      }}>
        <div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            INVESTIGATION HISTORY
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em' }}>
            TELEMETRY AUDIT TRAIL — {visibleHistory.length} SESSION{visibleHistory.length !== 1 ? 'S' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={rangeKey}
            onChange={e => setRangeKey(e.target.value)}
            style={{
              fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em',
              background: '#000000', color: 'rgba(255,255,255,0.5)',
              border: `1px solid ${BORDER}`, padding: '3px 6px', cursor: 'pointer',
            }}
          >
            {Object.entries(RANGE_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label.toUpperCase()}</option>
            ))}
          </select>
          <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.18em' }}>
            LIVE · 2s
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', width: '100%', maxWidth: 900, margin: '0 auto' }}>

        {visibleHistory.length === 0 ? (
          <div style={{ paddingTop: 16, display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.22em' }}>
              NO TELEMETRY RECORDED
            </div>
            <span
              onClick={() => setSwipeIndex(0)}
              style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: LIME, cursor: 'pointer', opacity: 0.7 }}
            >
              GO TO ANALYSIS →
            </span>
          </div>
        ) : (
          <div style={{ maxWidth: 900 }}>
            <SortHeader
              gridTemplateColumns="28px 1fr 110px 90px"
              sort={histSort}
              onSort={key => setHistSort(s => nextSortState(s, key))}
              columns={[
                { label: '#' },
                { label: 'QUERY', key: 'query' },
                { label: 'TIMESTAMP', key: 'ts' },
                { label: 'STATUS', key: 'status', align: 'right' },
              ]}
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
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${BORDER}`, maxWidth: 900 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 12 }}>
            TRANSACTION HISTORY
          </div>
          {visibleTransactions.length === 0 ? (
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em', paddingTop: 12 }}>
              NO TRANSACTIONS RECORDED
            </div>
          ) : (
            <>
              <SortHeader
                gridTemplateColumns="64px 110px 1fr 72px"
                sort={txSort}
                onSort={key => setTxSort(s => nextSortState(s, key))}
                columns={[
                  { label: 'TIME', key: 'ts' },
                  { label: 'TYPE', key: 'type' },
                  { label: 'MESSAGE' },
                  { label: 'STATUS', key: 'status', align: 'right' },
                ]}
              />
              {visibleTransactions.map((item, i) => {
                const typeColor =
                  item.type === 'SEARCH'         ? LIME :
                  item.type === 'ORACLE'         ? LIME :
                  item.type === 'MODEL'          ? '#007FFF' :
                  item.type === 'PROFILE UPDATE' ? '#8A2BE2' :
                  item.type === 'LENS CHANGE'    ? '#8A2BE2' :
                  item.type === 'SYSTEM'         ? 'rgba(255,255,255,0.35)' :
                  'rgba(255,255,255,0.35)';
                return (
                  <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '64px 110px 1fr 72px', alignItems: 'baseline', gap: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)' }}>{formatTime(item.ts)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: typeColor, letterSpacing: '0.12em' }}>{item.type}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subject}</div>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>{item.status}</div>
                    </div>
                    {(item.context !== '—' || item.horizon !== '—') && (
                      <div style={{ display: 'flex', gap: 16, marginTop: 4, paddingLeft: 176 }}>
                        {item.context !== '—' && (
                          <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
                            {item.context}
                          </span>
                        )}
                        {item.horizon !== '—' && (
                          <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
                            {item.horizon}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Export */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${BORDER}`, maxWidth: 900, paddingBottom: 8 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 8 }}>
            EXPORT TRANSACTION HISTORY
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 12, maxWidth: 480 }}>
            Includes transactions currently in view — {RANGE_PRESETS[rangeKey].label.toLowerCase()}, {visibleTransactions.length} record{visibleTransactions.length !== 1 ? 's' : ''}.
          </div>
          <button
            onClick={() => downloadTransactionsCSV(visibleTransactions)}
            disabled={visibleTransactions.length === 0}
            style={{
              fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
              background: 'transparent', border: `1px solid ${LIME}`,
              color: LIME, padding: '8px 18px', cursor: visibleTransactions.length === 0 ? 'default' : 'pointer',
              opacity: visibleTransactions.length === 0 ? 0.4 : 1,
            }}
          >
            ⬇ EXPORT CSV
          </button>
        </div>

      </div>

    </div>
  );
}
