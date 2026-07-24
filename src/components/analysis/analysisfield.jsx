// AnalysisField — ConeMap surface. Single state: always renders 6 domain bays.
// ACTIVE/TACTICAL/NodeMapCanvas modes killed (WO-1344 routing supersedes them).
import React, { useMemo } from 'react';
import ConeMap from '../spine/conemap.jsx';
import ScoutingReport from './scoutingreport.jsx';
import { LENS_EMBEDS, isEmbedLens } from '../../config/lensembeds.js';
import { usePrism } from '../../context/PrismContext.jsx';
import { aggregateSignals } from '../../engine/aggregation.js';
import { CANONICAL_DOMAINS } from '../../engine/ontology.js';
import { buildScoutingReportForDomain } from '../../engine/scoutingreportproducer.js';
import { useDriftDivergence } from '../../hooks/usedriftdivergence.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// ── LENS EMBED SIZING CONTRACT (LOCKED) ────────────────────────────────────────
// Every Flourish lens embed renders in ONE identical panel, centered in Region C.
// Do not size lenses individually. To resize ALL lenses, change these two numbers.
// Target footprint = the cone-map content box (measured 1025 × 565 px, ~16:9).
const LENS_EMBED = Object.freeze({ maxWidth: 900, maxHeight: 565 });

// Per-lens caption — the "why" line beneath the embed. Legend + colors stay in Flourish.
const LENS_CAPTIONS = Object.freeze({
  CONVERGENCE: 'The gap between the signal and its expected trend — it widens as they diverge, closes as they converge.',
});

function AnalysisField({
  signals,
  replayedSignals,
  selectedLens,
  topoMode,
  onTopoToggle,
  selection,
  clickEvent,
  onSelectCone,
  onActiveConeChange,
  onArcClick,
  maxCones,
  dollyKey,
  coneColorOverrides,
}) {
  const { state } = usePrism();
  const viewportLens = state?.activeLens ?? 'OBSERVE'; // KRYL-1034 active lens → cone suspended HUD

  // ── OPPORTUNITY (sell layer) — derive live cone state so the Scouting Report has real reads.
  // Hooks run every render (unconditional), but the work is gated on the OPPORTUNITY lens so the
  // GDELT drift query only fires when the storefront is actually open.
  const opportunityActive = viewportLens === 'OPPORTUNITY';
  const coneState = useMemo(() => {
    if (!opportunityActive) return [];
    const normalized = (replayedSignals ?? signals ?? []).map(sig => ({
      domain: sig.domain ?? sig.source ?? 'signal',
      leverage: (sig.fs ?? 0) * 100,
      volatility: sig.fidelity?.e_viral ?? 0,
    }));
    const byDomain = new Map(aggregateSignals(normalized).map(s => [s.domain, s]));
    return CANONICAL_DOMAINS.map(d => byDomain.get(d) ?? { domain: d, pressure: 0, volatility: 0 });
  }, [opportunityActive, signals, replayedSignals]);

  const driftByDomain = useDriftDivergence(coneState, opportunityActive);

  const scoutingReport = useMemo(() => {
    if (!opportunityActive || !coneState.length) return null;
    // Sell layer is SINGULAR (spec §3) — foreground one domain: the selection, else the hottest.
    const chosen = coneState.find(c => c.domain === selection)
      ?? [...coneState].sort((a, b) => (b.pressure ?? 0) - (a.pressure ?? 0))[0];
    if (!chosen) return null;
    return buildScoutingReportForDomain(chosen.domain, {
      pressure: chosen.pressure, volatility: chosen.volatility,
      drift: driftByDomain[chosen.domain] ?? null,
    });
  }, [opportunityActive, coneState, selection, driftByDomain]);

  if (opportunityActive) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden',
                    display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: `${LENS_EMBED.maxWidth}px`, height: '100%',
                      padding: '18px 20px', boxSizing: 'border-box' }}>
          {scoutingReport
            ? <ScoutingReport report={scoutingReport} />
            : <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)',
                            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                AWAITING SIGNALS
              </div>}
        </div>
      </div>
    );
  }

  // LSC-001 Region C — a lens with a Flourish embed renders it as an iframe (no WebGL); until a URL
  // is wired it shows an "awaiting embed" slot. Lenses not in the embed map fall through to the cone map.
  if (isEmbedLens(viewportLens)) {
    const url = LENS_EMBEDS[viewportLens];
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? (
          // top color key (states) + embed + bottom caption (the why). Flourish legend off.
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        width: '100%', height: '100%',
                        maxWidth: `${LENS_EMBED.maxWidth}px`, maxHeight: `${LENS_EMBED.maxHeight}px` }}>
            {/* wrapper clips the bottom "Made with Flourish" credit strip off the iframe (overflow hidden
                + iframe sized taller than the wrapper), leaving the full chart visible. */}
            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <iframe title={viewportLens} src={url}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)',
                               border: 'none', display: 'block' }} />
            </div>
            {LENS_CAPTIONS[viewportLens] && (
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.55)',
                            textAlign: 'left', alignSelf: 'flex-start', maxWidth: 760, lineHeight: 1.55, flexShrink: 0 }}>
                {LENS_CAPTIONS[viewportLens]}
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.26em', color: LIME }}>{viewportLens} LENS</div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>AWAITING FLOURISH EMBED</div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>
              paste the embed URL into src/config/lensembeds.js
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      <button
        onClick={onTopoToggle}
        style={{
          position: 'absolute', top: 16, right: 8, zIndex: 5,
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          background: 'transparent',
          border: `1px solid ${topoMode ? LIME : 'rgba(255,255,255,0.15)'}`,
          color: topoMode ? LIME : 'rgba(255,255,255,0.4)',
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
          padding: '10px 4px', cursor: 'pointer',
          transition: 'border-color 150ms, color 150ms',
        }}
      >
        {topoMode ? 'TOPOLOGY' : 'ABSTRACT'}
      </button>
      <ConeMap
        signals={replayedSignals ?? []}
        lens={selectedLens ?? 'INVESTOR'}
        selectedDomain={selection}
        clickEvent={clickEvent}
        onSelectCone={onSelectCone}
        onActiveConeChange={onActiveConeChange}
        topoMode={topoMode}
        onArcClick={onArcClick}
        maxCones={maxCones}
        dollyKey={dollyKey}
        coneColorOverrides={coneColorOverrides}
        viewportLens={viewportLens}
      />
    </div>
  );
}

// PERF (cone-rotation freeze): memoized so frequent SSE-driven App re-renders (useframestream) don't
// re-render the cone Canvas when AnalysisField's props are unchanged. Plain-component boundary — safe
// (worst case it re-renders as before); NOT an R3F-element memo (that caused the stale-scene glitch).
export default React.memo(AnalysisField);
