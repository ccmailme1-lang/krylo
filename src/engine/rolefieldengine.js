// RFE-1.0 — Role Field Engine
// Probabilistic role field: input → 5D projection → state-aware distribution
// O(n) fixed cost. No sinks. No fallback roles. Explicit uncertainty via UNCLASSIFIED.

const ROLE_VECTOR = {
  INVESTOR:      { CA: 0.55, GS: 0.30, RM: 0.10, OP: 0.03, DF: 0.02 },
  REALTOR:       { CA: 0.35, OP: 0.40, GS: 0.10, RM: 0.10, DF: 0.05 },
  ATHLETE:       { DF: 0.40, GS: 0.30, OP: 0.20, RM: 0.07, CA: 0.03 },
  SALES:         { GS: 0.45, OP: 0.35, RM: 0.10, CA: 0.05, DF: 0.05 },
  LEGAL:         { RM: 0.50, DF: 0.30, OP: 0.10, CA: 0.05, GS: 0.05 },
  RETIREMENT:    { RM: 0.45, CA: 0.35, DF: 0.10, OP: 0.05, GS: 0.05 },
  EXPENSE:       { OP: 0.40, RM: 0.35, CA: 0.10, GS: 0.10, DF: 0.05 },
  TRANSITION:    { GS: 0.40, RM: 0.25, OP: 0.20, CA: 0.10, DF: 0.05 },
  RESTART:       { GS: 0.45, RM: 0.25, OP: 0.15, CA: 0.10, DF: 0.05 },
  FAMILY:        { RM: 0.45, OP: 0.30, DF: 0.15, GS: 0.05, CA: 0.05 },
  HEALTH:        { RM: 0.55, OP: 0.25, DF: 0.10, GS: 0.05, CA: 0.05 },
  STUDENT:       { GS: 0.45, CA: 0.30, OP: 0.15, RM: 0.05, DF: 0.05 },
  GENERAL:       { OP: 0.50, GS: 0.20, RM: 0.15, CA: 0.10, DF: 0.05 },
  OPEN:          { OP: 0.55, GS: 0.20, RM: 0.15, CA: 0.05, DF: 0.05 },
  CEO:           { DF: 0.40, CA: 0.40, RM: 0.10, GS: 0.05, OP: 0.05 },
  CFO:           { CA: 0.50, RM: 0.35, OP: 0.10, GS: 0.03, DF: 0.02 },
  EA:            { OP: 0.50, RM: 0.30, GS: 0.10, CA: 0.05, DF: 0.05 },
  COO:           { OP: 0.55, RM: 0.25, GS: 0.10, CA: 0.05, DF: 0.05 },
  MANUFACTURING: { OP: 0.60, RM: 0.25, GS: 0.05, CA: 0.05, DF: 0.05 },
};

const ROLES = Object.keys(ROLE_VECTOR);
const AXES  = ['CA', 'GS', 'OP', 'RM', 'DF'];

// Axis → canonical lens ID (matches lensrouter VALID_LENS_IDS)
export const AXIS_TO_LENS = {
  CA: 'CAPITAL_ALLOCATOR',
  GS: 'GROWTH_SEEKER',
  OP: 'OPERATOR',
  RM: 'RISK_MANAGER',
  DF: 'DEFENDER',
};

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < AXES.length; i++) {
    const k = AXES[i];
    s += (a[k] || 0) * (b[k] || 0);
  }
  return s;
}

function softmax(scores) {
  let max = -Infinity;
  for (const k in scores) if (scores[k] > max) max = scores[k];
  let sum = 0;
  const out = {};
  for (const k in scores) { const e = Math.exp(scores[k] - max); out[k] = e; sum += e; }
  for (const k in out) out[k] /= sum;
  return out;
}

function computeEntropy(p) {
  let e = 0;
  for (const k in p) { const v = p[k]; if (v > 0) e -= v * Math.log(v); }
  return e;
}

// Weighted axis centroid from role distribution — feeds SV/MCV
function axesCentroid(p) {
  const c = { CA: 0, GS: 0, OP: 0, RM: 0, DF: 0 };
  for (const role in p) {
    const w = p[role];
    const v = ROLE_VECTOR[role];
    if (!v) continue;
    for (const ax of AXES) c[ax] += w * (v[ax] || 0);
  }
  return c;
}

// Main classify — input must be a 5D axis vector { CA, GS, OP, RM, DF }
export function classify(inputVector) {
  const scores = {};
  for (const r of ROLES) scores[r] = dot(inputVector, ROLE_VECTOR[r]);

  const p = softmax(scores);

  let top1 = null, top2 = null;
  for (const k in p) {
    if (!top1 || p[k] > p[top1]) { top2 = top1; top1 = k; }
    else if (!top2 || p[k] > p[top2]) top2 = k;
  }

  const topScore    = p[top1];
  const secondScore = p[top2] ?? 0;
  const ent         = computeEntropy(p);

  let state = 'RESOLVED';
  if (topScore < 0.45)                              state = 'UNCLASSIFIED';
  else if ((topScore - secondScore) < 0.12 || ent > 1.4) state = 'MULTI_ROLE_OVERLAP';

  const centroid = axesCentroid(p);

  const sv_influence_vector = {
    direction: centroid,
    amplitude: topScore * (1 - ent),
    volatility: ent,
  };

  const mcv_influence_vector = {
    constraint_pressure: (centroid.RM || 0) + (centroid.DF || 0),
    expansion_pressure:  (centroid.GS || 0) + (centroid.CA || 0),
    execution_pressure:  centroid.OP || 0,
  };

  return {
    role_distribution:     p,
    primary_role:          state === 'MULTI_ROLE_OVERLAP' ? [top1, top2] : top1,
    state,
    confidence:            topScore,
    stability:             1 - ent,
    entropy:               ent,
    sv_influence_vector,
    mcv_influence_vector,
  };
}

// Build a 5D input vector from a session object.
// Uses the detected persona's ROLE_VECTOR as the base projection.
export function buildInputVector(session) {
  const key = (session?.lens ?? 'GENERAL').toUpperCase();
  const base = ROLE_VECTOR[key] ?? ROLE_VECTOR.GENERAL;

  // Query signal nudge — adjusts axis weights based on detected intent keywords
  const q = (session?.query ?? '').toLowerCase();
  const nudge = { CA: 0, GS: 0, OP: 0, RM: 0, DF: 0 };
  if (/capital|invest|allocat|portfolio|fund/i.test(q))      nudge.CA += 0.08;
  if (/risk|threat|hedg|liability|exposure|downside/i.test(q)) nudge.RM += 0.08;
  if (/compet|rival|defend|moat|erosion/i.test(q))           nudge.DF += 0.08;
  if (/grow|expand|launch|scale|opportunit/i.test(q))        nudge.GS += 0.08;
  if (/cost|margin|efficienc|operat|workflow/i.test(q))      nudge.OP += 0.08;

  // Combine and renormalize
  const raw = {};
  let sum = 0;
  for (const ax of AXES) { raw[ax] = (base[ax] || 0) + nudge[ax]; sum += raw[ax]; }
  if (sum === 0) return { ...ROLE_VECTOR.GENERAL };
  for (const ax of AXES) raw[ax] /= sum;
  return raw;
}
