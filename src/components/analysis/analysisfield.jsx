// AnalysisField — ConeMap surface. Single state: always renders 6 domain bays.
// ACTIVE/TACTICAL/NodeMapCanvas modes killed (WO-1344 routing supersedes them).
import React, { useMemo } from 'react';
import ConeMap from '../spine/conemap.jsx';
import { LENS_EMBEDS, isEmbedLens } from '../../config/lensembeds.js';
import { usePrism } from '../../context/PrismContext.jsx';
import { buildLiveProspectus } from '../../engine/formationprospectusproducer.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// ── LENS EMBED SIZING CONTRACT (LOCKED) ────────────────────────────────────────
// Every Flourish lens embed renders in ONE identical panel, centered in Region C.
// Do not size lenses individually. To resize ALL lenses, change these two numbers.
// Target footprint = the cone-map content box (measured 1025 × 565 px, ~16:9).
const LENS_EMBED = Object.freeze({ maxWidth: 900, maxHeight: 565 });

// KRYL-1118 — prospectus graph artifact. Paste the Flourish graph chart URL here to wedge it into the
// Structural Relationships block (the formation's proof surface). null → shows an empty artifact slot.
const FORMATION_GRAPH_EMBED = null;

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

  // ── OPPORTUNITY (sell layer) → live Structural Intelligence Prospectus (KRYL-1117).
  // buildLiveProspectus runs the chain: signal pool → perception → inference → assembler.
  const opportunityActive = viewportLens === 'OPPORTUNITY';
  const prospectus = useMemo(
    () => (opportunityActive ? buildLiveProspectus({ now: Date.now() }) : null),
    [opportunityActive, signals, replayedSignals],
  );

  if (opportunityActive) {
    // OPPORTUNITY report surface (KRYL-1117). Dark §6 palette (no color change). §5 dual voice:
    // SERIF synthesis (narrative) / MONO data. VIC-001: institutional research artifact — hierarchy and
    // spacing carry it, no gray-border cards, lime is a live-state mark only.
    const SERIF = "Georgia, 'Times New Roman', serif";
    const INK = '#F5F5F7', DIM = 'rgba(245,245,247,0.60)', FAINT = 'rgba(245,245,247,0.34)';
    const TITLES = {
      STRUCTURAL_IDENTITY: 'Structural Identity', EXECUTIVE_STRUCTURAL_ASSESSMENT: 'Executive Assessment',
      FORMATION_ANATOMY: 'Formation Anatomy', STRUCTURAL_FIELD: 'Structural Field',
      FORMATION_PROPERTIES: 'Formation Properties', STRUCTURAL_RELATIONSHIPS: 'Structural Relationships',
      FORMATION_RESONANCE: 'Formation Resonance', STRUCTURAL_DRIFT: 'Structural Drift',
      PRESSURE_MAP: 'Pressure Map', FORMATION_TRAJECTORY: 'Formation Trajectory',
      EVIDENCE_FOUNDATION: 'Evidence Foundation', STRUCTURAL_INTELLIGENCE_CONCLUSION: 'Conclusion',
    };
    const NARRATIVE = new Set(['EXECUTIVE_STRUCTURAL_ASSESSMENT', 'STRUCTURAL_INTELLIGENCE_CONCLUSION']);
    const dataBody = (s) => {
      if (s.statement) return s.statement;
      if (s.note) return s.note;
      if (s.id === 'STRUCTURAL_IDENTITY') return s.participatingDomains.join('  ·  ');
      if (s.id === 'STRUCTURAL_RELATIONSHIPS') return (s.edges ?? []).map(e => `${e.a} ↔ ${e.b}`).join('    ') || '—';
      if (s.read) return `${s.read.label ?? s.read.lens} ${typeof s.read.value === 'number' ? s.read.value.toFixed(2) : s.read.value}`;
      return '—';
    };
    // sub-score bars — the CB-Insights coordinated-metric signature (label · value · bar), §6 mono, no lime.
    const Bars = ({ pairs }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 2 }}>
        {pairs.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '18px 40px 1fr', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT }}>{k}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: INK, fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(2)}</span>
            <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
              <span style={{ position: 'absolute', inset: 0, width: `${Math.round(v * 100)}%`, background: 'rgba(245,245,247,0.55)' }} />
            </span>
          </div>
        ))}
      </div>
    );
    const Body = ({ s }) => {
      if (s.state !== 'GROUNDED')
        return <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.03em', color: FAINT }}>Withheld — {s.reason} · {s.absence}</div>;
      if (s.id === 'FORMATION_PROPERTIES')
        return <Bars pairs={[['E', s.existence], ['C', s.cohesion], ['Q', s.pressureCoherence], ['Ḡ', s.avgGroundedness]]} />;
      if (NARRATIVE.has(s.id))
        return <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, color: INK }}>{dataBody(s)}</div>;
      return <div style={{ fontFamily: MONO, fontSize: 13, lineHeight: 1.7, letterSpacing: '0.02em', color: DIM }}>{dataBody(s)}</div>;
    };
    const Label = ({ s }) => (
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: FAINT, marginBottom: 10,
                    display: 'flex', justifyContent: 'space-between' }}>
        <span>{(TITLES[s.id] ?? s.id).toUpperCase()}</span>
        <span style={{ color: s.state === 'GROUNDED' ? DIM : FAINT }}>{s.state === 'GROUNDED' ? '' : 'WITHHELD'}</span>
      </div>
    );
    const CARD = { border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' };
    const byId = Object.fromEntries((prospectus?.sections ?? []).map((s) => [s.id, s]));
    const GRID = ['FORMATION_ANATOMY', 'FORMATION_PROPERTIES', 'PRESSURE_MAP', 'EVIDENCE_FOUNDATION',
      'STRUCTURAL_FIELD', 'STRUCTURAL_DRIFT', 'FORMATION_RESONANCE', 'FORMATION_TRAJECTORY'];
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto',
                    display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 940, minHeight: '100%', padding: '40px 44px 72px', boxSizing: 'border-box' }}>
          {prospectus && prospectus.live ? (
            <>
              {/* hero — conclusion-first, full width */}
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: FAINT, marginBottom: 18 }}>FORMATION PROSPECTUS</div>
              <div style={{ fontFamily: SERIF, fontSize: 36, lineHeight: 1.1, color: INK, marginBottom: 14 }}>{prospectus.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.05em', color: DIM, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: INK }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: LIME }} />{prospectus.header.state}
                </span>
                <span>E {prospectus.header.existence?.toFixed(2)}</span>
                <span>{Math.round(prospectus.header.coverage * 100)}% coverage</span>
                <span>{prospectus.header.evidenceCount} signals</span>
              </div>
              {byId.STRUCTURAL_IDENTITY && (
                <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: DIM, marginBottom: 34 }}>
                  {byId.STRUCTURAL_IDENTITY.participatingDomains?.join('   ·   ')}
                </div>
              )}

              {/* executive brief — full width, serif */}
              {byId.EXECUTIVE_STRUCTURAL_ASSESSMENT && (
                <div style={{ ...CARD, marginBottom: 40 }}>
                  <Label s={byId.EXECUTIVE_STRUCTURAL_ASSESSMENT} />
                  <Body s={byId.EXECUTIVE_STRUCTURAL_ASSESSMENT} />
                </div>
              )}

              {/* structural relationships — the formation graph = proof surface (KRYL-1118). Flourish slot. */}
              {byId.STRUCTURAL_RELATIONSHIPS && (
                <div style={{ ...CARD, marginBottom: 40 }}>
                  <Label s={byId.STRUCTURAL_RELATIONSHIPS} />
                  <Body s={byId.STRUCTURAL_RELATIONSHIPS} />
                  <div style={{ marginTop: 16, height: 340, background: 'rgba(245,245,247,0.03)', position: 'relative', overflow: 'hidden' }}>
                    {FORMATION_GRAPH_EMBED ? (
                      <iframe title="formation-graph" src={FORMATION_GRAPH_EMBED}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)', border: 'none' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: FAINT }}>
                        GRAPH ARTIFACT · SET FORMATION_GRAPH_EMBED
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* coordinated panel grid — whitespace-separated, no borders */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 48, rowGap: 34, marginBottom: 40 }}>
                {GRID.filter((id) => byId[id]).map((id) => (
                  <div key={id} style={CARD}><Label s={byId[id]} /><Body s={byId[id]} /></div>
                ))}
              </div>

              {/* conclusion — full width, serif */}
              {byId.STRUCTURAL_INTELLIGENCE_CONCLUSION && (
                <div style={CARD}><Label s={byId.STRUCTURAL_INTELLIGENCE_CONCLUSION} /><Body s={byId.STRUCTURAL_INTELLIGENCE_CONCLUSION} /></div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: FAINT,
                          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {prospectus ? 'INSUFFICIENT SIGNAL — NO FORMATION DETECTED' : 'AWAITING SIGNALS'}
            </div>
          )}
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
