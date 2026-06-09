export function computeFieldMetrics(input: any) {
  const base = input.metrics;

  return {
    stabilityIndex: clamp(1 - base.instability, 0, 1),
    entropyLevel: base.entropy ?? 0,
    coherenceScore: base.coherence ?? 0
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
