// WO-1316-H — Lens-Conditioned Retrieval Tensor presets
export const LENS_PRESETS = {
  ATHLETE: {
    scaffold: {
      rules: [
        { key: 'Earning Phase',      operator: 'is', value: 'ACTIVE' },
        { key: 'Sponsorship Value',  operator: 'is greater than', value: '$500K' },
      ],
      semanticSeed: 'Career velocity, sponsorship stability, lifestyle burn-rate, retirement horizon.',
      geometry: { constraintStrength: 0.85, intentEntropy: 0.15 },
    },
  },
  INVESTOR: {
    scaffold: {
      rules: [
        { key: 'Capital Burn',           operator: 'is greater than', value: '15%' },
        { key: 'Governance Dissonance',  operator: 'is',              value: 'TRUE' },
      ],
      semanticSeed: 'Leverage ratios, market exposure, governance asymmetry, capital fragility, exit liquidity.',
      geometry: { constraintStrength: 0.75, intentEntropy: 0.25 },
    },
  },
  LEGAL: {
    scaffold: {
      rules: [
        { key: 'Disclosure Asymmetry', operator: 'is',              value: 'DETECTED' },
        { key: 'Regulatory Exposure',  operator: 'is greater than', value: '6.0' },
      ],
      semanticSeed: 'Jurisdictional friction, compliance divergence, adverse precedent, liability chaining.',
      geometry: { constraintStrength: 0.95, intentEntropy: 0.05 },
    },
  },
  REALTOR: {
    scaffold: {
      rules: [
        { key: 'Occupancy Volatility', operator: 'is greater than', value: '12%' },
        { key: 'Asset Friction',       operator: 'contains',        value: 'COMMERCIAL' },
      ],
      semanticSeed: 'Market saturation, occupancy delta, lease-term risk, asset-class liquidity.',
      geometry: { constraintStrength: 0.65, intentEntropy: 0.35 },
    },
  },
  SALES: {
    scaffold: {
      rules: [
        { key: 'Conversion Velocity', operator: 'is less than', value: 'BASELINE' },
        { key: 'Pipeline Friction',   operator: 'is',           value: 'HIGH' },
      ],
      semanticSeed: 'Conversion decay, customer acquisition cost, narrative resonance, churn risk.',
      geometry: { constraintStrength: 0.5, intentEntropy: 0.5 },
    },
  },
  RETIREMENT: {
    scaffold: {
      rules: [
        { key: 'Accumulation Ratio', operator: 'is less than',    value: 'TARGET' },
        { key: 'Longevity Risk',     operator: 'is greater than', value: '0.7' },
      ],
      semanticSeed: 'Longevity exposure, inflation sensitivity, wealth preservation, drawdown sustainability.',
      geometry: { constraintStrength: 0.9, intentEntropy: 0.1 },
    },
  },
  STUDENT: {
    scaffold: {
      rules: [
        { key: 'Accumulation Ratio', operator: 'is less than',    value: 'TARGET' },
        { key: 'Debt Exposure',      operator: 'is greater than', value: '0' },
      ],
      semanticSeed: 'Academic trajectory, skill development, debt burden, career entry timing, opportunity cost.',
      geometry: { constraintStrength: 0.6, intentEntropy: 0.4 },
    },
  },
  NEWLYWED: {
    scaffold: {
      rules: [
        { key: 'Asset Friction',     operator: 'contains',        value: 'RESIDENTIAL' },
        { key: 'Accumulation Ratio', operator: 'is less than',    value: 'TARGET' },
      ],
      semanticSeed: 'Joint financial planning, debt consolidation, asset combination, life insurance, home purchase timing.',
      geometry: { constraintStrength: 0.7, intentEntropy: 0.3 },
    },
  },
  TRANSITION: {
    scaffold: {
      rules: [
        { key: 'Asset Friction',     operator: 'contains',        value: 'RESIDENTIAL' },
        { key: 'Regulatory Exposure', operator: 'is greater than', value: '4.0' },
      ],
      semanticSeed: 'Asset division, liability separation, custody cost exposure, income recalibration, estate restructuring.',
      geometry: { constraintStrength: 0.85, intentEntropy: 0.15 },
    },
  },
  FAMILY: {
    scaffold: {
      rules: [
        { key: 'Accumulation Ratio', operator: 'is less than',    value: 'TARGET' },
        { key: 'Asset Friction',     operator: 'contains',        value: 'RESIDENTIAL' },
      ],
      semanticSeed: 'Family financial planning, estate protection, education funding, insurance coverage, generational wealth.',
      geometry: { constraintStrength: 0.8, intentEntropy: 0.2 },
    },
  },
  SINGLE: {
    scaffold: {
      rules: [
        { key: 'Accumulation Ratio', operator: 'is less than',    value: 'TARGET' },
        { key: 'Conversion Velocity', operator: 'is greater than', value: 'BASELINE' },
      ],
      semanticSeed: 'Personal financial independence, career trajectory, lifestyle optimization, risk tolerance, asset accumulation.',
      geometry: { constraintStrength: 0.5, intentEntropy: 0.5 },
    },
  },
  HEALTH: {
    scaffold: {
      rules: [
        { key: 'Regulatory Exposure', operator: 'is greater than', value: '5.0' },
        { key: 'Longevity Risk',      operator: 'is greater than', value: '0.5' },
      ],
      semanticSeed: 'Healthcare cost exposure, insurance coverage gaps, wellness trajectory, longevity planning, medical debt risk.',
      geometry: { constraintStrength: 0.75, intentEntropy: 0.25 },
    },
  },
  OPEN: {
    scaffold: {
      rules: [],
      semanticSeed: 'Any signal anomaly, unexpected narrative divergence, hidden thematic link.',
      geometry: { constraintStrength: 0.1, intentEntropy: 0.9 },
    },
  },
};

export const LENS_ORDER = ['ATHLETE', 'INVESTOR', 'LEGAL', 'REALTOR', 'SALES', 'RETIREMENT', 'STUDENT', 'NEWLYWED', 'TRANSITION', 'FAMILY', 'SINGLE', 'HEALTH', 'OPEN'];
