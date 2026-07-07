// KRYL-969 Phase 3 (candidate) — Identity Vector + Deterministic Drift
// Spec origin: WO-KRYL-969-PHASE3 draft, corrected during build 2026-07-06 —
// the draft's `KRYLO_DOMAIN_LEXICON` import from rbcsengine.js does not exist
// (verified: rbcsengine.js exports RBCS_WEIGHTS/RBCS_INVARIANT_KEYS/RBCS_THRESHOLDS/
// scoreAdmitted only, no lexicon). No real per-domain word-lexicon exists anywhere
// in the codebase under any name — domainpackage.js's DOMAINS is 6 category labels,
// not a filterable vocabulary, and using it as a token filter here would strip
// nearly all real claim text. That filtering step is removed below rather than
// built on a fabricated dependency. If domain-scoped filtering is wanted later,
// it needs a real lexicon built as its own explicit scope, not invented here.
//
// NOT YET HARDENED as a WO per §11a — Bottle Test for this phase has not been run,
// and DRIFT_ALERT_THRESHOLD (what score counts as "significant") is genuinely TBD,
// pending real Phase 1 telemetry. This file computes the raw scalar only; it does
// not classify, alert, or gate on it — same discipline as Phase 1's connectors
// returning raw evidence without asserting interpretation.
//
// Guardrail #1 (no NLP/ML): 100% deterministic string/set comparison, zero learned
// or probabilistic behavior — Jaccard set arithmetic + classic Levenshtein DP.
// Guardrail #5 (no invented thresholds): the 0.5/0.5 blend weight below is NOT
// claimed as derived or final — flagged explicitly as an assumed default requiring
// real-data calibration before this WO could pass its own Bottle Test.
// Guardrail #6 (absence is not zero): empty/null claim arrays throw
// E_VOID_STATE_PAYLOAD rather than silently returning 0.

/**
 * Computes standard Levenshtein distance between two string arrays (token sequences).
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number} minimum edit operations (insert, delete, substitute)
 */
function computeLevenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1,     // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates deterministic structural drift between two token sequences.
 * Caller is responsible for tokenizing raw NarrativeSnapshot.raw_text before calling
 * this — this function takes token arrays, it does not parse text itself.
 * @param {string[]} tokensA - normalized tokens from the earlier state
 * @param {string[]} tokensB - normalized tokens from the later state
 * @returns {{ score: number, jaccardDistance: number, levenshteinRatio: number, sharedTokens: number, unionSize: number }}
 */
export function calculateDeterministicDrift(tokensA, tokensB) {
  if (!tokensA?.length || !tokensB?.length) {
    throw Object.assign(new Error('E_VOID_STATE_PAYLOAD'), { code: 'E_VOID_STATE_PAYLOAD' });
  }

  // Vocabulary overlap (order-independent)
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersectionSize = 0;
  for (const token of setA) if (setB.has(token)) intersectionSize++;
  const unionSize = setA.size + setB.size - intersectionSize;
  const jaccardDistance = unionSize === 0 ? 0 : 1 - (intersectionSize / unionSize);

  // Sequence/ordering divergence (order-dependent)
  const rawLev = computeLevenshtein(tokensA, tokensB);
  const maxLen = Math.max(tokensA.length, tokensB.length);
  const levenshteinRatio = maxLen === 0 ? 0 : rawLev / maxLen;

  // Composite scalar — 0.5/0.5 is an ASSUMED default, not derived. Must be
  // recalibrated against real Phase 1 data before this is trusted for anything
  // beyond exploratory inspection. See file header + Guardrail #5.
  const score = parseFloat(((0.5 * jaccardDistance) + (0.5 * levenshteinRatio)).toFixed(4));

  return { score, jaccardDistance, levenshteinRatio, sharedTokens: intersectionSize, unionSize };
}
