// src/components/surface/orientationsurface.jsx
// OrientationSurface — pre-activation perceptual posture (mounted when isSurface && !surfaceActivated
// in app.jsx). Owns layout boundary only. No formation adaptation, no relationship derivation, no
// connector filtering, no evidence/provenance logic — all of that lives in the shared pipeline
// ConeMap already calls (formationadapter.js / formationrelationship.js). Named to avoid collision
// with CLAUDE.md's locked "Layer 1 (Hero)" (public/krylo2-feed.html) — this is a ConeMap density
// posture nested inside the Surface bay, not a funnel layer.
import React from 'react';
import ConeMap from '../spine/conemap.jsx';

export default function OrientationSurface(props) {
  return (
    <section className="orientation-surface" data-surface="orientation" style={{ position: 'absolute', inset: 0 }}>
      <ConeMap {...props} connectorTier="hero" />
    </section>
  );
}
