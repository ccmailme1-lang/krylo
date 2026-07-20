// lensembeds.js — Flourish embed URL per lens (LSC-001 Region C).
// Each lens can render a published Flourish visualization as an iframe (no WebGL, renders every time,
// live via Flourish's CSV feed). To wire a lens: publish the viz in Flourish → Export & Publish →
// copy the embed URL (e.g. https://flo.uri.sh/visualisation/1234567/embed) → paste it below.
//
// null = not wired yet → the lens shows an "awaiting embed" placeholder (or falls back to the cone
// map for lenses not listed here). A real URL string → that lens renders the Flourish viz in Region C.
export const LENS_EMBEDS = Object.freeze({
  SIGNAL:      'https://flo.uri.sh/visualisation/29733311/embed', // Signal Strength heatmap — 6 domains × time (% of peak)
  FLOW:        'https://flo.uri.sh/visualisation/29731380/embed', // Capital-lime directional chord — domain flows
  PRESSURE:    'https://flo.uri.sh/visualisation/29733840/embed', // Constraint radar — 6 domains × time envelope (% of ceiling)
  CONVERGENCE: null,
  DRIFT:       null,
  OPPORTUNITY: null,
});

// Is this lens managed by a Flourish embed slot at all? (listed above)
export function isEmbedLens(lens) {
  return Object.prototype.hasOwnProperty.call(LENS_EMBEDS, lens);
}
