// WO-1317 — Analysis P2: Oracle Engine — Bipartite Tension Graph (DOM layer)
// WebGL ShaderMaterial fracture lines: stubbed — awaiting spec resolution
import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { useRenderStore }   from '../../store/userenderstore.js';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Playfair Display', serif";
const LIME  = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

// tension: 'truth' | 'fracture' | 'silence'
const TENSION_LINE = {
  truth:    { stroke: 'rgba(26,26,26,1)',    width: 1,   dash: 'none'    },
  fracture: { stroke: LIME,                  width: 1.5, dash: 'none'    },
  silence:  { stroke: 'rgba(255,255,255,0.15)', width: 1, dash: '4 4'   },
};

const TENSION_LABEL = {
  truth:    { text: 'ALIGNED',     color: 'rgba(255,255,255,0.35)' },
  fracture: { text: 'FRACTURE',    color: LIME                      },
  silence:  { text: 'UNVERIFIED',  color: 'rgba(255,255,255,0.2)'  },
};

// ── Mock claim-telemetry pairs ────────────────────────────────────────────────

const PAIRS = [
  {
    id: 'p1',
    claim:     { speaker: 'PUBLIC STATEMENT', quote: '"We have zero debt on the balance sheet."' },
    telemetry: { label: 'TOTAL DEBT',         value: '$2.4M',    delta: '▲ +14% QoQ' },
    tension:   'fracture',
  },
  {
    id: 'p2',
    claim:     { speaker: 'EARNINGS CALL',    quote: '"Revenue is growing 40% year over year."' },
    telemetry: { label: 'REV GROWTH Δ',       value: '+12%',     delta: '▼ −28 pts vs claim' },
    tension:   'fracture',
  },
  {
    id: 'p3',
    claim:     { speaker: 'INTERVIEW — Q1',   quote: '"The team is stable and fully committed."' },
    telemetry: { label: 'TURNOVER RATE',      value: '34%',      delta: '▲ above sector avg' },
    tension:   'fracture',
  },
  {
    id: 'p4',
    claim:     { speaker: 'PRESS RELEASE',    quote: '"Fully funded through the end of 2026."' },
    telemetry: { label: 'RUNWAY',             value: '8 MO',     delta: '— at current burn' },
    tension:   'silence',
  },
  {
    id: 'p5',
    claim:     { speaker: 'ANNUAL REPORT',    quote: '"Operations are running at peak efficiency."' },
    telemetry: { label: 'OPS EFFICIENCY',     value: 'NO DATA',  delta: '— unverified' },
    tension:   'silence',
  },
];

// ── Tension line (SVG inline) ─────────────────────────────────────────────────

function TensionLine({ tension }) {
  const { stroke, width, dash } = TENSION_LINE[tension];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <svg width="100%" height="20" style={{ display: 'block' }}>
        <line
          x1="0" y1="10" x2="100%" y2="10"
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray={dash === 'none' ? undefined : dash}
        />
      </svg>
    </div>
  );
}

// ── Claim node ────────────────────────────────────────────────────────────────

function ClaimNode({ speaker, quote, tension, active, onHover }) {
  const isActive = tension === 'fracture';
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        padding: '14px 16px',
        borderLeft: `2px solid ${isActive ? LIME : BORDER}`,
        background: active ? 'rgba(102,255,0,0.03)' : 'transparent',
        cursor: 'default',
        transition: 'background 150ms',
      }}
    >
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', marginBottom: 6 }}>
        {speaker}
      </div>
      <div style={{
        fontFamily: SERIF, fontSize: 12, lineHeight: 1.55,
        color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
        fontStyle: 'italic',
      }}>
        {quote}
      </div>
    </div>
  );
}

// ── Telemetry node ────────────────────────────────────────────────────────────

function TelemetryNode({ label, value, delta, tension, active }) {
  const isActive = tension === 'fracture';
  return (
    <div style={{
      padding: '14px 16px',
      borderRight: `2px solid ${isActive ? LIME : BORDER}`,
      background: active ? 'rgba(102,255,0,0.03)' : 'transparent',
      transition: 'background 150ms',
      textAlign: 'right',
    }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 16,
        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
        letterSpacing: '0.04em',
        marginBottom: 3,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)', letterSpacing: '0.1em' }}>
        {delta}
      </div>
    </div>
  );
}

// ── OracleEngine ──────────────────────────────────────────────────────────────

export default function OracleEngine() {
  const [hoveredId, setHoveredId]  = useState(null);

  const sessions        = useAnalysisStore((s) => s.sessions);
  const activeSessionId = useAnalysisStore((s) => s.activeSessionId);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const targetLabel     = session?.query?.toUpperCase() ?? 'TARGET';

  const frame = useRenderStore((s) => s.activeSpatialFrame);
  const fractureCount      = PAIRS.filter(p => p.tension === 'fracture').length;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO, overflow: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            P2 — ORACLE ENGINE
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
            {targetLabel} — SAID VS. UNSAID
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em' }}>
            {fractureCount} FRACTURE{fractureCount !== 1 ? 'S' : ''} DETECTED
          </div>
          <div style={{
            background: 'rgba(102,255,0,0.1)',
            border: `1px solid rgba(102,255,0,0.35)`,
            padding: '3px 10px', fontSize: 8, color: LIME, letterSpacing: '0.18em',
          }}>
            FRACTURE — HIGH
          </div>
        </div>
      </div>

      {/* ── Column headers ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
        padding: '10px 24px',
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.24em' }}>NODE ALPHA — SPOKEN CLAIM</div>
        <div />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.24em', textAlign: 'right' }}>NODE BETA — TELEMETRY</div>
      </div>

      {/* ── Bipartite pairs ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {PAIRS.map((pair) => {
          const isHovered = hoveredId === pair.id;
          const tLabel    = TENSION_LABEL[pair.tension];
          return (
            <div
              key={pair.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
                alignItems: 'center',
                borderBottom: `1px solid ${BORDER}`,
                padding: '4px 0',
              }}
            >
              <ClaimNode
                {...pair.claim}
                tension={pair.tension}
                active={isHovered}
                onHover={(v) => setHoveredId(v ? pair.id : null)}
              />

              {/* Center: tension line + label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <TensionLine tension={pair.tension} />
                <div style={{ fontSize: 6, color: tLabel.color, letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
                  {tLabel.text}
                </div>
              </div>

              <TelemetryNode
                {...pair.telemetry}
                tension={pair.tension}
                active={isHovered}
              />
            </div>
          );
        })}
      </div>

      {/* ── Footer: tension multiplier readout ──────────────────── */}
      <div style={{
        padding: '10px 24px',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', gap: 24, flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.16em' }}>
          FRAME: {frame.frameId}
        </div>
        <div style={{ fontSize: 9, color: frame.globalTensionSpike > 0 ? LIME : 'rgba(255,255,255,0.2)', letterSpacing: '0.16em' }}>
          TENSION SPIKE: {frame.globalTensionSpike.toFixed(2)}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.16em', marginLeft: 'auto' }}>
          WEBGL FRACTURE LINES — PENDING SHADER SPEC
        </div>
      </div>

    </div>
  );
}
