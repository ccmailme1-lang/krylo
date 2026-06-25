// attentionstack.jsx — SAB Visual Bifurcation Strategy: Attention Stack
// Ranked Kalshi market signals. Hierarchy-driven focus. What matters, now.
// WO-1726: Weak Signal Detection — sub-threshold signals surfaced below main stack.
// WO-1734: Non-Consensus Layer — NC classification strip (read-only telemetry).
import React, { useState } from 'react';
import { useKalshiSignals } from '../../hooks/usekalshisignals.js';
import { detectWeakSignals } from '../../engine/weaksignaldetector.js';
import { analyzeNonConsensus } from '../../engine/nonconsensusdetector.js';
import { synthesizeCrossDomain } from '../../engine/verdictsynthesis.js';
import { detectPlatformFormation, PLATFORM_FORMATION_PHASE } from '../../engine/platformformation.js';
import { classifyConviction, CONVICTION_LEVEL } from '../../engine/platformconviction.js';
import { attributeEntityToSignals } from '../../engine/entityattribution.js';
import { computePortfolioConvergence, detectPlatformInflection } from '../../engine/portfolioconvergence.js';
import { getRunningAccuracy, checkExpiry } from '../../engine/evidenceregistry.js';
import { detectRegulatoryWindow, REGULATORY_STATE } from '../../engine/regulatoryconvergence.js';
import { detectHNWConvergence, HNW_PHASE } from '../../engine/hnwconvergence.js';
import { detectCriticalMaterials, MATERIALS_PHASE } from '../../engine/criticalmaterials.js';
import { detectAIInfrastructureDemand } from '../../engine/aiinfrastructure.js';

const LIME  = '#66FF00';
const DIM   = 'rgba(255,255,255,0.35)';
const MID   = 'rgba(255,255,255,0.65)';
const WEAK  = 'rgba(255,255,255,0.22)';   // sub-threshold label color
const SLATE = 'rgba(58,61,74,0.90)';      // muted_slate per CLAUDE.md color semantics

const FREE_TIER_LIMIT = 3; // rows 1–3 free; row 4 partial; rows 5+ redacted

// Visibility contract — access/rendering only, no value judgment
const VISIBILITY = { FULL: 'FULL', PARTIAL: 'PARTIAL', REDACTED: 'REDACTED' };

function getVisibility(rowIndex) {
  if (rowIndex < FREE_TIER_LIMIT)    return VISIBILITY.FULL;
  if (rowIndex === FREE_TIER_LIMIT)  return VISIBILITY.PARTIAL;
  return VISIBILITY.REDACTED;
}

function TrendArrow({ forecast }) {
  if (forecast > 2)  return <span style={{ color: LIME }}>↑</span>;
  if (forecast < -2) return <span style={{ color: '#ff4444' }}>↓</span>;
  return <span style={{ color: DIM }}>—</span>;
}

function VolBadge({ volatility }) {
  const color = volatility === 'HIGH' ? '#ff4444' : volatility === 'MED' ? '#ffaa00' : LIME;
  return <span style={{ color, fontSize: 8 }}>{volatility}</span>;
}

export default function AttentionStack({ maxRows = 8, onSignalClick, style }) {
  const { signals, loading, lastFetch } = useKalshiSignals('ALL');
  const [expanded, setExpanded] = useState(false);

  // WO-1726 — WEAK-tier read-only telemetry
  const { weakSignals, emergingSignals } = detectWeakSignals(signals);
  const emergingDomains = new Set(emergingSignals.map(s => s.domain));

  // WO-1734 — NC-tier read-only telemetry (no classification logic here)
  const nc = analyzeNonConsensus(emergingSignals, signals);

  // WO-1722 — Munger cross-domain synthesis
  // Derive domain states from Kalshi pressure + confidence as convergence proxy.
  // signal >= 50 = BUILDING CONVERGENCE proxy. Fs = confidence / 100.
  const domainStates = signals.map(s => ({
    domain: s.domain,
    convergenceLabel: (s.signal ?? 0) >= 50 ? 'BUILDING CONVERGENCE' : 'LOW SIGNAL YIELD',
    fs: (s.confidence ?? 0) / 100,
  }));
  const munger = synthesizeCrossDomain(domainStates);

  // WO-1741 — Platform Formation Signal (META-SIGNAL / DETECTION)
  const formation = detectPlatformFormation(signals);

  // WO-1735 — Platform Conviction Arc (interpretation layer)
  const conviction = classifyConviction(formation, signals, nc);

  // WO-1728 — Full-Field Portfolio Convergence (Bezos Protocol)
  const portfolio   = computePortfolioConvergence(signals);
  const inflection  = detectPlatformInflection(signals);

  // WO-1736 — Regulatory Convergence Window (Gass-Benecke Protocol)
  const regulatory = detectRegulatoryWindow(signals);

  // WO-1737 — HNW Client Convergence Overlay (Cornerstone Protocol)
  const hnw = detectHNWConvergence(signals);

  // WO-1738 — Critical Materials Demand Signal (Lacaze Protocol)
  const materials = detectCriticalMaterials(signals);

  // WO-1739 — AI Infrastructure Demand Signal (Khoo Protocol)
  const khoo = detectAIInfrastructureDemand(signals);

  // WO-1725 Phase A — Entity pressure attribution
  const [activeEntity, setActiveEntity] = React.useState('');
  const [entityInput, setEntityInput] = React.useState('');
  const entityResult = activeEntity ? attributeEntityToSignals(activeEntity, signals) : null;

  // Top signals by OI, skip duplicates by domain+direction
  const seen = new Set();
  const rows = [];
  for (const s of signals) {
    const key = `${s.domain}-${s.signal > 50 ? 'yes' : 'no'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(s);
    if (rows.length >= (expanded ? 20 : maxRows)) break;
  }

  const displayRows = rows.slice(0, expanded ? 20 : maxRows);
  const age = lastFetch ? Math.round((Date.now() - lastFetch) / 1000) : null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 340,
      background: 'rgba(0,0,0,0.82)',
      border: '1px solid rgba(102,255,0,0.15)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      fontFamily: "'IBM Plex Mono', monospace",
      userSelect: 'none',
      ...style,
    }}>

      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 10px',
          borderBottom: '1px solid rgba(102,255,0,0.10)',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: LIME, fontSize: 8, letterSpacing: '0.2em' }}>
          ATTENTION STACK
        </span>
        <span style={{ color: DIM, fontSize: 9 }}>
          {loading ? 'LOADING…' : age !== null ? `${age}s AGO` : ''}
          {' '}{expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '20px 60px 36px 36px 52px 40px 20px',
        gap: 0, padding: '4px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {['RNK','SIGNAL','S','Δ','VOL','CONF',''].map(h => (
          <span key={h} style={{ fontSize: 9, letterSpacing: '0.15em', color: DIM }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      {displayRows.map((s, i) => {
        const vis = getVisibility(i);
        const isFull     = vis === VISIBILITY.FULL;
        const isPartial  = vis === VISIBILITY.PARTIAL;

        return (
          <div
            key={s.ticker}
            onClick={() => isFull && onSignalClick?.(s)}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 60px 36px 36px 52px 40px 20px',
              gap: 0,
              padding: '4px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              cursor: isFull && onSignalClick ? 'pointer' : 'default',
              transition: 'background 150ms',
              position: 'relative',
            }}
            onMouseEnter={e => { if (isFull) e.currentTarget.style.background = 'rgba(102,255,0,0.04)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Rank — lime square navigation glyph for PARTIAL and REDACTED */}
            {isFull ? (
              <span style={{ color: DIM, fontSize: 8 }}>{i + 1}</span>
            ) : (
              <div style={{
                width: 16, height: 16,
                background: LIME,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#000', flexShrink: 0,
              }}>
                {i + 1}
              </div>
            )}

            {/* Content columns — FULL: normal | PARTIAL: blurred | REDACTED: empty */}
            <span style={{
              color: isFull ? MID : 'transparent',
              fontSize: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              filter: isPartial ? 'blur(3px)' : 'none',
              userSelect: isFull ? 'auto' : 'none',
            }}>
              {isFull ? s.domain : isPartial ? '██████' : ''}
            </span>

            <span style={{
              color: isFull ? '#ffffff' : 'transparent',
              fontSize: 9, fontWeight: 600,
              filter: isPartial ? 'blur(3px)' : 'none',
              userSelect: isFull ? 'auto' : 'none',
            }}>
              {isFull ? s.signal : isPartial ? '██' : ''}
            </span>

            <span style={{
              fontSize: 8,
              color: isFull ? (s.forecast > 2 ? LIME : s.forecast < -2 ? '#ff4444' : DIM) : 'transparent',
              filter: isPartial ? 'blur(3px)' : 'none',
              userSelect: isFull ? 'auto' : 'none',
            }}>
              {isFull ? `${s.forecast > 0 ? '+' : ''}${s.forecast}` : ''}
            </span>

            {isFull
              ? <VolBadge volatility={s.volatility} />
              : <span />
            }

            <span style={{
              color: isFull ? MID : 'transparent',
              fontSize: 8,
              filter: isPartial ? 'blur(3px)' : 'none',
              userSelect: isFull ? 'auto' : 'none',
            }}>
              {isFull ? `${s.confidence}%` : ''}
            </span>

            {isFull ? <TrendArrow forecast={s.forecast} /> : <span />}

            {/* CTA — PARTIAL row only, positioned to not overlap grid */}
            {isPartial && (
              <span style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: LIME,
                fontSize: 6,
                letterSpacing: '0.14em',
                fontFamily: "'IBM Plex Mono', monospace",
                pointerEvents: 'none',
              }}>
                UPGRADE TO UNLOCK
              </span>
            )}
          </div>
        );
      })}

      {/* WO-1726 Phase A/B — Weak Signals (cross-domain alert lives in WO-1734 NC layer) */}
      {weakSignals.length > 0 && (
        <div>
          <div style={{
            padding: '4px 10px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: WEAK, fontSize: 9, letterSpacing: '0.18em' }}>
              WEAK SIGNALS · {weakSignals.length}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>PRESSURE &lt; 20</span>
          </div>
          {weakSignals.slice(0, 4).map(s => {
            const isEmerging = emergingDomains.has(s.domain);
            return (
              <div
                key={`weak-${s.ticker ?? s.domain}`}
                onClick={() => onSignalClick?.(s)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 60px 36px 1fr 50px',
                  gap: 0,
                  padding: '3px 10px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  opacity: 0.55,
                  cursor: onSignalClick ? 'pointer' : 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.80'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
              >
                <span style={{ color: SLATE, fontSize: 9 }}>·</span>
                <span style={{ color: WEAK, fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.domain}
                </span>
                <span style={{ color: WEAK, fontSize: 8 }}>{s.signal}</span>
                <span style={{ color: WEAK, fontSize: 6 }}>
                  {s.slope > 0 ? `+${s.slope.toFixed(1)}/r` : s.slope < 0 ? `${s.slope.toFixed(1)}/r` : '—'}
                </span>
                {isEmerging && (
                  <span style={{ color: LIME, fontSize: 6, letterSpacing: '0.1em' }}>↗ EMERGING</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* WO-1734 — NC Classification Strip */}
      {(nc.classification !== 'AMBIGUOUS' || nc.crossDomainEmergenceDetected) && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '5px 10px',
          background: nc.classification === 'DIVERGING'
            ? 'rgba(102,255,0,0.04)'
            : nc.consensusArriving
              ? 'rgba(0,127,255,0.05)'
              : 'transparent',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: nc.classification === 'DIVERGING' ? LIME
                   : nc.consensusArriving ? '#007FFF'
                   : WEAK,
            }}>
              {nc.classification === 'DIVERGING' && '◈ NON-CONSENSUS WINDOW'}
              {nc.classification === 'CONVERGING' && nc.consensusArriving && '◈ CONSENSUS FORMING'}
              {nc.crossDomainEmergenceDetected && nc.classification === 'AMBIGUOUS' && '◈ CROSS-DOMAIN EMERGENCE'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              K {nc.knowledgeAlignment} · C {nc.capitalAlignment} · Δ{nc.consensusDelta > 0 ? '+' : ''}{nc.consensusDelta}
            </span>
          </div>
          {nc.classification === 'DIVERGING' && nc.gapOpenMs > 0 && (
            <span style={{ color: WEAK, fontSize: 6 }}>
              CONVICTION WINDOW OPEN {Math.round(nc.gapOpenMs / 1000)}s · POP {Math.round(nc.populationAgreement * 100)}%
            </span>
          )}
        </div>
      )}

      {/* WO-1741 — Platform Formation Signal */}
      {formation.triggered && (
        <div style={{
          borderTop: '1px solid rgba(102,255,0,0.12)',
          padding: '5px 10px',
          background: formation.phase === PLATFORM_FORMATION_PHASE.CONFIRMED
            ? 'rgba(102,255,0,0.07)'
            : 'rgba(102,255,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ color: LIME, fontSize: 9, letterSpacing: '0.18em' }}>
              {formation.phase === PLATFORM_FORMATION_PHASE.CONFIRMED
                ? '◈ PLATFORM FORMATION CONFIRMED'
                : '◈ PLATFORM FORMATION DETECTED'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              {formation.velocityQualified ? `≥14d SUSTAINED` : `T+${Math.floor(Math.max(formation.daysAbove?.TECHNOLOGY ?? 0, formation.daysAbove?.CAPITAL ?? 0))}d`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: MID, fontSize: 6 }}>
              TECH {formation.technologyScore} · CAP {formation.capitalScore}
            </span>
            {!formation.velocityQualified && (
              <span style={{ color: WEAK, fontSize: 6 }}>
                VELOCITY GATE: {14 - Math.floor(Math.min(formation.daysAbove?.TECHNOLOGY ?? 0, formation.daysAbove?.CAPITAL ?? 0))}d REMAINING
              </span>
            )}
          </div>
        </div>
      )}

      {/* WO-1735 — Platform Conviction Arc */}
      {conviction.level !== CONVICTION_LEVEL.NONE && (
        <div style={{
          borderTop: '1px solid rgba(102,255,0,0.10)',
          padding: '5px 10px',
          background: conviction.level === CONVICTION_LEVEL.HYPERGROWTH
            ? 'rgba(138,43,226,0.07)'
            : 'rgba(102,255,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: conviction.level === CONVICTION_LEVEL.HYPERGROWTH ? '#8A2BE2'
                   : conviction.level === CONVICTION_LEVEL.CONFIRMED   ? LIME
                   : WEAK,
            }}>
              {conviction.level === CONVICTION_LEVEL.HYPERGROWTH && '◈ HYPERGROWTH WINDOW'}
              {conviction.level === CONVICTION_LEVEL.CONFIRMED   && '◈ CONVICTION CONFIRMED'}
              {conviction.level === CONVICTION_LEVEL.EARLY       && '◈ EARLY CONVICTION'}
            </span>
            {conviction.ncContext && (
              <span style={{ color: WEAK, fontSize: 6 }}>NC→CONFIRMED</span>
            )}
          </div>
          {conviction.personas.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {conviction.personas.map(p => (
                <span key={p} style={{
                  color: conviction.level === CONVICTION_LEVEL.HYPERGROWTH ? '#8A2BE2' : LIME,
                  fontSize: 6, letterSpacing: '0.1em',
                }}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WO-1722 — Munger Cross-Domain Synthesis */}
      {munger?.triggered && (
        <div style={{
          borderTop: '1px solid rgba(102,255,0,0.18)',
          padding: '6px 10px',
          background: 'rgba(102,255,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ color: LIME, fontSize: 9, letterSpacing: '0.18em' }}>
              ◈ CROSS-DOMAIN SYNTHESIS
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              {munger.domainCount} DOMAINS · Fs {Math.round(munger.mungerScore * 100)}%
            </span>
          </div>
          <div style={{ color: MID, fontSize: 9, lineHeight: 1.5, marginBottom: 3 }}>
            {munger.synthesis}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {munger.provenance.map(p => (
              <span key={p.domain} style={{ color: LIME, fontSize: 6, letterSpacing: '0.1em' }}>
                {p.domain} {Math.round(p.fs * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* WO-1728 — Full-Field Portfolio Convergence */}
      {portfolio.activeDomains > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '5px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ color: inflection.triggered ? LIME : DIM, fontSize: 9, letterSpacing: '0.18em' }}>
              {inflection.triggered ? '◈ PLATFORM BET WINDOW' : '· PORTFOLIO FIELD'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              AGG {portfolio.aggregateScore} · {portfolio.activeDomains}/6 · Fs {Math.round(portfolio.fs * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {portfolio.domainScores.filter(d => d.active).map(d => (
              <span key={d.domain} style={{
                fontSize: 6,
                color: d.score > 50 ? LIME : WEAK,
              }}>
                {d.domain.slice(0, 4)} {d.score}
              </span>
            ))}
          </div>
          {inflection.triggered && (
            <div style={{ marginTop: 3, color: LIME, fontSize: 6, letterSpacing: '0.1em' }}>
              {inflection.convergenceCount} DOMAINS CONVERGING · {inflection.convergingDomains.map(d => d.slice(0,4)).join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* WO-1736 — Regulatory Convergence Window (Gass-Benecke Protocol) */}
      {regulatory.triggered && (
        <div style={{
          borderTop: `1px solid ${regulatory.velocityState === REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED ? 'rgba(0,127,255,0.22)' : 'rgba(102,255,0,0.12)'}`,
          padding: '5px 10px',
          background: regulatory.velocityState === REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED
            ? 'rgba(0,127,255,0.06)' : 'rgba(102,255,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: regulatory.velocityState === REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED ? '#007FFF' : LIME,
            }}>
              ◈ GB · {regulatory.velocityState.replace(/_/g, ' ')}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>Fs {Math.round(regulatory.fs * 100)}%</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: MID, fontSize: 6 }}>K {regulatory.knowledgeScore} · M {regulatory.mediaScore}</span>
            {regulatory.microWindow.active && (
              <span style={{ color: LIME, fontSize: 6 }}>μ {regulatory.microWindow.domainCount}J · {regulatory.microWindow.count}e</span>
            )}
            {regulatory.macroWindow.active && (
              <span style={{ color: MID, fontSize: 6 }}>Σ {regulatory.macroWindow.distinctDays}d</span>
            )}
            {regulatory.phaseC && (
              <span style={{ color: regulatory.velocityState === REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED ? '#007FFF' : WEAK, fontSize: 6 }}>
                K−C +{regulatory.enforcementDelta}
              </span>
            )}
          </div>
        </div>
      )}

      {/* WO-1737 — HNW Client Convergence Overlay (Cornerstone Protocol) */}
      {hnw.triggered && (
        <div style={{
          borderTop: `1px solid ${hnw.phase === HNW_PHASE.TECH_CAPITAL_SPREAD ? 'rgba(0,127,255,0.22)' : 'rgba(102,255,0,0.12)'}`,
          padding: '5px 10px',
          background: hnw.phase === HNW_PHASE.TECH_CAPITAL_SPREAD
            ? 'rgba(0,127,255,0.06)'
            : 'rgba(102,255,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: hnw.phase === HNW_PHASE.TECH_CAPITAL_SPREAD ? '#007FFF' : LIME,
            }}>
              {hnw.phase === HNW_PHASE.OWNERSHIP_CAPITAL_DIVERGENCE && '◈ CS · OWNERSHIP CAPITAL DIVERGENCE'}
              {hnw.phase === HNW_PHASE.TECH_CAPITAL_SPREAD          && '◈ CS · TECH CAPITAL SPREAD'}
              {hnw.phase === HNW_PHASE.TRIPLE_CONVERGENCE           && '◈ CS · TRIPLE CONVERGENCE'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              Fs {Math.round(hnw.fs * 100)}%{hnw.fsQualified ? '' : ' · UNQUALIFIED'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {hnw.phase === HNW_PHASE.OWNERSHIP_CAPITAL_DIVERGENCE && (
              <span style={{ color: LIME, fontSize: 6 }}>O {hnw.ownershipScore} · C {hnw.capitalScore}</span>
            )}
            {hnw.phase === HNW_PHASE.TECH_CAPITAL_SPREAD && (
              <>
                <span style={{ color: '#007FFF', fontSize: 6 }}>T {hnw.technologyScore} · C {hnw.capitalScore}</span>
                <span style={{ color: '#007FFF', fontSize: 6, letterSpacing: '0.08em' }}>Δ +{hnw.techCapitalDelta}</span>
              </>
            )}
            {hnw.phase === HNW_PHASE.TRIPLE_CONVERGENCE && (
              <span style={{ color: MID, fontSize: 6 }}>T {hnw.technologyScore} · C {hnw.capitalScore} · O {hnw.ownershipScore}</span>
            )}
          </div>
        </div>
      )}

      {/* WO-1738 — Critical Materials Demand Signal (Lacaze Protocol) */}
      {materials.triggered && (
        <div style={{
          borderTop: `1px solid ${materials.phase === MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE ? 'rgba(0,127,255,0.22)' : 'rgba(102,255,0,0.12)'}`,
          padding: '5px 10px',
          background: materials.phase === MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE
            ? 'rgba(0,127,255,0.06)'
            : 'rgba(102,255,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: materials.phase === MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE ? '#007FFF' : LIME,
            }}>
              {materials.phase === MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE && '◈ LACAZE · MEDIA OWNERSHIP CONVERGENCE'}
              {materials.phase === MATERIALS_PHASE.OWNERSHIP_ELEVATION         && '◈ LACAZE · OWNERSHIP ELEVATION'}
              {materials.phase === MATERIALS_PHASE.T_C_O_CONVERGENCE          && '◈ LACAZE · T·C·O CONVERGENCE'}
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>Fs {Math.round(materials.fs * 100)}%</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {materials.phase === MATERIALS_PHASE.MEDIA_OWNERSHIP_CONVERGENCE && (
              <span style={{ color: '#007FFF', fontSize: 6 }}>M {materials.mediaScore} · O {materials.ownershipScore}</span>
            )}
            {materials.phase === MATERIALS_PHASE.OWNERSHIP_ELEVATION && (
              <span style={{ color: MID, fontSize: 6 }}>O {materials.ownershipScore}</span>
            )}
            {materials.phase === MATERIALS_PHASE.T_C_O_CONVERGENCE && (
              <span style={{ color: MID, fontSize: 6 }}>T {materials.technologyScore} · C {materials.capitalScore} · O {materials.ownershipScore}</span>
            )}
          </div>
        </div>
      )}

      {/* WO-1739 — AI Infrastructure Demand Signal (Khoo Protocol) */}
      {/* Evidence display only — no conclusions per WO-1745 contract */}
      {khoo.triggered && (
        <div style={{ borderTop: '1px solid rgba(102,255,0,0.08)', padding: '5px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ color: WEAK, fontSize: 9, letterSpacing: '0.18em' }}>
              · KHOO PROTOCOL
            </span>
            <span style={{ color: WEAK, fontSize: 6 }}>
              {khoo.evidence.filter(e => e.active).length}/3 · Fs {Math.round(khoo.fs * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {khoo.evidence.map(e => (
              <span key={e.domain} style={{ color: e.active ? LIME : WEAK, fontSize: 6 }}>
                {e.domain.slice(0, 4)} {e.score}{e.active ? ' ↑' : ''}
              </span>
            ))}
          </div>
          {khoo.provenance.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              {khoo.provenance.map(p => (
                <span key={p.source} style={{ color: WEAK, fontSize: 5, letterSpacing: '0.08em' }}>
                  {p.source}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WO-1725 Phase A — Entity Footprint */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '5px 10px' }}>
        <form onSubmit={e => { e.preventDefault(); setActiveEntity(entityInput.trim()); }} style={{ display: 'flex', gap: 4 }}>
          <input
            value={entityInput}
            onChange={e => setEntityInput(e.target.value)}
            placeholder="entity..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(102,255,0,0.25)',
              color: '#fff', fontSize: 9, fontFamily: 'inherit',
              outline: 'none', padding: '2px 0',
            }}
          />
          <button type="submit" style={{ background: 'none', border: 'none', color: LIME, fontSize: 9, cursor: 'pointer' }}>↩</button>
          {activeEntity && (
            <button type="button" onClick={() => { setActiveEntity(''); setEntityInput(''); }} style={{ background: 'none', border: 'none', color: WEAK, fontSize: 9, cursor: 'pointer' }}>✕</button>
          )}
        </form>
        {entityResult && (
          <div style={{ marginTop: 4 }}>
            {!entityResult.known && (
              <span style={{ color: WEAK, fontSize: 6 }}>ENTITY NOT IN REGISTRY</span>
            )}
            {entityResult.known && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: entityResult.qualified ? LIME : WEAK, fontSize: 9, letterSpacing: '0.15em' }}>
                    {entityResult.qualified ? '◈ ENTITY FOOTPRINT' : '· ENTITY FOOTPRINT'}
                  </span>
                  <span style={{ color: WEAK, fontSize: 6 }}>
                    {entityResult.footprint} DOMAINS · Fs {Math.round(entityResult.fs * 100)}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {entityResult.contributing.map(d => (
                    <span key={d.domain} style={{ color: LIME, fontSize: 6 }}>
                      {d.domain} {Math.round(d.attributedPressure * 100)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* WO-EVIDENCE-001 — Signal Outcome Registry */}
      {(() => {
        checkExpiry();
        const acc = getRunningAccuracy();
        const hasData = acc.totalPredictions > 0;
        return (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '5px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: hasData ? LIME : WEAK, fontSize: 9, letterSpacing: '0.18em' }}>
                {hasData ? '◈ SIGNAL REGISTRY' : '· SIGNAL REGISTRY'}
              </span>
              <span style={{ color: WEAK, fontSize: 6 }}>
                {hasData
                  ? `${acc.totalPredictions} TRACKED · ${acc.pending} PENDING`
                  : 'ACCUMULATING'}
              </span>
            </div>
            {hasData && (
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <span style={{ color: MID, fontSize: 6 }}>
                  ACC {acc.overallAccuracy !== null ? `${Math.round(acc.overallAccuracy * 100)}%` : '—'}
                </span>
                <span style={{ color: MID, fontSize: 6 }}>
                  AVG LEAD {acc.avgLeadTimeDays !== null ? `${acc.avgLeadTimeDays}d` : '—'}
                </span>
                <span style={{ color: acc.validated > 0 ? LIME : WEAK, fontSize: 6 }}>
                  ✓{acc.validated} ✗{acc.invalidated}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Footer — market source */}
      <div style={{
        padding: '4px 10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: DIM, fontSize: 9, letterSpacing: '0.1em' }}>
          KALSHI MARKETS · {signals.length} SIGNALS
        </span>
        <span style={{ color: DIM, fontSize: 9 }}>LIVE. VERIFIABLE.</span>
      </div>
    </div>
  );
}
