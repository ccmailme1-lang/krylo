// KRYLO — Concept rewrite table (token-group match).
// specs/SPEC-cice-contextual-investigative-concept-expansion.md
//
// Closed, hand-curated, deterministic token matching only. No fuzzy match, no embeddings, no
// LLM, no demographic/behavioral input. Scope is paraphrase expansion only — the spec's SCOPE
// DECISION explicitly drops demographic/thematic inference. Never add a demographic, profile,
// or behavioral field as a lookup key here.
//
// Match rule: a concept fires when, for EVERY token group in its entry, at least one token in
// that group appears anywhere in the query's tokens (AND across groups, OR within a group).
// Intentionally order- and adjacency-independent — "purchase a house", "house I want to
// purchase", and "purchasing a house" all match a ['purchase','buy','buying'] + ['house','home']
// entry — while staying fully deterministic, closed, and reviewable. Same discipline as
// scoreTermRelevance in analysisidlefield.jsx, which already matches at the token level, not
// the phrase level — an earlier version of this file used rigid exact-phrase substring
// matching and missed "purchase a house" against a "purchase home" surface form; token groups
// fix that class of miss structurally instead of enumerating more literal phrases.
//
// Vocabulary content is Founder-owned, same as DOMAIN_PRECURSORS. New entries require explicit
// review, not agent-side expansion.

const REWRITE_TABLE = {
  FINANCIAL: [
    {
      conceptId: 'REAL_ESTATE',
      label: 'REAL ESTATE',
      tokenGroups: [
        ['purchase', 'buy', 'buying', 'bought'],
        ['house', 'home', 'property'],
      ],
    },
    {
      conceptId: 'MORTGAGE',
      label: 'MORTGAGE',
      tokenGroups: [
        ['mortgage', 'refinance', 'refinancing'],
      ],
    },
    {
      conceptId: 'DOWN_PAYMENT',
      label: 'DOWN PAYMENT',
      tokenGroups: [
        ['down'],
        ['payment', 'payments'],
      ],
    },
  ],
};

function tokenize(text) {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));
}

export function matchConceptRewrites(queryText, pill) {
  const entries = REWRITE_TABLE[pill];
  if (!entries || !entries.length || !queryText) return [];
  const queryTokens = tokenize(queryText);
  const matched = [];
  for (const entry of entries) {
    const hit = entry.tokenGroups.every(group => group.some(t => queryTokens.has(t)));
    if (hit) matched.push(entry.label);
  }
  return matched;
}
