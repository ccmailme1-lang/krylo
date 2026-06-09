// WO-1700 — ReplayOverlayApp
// Dedicated render root for replay. Fully isolated from the main React tree.
// Receives UISnapshot from ReplayGateway. No LEV-02. No session state.
// Public API: mountReplay(requestId) — called by HistoryBay replay branch only.

import React    from 'react';
import ReactDOM from 'react-dom/client';
import { openReplay, closeReplay } from './replaygateway.js';

const MONO  = "'IBM Plex Mono', monospace";
const LIME  = '#66FF00';
const DIM   = 'rgba(255,255,255,0.25)';
const DIM2  = 'rgba(255,255,255,0.08)';
const BRT   = '#FFFFFF';
const SERIF = "'Georgia', serif";
const BG    = 'rgba(0,0,0,0.94)';

function ReplayHeader({ requestId, timestamp, onClose }) {
  return (
    <div style={{
      padding: '10px 20px', borderBottom: `1px solid rgba(102,255,0,0.15)`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.4em', color: LIME, textTransform: 'uppercase' }}>
          FORENSIC FOSSIL · READ-ONLY
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.18em' }}>
          {timestamp ? new Date(timestamp).toLocaleString() : '—'} · {requestId}
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: `1px solid rgba(255,255,255,0.15)`,
          color: DIM, fontFamily: MONO, fontSize: 8, padding: '4px 14px',
          cursor: 'pointer', letterSpacing: '0.25em', textTransform: 'uppercase',
        }}
      >CLOSE</button>
    </div>
  );
}

function ReplayContext({ context }) {
  return (
    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${DIM2}`, flexShrink: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>
        DECISION CONTEXT
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: BRT, lineHeight: 1.5 }}>
        {context.query}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, marginTop: 6, letterSpacing: '0.15em' }}>
        {[context.domain, context.lens, context.horizon, context.floor ? `$${context.floor.toLocaleString()} floor` : null]
          .filter(Boolean).join(' · ')}
      </div>
    </div>
  );
}

function HappyPathCard({ happyPath }) {
  if (!happyPath) return null;
  return (
    <div style={{
      margin: '16px 20px 0', padding: '14px 16px',
      borderLeft: `3px solid ${LIME}`, borderBottom: `1px solid rgba(102,255,0,0.12)`,
      flexShrink: 0,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 8 }}>
        HAPPY PATH · SCORE {(happyPath.score * 100).toFixed(0)} · {happyPath.type?.toUpperCase()}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 12, color: BRT, lineHeight: 1.6 }}>
        {happyPath.rationale}
      </div>
    </div>
  );
}

function AlternativeRow({ candidate, rank }) {
  return (
    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${DIM2}` }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>
        RANK {rank} · {candidate.type?.toUpperCase()} · SCORE {(candidate.score * 100).toFixed(0)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
        {candidate.rationale}
      </div>
    </div>
  );
}

function ReplayOverlay({ snapshot, onClose }) {
  const { happyPath, alternatives, context, commit, requestId } = snapshot;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: BG, display: 'flex', flexDirection: 'column',
      fontFamily: MONO,
    }}>
      <ReplayHeader requestId={requestId} timestamp={commit.timestamp} onClose={onClose} />
      <ReplayContext context={context} />
      <HappyPathCard happyPath={happyPath} />
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
        {alternatives.map((c, i) => (
          <AlternativeRow key={c.id ?? i} candidate={c} rank={i + 2} />
        ))}
      </div>
    </div>
  );
}

let _root = null;

export async function mountReplay(requestId) {
  const { snapshot, mount } = await openReplay(requestId);

  if (_root) {
    _root.unmount();
    _root = null;
  }

  _root = ReactDOM.createRoot(mount);
  _root.render(
    <ReplayOverlay
      snapshot={snapshot}
      onClose={() => {
        if (_root) { _root.unmount(); _root = null; }
        closeReplay();
      }}
    />
  );
}
