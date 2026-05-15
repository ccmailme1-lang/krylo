// src/context/SurfaceContext.jsx
// WO-1040 — Continuous Signal Surface Orchestration
// Shared runtime state: topology, phase, renderOwner, perturbation.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  RENDER_OWNER,
  SURFACE_PHASE,
  signalToNode,
} from '../engine/surfacecontract.js';

const SurfaceContext = createContext(null);

export function useSurface() {
  const ctx = useContext(SurfaceContext);
  if (!ctx) throw new Error('useSurface must be inside SurfaceProvider');
  return ctx;
}

export function SurfaceProvider({ children }) {
  const [topology,     setTopology]     = useState([]);
  const [phase,        setPhase]        = useState(SURFACE_PHASE.AMBIENT);
  const [renderOwner,  setRenderOwner]  = useState(RENDER_OWNER.CLUSTER);
  const [perturbation, setPerturbation] = useState(null);

  // Derive topology from a signal array — modifies existing nodes by id, spawns new, retains unchanged
  const hydrateFromSignals = useCallback((signals) => {
    if (!signals?.length) return;
    const incoming = signals.slice(0, 8).map((s, i, arr) => signalToNode(s, i, arr.length));
    setTopology(prev => {
      const prevById = Object.fromEntries(prev.map(n => [n.id, n]));
      return incoming.map(node => ({
        ...node,
        // Preserve born timestamp if node already existed (continuity)
        born: prevById[node.id]?.born ?? node.born,
      }));
    });
  }, []);

  // Authoritative transition — sets render owner and surface phase together
  const transitionTo = useCallback((owner, nextPhase) => {
    setRenderOwner(owner);
    if (nextPhase) setPhase(nextPhase);
  }, []);

  const perturb = useCallback((type) => setPerturbation(type), []);
  const clearPerturbation = useCallback(() => setPerturbation(null), []);

  return (
    <SurfaceContext.Provider value={{
      topology,
      phase,
      renderOwner,
      perturbation,
      hydrateFromSignals,
      transitionTo,
      perturb,
      clearPerturbation,
      setTopology,
      RENDER_OWNER,
      SURFACE_PHASE,
    }}>
      {children}
    </SurfaceContext.Provider>
  );
}
