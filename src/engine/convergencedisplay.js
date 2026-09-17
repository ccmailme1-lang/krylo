// convergencedisplay.js — DEF-1303. Single source for the withheld -> fieldValue
// resolution rule metricstrip.jsx already implemented correctly (DEF-1242) but
// intelligencebrief.jsx's separately hand-rolled telemetry badge (DEF-1875) never learned
// about: metricsengine.js's `convergence` shape gained withheld/fieldValue six weeks after
// DEF-1875 wired that badge to the raw .value, and only metricstrip.jsx was updated to
// match. Two independent copies of the same rule is exactly how they drifted -- this is now
// the one place the rule lives; every consumer calls this, never re-derives it.
export function resolveConvergenceDisplay(convergence) {
  const withheld = convergence?.withheld === true;
  const isField = withheld && convergence?.fieldValue != null;
  const rawValue = isField ? convergence.fieldValue : (withheld ? null : convergence?.value);
  const hasValue = rawValue != null;
  const pct = hasValue ? Math.round(rawValue * 100) : null;
  const groundedness = isField
    ? (convergence?.fieldGroundedness ?? 0)
    : (withheld ? 0 : (convergence?.groundedness ?? 0));
  const queryRelevant = convergence?.queryRelevant !== false;

  let state;
  if (!hasValue)       state = 'INSUFFICIENT';
  else if (pct >= 66)  state = 'HIGH';
  else if (pct >= 40)  state = 'BUILDING';
  else if (pct >= 20)  state = 'LOW';
  else                 state = 'INSUFFICIENT';

  const tag = withheld ? (isField ? 'FIELD' : 'WITHHELD') : (queryRelevant ? null : 'AMB');

  return { hasValue, pct, state, isField, withheld, queryRelevant, groundedness, tag };
}
