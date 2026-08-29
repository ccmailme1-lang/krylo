// completionchips.js — KRYL-1222
//
// PRESCRIPTIVE chips for the Analysis search: they answer "what's missing", where
// TRENDING answers "what you typed". Pure derivation — no React, no side effects.
//
// A completion chip surfaces a gap between what the query establishes and a
// dimension that materially deepens the payload, and (on click) opens the
// existing control that captures that dimension. It never auto-fills a value,
// never computes payload depth, never touches synthesis.
//
// Source of truth for "what the query has" is the KRYL-1221 QueryContext. This
// module reads it; it does not re-parse.
//
// Spec: specs/SPEC-KRYL-1222-completion-chips.md
//
// ── Gating (KRYL-1222 narrowed scope) ───────────────────────────────────────
// Only `timeline` has a control to route to today (the horizon scrubber). The
// other four dimensions are DEFINED here so the derivation logic is complete and
// tested, but ENABLED: false until their controls are mounted (separate ticket).
// `deriveCompletionChips` returns the full candidate set; `activeCompletionChips`
// returns only what the UI should render right now.

// Priority: lower number = higher priority. decision > budget > timeline > lens > asset.
const CHIP_MODEL = [
  {
    id: 'decision',
    label: '+ decision',
    priority: 1,
    target: 'rules',
    enabled: false,
    mechanic: 'Names the target that relationships can assemble around — a shared target is what lets convergence or concentration form at all.',
  },
  {
    id: 'budget',
    label: '+ budget',
    priority: 2,
    target: 'floor',
    enabled: false,
    mechanic: 'Brings the capital domain into the field with real magnitude, so it counts as a formation member instead of ambient noise.',
  },
  {
    id: 'timeline',
    label: '+ timeline',
    priority: 3,
    target: 'horizon',
    enabled: true,
    mechanic: 'Adds temporal order and span — sequence, persistence and commitment only become readable once events can be ordered.',
  },
  {
    id: 'lens',
    label: '+ lens',
    priority: 4,
    target: 'lens',
    enabled: false,
    mechanic: 'Sets which domains are structurally expected — sharpens what counts as absence versus simply out of scope.',
  },
  {
    id: 'asset',
    label: '+ asset detail',
    priority: 5,
    target: 'rules',
    enabled: false,
    mechanic: 'Narrows the target entity — tighter relationship admission, fewer spurious formation members.',
  },
];

const MODEL_BY_ID = Object.fromEntries(CHIP_MODEL.map(c => [c.id, c]));

// Per-asset-class refinement copy for the `asset` chip. Kept qualitative.
const ASSET_MECHANIC = {
  COMMERCIAL_REAL_ESTATE: 'Names the use (owner-occupied / investment / redevelopment) — narrows which relationships are admissible.',
};

const VISIBLE_CAP = 4;

function isLensUnset(activeLens) {
  return activeLens == null || activeLens === 'OPEN' || activeLens === 'GENERAL';
}

/**
 * shownDimensions — which gaps the current input exposes, regardless of gating.
 * @param {object} input
 * @param {object} input.queryContext  a KRYL-1221 QueryContext (buildQueryContext output)
 * @param {number|null} [input.selectedFloor]
 * @param {boolean} [input.horizonSet]  true only when the guest actually chose a
 *   horizon through the scrubber — NOT the New-Query reset default.
 * @param {string|null} [input.activeLens]
 * @returns {Set<string>} chip ids whose dimension is currently missing
 */
function shownDimensions({ queryContext, selectedFloor = null, horizonSet = false, activeLens = null }) {
  const qc = queryContext ?? {};
  const decisionCues = Array.isArray(qc.decisionCues) ? qc.decisionCues : [];
  const numbers      = Array.isArray(qc.numbers) ? qc.numbers : [];
  const assetClass   = qc.assetClass ?? { state: 'absent' };

  const shown = new Set();
  if (decisionCues.length === 0)                              shown.add('decision');
  if (numbers.length === 0 && selectedFloor == null)          shown.add('budget');
  if (!horizonSet)                                            shown.add('timeline');
  if (isLensUnset(activeLens))                                shown.add('lens');
  if (assetClass.state === 'resolved')                        shown.add('asset');
  return shown;
}

/**
 * deriveCompletionChips — the full candidate set for the current input.
 * Every chip carries its `enabled` flag; callers that render pass through
 * `activeCompletionChips`.
 * @returns {Array<{id,label,mechanic,target,priority,enabled}>} priority-sorted
 */
export function deriveCompletionChips(input) {
  const shown = shownDimensions(input);
  const qc = input?.queryContext ?? {};
  const assetClassValue = qc.assetClass?.state === 'resolved' ? qc.assetClass.value : null;

  return CHIP_MODEL
    .filter(c => shown.has(c.id))
    .map(c => {
      if (c.id === 'asset' && assetClassValue && ASSET_MECHANIC[assetClassValue]) {
        return { ...c, mechanic: ASSET_MECHANIC[assetClassValue] };
      }
      return { ...c };
    })
    .sort((a, b) => a.priority - b.priority);
}

/**
 * activeCompletionChips — what the UI renders right now: shown ∧ enabled,
 * priority-sorted, capped at VISIBLE_CAP.
 */
export function activeCompletionChips(input) {
  return deriveCompletionChips(input)
    .filter(c => c.enabled)
    .slice(0, VISIBLE_CAP);
}

export { CHIP_MODEL, MODEL_BY_ID, VISIBLE_CAP };
