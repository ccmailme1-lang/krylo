/* src/components/integritybadge.jsx                                    */
/* WO-729 — Integrity Badge primitive                                   */
/* Visual anchor for the Integrity Stack result on a locked ETR node.  */
/*                                                                      */
/* Props:                                                               */
/*   node           — ETR signal object (from signals[i])               */
/*   onOpenScorecard — callback; fires on click → WO-740 Scorecard     */

import { motion } from 'framer-motion';
import { useNodeMetadata }     from '../hooks/useNodeMetadata';
import { SCRUTINY_PULSE_PERIOD } from '../designSystem/badges';

export function IntegrityBadge({ node, onOpenScorecard }) {
  const meta = useNodeMetadata(node);
  if (!meta) return null;

  const {
    catLabel,
    riskColor,
    riskLabel,
    riskPct,
    isPending,
    shouldPulse,
    trustDelta,
    trustSign,
  } = meta;

  // ── Pulse variants — synced to WO-753 ScrutinyField at ~4.5 rad/s ───────────
  const pulseVariants = {
    idle: {
      opacity:     1,
      borderColor: 'rgba(255,255,255,0.08)',
      boxShadow:   trustDelta > 0
        ? '0 0 10px rgba(0,200,83,0.18)'   // static bloom — positive trust
        : 'none',
    },
    pulse: {
      opacity:     [0.75, 1, 0.75],
      borderColor: ['rgba(255,59,48,0.25)', 'rgba(255,59,48,0.75)', 'rgba(255,59,48,0.25)'],
      boxShadow:   ['0 0 6px rgba(255,59,48,0.1)', '0 0 14px rgba(255,59,48,0.35)', '0 0 6px rgba(255,59,48,0.1)'],
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={shouldPulse ? 'pulse' : 'idle'}
      variants={pulseVariants}
      transition={
        shouldPulse
          ? { duration: SCRUTINY_PULSE_PERIOD, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3, ease: 'easeOut' }
      }
      whileEnter={{ opacity: 0 }}
      onClick={onOpenScorecard}
      style={{
        width:         '240px',   // fixed — zero layout shift
        fontFamily:    'IBM Plex Mono, monospace',
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        borderRadius:  '3px',
        padding:       '8px 10px',
        cursor:        onOpenScorecard ? 'pointer' : 'default',
        pointerEvents: 'auto',
        userSelect:    'none',
        marginTop:     '10px',
      }}
    >
      {/* Row 1: category label + trust delta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <span style={{
          fontSize:      '9px',
          letterSpacing: '0.14em',
          color:         riskColor,
          fontWeight:    600,
        }}>
          {catLabel}
        </span>
        <span style={{
          fontSize:      '8px',
          letterSpacing: '0.1em',
          color:         trustDelta >= 0 ? 'rgba(0,200,83,0.7)' : 'rgba(255,59,48,0.7)',
        }}>
          Δ{trustSign}{trustDelta.toFixed(0)}
        </span>
      </div>

      {/* Row 2: risk bar — SVG mask */}
      <div style={{ marginBottom: '6px' }}>
        <svg width="100%" height="3" style={{ display: 'block' }}>
          <rect x="0" y="0" width="100%" height="3" fill="rgba(255,255,255,0.07)" rx="1.5" />
          {!isPending && (
            <rect x="0" y="0" width={`${riskPct}%`} height="3" fill={riskColor} rx="1.5" />
          )}
          {isPending && (
            // Indeterminate shimmer placeholder when score is null
            <rect x="0" y="0" width="35%" height="3" fill="rgba(128,128,128,0.4)" rx="1.5" />
          )}
        </svg>
      </div>

      {/* Row 3: risk label */}
      <div style={{
        fontSize:      '8px',
        letterSpacing: '0.12em',
        color:         isPending ? 'rgba(128,128,128,0.55)' : 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
      }}>
        {isPending ? '⟳  AUDIT IN PROGRESS' : riskLabel}
        {onOpenScorecard && !isPending && (
          <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.2)', fontSize: '7px' }}>
            TAP FOR SCORECARD →
          </span>
        )}
      </div>
    </motion.div>
  );
}
