// WO-1798: Brand-Equity-to-Enterprise-Stability infrastructure
// Universal Brand Equity Variable (BEV) schema.
// All personality-brand synthesizers import computeBEV() — no duplicate logic permitted.

export const BEV_WEIGHTS = Object.freeze({
  velocity:      0.40,
  moat:          0.35,
  dilution:      0.15,
  concentration: 0.10,
});

export const BEV_STRESS_TEST_THRESHOLD = 0.40;

const VELOCITY_MAP      = { HIGH: 1.0, DECLINING: 0.6, STALLING: 0.3, COLLAPSED: 0.0 };
const DILUTION_MAP      = { LOW: 0.0, MODERATE: 0.33, HIGH: 0.67, CRITICAL: 1.0 };
const CONCENTRATION_MAP = { LOW: 0.0, MODERATE: 0.33, HIGH: 0.67, EXTREME: 1.0 };

export const BEV_VELOCITY_LEVELS      = Object.keys(VELOCITY_MAP);
export const BEV_DILUTION_LEVELS      = Object.keys(DILUTION_MAP);
export const BEV_CONCENTRATION_LEVELS = Object.keys(CONCENTRATION_MAP);

/**
 * computeBEV — Universal brand equity variable.
 *
 * @param {object} inputs
 * @param {'HIGH'|'DECLINING'|'STALLING'|'COLLAPSED'} inputs.brand_velocity
 * @param {number}  inputs.moat_durability     0.0–1.0
 * @param {'LOW'|'MODERATE'|'HIGH'|'CRITICAL'} inputs.dilution_risk
 * @param {'LOW'|'MODERATE'|'HIGH'|'EXTREME'}  inputs.concentration_risk
 * @returns {{ brand_velocity, moat_durability, dilution_risk, concentration_risk,
 *             bev_score, at_risk_ratio, stress_flag }}
 */
export function computeBEV({ brand_velocity, moat_durability, dilution_risk, concentration_risk }) {
  if (!Object.prototype.hasOwnProperty.call(VELOCITY_MAP, brand_velocity))
    throw new Error(`computeBEV: invalid brand_velocity "${brand_velocity}". Valid: ${BEV_VELOCITY_LEVELS.join('|')}`);
  if (typeof moat_durability !== 'number' || moat_durability < 0 || moat_durability > 1)
    throw new Error(`computeBEV: moat_durability must be 0.0–1.0, got "${moat_durability}"`);
  if (!Object.prototype.hasOwnProperty.call(DILUTION_MAP, dilution_risk))
    throw new Error(`computeBEV: invalid dilution_risk "${dilution_risk}". Valid: ${BEV_DILUTION_LEVELS.join('|')}`);
  if (!Object.prototype.hasOwnProperty.call(CONCENTRATION_MAP, concentration_risk))
    throw new Error(`computeBEV: invalid concentration_risk "${concentration_risk}". Valid: ${BEV_CONCENTRATION_LEVELS.join('|')}`);

  const bev_score = parseFloat((
    VELOCITY_MAP[brand_velocity]                   * BEV_WEIGHTS.velocity +
    moat_durability                                * BEV_WEIGHTS.moat +
    (1 - DILUTION_MAP[dilution_risk])              * BEV_WEIGHTS.dilution +
    (1 - CONCENTRATION_MAP[concentration_risk])    * BEV_WEIGHTS.concentration
  ).toFixed(3));

  const at_risk_ratio = parseFloat((1 - moat_durability).toFixed(3));

  return {
    brand_velocity,
    moat_durability,
    dilution_risk,
    concentration_risk,
    bev_score,
    at_risk_ratio,
    stress_flag: bev_score < BEV_STRESS_TEST_THRESHOLD,
  };
}
