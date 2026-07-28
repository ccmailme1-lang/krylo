// src/intake/contracts/homePurchaseDIC.js — Decision Input Contract, Real Estate pilot.
//
// Invariant: this file exports a plain declarative object only. No functions, no retrieval
// calls, no embedded formulas, no rendering instructions. A DIC describes what a decision needs;
// it does not fetch, calculate, or render anything itself.
export default {
  decisionType: 'homePurchase',

  required: [
    { key: 'location_geo',         label: 'ZIP / county / CBSA',        units: 'geo' },
    { key: 'annual_rent_cash',     label: 'Current annual rent',        units: 'USD' },
    { key: 'purchase_price_offer', label: 'Target purchase price',      units: 'USD' },
    { key: 'holding_period_years', label: 'Expected ownership horizon', units: 'years' },
  ],

  groundable: [
    // Each field maps to exactly ONE canonical BenchmarkArtifact source — no fallback branching
    // here (§21); if a source needs a fallback, that's connector-layer work, not DIC work.
    { key: 'mortgage_rate_weekly', label: '30-yr FRM rate',      sourceId: 'FRED',   seriesId: 'MORTGAGE30US' },
    { key: 'price_to_rent_ratio',  label: 'Home value / rent',   sourceId: 'ZILLOW', seriesId: 'ZHVI_ZORI' },
    { key: 'property_tax_rate',    label: 'Avg county tax rate', sourceId: 'CENSUS', seriesId: 'PTRATIO' },
  ],

  optional: [
    { key: 'percent_down_payment', label: 'Down-payment %', units: 'pct' },
    { key: 'hoa_monthly',          label: 'HOA fee',         units: 'USD' },
  ],

  derived: [
    // formulaId MUST resolve through src/engine/formulaRegistry.js. A DIC referencing a
    // formulaId that isn't registered resolves to WITHHELD/FORMULA_UNAVAILABLE, never a crash.
    { key: 'loan_principal',       label: 'Loan size',            formulaId: 'FIN.LOAN_PRINCIPAL@1' },
    { key: 'monthly_mortgage_pmt', label: 'Monthly Mortgage P&I', units: 'USD/month', formulaId: 'FIN.PMT_30YR@1' },
  ],
};
