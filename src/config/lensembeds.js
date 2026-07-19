// lensembeds.js — Flourish embed URL per lens (LSC-001 Region C).
// Each lens can render a published Flourish visualization as an iframe (no WebGL, renders every time,
// live via Flourish's CSV feed). To wire a lens: publish the viz in Flourish → Export & Publish →
// copy the embed URL (e.g. https://flo.uri.sh/visualisation/1234567/embed) → paste it below.
//
// null = not wired yet → the lens shows an "awaiting embed" placeholder (or falls back to the cone
// map for lenses not listed here). A real URL string → that lens renders the Flourish viz in Region C.
export const LENS_EMBEDS = Object.freeze({
  SIGNAL:      null, // e.g. 'https://flo.uri.sh/visualisation/XXXXXXX/embed'
  FLOW:        'https://flo.uri.sh/visualisation/29728063/embed', // Sankey — domain flows
  PRESSURE:    null,
  CONVERGENCE: null,
  DRIFT:       null,
  OPPORTUNITY: null,
});

// Is this lens managed by a Flourish embed slot at all? (listed above)
export function isEmbedLens(lens) {
  return Object.prototype.hasOwnProperty.call(LENS_EMBEDS, lens);
}
