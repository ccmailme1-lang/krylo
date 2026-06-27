// WO-1319 / WO-1710 — Action Matrix with Hero Card Elevation
// WO-1710: hero card (highest-impact action) receives full-width visual dominance.
// Supporting cards are recessed. 3-column equal grid removed.
import React, { useState, useMemo } from 'react';
import { useAnalysisStore }        from '../../store/useanalysisstore.js';
import { synthesizeQuery }         from '../../engine/querysynthesis.js';
import { getVisibleCards }         from '../../engine/editorialgate.js';
import { getDisplayEntity }        from '../../utils/formatters.js';
import { useHappyPathEngine }      from '../../engine/happypathdisplacementengine.js';
import { computeMetrics }         from '../../engine/metricsengine.js';
import { computeTruthDynamics }   from '../../engine/identitydynamics.js';
import MetricStrip                from './metricstrip.jsx';
import { useMetricVisibility }    from '../../hooks/useMetricVisibility.js';
import { getLRPrior }             from '../../engine/pathstore.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Playfair Display', serif";
const LIME   = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

const HORIZON_LABEL = {
  IMMEDIATE:  '0–30 DAYS',
  SHORT_TERM: '1–6 MONTHS',
  STRUCTURAL: '6+ MONTHS',
};

function ImpactBar({ score, height = 2 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.07)', borderRadius: 1, marginTop: 8 }}>
      <div style={{
        height: '100%', borderRadius: 1,
        width: `${score * 100}%`,
        background: score >= 0.8 ? LIME : 'rgba(255,255,255,0.3)',
        transition: 'width 500ms cubic-bezier(0.16,1,0.3,1)',
      }} />
    </div>
  );
}

function FrictionCard({ friction }) {
  const { score, state, vector } = friction;
  const opDef  = vector.operational > 0.05;
  const strDef = vector.strategic   > 0.05;
  const primary = (opDef && strDef)
    ? (vector.operational >= vector.strategic ? 'OPERATIONAL' : 'STRATEGIC')
    : opDef ? 'OPERATIONAL' : strDef ? 'STRATEGIC' : null;
  const remediation = {
    OPERATIONAL: 'Raise liquidity or execution capacity before pursuing optimization.',
    STRATEGIC:   'Re-weight long-term goals to match available strategic runway.',
  }[primary] ?? 'Reduce mismatch between desired structure and available capacity.';

  return (
    <div style={{
      padding: '14px 28px',
      borderBottom: `1px solid ${BORDER}`,
      borderTop: '2px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.012)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: 'rgba(255,255,255,0.35)' }}>STRUCTURAL FRICTION</span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px' }}>
          {state} · {Math.round(score * 100)}
        </span>
      </div>
      {primary && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', marginBottom: 6 }}>
          ↑ {primary} shortfall
        </div>
      )}
      <div style={{ fontFamily: SERIF, fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.38)' }}>
        {remediation}
      </div>
    </div>
  );
}

function HeroCard({ action }) {
  return (
    <div style={{
      padding: '20px 28px',
      borderBottom: `1px solid ${BORDER}`,
      borderTop: `2px solid ${LIME}`,
      background: 'rgba(102,255,0,0.03)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 9, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.32em', marginBottom: 10 }}>
        LEAD ACTION
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: LIME }}>
          {action.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px',
          }}>
            {action.tag}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)' }}>
            {HORIZON_LABEL[action._horizon]}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)', maxWidth: 640 }}>
        {action.rationale}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <ImpactBar score={action.impact} height={3} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: LIME, letterSpacing: '0.12em', flexShrink: 0 }}>
          {Math.round(action.impact * 100)}
        </div>
      </div>
    </div>
  );
}

function SecondaryCard({ action, active, onHover }) {
  return (
    <div
      onMouseEnter={() => onHover(action.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: '12px 0',
        borderBottom: `1px solid ${BORDER}`,
        cursor: 'default',
        transition: 'opacity 150ms',
        opacity: active === null || active === action.id ? 0.6 : 0.22,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>
          {action.label}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
            {HORIZON_LABEL[action._horizon]}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.04)', padding: '2px 6px', letterSpacing: '0.12em',
          }}>
            {action.tag}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.4)' }}>
        {action.rationale}
      </div>
      <ImpactBar score={action.impact} />
    </div>
  );
}

export default function ActionMatrix() {
  const [hoveredId, setHoveredId] = useState(null);

  const sessions        = useAnalysisStore((s) => s.sessions);
  const activeSessionId = useAnalysisStore((s) => s.activeSessionId);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const targetLabel     = getDisplayEntity(session?.query ?? '').toUpperCase() || 'TARGET';
  const lensLabel       = session?.lens?.toUpperCase() ?? 'OPEN';

  const synthesis    = useMemo(() => synthesizeQuery(session), [session]);
  const { engineState } = useHappyPathEngine();
  const stateLabel   = synthesis?.stateLabel ?? 'BUILDING CONVERGENCE';
  const lrPrior      = useMemo(() => getLRPrior({ domain: synthesis?.queryDomain, stateLabel, lens: session?.lens ?? 'GENERAL' }), [synthesis?.queryDomain, stateLabel, session?.lens]);
  const metrics      = useMemo(() => computeMetrics(synthesis, engineState, null, lrPrior), [synthesis, engineState, lrPrior]);
  const dynamics     = useMemo(() => computeTruthDynamics(synthesis?.canonicalId ?? null), [synthesis?.canonicalId]);
  const visibility   = useMetricVisibility(metrics, dynamics);
  const actions      = synthesis?.actions ?? { IMMEDIATE: [], SHORT_TERM: [], STRUCTURAL: [] };
  const visibleCards = useMemo(() => getVisibleCards(actions), [actions]);

  const hero               = visibleCards[0] ?? null;
  const secondary          = visibleCards.slice(1);
  const highImpact         = visibleCards.filter(c => c.impact >= 0.8).length;
  const structuralFriction = session?.tensor?.structuralFriction ?? null;
  const showFriction       = structuralFriction?.state === 'HIGH_FRICTION';

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO, overflow: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
            P4 — ACTION MATRIX
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
            {targetLabel} — {lensLabel} LENS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, color: LIME, lineHeight: 1 }}>{highImpact}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 3 }}>HIGH IMPACT</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, color: '#ffffff', lineHeight: 1 }}>{visibleCards.length}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 3 }}>TOTAL ACTIONS</div>
          </div>
        </div>
      </div>

      {/* ── WO-1868: Metric Strip ──────────────────────────────────────────── */}
      <MetricStrip metrics={metrics} visibility={visibility} />

      {/* ── Structural Friction alert — injected pre-hero when HIGH_FRICTION */}
      {showFriction && <FrictionCard friction={structuralFriction} />}

      {/* ── Hero card ───────────────────────────────────────────────── */}
      {hero && <HeroCard action={hero} />}

      {/* ── Supporting stack ────────────────────────────────────────── */}
      {secondary.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ padding: '8px 28px 4px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em' }}>
              SUPPORTING ACTIONS
            </div>
          </div>
          <div style={{ padding: '0 28px' }}>
            {secondary.map(action => (
              <SecondaryCard
                key={action.id}
                action={action}
                active={hoveredId}
                onHover={setHoveredId}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Happy Path ──────────────────────────────────────────────── */}
      {(() => {
        const arb = session?.tensor?.arbitration ?? null;
        const hp  = arb?.topK?.[0] ?? null;
        const alt = arb?.topK?.slice(1) ?? [];
        const gap = hp && alt.length > 0 ? ((hp.score - alt[0].score) * 100).toFixed(0) : null;
        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.012)' }}>
            {hp && synthesis?.resolutionEligible !== false && synthesis?.queryDomain !== 'AMBIGUOUS' && (
              <div style={{ padding: '10px 28px' }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'RANK',   value: `#${hp.dominanceRank ?? 1}`,           lime: false },
                    { label: 'TYPE',   value: hp.type?.toUpperCase() ?? '—',          lime: true  },
                    { label: 'SCORE',  value: `${(hp.score * 100).toFixed(0)} / 100`, lime: true  },
                    { label: 'DELTA',  value: gap ? `↑ ${gap} pts above next` : '—', lime: false },
                    { label: 'ENGINE', value: 'LEV-02 ARBITRATED',                    lime: true  },
                  ].map(({ label, value, lime }) => (
                    <span key={label} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)' }}>
                      {label} <span style={{ color: lime ? LIME : 'rgba(255,255,255,0.6)' }}>{value}</span>
                    </span>
                  ))}
                </div>
                {hp.content && (
                  <div style={{ fontFamily: SERIF, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginTop: 6, borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
                    {hp.content}
                  </div>
                )}
            </div>
            )}
          </div>
        );
      })()}

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 28px',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.16em' }}>
          ACTIONS DERIVED FROM ORACLE FRACTURES + {lensLabel} LENS VECTORS
        </div>
        <div style={{
          fontSize: 9, color: LIME, letterSpacing: '0.16em',
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
