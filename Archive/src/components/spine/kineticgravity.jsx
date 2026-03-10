// kineticgravity.jsx
// WO-216 — Gravity HOC
// WO-228 — Replaced JS particle system with CSS-only ambient ETR text
// Location: src/components/spine/kineticgravity.jsx
import React from "react";
import { CRAWL_PHRASES } from "./constants.js";
import "../../styles/particles.css";

export default function KineticGravity({ isPaused }) {
  if (isPaused) return null;
  return (
    <div className="particle-field">
      {CRAWL_PHRASES.map((phrase, i) => (
        <span key={i}>{phrase.text}</span>
      ))}
      {CRAWL_PHRASES.map((phrase, i) => (
        <span key={"b" + i}>{phrase.text}</span>
      ))}
    </div>
  );
}
