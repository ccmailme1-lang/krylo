// KRYL-1158 — Component 5 support: pure state->visual-encoding derivation.
// Split out from the React renderer so the actual logic (state -> what gets shown) is testable
// without a browser, and so the renderer component stays a thin, dumb mapping layer — per the
// contract's own rule: "ConeMap must not interpret missing data, infer signal meaning, create
// defaults, transform evidence, or calculate domain truth." This function does NONE of that —
// it only maps an already-resolved DOMAIN_STATE to a rendering encoding (height/opacity/color
// token), which is a presentation concern, not a truth concern. All truth resolution already
// happened upstream in perceptionhydrator.js.

import { DOMAIN_STATE } from '../contracts/perceptionframe.js';

// Deliberately NOT hex values here — §15 Design Sovereignty: color is the Founder's call.
// These are semantic tokens only; a real render pass maps tokens -> approved colors.
const STATE_ENCODING = Object.freeze({
  [DOMAIN_STATE.AWAITING]: { colorToken: 'muted',   opacity: 0.25, showsValue: false },
  [DOMAIN_STATE.OBSERVED]: { colorToken: 'active',  opacity: 1.0,  showsValue: true  },
  [DOMAIN_STATE.STALE]:    { colorToken: 'aging',   opacity: 0.55, showsValue: true  },
  [DOMAIN_STATE.INVALID]:  { colorToken: 'flagged', opacity: 0.4,  showsValue: false },
});

/**
 * @typedef {{ domain: string, state: string, heightRatio: number, opacity: number, colorToken: string, displayValue: number|null, label: string }} ConeRenderSpec
 */

/**
 * Derives one cone's render spec from its DomainState. Pure — no defaults invented for
 * missing evidence (AWAITING renders as 0-height/muted, never a guessed value).
 * @param {import('../contracts/perceptionframe.js').DomainState} domainState
 * @returns {ConeRenderSpec}
 */
export function deriveConeRenderSpec(domainState) {
  const encoding = STATE_ENCODING[domainState.state];
  return Object.freeze({
    domain:       domainState.domain,
    state:        domainState.state,
    heightRatio:  encoding.showsValue ? Math.max(0, Math.min(1, domainState.value / 100)) : 0,
    opacity:      encoding.opacity,
    colorToken:   encoding.colorToken,
    displayValue: encoding.showsValue ? domainState.value : null,
    label:        domainState.domain.toUpperCase(),
  });
}

/**
 * Derives render specs for an entire frame, in the frame's own domain order (already
 * canonical, per perceptionframe.js's buildPerceptionFrame). One-to-one with the 6 domains —
 * this function never drops or adds a cone; count-stability is the renderer's whole reason
 * for existing (KRYL-1159 §1: "No cone disappears").
 * @param {import('../contracts/perceptionframe.js').PerceptionFrame} frame
 * @returns {ConeRenderSpec[]}
 */
export function deriveFrameRenderSpecs(frame) {
  if (!frame || !Array.isArray(frame.domains)) return [];
  return frame.domains.map(deriveConeRenderSpec);
}
