// WO-2080 — Rendering Fidelity Constraint System
// Guardrails for Cone rendering: determinism, layout-shift tolerance, performance budget.
// Validates inputs/outputs of EXISTING rendering functions (encodeCone, etc.) — does not
// change cone geometry, height, radius, or color logic, and does not modify conemap.jsx
// or coneencoding.js. WO-2076 (a geometry model replacement) was struck by Founder
// 2026-07-02; this WO does not revisit cone shape in any way.

const LAYOUT_SHIFT_TOLERANCE = 0.15; // max fractional per-frame height/radius change before flagged
const FRAME_BUDGET_MS        = 16.67; // 60fps budget per frame

// Determinism check — calls a pure geometry function twice with identical input and
// confirms bit-identical output. Generic over encodeFn so it can validate encodeCone()
// (or any future pure rendering function) without hardcoding its internals here.
export function verifyDeterministic(encodeFn, input, opts) {
  const first  = encodeFn(input, opts);
  const second = encodeFn(input, opts);
  return { deterministic: JSON.stringify(first) === JSON.stringify(second), first, second };
}

// Layout-shift check — flags a frame-to-frame value jump larger than tolerance.
// Reports only; does not smooth, clamp, or alter the value. The caller decides what
// to do with a flagged shift — this module doesn't dictate visuals.
export function exceedsLayoutShift(prevValue, nextValue, tolerance = LAYOUT_SHIFT_TOLERANCE) {
  if (prevValue === 0) return nextValue !== 0;
  const delta = Math.abs(nextValue - prevValue) / Math.abs(prevValue);
  return delta > tolerance;
}

// Performance budget check — given a cone count and a per-cone render cost estimate,
// reports whether a real-time update batch fits inside one frame's budget.
export function withinRenderBudget(coneCount, msPerCone, frameBudgetMs = FRAME_BUDGET_MS) {
  const estimatedMs = coneCount * msPerCone;
  return { withinBudget: estimatedMs <= frameBudgetMs, estimatedMs, frameBudgetMs };
}

// Full check bundle for one render pass — combines all three, doesn't add new rules.
export function checkRenderingFidelity({ encodeFn, input, opts, prevHeight, nextHeight, coneCount, msPerCone }) {
  const determinism = verifyDeterministic(encodeFn, input, opts);
  const layoutShiftExceeded = exceedsLayoutShift(prevHeight, nextHeight);
  const performanceBudget   = withinRenderBudget(coneCount, msPerCone);
  return {
    deterministic:      determinism.deterministic,
    layoutShiftExceeded,
    performanceBudget,
    passedAll: determinism.deterministic && !layoutShiftExceeded && performanceBudget.withinBudget,
  };
}
