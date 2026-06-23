// WO-1839 — Opportunity Framing Layer
// WO-1840 — Intent Multiplicity Gating Layer (distribution gate, replaces scalar threshold)
// Phase A: static templates only. Zero inference. Zero generation. Zero signal addition.
// Architectural rule: this component re-expresses findings. It never adds to them.

const MONO   = "'IBM Plex Mono', monospace";
const LIME   = '#66FF00';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.85)';

const HP_PRIMARY  = 75;  // full validated render
const HP_FALLBACK = 65;  // muted fallback render — distribution gate, not scalar patch

// Phase A — frozen static templates. Text is verbatim. No interpolation.
const DECISION_TEMPLATES = {
  CAPITAL_ALLOCATOR: {
    stake:  'Capital at risk or opportunity cost in allocation decisions',
    move:   'Allocate / hold / exit / adjust position',
    window: '0–8 weeks before capital commitment or review window closes',
  },
  RISK_MANAGER: {
    stake:  'Exposure in operating/financial model assumptions or risk surface',
    move:   'Hedge / cover / monitor / rerun stress test',
    window: 'Next reporting cycle or risk review',
  },
  OPERATOR: {
    stake:  'Impact on cost baseline, capacity, or execution constraints',
    move:   'Absorb / redirect / accelerate / defer operations',
    window: 'Current operational cycle',
  },
  GROWTH_SEEKER: {
    stake:  'Market timing or competitive entry opportunity',
    move:   'Enter / wait / partner / scale initiative',
    window: 'Market inflection window per signal velocity',
  },
  DEFENDER: {
    stake:  'Competitive threat vector or market share erosion risk',
    move:   'Fortify / respond / acquire / reposition',
    window: 'Pre-competitor action or churn threshold',
  },
};

// LENS_PRIORITY — tie-break when conviction scores are equal.
const LENS_PRIORITY = [
  'CAPITAL_ALLOCATOR',
  'RISK_MANAGER',
  'OPERATOR',
  'GROWTH_SEEKER',
  'DEFENDER',
];

// resolveFrames — two-tier distribution gate.
// Primary tier (hpScore >= HP_PRIMARY): full validated render.
// Fallback tier (HP_FALLBACK <= hpScore < HP_PRIMARY): muted render, pointerEvents off.
// Below HP_FALLBACK: null — gate suppresses entirely.
function resolveFrames(lensProfiles, hpScore) {
  if (!Array.isArray(lensProfiles) || lensProfiles.length === 0) return null;
  if (typeof hpScore !== 'number' || hpScore < HP_FALLBACK)        return null;

  const valid = lensProfiles.filter(p => DECISION_TEMPLATES[p.lensId]);
  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => {
    if (b.conviction !== a.conviction) return b.conviction - a.conviction;
    return LENS_PRIORITY.indexOf(a.lensId) - LENS_PRIORITY.indexOf(b.lensId);
  });

  const [top, ...rest] = sorted;
  return {
    primary:                { ...top, ...DECISION_TEMPLATES[top.lensId] },
    secondaries:            rest.map(p => ({ ...p, ...DECISION_TEMPLATES[p.lensId] })),
    resolutionPolicyApplied: rest.length > 0,
    isFallback:             hpScore < HP_PRIMARY,
  };
}

function FrameRow({ label, value, dimValue }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: dimValue ? DIM : BRT, letterSpacing: '0.06em', lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  );
}

export default function DecisionFrameCard({ lensProfiles, hpScore }) {
  const frames = resolveFrames(lensProfiles, hpScore);
  if (!frames) return null;

  const { primary, secondaries, resolutionPolicyApplied, isFallback } = frames;

  return (
    <div style={{
      flexShrink: 0,
      opacity: isFallback ? 0.5 : 1,
      pointerEvents: isFallback ? 'none' : 'auto',
    }}>

      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: isFallback ? LIME : DIM, textTransform: 'uppercase' }}>
            {isFallback ? 'PRELIMINARY SIGNAL // LOW CONFIDENCE CONVERGENCE' : 'Decision Translation Layer'}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em',
            padding: '1px 6px',
            ...(isFallback
              ? { color: DIM, border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent' }
              : { color: '#000', background: LIME }),
          }}>
            {primary.lensId.replace(/_/g, ' ')}
          </span>
        </div>
        {resolutionPolicyApplied && (
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: DIM }}>
            MULTI-LENS
          </span>
        )}
      </div>

      {/* Primary frame */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FrameRow label="Stake" value={primary.stake}  dimValue={isFallback} />
        <FrameRow label="Move"  value={primary.move}   dimValue={isFallback} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
            Window
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: isFallback ? MID : LIME }}>
            {primary.window}
          </span>
        </div>
      </div>

      {/* Secondary decision spaces — collapsed, non-active */}
      {secondaries.length > 0 && (
        <div style={{ padding: '8px 20px 12px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase', marginBottom: 8 }}>
            Secondary Decision Spaces — non-active
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {secondaries.map(s => (
              <div key={s.lensId} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '6px 10px',
                border: `1px solid ${BORDER}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 7, color: MID, letterSpacing: '0.18em', flexShrink: 0 }}>
                  {s.lensId.replace(/_/g, ' ')}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.04em', lineHeight: 1.4 }}>
                  {s.move}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
