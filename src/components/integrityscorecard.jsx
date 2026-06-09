/* src/components/integrityscorecard.jsx                                */
/* WO-740 — Node Interrogation: Integrity Scorecard                     */
/* Shows ABI-framed Keccak hash + 4 Integrity ID Badge breakdown.       */
/* Triggered by clicking IntegrityBadge in HoverCard.                   */

import { motion, AnimatePresence } from 'framer-motion';
import { getRiskColor, CATEGORY_LABELS, BADGE_RISK_COLORS } from '../designSystem/badges';

const BADGE_META = {
  SOURCE:     { label: 'SOURCE',     weight: 25, desc: 'Named outlet vs. unknown. The Anchor.' },
  FIDELITY:   { label: 'FIDELITY',   weight: 15, desc: 'synthetic_risk_score. The Filter.' },
  TRACTION:   { label: 'TRACTION',   weight: 5,  desc: 't_telemetry engagement. The Inertia.' },
  VOLATILITY: { label: 'VOLATILITY', weight: 5,  desc: 'category_mass coefficient. The Spring.' },
};

function BadgeRow({ id, score, maxWeight }) {
  const meta   = BADGE_META[id];
  if (!meta) return null;
  const pct    = Math.abs(score) / maxWeight * 100;
  const isPos  = score >= 0;
  const color  = isPos ? '#00C853' : '#FF3B30';
  const sign   = isPos ? '+' : '';

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)' }}>
          {meta.label}
        </span>
        <span style={{ fontSize: '10px', color, fontWeight: 600 }}>
          {sign}{score.toFixed(1)}
        </span>
      </div>
      <div style={{ position: 'relative', height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '1px' }}>
        {/* Center line */}
        <div style={{
          position:   'absolute',
          left:       '50%',
          top:        0,
          width:      '1px',
          height:     '2px',
          background: 'rgba(255,255,255,0.2)',
        }} />
        {/* Score bar — grows from center */}
        <div style={{
          position:     'absolute',
          top:          0,
          height:       '2px',
          width:        `${pct / 2}%`,
          left:         isPos ? '50%' : `${50 - pct / 2}%`,
          background:   color,
          borderRadius: '1px',
        }} />
      </div>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginTop: '3px', letterSpacing: '0.08em' }}>
        {meta.desc}
      </div>
    </div>
  );
}

export function IntegrityScorecard({ signal, onClose }) {
  if (!signal) return null;

  const {
    category_id,
    trust_delta,
    synthetic_risk_score,
    keccak_hash,
    integrity_badges,
    title,
  } = signal;

  const catLabel  = CATEGORY_LABELS[category_id] ?? 'GENERAL NEWS';
  const riskColor = getRiskColor(synthetic_risk_score);
  const isPending = synthetic_risk_score === null || synthetic_risk_score === undefined;
  const trustSign = (trust_delta ?? 0) >= 0 ? '+' : '';

  return (
    <AnimatePresence>
      <motion.div
        key="scorecard"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width:         '300px',
          fontFamily:    'IBM Plex Mono, monospace',
          background:    'rgba(5,7,10,0.97)',
          border:        '1px solid rgba(255,255,255,0.1)',
          borderRadius:  '6px',
          padding:       '16px 18px',
          pointerEvents: 'auto',
          userSelect:    'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', color: riskColor, marginBottom: '2px' }}>
              {catLabel}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>
              INTEGRITY SCORECARD
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize:  '16px',
              fontWeight: 700,
              color:      (trust_delta ?? 0) >= 0 ? '#00C853' : '#FF3B30',
              lineHeight: 1,
            }}>
              {trustSign}{(trust_delta ?? 0).toFixed(0)}
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>TrustΔ</div>
          </div>
        </div>

        {/* Keccak Hash */}
        <div style={{
          marginBottom:  '14px',
          padding:       '8px',
          background:    'rgba(255,255,255,0.03)',
          borderRadius:  '3px',
          border:        '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: '4px' }}>
            KECCAK-256 FINGERPRINT
          </div>
          <div style={{
            fontSize:    '8px',
            color:       'rgba(102,255,0,0.6)',
            letterSpacing: '0.06em',
            wordBreak:   'break-all',
            lineHeight:  1.5,
          }}>
            {keccak_hash ?? '0x—'}
          </div>
        </div>

        {/* 4 Badge Breakdown */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', marginBottom: '10px' }}>
            ID BADGES
          </div>
          {integrity_badges
            ? Object.entries(integrity_badges).map(([id, score]) => (
                <BadgeRow key={id} id={id} score={score} maxWeight={BADGE_META[id]?.weight ?? 25} />
              ))
            : (
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
                ⟳  AUDIT IN PROGRESS
              </div>
            )
          }
        </div>

        {/* Risk status */}
        <div style={{
          paddingTop:   '10px',
          borderTop:    '1px solid rgba(255,255,255,0.06)',
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
        }}>
          <div style={{ fontSize: '8px', color: isPending ? BADGE_RISK_COLORS.pending : riskColor, letterSpacing: '0.12em' }}>
            {isPending ? '⟳ AUDIT IN PROGRESS' : `RISK ${synthetic_risk_score}/100`}
          </div>
          <button
            onClick={onClose}
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              color:         'rgba(255,255,255,0.3)',
              fontSize:      '11px',
              padding:       0,
              letterSpacing: 0,
              fontFamily:    'IBM Plex Mono, monospace',
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
