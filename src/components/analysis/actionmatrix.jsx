// WO-1319 / WO-1710 — Action Matrix with Hero Card Elevation
// WO-1710: hero card (highest-impact action) receives full-width visual dominance.
// Supporting cards are recessed. 3-column equal grid removed.
import React, { useState, useMemo } from 'react';
import { useAnalysisStore }   from '../../store/useanalysisstore.js';
import { synthesizeQuery }    from '../../engine/querysynthesis.js';
import { getVisibleCards }    from '../../engine/editorialgate.js';
import { getDisplayEntity }   from '../../utils/formatters.js';

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

function HeroCard({ action }) {
  return (
    <div style={{
      padding: '20px 28px',
      borderBottom: `1px solid ${BORDER}`,
      borderTop: `2px solid ${LIME}`,
      background: 'rgba(102,255,0,0.03)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 7, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.32em', marginBottom: 10 }}>
        LEAD ACTION
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: LIME }}>
          {action.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
          <div style={{
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px',
          }}>
            {action.tag}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)' }}>
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
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
            {HORIZON_LABEL[action._horizon]}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.2)',
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
  const actions      = synthesis?.actions ?? { IMMEDIATE: [], SHORT_TERM: [], STRUCTURAL: [] };
  const visibleCards = useMemo(() => getVisibleCards(actions), [actions]);

  const hero      = visibleCards[0] ?? null;
  const secondary = visibleCards.slice(1);
  const highImpact = visibleCards.filter(c => c.impact >= 0.8).length;

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
            <div style={{ fontSize: 16, color: '#ffffff', lineHeight: 1 }}>{visibleCards.length}</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 3 }}>TOTAL ACTIONS</div>
          </div>
        </div>
      </div>

      {/* ── Hero card ───────────────────────────────────────────────── */}
      {hero && <HeroCard action={hero} />}

      {/* ── Supporting stack ────────────────────────────────────────── */}
      {secondary.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 28px 4px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em' }}>
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
        if (!hp) return null;
        return (
          <div style={{ flexShrink: 0, padding: '10px 28px', borderTop: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.012)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: 'rgba(102,255,0,0.55)' }}>HP · HAPPY PATH</span>
              <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(2deg)', position: 'relative', top: 1 }}>
                <ellipse cx="4"  cy="15" rx="5.5" ry="3.2" transform="rotate(-8 4 15)"  fill="#66FF00" fillOpacity="1"/>
                <ellipse cx="10" cy="10" rx="4.2" ry="2.5" transform="rotate(-8 10 10)" fill="#66FF00" fillOpacity="0.72"/>
                <ellipse cx="16" cy="6"  rx="3.0" ry="1.8" transform="rotate(-8 16 6)"  fill="#66FF00" fillOpacity="0.48"/>
                <ellipse cx="20" cy="3"  rx="1.9" ry="1.1" transform="rotate(-8 20 3)"  fill="#66FF00" fillOpacity="0.28"/>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'RANK',   value: `#${hp.dominanceRank ?? 1}`,           lime: false },
                { label: 'TYPE',   value: hp.type?.toUpperCase() ?? '—',          lime: true  },
                { label: 'SCORE',  value: `${(hp.score * 100).toFixed(0)} / 100`, lime: true  },
                { label: 'DELTA',  value: gap ? `↑ ${gap} pts above next` : '—', lime: false },
                { label: 'ENGINE', value: 'LEV-02 ARBITRATED',                    lime: true  },
              ].map(({ label, value, lime }) => (
                <span key={label} style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)' }}>
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
        );
      })()}

      {/* ── Footer ──────────────────────────────────────────────────── */}
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
