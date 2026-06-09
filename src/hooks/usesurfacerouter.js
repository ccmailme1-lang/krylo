// WO-1092 — Surface Router Hook
// Uses a ref to avoid stale handler closures while keeping a stable subscribe identity.
import { useEffect, useRef } from 'react';
import { surfaceRouter } from '../engine/surfacerouter.js';

export function usesurfacerouter(surfaceId, domains, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;  // always current — no stale closure

  useEffect(() => {
    surfaceRouter.subscribe(surfaceId, domains, (event, op) => handlerRef.current(event, op));
    return () => surfaceRouter.unsubscribe(surfaceId);
  }, [surfaceId]);  // re-register only if surfaceId changes; domains are stable at mount
}
