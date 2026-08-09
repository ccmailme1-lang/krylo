import React from 'react';
import { deriveFrameRenderSpecs } from '../../engine/perceptionrenderdata.js';

// KRYL-1158 — Component 5: ConeMap Replacement Renderer (Migration Phase 1).
//
// NOT wired into the live app. Nothing in app.jsx/orientationsurface.jsx/analysisfield.jsx
// imports this yet — per KRYL-1158's own Migration Strategy, Phase 1 is "build beside the
// current implementation," Phase 3 ("switch ConeMap renderer to new perception frame source")
// is a separate, later authorization.
//
// Contract (KRYL-1158 Component 5, verbatim): "ConeMap receives: one input, validated state,
// immutable data. ConeMap does not receive: raw evidence, connector payloads, mutable
// aggregation objects." This component's ENTIRE prop surface is perceptionFrame — enforced by
// having no other prop in the signature at all, not by convention.
//
// Deliberately unstyled beyond structural layout. §15 Design Sovereignty: color/visual
// treatment is the Founder's call, not this agent's. `colorToken` from perceptionrenderdata.js
// is exposed as a data attribute for a later, Founder-directed styling pass to hook into —
// this component makes zero color decisions itself.
export default function PerceptionConeMap({ perceptionFrame }) {
  const specs = deriveFrameRenderSpecs(perceptionFrame);

  if (!specs.length) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, opacity: 0.4 }}>
          NO PERCEPTION FRAME
        </span>
      </div>
    );
  }

  return (
    <div
      data-frame-id={perceptionFrame.frameId}
      data-frame-status={perceptionFrame.status}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24,
        padding: '0 40px 40px',
      }}
    >
      {specs.map(spec => (
        <div
          key={spec.domain}
          data-domain={spec.domain}
          data-state={spec.state}
          data-color-token={spec.colorToken}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            opacity: spec.opacity, width: 80,
          }}
        >
          <div
            style={{
              width: '100%',
              height: Math.max(4, spec.heightRatio * 200),
              border: '1px solid currentColor',
              transition: 'height 300ms ease',
            }}
          />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em' }}>
            {spec.label}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, opacity: 0.6 }}>
            {spec.displayValue !== null ? spec.displayValue : spec.state}
          </span>
        </div>
      ))}
    </div>
  );
}
