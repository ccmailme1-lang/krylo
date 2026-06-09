// WO-1344A + WO-1344 Phase 1 — Domain-mutable Bay State Model
import { create } from 'zustand';

// Operator-facing domain registry — bays cycle through these freely
export const DOMAIN_REGISTRY = ['TECH', 'LEGAL', 'MARKET', 'HEALTH', 'CAREER', 'FINANCE'];

// Default domain-to-bay mapping (mutable at runtime via setBayDomain)
export const BAY_DOMAINS = {
  1: 'TECH',
  2: 'LEGAL',
  3: 'MARKET',
  4: 'HEALTH',
  5: 'CAREER',
  6: 'FINANCE',
};

// Legacy abbr map retained for any existing consumers
export const DOMAIN_ABBR = {
  technology: 'TECH', capital: 'CAPI', knowledge: 'KNOW',
  labor: 'LABO', media: 'MEDI', ownership: 'OWNE',
  TECH: 'TECH', LEGAL: 'LEGL', MARKET: 'MRKT',
  HEALTH: 'HLTH', CAREER: 'CARR', FINANCE: 'FINC',
};

// domain is now MUTABLE — operator can cycle to any registry value
const initBay = (id) => ({
  id,
  domain:      BAY_DOMAINS[id],
  assignment:  null,
  viewMode:    'cone',
  xrayOpen:    false,
  frozen:      false,            // WO-1347: bay locked — no live signal updates
  compareFlag: false,            // WO-1347: flagged for cross-bay comparison
  candidates:  [],
});

export const useBayStore = create((set) => ({
  bays: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map(id => [id, initBay(id)])
  ),

  // candidateCache — per-domain history of previously added items (for quick re-add)
  candidateCache: {},
  // domainCandidates — active candidates per domain { [domain]: [{id, text}] }
  domainCandidates: {},

  // pendingAssignment — set by search/submit, cleared after modal dispatch
  pendingAssignment: null,

  // hoveredBay — bay number currently hovered in bay picker (null when none)
  hoveredBay: null,
  setHoveredBay: (id) => set({ hoveredBay: id }),

  // ASSIGN_TO_BAY: overlay signal on domain, reset projection state
  assignToBay: (bayId, signal) => set(s => ({
    bays: {
      ...s.bays,
      [bayId]: { ...s.bays[bayId], assignment: signal, viewMode: 'cone', xrayOpen: false },
    },
    pendingAssignment: null,
  })),

  // CLEAR_BAY: remove assignment + reset projection — domain never touched
  clearBay: (bayId) => set(s => ({
    bays: {
      ...s.bays,
      [bayId]: { ...s.bays[bayId], assignment: null, viewMode: 'cone', xrayOpen: false },
    },
  })),

  // SET_BAY_VIEW: switch cone ↔ signalmap projection
  setBayView: (bayId, viewMode) => set(s => ({
    bays: { ...s.bays, [bayId]: { ...s.bays[bayId], viewMode } },
  })),

  // TOGGLE_XRAY: open/close decomposition overlay
  toggleXray: (bayId) => set(s => ({
    bays: { ...s.bays, [bayId]: { ...s.bays[bayId], xrayOpen: !s.bays[bayId].xrayOpen } },
  })),

  // ADD_CANDIDATE: domain-keyed, no bay dependency
  addCandidate: (domain, text) => set(s => {
    const candidate = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text };
    const existing = s.candidateCache[domain] ?? [];
    const cached = existing.some(c => c.text === text) ? existing : [...existing, { text }];
    const current = s.domainCandidates[domain] ?? [];
    return {
      candidateCache:    { ...s.candidateCache,    [domain]: cached },
      domainCandidates:  { ...s.domainCandidates,  [domain]: [...current, candidate] },
    };
  }),

  // REMOVE_CANDIDATE: domain-keyed, cache retained
  removeCandidate: (domain, candidateId) => set(s => {
    const current = s.domainCandidates[domain] ?? [];
    return {
      domainCandidates: {
        ...s.domainCandidates,
        [domain]: current.filter(c => c.id !== candidateId),
      },
    };
  }),

  // WO-1347: TOGGLE_FREEZE — lock/unlock bay against live signal updates
  toggleFreeze: (bayId) => set(s => ({
    bays: { ...s.bays, [bayId]: { ...s.bays[bayId], frozen: !s.bays[bayId].frozen } },
  })),

  // WO-1347: TOGGLE_COMPARE — flag/unflag bay for cross-bay comparison
  toggleCompare: (bayId) => set(s => ({
    bays: { ...s.bays, [bayId]: { ...s.bays[bayId], compareFlag: !s.bays[bayId].compareFlag } },
  })),

  // SET_BAY_DOMAIN: mutate domain orientation — cycles through DOMAIN_REGISTRY
  setBayDomain: (bayId, targetDomain) => set(s => ({
    bays: { ...s.bays, [bayId]: { ...s.bays[bayId], domain: targetDomain } },
  })),

  setPendingAssignment: (signal) => set({ pendingAssignment: signal }),

  // CONE_COLOR_OVERRIDE: per-bay color selection propagated to 3D scene
  coneColorOverrides: {},
  setConeColor: (bayNum, color) => set(s => ({
    coneColorOverrides: { ...s.coneColorOverrides, [bayNum]: color },
  })),
  clearPendingAssignment: () => set({ pendingAssignment: null }),
}));
