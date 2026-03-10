// ============================================================================
// FILE 6: src/spine/signalmap.tsx
// ============================================================================

import React, { useEffect, useRef } from "react";
import type { GateState } from "../friction/frictiongate";

interface StreamData {
  id: string;
  truthScore: number;
  angle?: number;
}

interface SignalMapProps {
  streams: StreamData[];
  oracleRadius?: number;
  width?: number;
  height?: number;
  pulseFrequency?: number;
  gateState?: GateState;
  frozenStreams?: StreamData[];
}

const SignalMap: React.FC<SignalMapProps> = ({
  streams,
  oracleRadius = 50,
  width = 400,
  height = 400,
  pulseFrequency = 1,
  gateState = "open",
  frozenStreams,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();

  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - oracleRadius;

  const effectiveStreams =
    gateState === "frozen" || gateState === "slam"
      ? frozenStreams ?? streams
      : streams;

  const globalDesaturate =
    gateState === "frozen" ? 0.4 : gateState === "slam" ? 0.1 : 1;
  const flashIntensity = gateState === "slam" ? 1.5 : 1;

  useEffect(() => {
    const animate = (time: number) => {
      if (!svgRef.current) return;

      if (gateState === "frozen") {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const pulse =
        0.5 +
        Math.sin(time * 0.001 * pulseFrequency * 2 * Math.PI) *
          0.5 *
          flashIntensity;

      effectiveStreams.forEach((stream) => {
        const path = svgRef.current?.querySelector(`#artery-${stream.id}`);
        if (path) {
          const modulatedPulse = pulse * stream.truthScore;
          path.setAttribute("opacity", `${Math.max(0.3, modulatedPulse)}`);
          path.setAttribute("stroke-width", `${2 + modulatedPulse * 3}`);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [effectiveStreams, pulseFrequency, gateState, flashIntensity]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        filter:
          gateState === "frozen"
            ? "grayscale(0.6)"
            : gateState === "slam"
            ? "saturate(1.8)"
            : "none",
        transition: "filter 400ms ease",
      }}
    >
      <defs>
        <radialGradient id="oracle-grad">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#0000FF" />
        </radialGradient>
      </defs>
      <circle
        cx={centerX}
        cy={centerY}
        r={oracleRadius}
        fill="url(#oracle-grad)"
        stroke="none"
      />
      {effectiveStreams.map((stream, index) => {
        const angle = stream.angle ?? (index / effectiveStreams.length) * 360;
        const rad = (angle * Math.PI) / 180;

        const startX = centerX + outerRadius * Math.cos(rad);
        const startY = centerY + outerRadius * Math.sin(rad);
        const ctrlX1 = centerX + outerRadius * 0.7 * Math.cos(rad + 0.1);
        const ctrlY1 = centerY + outerRadius * 0.7 * Math.sin(rad + 0.1);
        const ctrlX2 = centerX + oracleRadius * 1.2 * Math.cos(rad - 0.1);
        const ctrlY2 = centerY + oracleRadius * 1.2 * Math.sin(rad - 0.1);

        const hue = 240 * stream.truthScore * globalDesaturate;
        const lightness = Math.min(80, 50 * flashIntensity);
        const color = `hsl(${hue}, 100%, ${lightness}%)`;

        return (
          <path
            key={stream.id}
            id={`artery-${stream.id}`}
            d={`M ${startX} ${startY} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${centerX} ${centerY}`}
            stroke={color}
            strokeWidth="2"
            fill="none"
            opacity="0.8"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

export default SignalMap;