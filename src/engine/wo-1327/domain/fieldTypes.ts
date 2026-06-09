export type ConeSnapshot = {
  coneId: string;
  bayId: string;
  state: Record<string, any>;
  metrics: Record<string, number>;
  controlContext: {
    mode: "DEFAULT" | "METRICS" | "ALERTS";
  };
};

export type FieldState = {
  coneId: string;
  fieldState: Record<string, any>;
  computedMetrics: Record<string, number>;
  signals: FieldSignal[];
  timestamp: number;
};

export type FieldSignal = {
  type: "STABILITY" | "DRIFT" | "RESISTANCE" | "COHERENCE";
  intensity: number;
  vector?: Record<string, number>;
};
