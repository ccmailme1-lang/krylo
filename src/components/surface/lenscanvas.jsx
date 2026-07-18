// lenscanvas.jsx — Lens Surface Contract region C (LSC-001, Founder 2026-07-18).
// The single swappable Primary Rendering slot. Every lens renders INTO this one container; only the
// content here changes between lenses — header, nav, timeline, status stay invariant (that is LSC-001).
//
// STEP 1 (this): pure scaffold. EVERY lens renders the existing cone map (AnalysisField) unchanged —
// so dropping this in changes nothing visually or behaviorally; it only establishes the one slot.
// Per-lens surfaces (Signal → floating nodes, etc.) are added in later steps behind their lens id,
// each defaulting back to the cone map until built (nothing regresses).
import React from 'react';
import { usePrism } from '../../context/PrismContext.jsx';
import AnalysisField from '../analysis/analysisfield.jsx';

export default function LensCanvas(props) {
  const { state } = usePrism();
  const lens = state?.activeLens ?? 'OBSERVE';

  // The cone map is the default surface for every lens (unchanged behavior).
  const coneMap = <AnalysisField {...props} />;

  switch (lens) {
    // Per-lens Primary surfaces slot in here as they're built. Until then → cone map.
    // case 'SIGNAL': return <SignalNodesSurface ... />;   // Step 3
    default:
      return coneMap;
  }
}
