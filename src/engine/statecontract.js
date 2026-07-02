// DEF-1863 — Hard State Contract
// Fixes semantic collapse: confidence >= threshold does NOT imply completion.
// Every state-bearing output must declare its STATE_TYPE explicitly. Terminal/outcome
// language ("resolved", "complete", "win") is only valid when stateType === TERMINAL.
// Everything else must be normalized to projection language ("high-probability path").

export const STATE_TYPE = {
  TERMINAL:     'TERMINAL',     // an actually observed/closed outcome — not produced anywhere yet
  TRANSITIONAL: 'TRANSITIONAL', // mid-flight, actively changing
  PROJECTION:   'PROJECTION',   // inferred from signals — the default for all current classifiers
};

export function isTerminal(stateType) {
  return stateType === STATE_TYPE.TERMINAL;
}

// Explicit phrase-level substitutions only — no hand-waving, no NLP.
// Longest/most-specific phrases first so they match before their sub-strings do.
const PROJECTION_SUBSTITUTIONS = [
  ['DECISION OUTCOME', 'PROJECTED PATH'],
  ['adopt now', 'high-probability adoption window'],
  ['resolved', 'high-probability'],
  ['complete', 'in-progress'],
  ['win', 'lead'],
];

export function normalizeToProjectionLanguage(text, stateType) {
  if (typeof text !== 'string' || isTerminal(stateType)) return text;
  let out = text;
  for (const [term, replacement] of PROJECTION_SUBSTITUTIONS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), replacement);
  }
  return out;
}
