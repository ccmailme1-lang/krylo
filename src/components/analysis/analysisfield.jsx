// AnalysisField — ConeMap surface. Single state: always renders 6 domain bays.
// ACTIVE/TACTICAL/NodeMapCanvas modes killed (WO-1344 routing supersedes them).
import React from 'react';
import ConeMap from '../spine/conemap.jsx';
import SignalMap from '../spine/spinemap.jsx'; // Signal lens → node map in Region C (LSC-001)
import { usePrism } from '../../context/PrismContext.jsx';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

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

  // LSC-001 — the Signal lens swaps Region C to the node map (spinemap). Single Canvas at a time:
  // the cone map unmounts and the SignalMap mounts (no second WebGL context). `contained` keeps it
  // inside this Region-C container; `isActive` enables its raycast/hover.
  if (viewportLens === 'SIGNAL') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
        <SignalMap data={replayedSignals ?? signals ?? []} isActive contained />
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
