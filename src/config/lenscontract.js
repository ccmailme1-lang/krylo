// src/config/lenscontract.js
// THE LENS CONTRACT — which layer each lens belongs to, and the rules that layer binds.
// Spec: specs/lens-contract.md (Founder directive 2026-07-24, classification LOCKED).
//
// The platform is TWO layers with DIFFERENT rules of engagement:
//   REPORTING (the Show / engine) — truth law absolute: grounded or withhold (§20/§22).
//                                   Grammar = a READ. Never asserts a pick.
//   SELL      (the storefront)    — may persuade, frame, lead, aspire. That is its FUNCTION.
//                                   Grammar = a PITCH. Must keep a drill-down door to its proof.
//
// The one load-bearing line between them: the sell layer may ASPIRE, but may never wear the
// reporting layer's costume — aspiration dressed as a grounded reading is fabrication, because it
// has borrowed the Show's authority. Enforcement below is structural, not stylistic.
//
// This module is CONFIG + GUARDS only. It renders nothing and decides nothing about content.

export const LAYER = Object.freeze({ REPORTING: 'REPORTING', SELL: 'SELL' });

// ── Rules of engagement per layer (from specs/lens-contract.md "THE TWO LAYERS") ─────────────
export const LAYER_RULES = Object.freeze({
  [LAYER.REPORTING]: Object.freeze({
    truthLaw:          true,   // grounded or withhold — §22 "can't calculate, don't show"
    mayAssert:         false,  // never names a pick
    mayAspire:         false,  // no forward-leaning framing
    requiresProofDoor: false,  // it IS the proof
    doctrine:          Object.freeze(['§20 direction honesty', '§22 absence-is-signal']),
  }),
  [LAYER.SELL]: Object.freeze({
    truthLaw:          false,  // reporting rigor does NOT govern the storefront
    mayAssert:         true,   // conviction is the job
    mayAspire:         true,   // aspiration presented AS aspiration is honest selling
    requiresProofDoor: true,   // every claim keeps an open door to the engine
    doctrine:          Object.freeze(['sell-layer-opportunity-architecture §2', '§4 sell-to-proof']),
  }),
});

// ── LENS CLASSIFICATION (LOCKED — Founder 2026-07-24) ────────────────────────────────────────
// Five lenses SENSE the field. One SYNTHESIZES and sells. Layer does not change without
// Founder sign-off (specs/lens-contract.md ENFORCEMENT).
export const LENS_CONTRACT = Object.freeze({
  SIGNAL:      Object.freeze({ layer: LAYER.REPORTING, grammar: 'heatmap read',                  sensesWhat: 'how hot the domain is' }),
  FLOW:        Object.freeze({ layer: LAYER.REPORTING, grammar: 'directional read',              sensesWhat: 'which way it is moving' }),
  PRESSURE:    Object.freeze({ layer: LAYER.REPORTING, grammar: 'constraint read',               sensesWhat: 'what is constraining it' }),
  CONVERGENCE: Object.freeze({ layer: LAYER.REPORTING, grammar: 'gap read (observed vs trend)',  sensesWhat: 'how strongly signals agree' }),
  DRIFT:       Object.freeze({ layer: LAYER.REPORTING, grammar: 'structural-vs-narrative read',  sensesWhat: 'structure pulling from narrative' }),
  OPPORTUNITY: Object.freeze({ layer: LAYER.SELL,      grammar: 'pitch (block + drill-to-proof)', sensesWhat: 'names an advantage, makes the case' }),
});

export const LENS_IDS = Object.freeze(Object.keys(LENS_CONTRACT));

// The five reporting lenses, in rollup order — the receipts the sell layer cites (spec §6b).
export const REPORTING_LENSES = Object.freeze(
  LENS_IDS.filter(id => LENS_CONTRACT[id].layer === LAYER.REPORTING)
);
export const SELL_LENSES = Object.freeze(
  LENS_IDS.filter(id => LENS_CONTRACT[id].layer === LAYER.SELL)
);

export function layerOf(lens) {
  return LENS_CONTRACT[lens]?.layer ?? null;
}
export function rulesFor(lens) {
  const l = layerOf(lens);
  return l ? LAYER_RULES[l] : null;
}
export function isSellLens(lens)      { return layerOf(lens) === LAYER.SELL; }
export function isReportingLens(lens) { return layerOf(lens) === LAYER.REPORTING; }

// ── Violations (specs/lens-contract.md ENFORCEMENT) ──────────────────────────────────────────
export const VIOLATION = Object.freeze({
  UNKNOWN_LENS:            'UNKNOWN_LENS',            // lens has no declared layer
  WRONG_LAYER:             'WRONG_LAYER',             // checked against the layer it is not
  REPORTING_ASSERTS_PICK:  'REPORTING_ASSERTS_PICK',  // reporting lens naming a move
  REPORTING_CONVICTION:    'REPORTING_CONVICTION',    // reporting prose using sell grammar
  SELL_WITHOUT_PROOF:      'SELL_WITHOUT_PROOF',      // claim with no drill-down door
  SELL_WITHOUT_CITATION:   'SELL_WITHOUT_CITATION',   // claim not footnoted to a source lens
  SELL_WEARS_REPORT_COSTUME: 'SELL_WEARS_REPORT_COSTUME', // aspiration dressed as a grounded read
});

// Conviction markers — a deliberately SMALL, explicit list. This is a structural tripwire for
// reporting-layer prose, not a language model and not a truth check. A reporting read should be
// describing the field; if it is telling the reader what to do, the grammar has drifted to sell.
const CONVICTION_MARKERS = Object.freeze([
  'the move is', 'you should', 'we recommend', 'act now', 'buy ', 'sell ',
  'guaranteed', 'sure thing', 'don\'t miss', 'get in', 'the play is', 'best bet',
]);

function hasConvictionLanguage(text) {
  const t = String(text ?? '').toLowerCase();
  return CONVICTION_MARKERS.some(m => t.includes(m));
}

/**
 * checkReportingRead — a reporting-layer lens output must stay a READ.
 * @param {string} lens
 * @param {{text?:string, assertion?:*, recommendation?:*, pick?:*}} read
 * @returns {{ok:boolean, lens:string, layer:string|null, violations:string[]}}
 */
export function checkReportingRead(lens, read = {}) {
  const violations = [];
  const layer = layerOf(lens);
  if (!layer) violations.push(VIOLATION.UNKNOWN_LENS);
  else if (layer !== LAYER.REPORTING) violations.push(VIOLATION.WRONG_LAYER);

  // structural: a read carrying a pick/recommendation field has crossed into sell grammar
  if (read.assertion != null || read.recommendation != null || read.pick != null) {
    violations.push(VIOLATION.REPORTING_ASSERTS_PICK);
  }
  if (hasConvictionLanguage(read.text)) violations.push(VIOLATION.REPORTING_CONVICTION);

  return Object.freeze({ ok: violations.length === 0, lens, layer, violations: Object.freeze(violations) });
}

/**
 * checkSellClaim — a sell-layer claim may be bold, but it must keep the proof door open and it
 * may not pose as a grounded engine reading.
 * @param {string} lens
 * @param {{state?:string, citation?:string, drill?:object}} claim
 * @returns {{ok:boolean, lens:string, layer:string|null, violations:string[]}}
 */
export function checkSellClaim(lens, claim = {}) {
  const violations = [];
  const layer = layerOf(lens);
  if (!layer) violations.push(VIOLATION.UNKNOWN_LENS);
  else if (layer !== LAYER.SELL) violations.push(VIOLATION.WRONG_LAYER);

  // The sell-to-proof hinge: no claim without a citation and a drill receipt.
  if (!claim.citation) violations.push(VIOLATION.SELL_WITHOUT_CITATION);
  if (!claim.drill || typeof claim.drill !== 'object') violations.push(VIOLATION.SELL_WITHOUT_PROOF);

  // The costume rule: a claim may only call itself GROUNDED when its receipt is a grounded read.
  if (claim.state === 'GROUNDED' && claim.drill?.withheld === true) {
    violations.push(VIOLATION.SELL_WEARS_REPORT_COSTUME);
  }

  return Object.freeze({ ok: violations.length === 0, lens, layer, violations: Object.freeze(violations) });
}
