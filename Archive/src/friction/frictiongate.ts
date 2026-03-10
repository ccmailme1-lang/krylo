// ============================================================================
// FILE 3: src/friction/frictiongate.ts
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import type { BreachEvent } from "./usebreachhandler";

export type GateState = "open" | "monitoring" | "frozen" | "slam";

export interface FrictionGateConfig {
  monitorThreshold: number;
  freezeThreshold: number;
  slamThreshold: number;
  slamCooldownMs: number;
}

const DEFAULT_CONFIG: FrictionGateConfig = {
  monitorThreshold: 30,
  freezeThreshold: 55,
  slamThreshold: 70,
  slamCooldownMs: 3000,
};

export class FrictionGate {
  private state: GateState = "open";
  private config: FrictionGateConfig;
  private lastSlamAt: number = 0;
  private listeners: Set<(state: GateState, event?: BreachEvent) => void> = new Set();

  constructor(config: Partial<FrictionGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): GateState {
    return this.state;
  }

  ingest(variance: number): GateState {
    const prev = this.state;

    if (this.state === "slam") {
      const elapsed = performance.now() - this.lastSlamAt;
      if (elapsed < this.config.slamCooldownMs) return this.state;
    }

    if (variance >= this.config.slamThreshold) {
      this.state = "slam";
      this.lastSlamAt = performance.now();
    } else if (variance >= this.config.freezeThreshold) {
      this.state = "frozen";
    } else if (variance >= this.config.monitorThreshold) {
      this.state = "monitoring";
    } else {
      this.state = "open";
    }

    if (prev !== this.state) {
      this.notify();
    }
    return this.state;
  }

  forceSlam(event: BreachEvent): void {
    this.state = "slam";
    this.lastSlamAt = performance.now();
    this.notify(event);
  }

  reset(): void {
    this.state = "open";
    this.lastSlamAt = 0;
    this.notify();
  }

  subscribe(fn: (state: GateState, event?: BreachEvent) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify(event?: BreachEvent): void {
    this.listeners.forEach((fn) => fn(this.state, event));
  }
}

export function useFrictionGate(config?: Partial<FrictionGateConfig>) {
  const gate = useMemo(() => new FrictionGate(config), []);
  const [gateState, setGateState] = useState<GateState>("open");

  useEffect(() => {
    const unsub = gate.subscribe((state) => setGateState(state));
    return unsub;
  }, [gate]);

  return { gate, gateState };
}
