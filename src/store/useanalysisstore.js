// WO-1106-A — Semantic & Inference State
// WO-1812 — createSession inherits defaultLens from profile
import { create } from 'zustand';
import { loadProfile } from '../engine/userprofile.js';
import { buildQueryContext } from '../engine/querycontext.js';
import { buildAnalysisIntent } from '../engine/analysisintent.js';

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
  // KRYL — lifecycle-boundary fix for a real guest-facing defect (2026-09-22): a domain pill
  // selected in analysisidlefield.jsx (local component state, selectedDomains) only ever got
  // cleared by that component's own "New Query" button (resetSession(), which calls
  // setSelectedDomains([])). historybay.jsx's RE-RUN creates a brand-new session directly via
  // createSession() and never goes through that button, so a stale pill selection from an
  // earlier, unrelated query silently locked domain routing for the re-run too — landing on
  // querysynthesis.js's generic synthGeneral() fallback regardless of the re-run query's actual
  // content. This flag is the bridge: any entry point that creates a session outside
  // analysisidlefield.jsx's own submit flow sets it; analysisidlefield.jsx clears its local
  // selectedDomains when it sees it set, then clears the flag.
  pendingDomainReset: false,

  setPendingQuery:       (text)     => set({ pendingQuery: text }),
  setPendingAcquisition: (envelope) => set({ pendingAcquisition: envelope }),
  clearPendingAcquisition: ()       => set({ pendingAcquisition: null }),
  requestDomainReset:      ()       => set({ pendingDomainReset: true }),
  clearDomainResetRequest: ()       => set({ pendingDomainReset: false }),

  createSession: (id, lens, query = '', tensor = {}) => set((state) => {
    const resolvedLens = lens || loadProfile().defaultLens || 'GENERAL';
    // KRYL-1221 Phase 1 — the single build point for the canonical query record.
    // Additive: nothing reads it yet (consumer migration is Phase 2).
    const queryContext = buildQueryContext(query);
    // Interpretation carried for the session lifetime on every creation path: only the idle field
    // builds tensor.analysisIntent itself; a session created elsewhere (history re-run, cone
    // assignment, ingestion, brief re-run) gets the same existing buildAnalysisIntent() result.
    // A tensor that already carries one (idle field) is passed through untouched.
    const sessionTensor = (!tensor?.analysisIntent && typeof query === 'string' && query.trim())
      ? { ...tensor, analysisIntent: buildAnalysisIntent(query) }
      : tensor;
    return ({
      sessions: {
        ...state.sessions,
        [id]: {
          id,
          lens: resolvedLens,
          query,
          queryContext,
          tensor: sessionTensor,
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
  // KRYL-1244 — live render-gate for the brief's OUTPUT filters. Updates
  // tensor.outputFilters in place and PRESERVES tensor.synthesis (unlike
  // setTensorFields, which clears the synthesis cache). Pure visibility state —
  // never triggers re-synthesis.
  setOutputFilters: (sessionId, outputFilters) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          tensor: { ...(session.tensor ?? {}), outputFilters: { ...outputFilters } },
          metadata: { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

  // KRYL-1306 — Structural Signal Query Refinement v1.1. Same pattern as setOutputFilters:
  // additive tensor state only, never touches session.query or session.queryContext (the
  // immutable originalQuery record). structuralRefinements is set at construction time inside
  // the tensor object passed to createSession; this action exists for any later update to the
  // set (e.g. deselecting a refinement after the packet has already rendered), mirroring how
  // setOutputFilters supports post-creation edits to its own tensor field.
  setStructuralRefinements: (sessionId, structuralRefinements) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          tensor: { ...(session.tensor ?? {}), structuralRefinements: [...structuralRefinements] },
          metadata: { ...session.metadata, updated: Date.now() },
        },
      },
    };
  }),

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
