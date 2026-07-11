import { useRef, useEffect } from 'react';

// WebGL context-loss safety net (2026-07-11).
// A lost WebGL context ("THREE.WebGLRenderer: Context Lost") hard-crashes the 3D scene
// unless the app calls preventDefault() on the 'webglcontextlost' event — that tells the
// browser we will recover, so it fires 'webglcontextrestored' and the canvas comes back
// instead of staying dead. This is the SAFETY NET only. The root cause (context leak from
// multiple/remounting Canvases exceeding the browser's live-context cap) is a separate fix.
//
// Usage: <Canvas onCreated={({ gl }) => guardGLContext(gl)} ...>
export function guardGLContext(gl, onRestore) {
  const canvas = gl && gl.domElement;
  if (!canvas || canvas.__ctxGuarded) return;
  canvas.__ctxGuarded = true;

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // load-bearing: without this the loss is permanent
    console.warn('[WebGL] context lost — recovery armed (preventDefault)');
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    console.warn('[WebGL] context restored');
    if (typeof onRestore === 'function') onRestore();
  }, false);
}

// ROOT-CAUSE fix for the context leak. R3F disposes the scene on unmount but the browser
// retains the WebGL context until GC — so repeatedly mounting/unmounting Canvases (bay
// open/close, nav-mode switches) accumulates contexts past the browser cap (~8–16) and
// force-loses the oldest (the crash). forceContextLoss() on unmount releases each context
// immediately so they never pile up. Use as the Canvas onCreated handler:
//   const onCanvasCreated = useCanvasGuard();
//   <Canvas onCreated={onCanvasCreated} ...>
export function useCanvasGuard() {
  const glRef = useRef(null);
  useEffect(() => () => {
    const gl = glRef.current;
    if (!gl) return;
    try { gl.forceContextLoss && gl.forceContextLoss(); } catch { /* noop */ }
    try { gl.dispose && gl.dispose(); } catch { /* noop */ }
    glRef.current = null;
  }, []);
  return (state) => {
    const gl = state && state.gl ? state.gl : state;
    glRef.current = gl;
    guardGLContext(gl);
  };
}
