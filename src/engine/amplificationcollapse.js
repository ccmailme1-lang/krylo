// amplificationcollapse.js — Formation Integrity gate #2 (the legitimacy differentiator).
//
// Collapses signals that share a common provenance ORIGIN to a single confirmation unit. 500 articles
// citing one original report = 1 confirmation, not 500. Echo is not confirmation. In regulated use
// (finance / gov / defense) mistaking amplification for confirmation is the catastrophic failure —
// this is the brake that prevents it.
//
// DISCIPLINE (same asymmetry as Grounded-or-Withhold): this is a BRAKE. It can only DOWNGRADE a
// confirmation count to the distinct-provenance count — it can never inflate one. It manufactures no
// coherence; it removes false coherence.
// §22 absence-is-signal: a signal with NO provenance cannot count as independent confirmation — it is
// tallied as `unattributed`, never silently treated as a distinct source.
// KRYL-1039 doctrine-as-a-failing-test: assertNoAmplificationInflation is the CI-callable gate.

// The lineage key = the ORIGINAL source, most-authoritative first. A republisher's own URL is NOT the
// origin (that is exactly the echo we collapse). null = unattributed → cannot confirm independently.
export function lineageKey(sig) {
  return sig?.provenance?.originId
      ?? sig?.originId
      ?? sig?.provenance?.sourceUrl
      ?? sig?.sourceUrl
      ?? null;
}

/**
 * collapseAmplification(signals, { keyOf }) → {
 *   total, distinct, confirmationWeight, amplificationRatio, unattributed, groups
 * }
 *   confirmationWeight === distinct (INVARIANT — never exceeds the distinct-provenance count).
 *   amplificationRatio = total / distinct (> 1 means echo is present in the set).
 */
export function collapseAmplification(signals = [], { keyOf = lineageKey } = {}) {
  const groups = new Map();
  let unattributed = 0;
  for (const s of signals) {
    const k = keyOf(s);
    if (k == null) { unattributed++; continue; }        // §22 — cannot confirm independently
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  const distinct = groups.size;
  return {
    total:              signals.length,
    distinct,
    confirmationWeight: distinct,                        // brake: capped at distinct provenance
    amplificationRatio: distinct ? parseFloat((signals.length / distinct).toFixed(2)) : 0,
    unattributed,
    groups,
  };
}

/**
 * assertNoAmplificationInflation(claimedWeight, signals, opts) → { valid, distinct, claimedWeight, reason }
 * The falsifying test: any confirmation weight claimed downstream may NOT exceed the distinct
 * provenance count. A green build requires claimedWeight ≤ distinct.
 */
export function assertNoAmplificationInflation(claimedWeight, signals = [], opts = {}) {
  const { distinct } = collapseAmplification(signals, opts);
  const valid = claimedWeight <= distinct;
  return {
    valid, distinct, claimedWeight,
    reason: valid ? null : `amplification inflation: claimed ${claimedWeight} > ${distinct} distinct sources`,
  };
}
