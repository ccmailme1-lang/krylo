import { runPrecursorFieldEngine } from "../engine/precursorFieldEngine";

export function processConeRequest(snapshot: any) {

  // WO-1381 enforcement: cone-scoped only
  const result = runPrecursorFieldEngine(snapshot);

  return {
    type: "STATE_UPDATE",
    coneId: snapshot.coneId,
    bayId: snapshot.bayId,
    field: result.fieldState,
    metrics: result.computedMetrics,
    signals: result.signals
  };
}
