// WO-1106-A — Semantic & Inference State
// WO-1812 — createSession inherits defaultLens from profile
import { create } from 'zustand';
import { loadProfile } from '../engine/userprofile.js';

// Stable action skeleton — IDs assigned at session construction, never at render.
function buildActionSkeleton() {
  return [
    { actionId: crypto.randomUUID(), type: 'primary',   payload: null },
    { actionId: crypto.randomUUID(), type: 'secondary', payload: null },
    { actionId: crypto.randomUUID(), type: 'structural', payload: null },
  ];
}

export const useAnalysisStore = create((set) => ({
  sessions:           {},
  activeSessionId:    null,
  pendingQuery:       null,
  pendingAcquisition: null,

  setPendingQuery:       (text)     => set({ pendingQuery: text }),
  setPendingAcquisition: (envelope) => set({ pendingAcquisition: envelope }),
  clearPendingAcquisition: ()       => set({ pendingAcquisition: null }),

  createSession: (id, lens, query = '', tensor = {}) => set((state) => {
    const resolvedLens = lens || loadProfile().defaultLens || 'GENERAL';
    return ({
      sessions: {
        ...state.sessions,
        [id]: {
          id,
          lens: resolvedLens,
          query,
          tensor,
          targets:    [],
          signals:    [],
          artifacts:  [],
          narratives: [],
          inferences: [],
          actions:    buildActionSkeleton(),
          metadata:   { created: Date.now(), updated: Date.now() },
        },
      },
      activeSessionId: id,
    });
  }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  appendSignal: (sessionId, signal) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    const existing = session.signals.find(s => s.id === signal.id);
    if (existing) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          signals:  [...session.signals, signal],
          metadata: { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

  setNarrative: (sessionId, narrative) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          narratives: [...session.narratives.filter(n => n.id !== narrative.id), narrative],
          metadata:   { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

  setInference: (sessionId, inference) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          inferences: [...session.inferences.filter(i => i.id !== inference.id), inference],
          metadata:   { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

  setActions: (sessionId, actions) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: { ...session, actions, metadata: { ...session.metadata, updated: Date.now() } },
      },
    };
  }),

  // Closes the DIC intake loop (KRYL-1175): merges user-supplied required fields into the
  // existing tensor, preserving domainLock and everything else already on it. Also clears the
  // stale cached tensor.synthesis, so intelligencebrief.jsx's useMemo
  // (`session.tensor?.synthesis ?? synthesizeQuery(session)`) falls through to a fresh
  // synthesizeQuery(session) call that sees the new fields, instead of serving the old cached
  // result computed before the fields existed.
  setTensorFields: (sessionId, fields) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    const { synthesis, ...tensorRest } = session.tensor ?? {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          tensor: {
            ...tensorRest,
            fields: { ...(tensorRest.fields ?? {}), ...fields },
          },
          metadata: { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

}));
