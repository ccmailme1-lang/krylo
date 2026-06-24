// WO-1321 — Artifacts Bay: corroborating evidence. Ground truth anchors, not storage.
import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Playfair Display', serif";
const LIME   = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

const TYPE_COLORS = {
  ARTICLE:   'rgba(255,255,255,0.5)',
  INTERVIEW: LIME,
  VIDEO:     'rgba(255,255,255,0.5)',
};

const SIGNAL = {
  CORROBORATES: { label: 'CORROBORATES', color: LIME },
  CONTRADICTS:  { label: 'CONTRADICTS',  color: '#FF3300' },
  CONTEXT:      { label: 'CONTEXT',      color: 'rgba(255,255,255,0.3)' },
};

const MOCK_ARTIFACTS = [
  {
    id: 'a1', type: 'INTERVIEW',
    title: '"We restructured the entire cap table before the Series B closed."',
    source: 'FOUNDERS JOURNAL', date: '2026-03-14',
    signal: 'CONTRADICTS',
    note: 'Contradicts public statement re: zero restructuring activity.',
  },
  {
    id: 'a2', type: 'ARTICLE',
    title: 'Revenue Recognition Practices Under Scrutiny — Industry Wide',
    source: 'WSJ', date: '2026-02-28',
    signal: 'CONTEXT',
    note: 'Sector context for P2 telemetry divergence on revenue growth.',
  },
  {
    id: 'a3', type: 'ARTICLE',
    title: 'Key COO Departure Signals Internal Friction at Growth-Stage Firms',
    source: 'TECHCRUNCH', date: '2026-04-01',
    signal: 'CORROBORATES',
    note: 'Pattern matches 34% turnover rate detected in P2 telemetry.',
  },
  {
    id: 'a4', type: 'VIDEO',
    title: 'Board Meeting Recording — Q4 Strategy Review (leaked excerpt)',
    source: 'INTERNAL', date: '2026-01-19',
    signal: 'CONTRADICTS',
    note: 'Runway discussed as "less than 12 months" — contradicts public 2026 funding claim.',
  },
  {
    id: 'a5', type: 'INTERVIEW',
    title: '"Efficiency metrics are being redefined internally this quarter."',
    source: 'BLOOMBERG BRIEF', date: '2026-04-22',
    signal: 'CONTEXT',
    note: 'Aligns with OPS EFFICIENCY — NO DATA flag in P2.',
  },
  {
    id: 'a6', type: 'ARTICLE',
    title: 'Debt Instruments Hidden via SPV Structures: A Legal Overview',
    source: 'HARVARD LAW REVIEW', date: '2025-11-10',
    signal: 'CORROBORATES',
    note: 'Mechanism aligns with P2 debt discrepancy ($2.4M vs zero claim).',
  },
];

const FILTERS = ['ALL', 'ARTICLE', 'INTERVIEW', 'VIDEO'];

// ── Artifact Card ─────────────────────────────────────────────────────────────

function ArtifactCard({ artifact, active, onHover }) {
  const sig = SIGNAL[artifact.signal];
  const tc  = TYPE_COLORS[artifact.type];

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        padding: '16px 0',
        borderBottom: `1px solid ${BORDER}`,
        display: 'grid',
        gridTemplateColumns: '3px 1fr auto',
        gap: 16,
        background: active ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
      }}
    >
      {/* Signal bar */}
      <div style={{ background: sig.color, borderRadius: 2, opacity: active ? 1 : 0.4, transition: 'opacity 150ms' }} />

      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.2em', color: tc, padding: '2px 6px', border: `1px solid ${tc}`, opacity: 0.7 }}>
            {artifact.type}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.14em', color: sig.color }}>
            {sig.label}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>
            {artifact.date}
          </span>
        </div>

        <div style={{
          fontFamily: SERIF, fontSize: 12, lineHeight: 1.55,
          color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)',
          fontStyle: artifact.type === 'INTERVIEW' ? 'italic' : 'normal',
          marginBottom: 8,
          transition: 'color 150ms',
        }}>
          {artifact.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)' }}>
            {artifact.source}
          </span>
          {active && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', fontStyle: 'normal', letterSpacing: '0.04em' }}>
              {artifact.note}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ArtifactsBay ──────────────────────────────────────────────────────────────

export default function ArtifactsBay() {
  const [filter,    setFilter]  = useState('ALL');
  const [hoveredId, setHovered] = useState(null);

  const sessions        = useAnalysisStore(s => s.sessions);
  const activeSessionId = useAnalysisStore(s => s.activeSessionId);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const targetLabel     = session?.query?.toUpperCase() ?? 'TARGET';

  const visible = filter === 'ALL'
    ? MOCK_ARTIFACTS
    : MOCK_ARTIFACTS.filter(a => a.type === filter);

  const contradicts  = MOCK_ARTIFACTS.filter(a => a.signal === 'CONTRADICTS').length;
  const corroborates = MOCK_ARTIFACTS.filter(a => a.signal === 'CORROBORATES').length;

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
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            EVIDENCE ARCHIVE
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em' }}>
            {targetLabel} — GROUND TRUTH ANCHORS
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>CONTRADICTS</div>
            <div style={{ fontSize: 16, color: '#FF3300', fontFamily: MONO }}>{contradicts}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>CORROBORATES</div>
            <div style={{ fontSize: 16, color: LIME, fontFamily: MONO }}>{corroborates}</div>
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{
        padding: '10px 24px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
              padding: '3px 10px',
              background: filter === f ? LIME : 'transparent',
              color: filter === f ? '#000000' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${filter === f ? LIME : 'rgba(255,255,255,0.12)'}`,
              cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', alignSelf: 'center' }}>
          {visible.length} ARTIFACT{visible.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Artifact list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {visible.map(a => (
          <ArtifactCard
            key={a.id}
            artifact={a}
            active={hoveredId === a.id}
            onHover={v => setHovered(v ? a.id : null)}
          />
        ))}
      </div>

    </div>
  );
}
