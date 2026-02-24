/* --- BLOCK START: PHYSICS TELEMETRY (KRYL-301-T) --- */
import { useRef, useEffect } from 'react';

export function usePhysicsController({ 
  onUpdate, 
  baseStiffness = 0.05, 
  baseDamping = 0.8 
}) {
  const state = useRef({
    position: 0,
    velocity: 0,
    target: 0,
    lastTime: performance.now(),
    frameCount: 0,
    lastReport: performance.now()
  });

  const raf = useRef();

  useEffect(() => {
    const step = () => {
      const now = performance.now();
      const dt = (now - state.current.lastTime) / 16.67;
      state.current.lastTime = now;

      // Physics Math
      const s = state.current;
      const force = (s.target - s.position) * baseStiffness;
      s.velocity += force;
      s.velocity *= baseDamping; 
      s.position += s.velocity * dt;

      // TELEMETRY: Confirming 60fps+ 
      s.frameCount++;
      if (now - s.lastReport > 1000) {
        console.log(`[KRYLO TELEMETRY] FPS: ${s.frameCount} | Pos: ${s.position.toFixed(2)}`);
        s.frameCount = 0;
        s.lastReport = now;
      }

      if (onUpdate) onUpdate(s);
      raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [baseStiffness, baseDamping, onUpdate]);

  return {
    setTarget: (val) => { state.current.target = val; },
    impulse: (val) => { state.current.velocity += val; }
  };
}
/* --- BLOCK END: PHYSICS TELEMETRY --- */

/* --- BLOCK START: LOOP_VERIFICATION (KRYL-309) --- */
const runLoop = () => {
  // 1. Calculate the 'Distance' to the target
  const force = (target - current) * stiffness;
  
  // 2. Apply the 'Friction' (Damping)
  velocity = (velocity + force) * damping;
  current += velocity;

  // 3. The Handshake: Push to UI
  onUpdate(current);

  // 4. The Infinite Loop: Keep breathing
  loopRef.current = requestAnimationFrame(runLoop);
};
/* --- BLOCK END: LOOP_VERIFICATION --- */