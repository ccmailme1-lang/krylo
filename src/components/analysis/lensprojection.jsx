// WO-1318 — Analysis P3: Lens Projection — 40-year topological model
import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import ProjectionCanvas    from './projectioncanvas.jsx';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Playfair Display', serif";
const LIME  = '#66FF00';
const RED   = '#FF3300';
const BORDER = 'rgba(26,26,26,1)';

// Survival probability degrades with playhead + fracture exposure
function survivalProbability(playheadYear, fractureScore) {
  const base    = 100 - playheadYear * 2.4;
  const penalty = fractureScore * playheadYear * 0.6;
  return Math.max(Math.round(base - penalty), 8);
}

const FRACTURE_SCORE = 1.8; // inherited from P2 — 3 fractures detected

export default function LensProjection() {
  const [playheadYear, setPlayheadYear] = useState(0);

  const sessions        = useAnalysisStore((s) => s.sessions);
  const activeSessionId = useAnalysisStore((s) => s.activeSessionId);
  const session         = activeSessionId ? sessions[activeSessionId] : null;
  const lensLabel       = session?.lens?.toUpperCase() ?? 'RETIREMENT';

  const survival = survivalProbability(playheadYear, FRACTURE_SCORE);
  const survivalColor = survival > 60 ? '#ffffff' : survival > 30 ? LIME : RED;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid',
      gridTemplateColumns: '300px 1fr 300px',
      background: '#000000',
      fontFamily: MONO,
      overflow: 'hidden',
    }}>

      {/* ── COL 1: PROJECTION PARAMETERS ─────────────────────────── */}
      <aside style={{
        borderRight: `1px solid ${BORDER}`,
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        height: '100%', boxSizing: 'border-box', overflowY: 'auto',
      }}>
        <div>
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.28em', borderBottom: `1px solid ${BORDER}`,
            paddingBottom: 10, marginBottom: 16,
          }}>
            P3 — LENS PROJECTION
          </div>
          <div style={{ fontSize: 9, color: LIME, letterSpacing: '0.18em', marginBottom: 20 }}>
            PROJECTION CONSTRAINT: {lensLabel}
          </div>

          {/* Constraint metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Earning Window',      value: '4–6 YRS',  color: '#ffffff' },
              { label: 'Liability Tail',      value: '45+ YRS',  color: '#ffffff' },
              { label: 'Fracture Multiplier', value: `×${FRACTURE_SCORE}`, color: RED },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span style={{ fontSize: 11, color, fontFamily: MONO }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Variance band explanation */}
          <div style={{
            borderLeft: `2px solid rgba(102,255,0,0.25)`,
            paddingLeft: 12, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', marginBottom: 6 }}>
              UNCERTAINTY BAND
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>
              Band width is fracture-coupled. High P2 dissonance widens the probability envelope — the future becomes geometrically unpredictable.
            </div>
          </div>

          {/* Event horizons */}
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.22em', marginBottom: 10 }}>
            EVENT HORIZONS
          </div>
          {[
            { yr: 6,  label: 'PEAK EARN',       color: LIME },
            { yr: 16, label: 'CAREER CLIFF',     color: RED  },
            { yr: 22, label: 'LIABILITY MAX',    color: RED  },
            { yr: 28, label: 'LIQUIDITY FLOOR',  color: RED  },
          ].map(({ yr, label, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>{label}</span>
              <span style={{ fontSize: 8, color, fontFamily: MONO }}>YR {yr}</span>
            </div>
          ))}
        </div>

        {/* Temporal playhead */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 8,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>
              TEMPORAL PLAYHEAD
            </span>
            <span style={{ fontSize: 9, color: LIME }}>+{playheadYear} YRS</span>
          </div>
          <style>{`
            .proj-scrubber {
              -webkit-appearance: none; appearance: none;
              width: 100%; height: 2px;
              background: rgba(255,255,255,0.1);
              outline: none; cursor: pointer;
            }
            .proj-scrubber::-webkit-slider-thumb {
              -webkit-appearance: none; appearance: none;
              width: 12px; height: 12px; border-radius: 50%;
              background: #66FF00; cursor: pointer;
            }
            .proj-scrubber::-moz-range-thumb {
              width: 12px; height: 12px; border-radius: 50%;
              background: #66FF00; cursor: pointer; border: none;
            }
          `}</style>
          <input
            type="range"
            min="0" max="40"
            value={playheadYear}
            onChange={(e) => setPlayheadYear(parseInt(e.target.value))}
            className="proj-scrubber"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>NOW</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>YR 40</span>
          </div>
        </div>
      </aside>

      {/* ── COL 2: TOPOLOGICAL CANVAS ─────────────────────────────── */}
      <main style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          <ProjectionCanvas playhead={playheadYear} fractureScore={FRACTURE_SCORE} />
        </div>

        {/* Year axis labels */}
        <div style={{
          position: 'absolute', bottom: 12, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between',
          padding: '0 16px', pointerEvents: 'none',
        }}>
          {[0, 10, 20, 30, 40].map(yr => (
            <span key={yr} style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: MONO }}>
              YR {yr}
            </span>
          ))}
        </div>

        {/* Corner label */}
        <div style={{
          position: 'absolute', top: 12, left: 14,
          fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em',
          pointerEvents: 'none',
        }}>
          LENS: {lensLabel} — 40-YEAR PROJECTION
        </div>
      </main>

      {/* ── COL 3: PROBABILITY READOUT ────────────────────────────── */}
      <aside style={{
        borderLeft: `1px solid ${BORDER}`,
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        height: '100%', boxSizing: 'border-box', overflowY: 'auto',
      }}>
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.28em', borderBottom: `1px solid ${BORDER}`,
          paddingBottom: 10, marginBottom: 20,
        }}>
          FUTURE STATE +{playheadYear} YRS
        </div>

        {/* Survival probability */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', marginBottom: 8 }}>
            SURVIVAL PROBABILITY
          </div>
          <div style={{ fontSize: 52, color: survivalColor, lineHeight: 1, fontFamily: MONO, letterSpacing: '-0.02em' }}>
            {survival}%
          </div>
          {survival <= 30 && (
            <div style={{
              marginTop: 8, fontSize: 9, color: RED, letterSpacing: '0.16em',
              borderLeft: `2px solid ${RED}`, paddingLeft: 8,
            }}>
              CRITICAL — STRUCTURAL INTERVENTION REQUIRED
            </div>
          )}
        </div>

        {/* Confidence band note */}
        <div style={{
          borderLeft: `2px solid ${BORDER}`,
          paddingLeft: 12, marginBottom: 24,
        }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, fontFamily: SERIF }}>
            Confidence bands widen due to unverified claim (Node Alpha: 01). Fracture multiplier ×{FRACTURE_SCORE} applied to all forward projections.
          </div>
        </div>

        {/* State breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'CAPITAL COVERAGE',   value: `${Math.max(62 - playheadYear * 1.2, 8).toFixed(0)}%` },
            { label: 'VELOCITY DRIFT',     value: `−${(0.4 + playheadYear * 0.03).toFixed(2)}%/MO` },
            { label: 'VARIANCE BAND',      value: `±${(FRACTURE_SCORE * playheadYear * 0.4).toFixed(1)} PTS` },
          ].map(({ label, value }) => (
            <div key={label} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: '#ffffff', fontFamily: MONO }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Liquidity zero-point event if playhead crosses YR 28 */}
        {playheadYear >= 28 && (
          <div style={{
            marginTop: 20,
            border: `1px solid ${RED}`,
            background: 'rgba(255,51,0,0.06)',
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 9, color: RED, letterSpacing: '0.18em', marginBottom: 4 }}>
              LIQUIDITY ZERO-POINT
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Playhead has crossed the liquidity floor. Structural action required to prevent terminal drift.
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}
