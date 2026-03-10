// etrstrike.jsx
// WO-220 — Signal particle renderer
// WO-225 §3 — Coordinates received at dispatch, never at mount
// WO-228 — Reverted to position:fixed; coordinate system correct
// Location: src/components/spine/etrstrike.jsx
import React, { useState, useEffect } from "react";
import { TYPOGRAPHY, PALETTE } from "./constants.js";

export default function ETRStrike({ x, y, text, onExpire }) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const fade   = setTimeout(() => setOpacity(0),   800);
    const expire = setTimeout(() => onExpire?.(),   1200);
    return () => {
      clearTimeout(fade);
      clearTimeout(expire);
    };
  }, [onExpire]);

  return (
    <span
      style={{
        position:      "fixed",
        top:           y,
        left:          x,
        transform:     "translate(-50%, -50%)",
        opacity,
        transition:    "opacity 400ms ease",
        fontFamily:    TYPOGRAPHY.fontFamily,
        fontWeight:    TYPOGRAPHY.fontWeight,
        fontSize:      TYPOGRAPHY.etrSize,
        color:         PALETTE.text,
        pointerEvents: "none",
        whiteSpace:    "nowrap",
        userSelect:    "none",
        zIndex:        0,
      }}
    >
      {text}
    </span>
  );
}