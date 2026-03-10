// constants.js
// WO-225 — Immutable Seed. Single source of truth.
// Location: src/components/spine/constants.js

export const CRAWL_PHRASES = [
  { text: "Imminent Layoffs",            score: 0.98, type: "signal" },
  { text: "Unresolved Conflict",         score: 0.91, type: "signal" },
  { text: "Performance Issues?",         score: 0.88, type: "signal" },
  { text: "Marital Trouble?",            score: 0.93, type: "signal" },
  { text: "Unhealthy Workplace Culture", score: 0.89, type: "signal" },
];

export const SIGNAL_DURATION = 3000;

export const DEAD_ZONE = {
  width:  300,
  height: 300,
};

export const TYPOGRAPHY = {
  fontFamily:   '"Helvetica Neue", Arial, sans-serif',
  fontWeight:   900,
  etrSize:      "11px",
  wordmarkSize: "10px",
};

export const PALETTE = {
  bg:   "#000000",
  text: "#FFFFFF",
};

export const THRESHOLDS = {
  heartbeat: { amber: 0.85, red: 0.60 },
  velocity:  { amberDuration: 10, redRate: -0.2 },
  headroom:  { amber: 0.20, red: 0.05 },
  signal:    { amber: 'mixed', red: 'weak' },
  reaction:  { amber: 850, red: 1200 },
};