// index.js
// WO-225 — spine barrel export.
// All consumers import from this file only.
// Location: src/components/spine/index.js

export { default as KineticGravity } from "./KineticGravity.jsx";
export { default as ETRStrike }      from "./ETRStrike.jsx";
export {
  CRAWL_PHRASES,
  SIGNAL_DURATION,
  DEAD_ZONE,
  TYPOGRAPHY,
  PALETTE,
} from "./constants.js";