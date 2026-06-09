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

const SEED_TRANSACTIONS = [
  { type: 'SEARCH',         subject: 'Series B cap table restructuring signals', context: 'INVESTOR',  horizon: 'SHORT',      time: '09:41Z', status: 'COMPLETE' },
  { type: 'ORACLE',         subject: 'Acme Corp — 10K audit desk opened',        context: 'INVESTOR',  horizon: 'MEDIUM',     time: '09:38Z', status: 'COMPLETE' },
  { type: 'MODEL',          subject: 'Revenue recognition divergence',            context: 'LEGAL',     horizon: 'IMMEDIATE',  time: '09:31Z', status: 'COMPLETE' },
  { type: 'PROFILE UPDATE', subject: 'Default lens → INVESTOR',                  context: 'SETTINGS',  horizon: '—',          time: '09:20Z', status: 'SAVED'    },
  { type: 'SEARCH',         subject: 'Debt instrument SPV trace',                 context: 'LEGAL',     horizon: 'MEDIUM',     time: '09:10Z', status: 'COMPLETE' },
  { type: 'LENS CHANGE',    subject: 'RETIREMENT → INVESTOR',                    context: 'SESSION',   horizon: '—',          time: '08:57Z', status: 'APPLIED'  },
  { type: 'SEARCH',         subject: 'Labor market tightening — CAREER vertical', context: 'CAREER',    horizon: 'LONG',       time: '08:44Z', status: 'COMPLETE' },
  { type: 'SYSTEM',         subject: 'Signal Map session closed — 12 nodes',      context: 'SURFACE',   horizon: '—',          time: '08:38Z', status: 'LOGGED'   },
  { type: 'ORACLE',         subject: 'Benchmark Holdings — ground level view',    context: 'INVESTOR',  horizon: 'SHORT',      time: '08:30Z', status: 'COMPLETE' },
  { type: 'PROFILE UPDATE', subject: 'Temporal horizon default → SHORT',          context: 'SETTINGS',  horizon: '—',          time: '08:15Z', status: 'SAVED'    },
  { type: 'SYSTEM',         subject: 'Premium brief unlocked',                    context: 'TIER',      horizon: '—',          time: '08:02Z', status: 'ACTIVE'   },
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
      time:    s.createdAt
                 ? new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z'
                 : '—',
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: `1px solid ${BORDER}`,
        background: active ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
        overflow: 'hidden',
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', flexShrink: 0, width: 20 }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      <span style={{
        fontFamily: SERIF, fontSize: 12,
        color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
        transition: 'color 150ms',
        flexShrink: 0, maxWidth: 160,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {entry.query}
      </span>

      <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', flexShrink: 0 }}>
        {formatTs(entry.ts)}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden' }}>
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
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {srcLabel}
      </span>

      {/* Completeness indicator */}
      <span style={{
        fontFamily: MONO, fontSize: 7, flexShrink: 0,
        color: entry.complete ? LIME : 'rgba(255,255,255,0.2)',
        letterSpacing: '0.1em',
      }} title={entry.complete ? 'Pipeline complete' : 'Pipeline incomplete'}>
        {entry.complete ? '●' : '○'}
      </span>

      {/* Drift flag */}
      {entry.driftCount > 0 && (
        <span style={{
          fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em',
          color: '#007FFF', flexShrink: 0,
          padding: '1px 5px', border: '1px solid rgba(0,127,255,0.3)',
        }} title={`${entry.driftCount} drift violation${entry.driftCount !== 1 ? 's' : ''}`}>
          DRIFT {entry.driftCount}
        </span>
      )}

      {active ? (
        <button
          onClick={() => onRerun(entry)}
          style={{
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em',
            background: '#000000', border: `1px solid ${LIME}`,
            color: LIME, padding: '4px 12px',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          RE-RUN
        </button>
      ) : <div />}
    </div>
  );
}

// ── HistoryBay ────────────────────────────────────────────────────────────────

export default function HistoryBay() {
  const [hoveredIdx, setHovered] = useState(null);
  const [history, setHistory]    = useState(() => buildHistory(getTelemetryLog()));

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
  }, [createSession, setSwipeIndex]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO,
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            INVESTIGATION HISTORY
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em' }}>
            TELEMETRY AUDIT TRAIL — {history.length} SESSION{history.length !== 1 ? 'S' : ''}
          </div>
        </div>
        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.18em' }}>
          LIVE · 2s
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>

        {history.length === 0 ? (
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
            {history.map((entry, i) => (
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
          {transactions.length === 0 ? (
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em', paddingTop: 12 }}>
              NO TRANSACTIONS RECORDED
            </div>
          ) : transactions.map((item, i) => {
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
                  <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)' }}>{item.time}</div>
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
        </div>

      </div>

    </div>
  );
}
