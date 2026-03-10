// ============================================================================
// FILE 5: src/components/auditdesk.tsx
// ============================================================================

import React, { useCallback, useEffect, useRef } from "react";
import { useGhostPhotography } from "../friction/useghostphotography";
import { useBreachHandler } from "../friction/usebreachhandler";
import { useFrictionGate } from "../friction/frictiongate";
import SlamAnimation from "../friction/slamanimation";
import type { BusSnapshot } from "../friction/useghostphotography";
import type { BreachRule, BreachEvent } from "../friction/usebreachhandler";

const DEFAULT_RULES: BreachRule[] = [
  {
    id: "variance-spike",
    severity: "high",
    reason: "Variance exceeded slam threshold",
    test: (p) => typeof p.variance === "number" && (p.variance as number) > 70,
  },
  {
    id: "signal-dropout",
    severity: "critical",
    reason: "Signal strength collapsed below minimum",
    test: (p) => typeof p.signalStrength === "number" && (p.signalStrength as number) < 10,
  },
  {
    id: "convergence-break",
    severity: "medium",
    reason: "Convergence fell below integrity floor",
    test: (p) => typeof p.convergence === "number" && (p.convergence as number) < 0.3,
  },
];

interface AuditDeskProps {
  busSlice: Record<string, unknown>;
  rules?: BreachRule[];
  children: React.ReactNode;
}

const AuditDesk: React.FC<AuditDeskProps> = ({
  busSlice,
  rules = DEFAULT_RULES,
  children,
}) => {
  const frozenFrameRef = useRef<Record<string, unknown> | null>(null);
  const breachLogRef = useRef<BreachEvent[]>([]);

  const { gate, gateState } = useFrictionGate({
    monitorThreshold: 30,
    freezeThreshold: 55,
    slamThreshold: 70,
    slamCooldownMs: 3000,
  });

  const handleBreach = useCallback((event: BreachEvent) => {
    breachLogRef.current.push(event);
    gate.forceSlam(event);
    frozenFrameRef.current = structuredClone(event.triggerSnapshot.payload);
  }, [gate]);

  const { capture, flush, getHistory } = useGhostPhotography({
    maxHistory: 100,
    onCapture: (snap) => evaluate(snap),
  });

  const { evaluate, resolve, getActiveBreaches, registerFlush } = useBreachHandler({
    rules,
    onBreach: handleBreach,
    autoFlushOnCritical: true,
  });

  useEffect(() => {
    registerFlush(flush);
  }, [registerFlush, flush]);

  useEffect(() => {
    if (!busSlice) return;
    const variance = typeof busSlice.variance === "number" ? busSlice.variance : 0;
    gate.ingest(variance);
    capture(busSlice, gateState === "slam" ? "slam" : "tick");
  }, [busSlice, gate, capture, gateState]);

  const handleReset = useCallback(() => {
    const active = getActiveBreaches();
    active.forEach((b) => resolve(b.breachId));
    gate.reset();
    frozenFrameRef.current = null;
  }, [getActiveBreaches, resolve, gate]);

  const resetBtnStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 10002,
    padding: "8px 16px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    display: gateState === "slam" || gateState === "frozen" ? "block" : "none",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <SlamAnimation gateState={gateState}>
        {children}
      </SlamAnimation>
      <button style={resetBtnStyle} onClick={handleReset}>
        ↻ Reset Audit
      </button>
    </div>
  );
};

export default AuditDesk;

