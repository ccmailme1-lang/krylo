// KRYL-DIAG-1 — Domain Provenance Trace panel.
// Dev-only (?debug=1 gate). Reads the existing telemetry.js store — no new store, no
// aggregation/scoring/rendering changes. Purpose: answer "which of the six domains lost
// data, at which connector boundary, and why" directly from what's already been recorded,
// without needing the reporter's own DevTools access.
import React, { useState, useEffect } from 'react';
import { getDomainProvenanceLog } from '../../engine/telemetry.js';
import { CONE_DISPLAY_ORDER } from '../../engine/ontology.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const RED  = '#ff4444';
const DIM  = 'rgba(255,255,255,0.35)';

// KRYL-1065 — sourced from ontology.js (no local domain list). Same order as cone layout.
const CANONICAL_ORDER = CONE_DISPLAY_ORDER.map(d => d.toUpperCase());

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch { return false; }
}

// Latest known state per domain, derived from the raw event log (already newest-first).
function summarizeByDomain(log) {
  const byDomain = {};
  for (const d of CANONICAL_ORDER) byDomain[d] = null;
  for (const ev of log) {
    if (!ev.domain || byDomain[ev.domain] !== null) continue; // keep only the first (=latest) per domain
    byDomain[ev.domain] = ev;
  }
  return byDomain;
}

function StatusDot({ ev }) {
  if (!ev) return <span style={{ color: DIM }}>○ no data yet</span>;
  if (ev.stage === 'dispatch') return <span style={{ color: '#ffaa00' }}>◐ dispatched, awaiting resolve</span>;
  if (ev.stage === 'resolve' && ev.status === 'success') {
    return <span style={{ color: LIME }}>● resolved ({ev.outputCount ?? '?'} records, {ev.latencyMs}ms)</span>;
  }
  if (ev.stage === 'fail') {
    return <span style={{ color: RED }}>✕ failed: {ev.reason ?? 'unknown'} ({ev.latencyMs}ms)</span>;
  }
  return <span style={{ color: DIM }}>? {ev.stage}/{ev.status}</span>;
}

export default function DomainProvenancePanel() {
  const [enabled] = useState(isDebugEnabled);
  const [log, setLog] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const pull = () => setLog(getDomainProvenanceLog());
    pull();
    const id = setInterval(pull, 2000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const byDomain = summarizeByDomain(log);
  const commitSha  = typeof __KRYLO_COMMIT_SHA__  !== 'undefined' ? __KRYLO_COMMIT_SHA__  : 'unknown';
  const buildTime  = typeof __KRYLO_BUILD_TIME__   !== 'undefined' ? __KRYLO_BUILD_TIME__   : 'unknown';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const port = typeof window !== 'undefined' ? (window.location.port || '(default)') : 'unknown';

  return (
    <div style={{
      position: 'fixed', bottom: 12, right: 12, zIndex: 999999,
      width: 420, maxHeight: open ? '70vh' : 32, overflow: 'hidden',
      background: 'rgba(0,0,0,0.92)', border: `1px solid ${LIME}`,
      fontFamily: MONO, fontSize: 10, color: '#fff',
      transition: 'max-height 150ms',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '6px 10px', borderBottom: `1px solid rgba(102,255,0,0.3)`,
                  display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <span style={{ color: LIME, letterSpacing: '0.15em' }}>DOMAIN PROVENANCE TRACE (?debug=1)</span>
        <span>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', overflowY: 'auto', maxHeight: 'calc(70vh - 32px)' }}>
          <div style={{ color: DIM, marginBottom: 8, lineHeight: 1.6 }}>
            host: {host} · port: {port}<br />
            commit: {commitSha} · build: {buildTime}
          </div>
          {CANONICAL_ORDER.map(domain => (
            <div key={domain} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#fff', letterSpacing: '0.08em' }}>{domain}</div>
              <div style={{ marginTop: 2 }}><StatusDot ev={byDomain[domain]} /></div>
              {byDomain[domain] && (
                <div style={{ color: DIM, fontSize: 9, marginTop: 2 }}>
                  connector: {byDomain[domain].connector} · trace: {byDomain[domain].traceId}
                </div>
              )}
            </div>
          ))}
          <div style={{ color: DIM, marginTop: 8 }}>{log.length} total provenance event(s) recorded</div>
        </div>
      )}
    </div>
  );
}
