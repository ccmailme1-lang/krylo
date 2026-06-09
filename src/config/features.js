// src/config/features.js
// Feature Flag Registry — KRYLO Friday Build
// All flags default false. Flip to true to activate, false to disable. No rollbacks needed.

export const FEATURES = {
  FORENSIC_LEGEND: true, // WO-507: Tiered signal score legend (L2 — OracleView)
  GEOCENTRIC_MAP:  true, // WO-600: 4-city video ground plane (L4 — SignalMap)
  THREE_RING_NODES: true, // WO-601: Concentric ring node expression (L4 — SignalMap)
  VERTICAL_STALKS:  false, // WO-603: Node-to-floor anchor lines (L4 — SignalMap) — disabled WO-817
  SOVEREIGN_DRIFT:  true, // WO-816: Ghost Node drift on Headline→Hidden Drag toggle (L4 — SignalMap + PersonaProxy)
};
