// ============================================================================
// FILE 4: src/friction/slamanimation.tsx
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import type { GateState } from "./frictiongate";

interface SlamAnimationProps {
  gateState: GateState;
  flashDuration?: number;
  freezeFadeDuration?: number;
  children: React.ReactNode;
}

const SlamAnimation: React.FC<SlamAnimationProps> = ({
  gateState,
  flashDuration = 150,
  freezeFadeDuration = 400,
  children,
}) => {
  const [showFlash, setShowFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevState = useRef<GateState>("open");

  useEffect(() => {
    if (gateState === "slam" && prevState.current !== "slam") {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), flashDuration);
      return () => clearTimeout(timer);
    }
    prevState.current = gateState;
  }, [gateState, flashDuration]);

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: gateState === "frozen" || gateState === "slam" ? "all" : "none",
    zIndex: 9999,
    transition: `opacity ${freezeFadeDuration}ms ease, backdrop-filter ${freezeFadeDuration}ms ease`,
    opacity: gateState === "frozen" || gateState === "slam" ? 1 : 0,
    backdropFilter: gateState === "frozen" ? "blur(4px) grayscale(0.6)" : "none",
    background: showFlash
      ? "rgba(255, 0, 0, 0.15)"
      : gateState === "slam"
      ? "rgba(0, 0, 0, 0.05)"
      : "transparent",
  };

  const borderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 10000,
    border: gateState === "slam"
      ? "2px solid rgba(255, 0, 0, 0.6)"
      : gateState === "frozen"
      ? "1px solid rgba(255, 165, 0, 0.4)"
      : "none",
    transition: `border ${freezeFadeDuration}ms ease`,
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10001,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    padding: "4px 8px",
    borderRadius: 4,
    opacity: gateState === "open" ? 0 : 1,
    transition: `opacity ${freezeFadeDuration}ms ease`,
    background: gateState === "slam" ? "rgba(255,0,0,0.1)" : "rgba(255,165,0,0.1)",
    color: gateState === "slam" ? "#ff0000" : "#ff8c00",
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}
      <div style={overlayStyle} />
      <div style={borderStyle} />
      <div style={labelStyle}>
        {gateState === "slam" ? "⚠ BREACH" : gateState === "frozen" ? "◉ FROZEN" : ""}
      </div>
    </div>
  );
};

export default SlamAnimation;
