// WO-1106-C — R3F & Animation State
// Staged State (DOM intent) ↔ Committed State (WebGL truth)
// WebGL consumes activeSpatialFrame exclusively — never reads live DOM.
import { create } from 'zustand';

const createEmptyFrame = () => ({
  frameId:            0,
  timestamp:          0,
  nodes:              {},   // { [id]: { x, y, confidence } }
  cameraTarget:       [0, 0, 0],
  globalTensionSpike: 0.0,
});

export const useRenderStore = create((set, get) => ({

  // ── 1. DOM STAGING LAYER (mutable, reconciliation-coupled) ──────────────
  stagedNodes: {},

  // Called by DOM elements (Node Alpha/Beta) via ResizeObserver or useLayoutEffect.
  // Takes a DOMRect — anchors to geometric center.
  stageNodeIntent: (id, rect, confidence = 1.0) => set((state) => ({
    stagedNodes: {
      ...state.stagedNodes,
      [id]: {
        x: rect.x + rect.width  / 2,
        y: rect.y + rect.height / 2,
        confidence,
      },
    },
  })),

  // ── 2. WEBGL COMMIT LAYER (immutable, frame-coupled) ────────────────────
  activeSpatialFrame: createEmptyFrame(),

  // Sync Barrier — fired by rAF orchestrator after DOM settle.
  // DOM Mount → Layout Stabilization → commitSpatialFrame → WebGL Sampling
  commitSpatialFrame: () => set((state) => ({
    activeSpatialFrame: {
      frameId:            state.activeSpatialFrame.frameId + 1,
      timestamp:          performance.now(),
      nodes:              { ...state.stagedNodes },
      cameraTarget:       state.activeSpatialFrame.cameraTarget,
      globalTensionSpike: state.activeSpatialFrame.globalTensionSpike,
    },
  })),

  // ── 3. RENDER CONTROLS (write directly to frame) ────────────────────────
  updateCamera: (target) => set((state) => ({
    activeSpatialFrame: { ...state.activeSpatialFrame, cameraTarget: target },
  })),

  triggerTension: (intensity) => set((state) => ({
    activeSpatialFrame: { ...state.activeSpatialFrame, globalTensionSpike: intensity },
  })),
}));
