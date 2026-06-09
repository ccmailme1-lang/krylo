// src/store/useannotationstore.js
// WO-1333 — Dynamic Annotation Layer
// Owns scrubPos (global observable) + annotations[] as co-located state.
// scrubPos mirrors app.jsx scrubPos — synced on every onChange, no prop-drilling required.

import { create } from 'zustand';

export const useAnnotationStore = create((set) => ({
  // Normalized scrubber position [0,1]. 0 = LIVE, 1 = oldest frame.
  scrubPos: 0,

  // Flat array of annotations. Indexed by time (timestamp normalized [0,1]).
  annotations: [
    { id: 'ann-seed-1', timestamp: 0.18, label: 'capital pressure spike', tag: 'CAPITAL',  magnitude: 0.82 },
    { id: 'ann-seed-2', timestamp: 0.47, label: 'labor signal threshold', tag: 'LABOR',    magnitude: 0.61 },
    { id: 'ann-seed-3', timestamp: 0.74, label: 'media convergence event', tag: 'MEDIA',   magnitude: 0.94 },
  ],

  setScrubPos:     (pos) => set({ scrubPos: pos }),
  setAnnotations:  (arr) => set({ annotations: arr }),
  addAnnotation:   (a)   => set((state) => ({ annotations: [...state.annotations, a] })),
  removeAnnotation:(id)  => set((state) => ({ annotations: state.annotations.filter(a => a.id !== id) })),
}));
