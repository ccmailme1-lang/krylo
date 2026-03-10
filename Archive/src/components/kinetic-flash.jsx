// kinetic-flash.jsx
// WO-226 — Particle receiver. Two-layer uppercase enforcement.

import React, { useState, useEffect } from "react";

function Particle({ x, y, text }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setOpacity(1));
    const out = setTimeout(() => setOpacity(0), 1600);
    return () => clearTimeout(out);
  }, []);

  return (
    <div
      style={{
        position:      "fixed",
        left:          x,
        top:           y,
        transform:     "translate(-50%, -50%)",
        opacity,
        transition:    "opacity 400ms ease",
        color:         "#FFFFFF",
        fontWeight:    900,
        fontFamily:    "sans-serif",
        fontSize:      "clamp(14px, 2vw, 38px)",
        letterSpacing: "-0.02em",
        lineHeight:    1,
        pointerEvents: "none",
        userSelect:    "none",
        whiteSpace:    "nowrap",
        textTransform: "uppercase",   // Layer 2 — CSS fallback
      }}
    >
      {text.toUpperCase()}
    </div>
  );
}

export default function KineticFlash({ particles = [] }) {
  return (
    <>
      {particles.map(({ id, x, y, text }) => (
        <Particle key={id} x={x} y={y} text={text} />
      ))}
    </>
  );
}