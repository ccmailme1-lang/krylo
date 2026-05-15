/* src/engine/prismRegistry.js */
/* WO-264 — Prism Registry: maps 7 signal pillars to CSS custom properties */

/**
 * refract(pillars)
 * Accepts the 7-pillar scores object (integers 0-100).
 * Returns a CSS vars object for use as inline style / CSS variable injection.
 *
 * Pillar → CSS var mappings:
 *   trust       → --signal-opacity   (higher trust = more visible)
 *   accuracy    → --signal-radial    (higher accuracy = tighter radial spread)
 *   gap         → --signal-blur      (higher gap = more blur; information is missing)
 *   velocity    → --signal-pulse     (higher velocity = faster pulse)
 *   expiration  → --signal-y-pos     (higher expiration = signal drifts upward, fading out)
 *   strength    → --signal-size      (higher strength = larger signal node)
 *   alignment   → --signal-radial    (blended with accuracy for radial definition)
 */
export function refract(pillars) {
  const {
    trust      = 50,
    accuracy   = 50,
    gap        = 50,
    velocity   = 50,
    expiration = 50,
    strength   = 50,
    alignment  = 50,
  } = pillars ?? {};

  // --signal-opacity: 0.2 → 1.0 driven by trust
  const opacity = 0.2 + (trust / 100) * 0.8;

  // --signal-radial: tighter circle when accuracy + alignment are high
  // expressed as a percentage radius for radial-gradient (20% → 80%)
  const radialAvg = (accuracy + alignment) / 2;
  const radial    = `${Math.round(20 + (radialAvg / 100) * 60)}%`;

  // --signal-blur: 0px → 12px, driven by gap (missing info = blurrier)
  const blur = `${Math.round((gap / 100) * 12)}px`;

  // --signal-pulse: animation duration 0.6s → 3s (fast when velocity is high)
  const pulse = `${(3 - (velocity / 100) * 2.4).toFixed(2)}s`;

  // --signal-y-pos: -20px → 20px drift; high expiration pushes signal upward
  const yPos = `${Math.round(-20 + (expiration / 100) * 40)}px`;

  // --signal-size: 8px → 32px driven by strength
  const size = `${Math.round(8 + (strength / 100) * 24)}px`;

  return {
    '--signal-opacity': String(opacity.toFixed(2)),
    '--signal-radial':  radial,
    '--signal-blur':    blur,
    '--signal-pulse':   pulse,
    '--signal-y-pos':   yPos,
    '--signal-size':    size,
  };
}
