/* src/designSystem/badges.js                                           */
/* WO-729 — Integrity Badge theme constants                             */
/* Risk spectrum, pulse frequency, and category label map.              */

// ── Risk Spectrum ─────────────────────────────────────────────────────────────
export const BADGE_RISK_COLORS = {
  green:   '#00C853',  // synthetic_risk_score 0–20:  High Confidence
  amber:   '#007FFF',  // synthetic_risk_score 21–60: Moderate Risk
  red:     '#FF3B30',  // synthetic_risk_score 61–100: High Risk
  pending: '#808080',  // null: Audit in Progress
};

// ── Pulse Sync ────────────────────────────────────────────────────────────────
// Matches WO-753 ScrutinyField: sin(t * 4.5 rad/s)
// Period = 2π / 4.5 ≈ 1.396s — import this into any framer-motion duration
export const SCRUTINY_PULSE_PERIOD = (2 * Math.PI) / 4.5; // ~1.396s

// ── Category Labels ───────────────────────────────────────────────────────────
export const CATEGORY_LABELS = {
  'CAT-01': 'INFRASTRUCTURE',
  'CAT-02': 'POLICY',
  'CAT-03': 'GENERAL NEWS',
  'CAT-04': 'HUMAN INTEREST',
  'CAT-05': 'VIRAL',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getRiskColor(score) {
  if (score === null || score === undefined) return BADGE_RISK_COLORS.pending;
  if (score <= 20) return BADGE_RISK_COLORS.green;
  if (score <= 60) return BADGE_RISK_COLORS.amber;
  return BADGE_RISK_COLORS.red;
}

export function getRiskLabel(score) {
  if (score === null || score === undefined) return 'AUDIT IN PROGRESS';
  if (score <= 20) return 'HIGH CONFIDENCE';
  if (score <= 60) return 'MODERATE RISK';
  return 'HIGH RISK';
}
