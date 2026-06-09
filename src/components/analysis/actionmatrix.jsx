// WO-1319 — Analysis P4: Action Matrix — "What can I do"
import React, { useState, useMemo } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { synthesizeQuery }  from '../../engine/querysynthesis.js';
import { getDisplayEntity } from '../../utils/formatters.js';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Playfair Display', serif";
const LIME  = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

const ACTIONS = {
  IMMEDIATE: [
    {
      id: 'i1',
      label:    'REBALANCE EXPOSURE',
      impact:   0.88,
      rationale: 'Three fracture signals converge on liquidity. Reduce variable exposure within 30 days to extend runway past the 12-month threshold.',
      tag:      'RISK',
    },
    {
      id: 'i2',
      label:    'LOCK INCOME ANCHOR',
      impact:   0.74,
      rationale: 'Income stability is your only load-bearing vector at 81%. Secure it contractually before it becomes the next fracture.',
      tag:      'INCOME',
    },
  ],
  SHORT_TERM: [
    {
      id: 's1',
      label:    'ACCELERATE SAVINGS VELOCITY',
      impact:   0.81,
      rationale: 'Coverage gap widens 6 points per year at current rate. A +8% velocity correction closes the gap before the 2040 horizon.',
      tag:      'COVERAGE',
    },
    {
      id: 's2',
      label:    'REDUCE DEBT LOAD',
      impact:   0.67,
      rationale: 'Debt signal is the loudest fracture at $2.4M and climbing. Structured reduction in months 2–5 flattens the trajectory before Q3.',
      tag:      'DEBT',
    },
    {
      id: 's3',
      label:    'AUDIT OPERATIONAL COSTS',
      impact:   0.58,
      rationale: 'Burn rate at $45K/mo leaves limited compression margin. A cost audit identifies 12–18% reduction without disrupting core operations.',
      tag:      'BURN',
    },
  ],
  STRUCTURAL: [
    {
      id: 'r1',
      label:    'DIVERSIFY INCOME STREAMS',
      impact:   0.92,
      rationale: 'Single-source income is a structural fragility. A second uncorrelated stream at 20–30% of current income transforms your leverage position.',
      tag:      'LEVERAGE',
    },
    {
      id: 'r2',
      label:    'ESTABLISH COVERAGE FLOOR',
      impact:   0.79,
      rationale: 'Portfolio coverage must reach 80% to clear the threshold. Build a floor instrument — indexed, low-volatility — that holds regardless of market conditions.',
      tag:      'COVERAGE',
    },
  ],
};

const HORIZONS = [
  { key: 'IMMEDIATE',   label: 'IMMEDIATE',    sub: '0–30 DAYS'   },
  { key: 'SHORT_TERM',  label: 'SHORT-TERM',   sub: '1–6 MONTHS'  },
  { key: 'STRUCTURAL',  label: 'STRUCTURAL',   sub: '6+ MONTHS'   },
];

function ImpactBar({ score }) {
  return (
    <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, marginTop: 8 }}>
      <div style={{
        height: '100%', borderRadius: 1,
        width: `${score * 100}%`,
        background: score >= 0.8 ? LIME : 'rgba(255,255,255,0.3)',
        transition: 'width 500ms cubic-bezier(0.16,1,0.3,1)',
      }} />
    </div>
  );
}

function ActionCard({ action, active, onHover }) {
  const isHigh = action.impact >= 0.8;
  return (
    <div
      onMouseEnter={() => onHover(action.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: '16px 0',
        borderBottom: `1px solid ${BORDER}`,
        cursor: 'default',
        transition: 'opacity 150ms',
        opacity: active === null || active === action.id ? 1 : 0.4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
          color: isHigh ? LIME : 'rgba(255,255,255,0.75)',
        }}>
          {action.label}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 7,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.14em',
          background: 'rgba(255,255,255,0.05)',
          padding: '2px 7px',
          flexShrink: 0, marginLeft: 12,
        }}>
          {action.tag}
        </div>
      </div>
      <div style={{
        fontFamily: SERIF, fontSize: 11, lineHeight: 1.6,
        color: 'rgba(255,255,255,0.55)',
      }}>
        {action.rationale}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <ImpactBar score={action.impact} />
        <div style={{
          fontFamily: MONO, fontSize: 7,
          color: isHigh ? LIME : 'rgba(255,255,255,0.3)',
          letterSpacing: '0.12em', flexShrink: 0,
        }}>
          {Math.round(action.impact * 100)}
        </div>
      </div>
    </div>
  );
}

export default function ActionMatrix() {
  const [hoveredId, setHoveredId] = useState(null);

  const sessions        = useAnalysisStore((s) => s.sessions);
  const activeSessionId = useAnalysisStore((s) => s.activeSessionId);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const targetLabel     = getDisplayEntity(session?.query ?? '').toUpperCase() || 'TARGET';
  const lensLabel       = session?.lens?.toUpperCase()  ?? 'OPEN';

  const synthesis   = useMemo(() => synthesizeQuery(session), [session]);
  const ACTIONS     = synthesis?.actions ?? {
    IMMEDIATE:  [],
    SHORT_TERM: [],
    STRUCTURAL: [],
  };

  const totalActions = Object.values(ACTIONS).flat().length;
  const highImpact   = Object.values(ACTIONS).flat().filter(a => a.impact >= 0.8).length;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO, overflow: 'hidden',
    }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            P4 — ACTION MATRIX
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
            {targetLabel} — {lensLabel} LENS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, color: LIME, lineHeight: 1 }}>{highImpact}</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 3 }}>HIGH IMPACT</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, color: '#ffffff', lineHeight: 1 }}>{totalActions}</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 3 }}>TOTAL ACTIONS</div>
          </div>
        </div>
      </div>

      {/* ── 3-column matrix ───────────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      }}>
        {HORIZONS.map(({ key, label, sub }, colIdx) => (
          <div
            key={key}
            style={{
              borderRight: colIdx < 2 ? `1px solid ${BORDER}` : 'none',
              display: 'flex', flexDirection: 'column',
              height: '100%', overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${BORDER}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.2em', marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em' }}>
                {sub}
              </div>
            </div>

            {/* Actions */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {ACTIONS[key].map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  active={hoveredId}
                  onHover={setHoveredId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 28px',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.16em' }}>
          ACTIONS DERIVED FROM ORACLE FRACTURES + {lensLabel} LENS VECTORS
        </div>
        <div style={{
          fontSize: 7, color: LIME, letterSpacing: '0.16em',
          background: 'rgba(102,255,0,0.08)',
          border: `1px solid rgba(102,255,0,0.2)`,
          padding: '3px 10px',
        }}>
          LEVERAGE WINDOW — OPEN
        </div>
      </div>

    </div>
  );
}
