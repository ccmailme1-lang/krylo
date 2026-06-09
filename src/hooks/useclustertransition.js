// WO-1201/1215 — Cluster-to-Mesh Transition Hook
// Drives collapseT (0→1) via R3F useFrame.
// Must be used inside a Canvas component.
// Watches isActive: false→true to auto-start; calls onDone at completion.

import { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

const DURATION = 0.55; // seconds

export function useClusterMeshTransition({ isActive, onDone }) {
  const tRef      = useRef(0);
  const runRef    = useRef(false);
  const firedRef  = useRef(false);
  const prevRef   = useRef(false);

  // Trigger on rising edge of isActive
  useEffect(() => {
    if (isActive && !prevRef.current) {
      tRef.current   = 0;
      runRef.current = true;
      firedRef.current = false;
    }
    if (!isActive) {
      tRef.current    = 0;
      runRef.current  = false;
      firedRef.current = false;
    }
    prevRef.current = isActive;
  }, [isActive]);

  useFrame((_, delta) => {
    if (!runRef.current) return;
    tRef.current = Math.min(tRef.current + delta / DURATION, 1);
    if (tRef.current >= 1 && !firedRef.current) {
      firedRef.current = true;
      onDone?.();
    }
  });

  // tRef is readable each frame by the caller via collapseT()
  const collapseT = useCallback(() => tRef.current, []);

  return { collapseT };
}
