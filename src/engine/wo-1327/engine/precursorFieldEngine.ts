import { ConeSnapshot, FieldState } from "../domain/fieldTypes";
import { computeFieldMetrics } from "./fieldSelectors";
import { evaluateFieldSignals } from "./fieldReducer";

export function runPrecursorFieldEngine(
  input: ConeSnapshot
): FieldState {

  const computedMetrics = computeFieldMetrics(input);

  const signals = evaluateFieldSignals(computedMetrics);

  return {
    coneId: input.coneId,
    fieldState: {
      stabilityIndex: computedMetrics.stabilityIndex,
      entropyLevel: computedMetrics.entropyLevel,
      coherenceScore: computedMetrics.coherenceScore
    },
    computedMetrics,
    signals,
    timestamp: Date.now()
  };
}
