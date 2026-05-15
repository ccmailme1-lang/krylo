// kineticgravity.jsx
// WO-216 — Gravity HOC
// WO-228 — Replaced JS particle system with CSS-only ambient ETR text
// WO-276 — Ambient Signal Behavior: avgFs drives particle field opacity
// Location: src/components/spine/kineticgravity.jsx

import React, { useEffect } from "react";
import { CRAWL_PHRASES } from "./constants.js";

export default function KineticGravity({ isPaused, avgFs }) {
  // KRYL-225: Stamp session flag so health check can confirm initialization
  useEffect(() => {
    try { sessionStorage.setItem('krylo_particle_field_init', '1'); } catch {}
  }, []);

  if (isPaused) return null;

  // WO-276 — Scale opacity with Fs magnitude. Opacity only — no filter.
  // CSS filter on the container breaks GPU compositing of the child animations,
  // forcing main-thread rasterization every frame and causing jitter.
  const fs      = typeof avgFs === 'number' ? Math.min(1, Math.max(0, avgFs)) : 0;
  const opacity = 0.15 + fs * 0.70;   // 0.15 (calm) → 0.85 (high signal)

  return (
    <div
      className="particle-field"
      data-particle-field-ready="true"
      style={{ opacity }}
    >
      {CRAWL_PHRASES.map((phrase, i) => (
        <span key={i}>{phrase.text}</span>
      ))}
      {CRAWL_PHRASES.map((phrase, i) => (
        <span key={"b" + i}>{phrase.text}</span>
      ))}
    </div>
  );
}
