// lookingfunnel.jsx
// WO-226 — Smooth collapse transition via COLLAPSING phase.

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import KineticFlash from "./kinetic-flash.jsx";

const CRAWL_PHRASES = [
  { text: "Imminent Layoffs",            score: 0.98, type: "signal" },
  { text: "Unresolved Conflict",         score: 0.91, type: "signal" },
  { text: "Performance Issues?",         score: 0.88, type: "signal" },
  { text: "Marital Trouble?",            score: 0.93, type: "signal" },
  { text: "Unhealthy Workplace Culture", score: 0.89, type: "signal" },
];

const PHASE = {
  SIGNAL:     "SIGNAL",
  COLLAPSING: "COLLAPSING",
  ACTION:     "ACTION",
};

const SIGNAL_DURATION  = 5500;
const COLLAPSE_DURATION = 600;
const FIRE_INTERVAL    = 520;
const PARTICLE_TTL     = 3500;

const DEAD_ZONE = { w: 500, h: 300 };

function isInDeadZone(x, y) {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  return (
    x >= cx - DEAD_ZONE.w / 2 &&
    x <= cx + DEAD_ZONE.w / 2 &&
    y >= cy - DEAD_ZONE.h / 2 &&
    y <= cy + DEAD_ZONE.h / 2
  );
}

function safeCoords() {
  const BUFFER = 80;
  let x, y;
  do {
    x = BUFFER + Math.random() * (window.innerWidth  - BUFFER * 2);
    y = BUFFER + Math.random() * (window.innerHeight - BUFFER * 2);
  } while (isInDeadZone(x, y));
  return { x, y };
}

export default function LookingFunnel({ isReceding, onSubmit }) {

  const [phase, setPhase]         = useState(PHASE.SIGNAL);
  const [query, setQuery]         = useState("");
  const [particles, setParticles] = useState([]);

  const inputRef    = useRef(null);
  const timerRef    = useRef(null);
  const collapseRef = useRef(null);
  const fireRef     = useRef(null);
  const particleId  = useRef(0);
  const hasTypedRef = useRef(false);

  const startSignalPhase = useCallback(() => {
    setPhase(PHASE.SIGNAL);
    setParticles([]);
    clearTimeout(timerRef.current);
    clearTimeout(collapseRef.current);

    timerRef.current = setTimeout(() => {
      // Begin collapse
      setPhase(PHASE.COLLAPSING);
      collapseRef.current = setTimeout(() => {
        setPhase(PHASE.ACTION);
      }, COLLAPSE_DURATION);
    }, SIGNAL_DURATION);
  }, []);

  // Mount trigger
  useEffect(() => {
    startSignalPhase();
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(collapseRef.current);
    };
  }, [startSignalPhase]);

  // Focus on hard cut
  useEffect(() => {
    if (phase === PHASE.ACTION) {
      setParticles([]);
      clearInterval(fireRef.current);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [phase]);

  // Fire loop — stop on COLLAPSING
  useEffect(() => {
    if (phase !== PHASE.SIGNAL || isReceding) {
      clearInterval(fireRef.current);
      return;
    }

    fireRef.current = setInterval(() => {
      const { x, y } = safeCoords();
      const id        = ++particleId.current;
      const phrase    = CRAWL_PHRASES[
        Math.floor(Math.random() * CRAWL_PHRASES.length)
      ];

      setParticles((prev) => [...prev, { id, x, y, text: phrase.text }]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, PARTICLE_TTL);

    }, FIRE_INTERVAL);

    return () => clearInterval(fireRef.current);
  }, [phase, isReceding]);

  // Re-arm only if user explicitly clears after typing
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 0) {
      hasTypedRef.current = true;
    }
    if (val.length === 0 && hasTypedRef.current) {
      hasTypedRef.current = false;
      startSignalPhase();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSubmit?.(query);
  };

  const isParticlePhase =
    phase === PHASE.SIGNAL || phase === PHASE.COLLAPSING;

  return (
    <div style={rootStyle}>

      {/* Signal + Collapse Phase — fades out smoothly */}
      {isParticlePhase && (
        <div
          style={{
            ...particleLayerStyle,
            opacity:    phase === PHASE.COLLAPSING ? 0 : 1,
            transition: phase === PHASE.COLLAPSING
              ? `opacity ${COLLAPSE_DURATION}ms ease`
              : "none",
          }}
        >
          <KineticFlash particles={particles} />
        </div>
      )}

      {/* Action Phase — search input */}
      {phase === PHASE.ACTION && (
        <div style={inputWrapperStyle}>
          <div style={inputBlockStyle}>
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Go ahead. Ask it."
                style={inputStyle}
                value={query}
                onChange={handleChange}
              />
            </form>
            <div style={subtitleStyle}>
              THINKING SILENCE OUT LOUD
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const rootStyle = {
  position: "fixed",
  inset:    0,
  overflow: "hidden",
};

const particleLayerStyle = {
  position:        "fixed",
  inset:           0,
  zIndex:          9998,
  backgroundColor: "#000000",
  overflow:        "hidden",
};

const inputWrapperStyle = {
  position:        "fixed",
  inset:           0,
  zIndex:          9999,
  display:         "flex",
  alignItems:      "center",
  justifyContent:  "center",
  backgroundColor: "#000000",
};

const inputBlockStyle = {
  display:       "flex",
  flexDirection: "column",
  alignItems:    "center",
  gap:           "20px",
  width:         "100%",
  maxWidth:      "680px",
  padding:       "0 24px",
};

const inputStyle = {
  width:           "100%",
  padding:         "20px 32px",
  fontFamily:      "sans-serif",
  fontStyle:       "italic",
  fontWeight:      400,
  fontSize:        "18px",
  borderRadius:    "999px",
  border:          "1px solid rgba(255,255,255,0.6)",
  outline:         "none",
  backgroundColor: "rgba(255,255,255,0.08)",
  color:           "#FFFFFF",
  caretColor:      "#FFFFFF",
  boxSizing:       "border-box",
};

const subtitleStyle = {
  fontFamily:    "sans-serif",
  fontWeight:    600,
  fontSize:      "11px",
  letterSpacing: "0.2em",
  color:         "rgba(255,255,255,0.35)",
  textAlign:     "center",
};