export function evaluateFieldSignals(metrics: any) {
  const signals = [];

  if (metrics.stabilityIndex < 0.4) {
    signals.push({
      type: "DRIFT",
      intensity: 1 - metrics.stabilityIndex
    });
  }

  if (metrics.entropyLevel > 0.7) {
    signals.push({
      type: "RESISTANCE",
      intensity: metrics.entropyLevel
    });
  }

  if (metrics.coherenceScore > 0.8) {
    signals.push({
      type: "COHERENCE",
      intensity: metrics.coherenceScore
    });
  }

  return signals;
}
