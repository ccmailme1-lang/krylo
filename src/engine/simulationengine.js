// WO-2038 — Simulation Engine
// Diffs a baseline domain-pressure snapshot against a perturbed one.
// Pure function — no side effects, no direct call into domaingravity.js.

export function simulate(before, after) {
  const domains = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  let sumSq = 0;
  for (const d of domains) {
    const b = before?.[d] ?? 0;
    const a = after?.[d] ?? 0;
    sumSq += (a - b) ** 2;
  }
  return Math.sqrt(sumSq);
}
