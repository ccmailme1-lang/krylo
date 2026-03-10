import React from "react";

// ShiftShutter renders each signal with visual effects based on score/type
export default function ShiftShutter({ signals = [], isPaused = false }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "300px",
        backgroundColor: "#000", // dark void
        overflow: "hidden",
      }}
    >
      {signals.map((signal, index) => {
        // Determine styles based on score
        const opacity = signal.score ?? 0.5;
        const blurPx = (1 - opacity) * 20;
        const zIndex = index === 0 ? 100 : 10 + index;

        // Optional: pulse for very high-score signals
        const pulse = opacity >= 0.95 ? { animation: "pulse 1s infinite" } : {};

        return (
          <div
            key={signal.id || signal.text}
            style={{
              position: "absolute",
              top: `${Math.random() * 80}%`, // random vertical placement
              left: `${Math.random() * 90}%`, // random horizontal placement
              color: "#fff",
              fontWeight: "bold",
              opacity,
              filter: `blur(${blurPx}px)`,
              zIndex,
              pointerEvents: "none",
              ...pulse,
            }}
          >
            {signal.text}
          </div>
        );
      })}

      {/* Pulse keyframes */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}