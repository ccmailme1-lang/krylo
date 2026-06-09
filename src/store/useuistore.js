// WO-1106-B — Ephemeral Interaction State
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  swipeIndex:         0,   // 0=SearchProfile, 1=Oracle, 2=Lens, 3=ActionPlan
  expandedNodes:      [],
  activeHoverContext: null,
  activeNav:          'surface',

  setSwipeIndex:      (index) => set({ swipeIndex: index }),
  setHoverContext:    (ctx)   => set({ activeHoverContext: ctx }),
  setActiveNav:       (nav)   => set({ activeNav: nav, swipeIndex: 0 }),
  toggleNode:         (id)    => set((state) => ({
    expandedNodes: state.expandedNodes.includes(id)
      ? state.expandedNodes.filter(n => n !== id)
      : [...state.expandedNodes, id],
  })),
}));
