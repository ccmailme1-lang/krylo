// WO-1331 — Viewport State Mutator
// Deterministic panel opacity + active_component assignment from normalized ingress payload.
// No UI rendering. Returns calculated state only.

const PANEL_MAP = {
  negotiation:  { LABO: { opacity: 1.0 }, TECH: { opacity: 0.2 }, active_component: 'VerdictDashboard' },
  investment:   { LABO: { opacity: 0.2 }, TECH: { opacity: 0.9 }, active_component: 'SignalMap' },
  realestate:   { LABO: { opacity: 0.1 }, TECH: { opacity: 0.4 }, active_component: 'SignalMap' },
  sales:        { LABO: { opacity: 0.3 }, TECH: { opacity: 0.5 }, active_component: 'SignalMap' },
  general:      { LABO: { opacity: 0.2 }, TECH: { opacity: 0.2 }, active_component: 'UNKNOWN'   },
};

export async function calculateViewportState(payload) {
  if (!payload?.valid) {
    return {
      panels: { LABO: { opacity: 0 }, TECH: { opacity: 0 } },
      active_component: 'UNKNOWN',
    };
  }

  const config = PANEL_MAP[payload.domain] ?? PANEL_MAP.general;

  return {
    panels: {
      LABO: { opacity: config.LABO.opacity },
      TECH: { opacity: config.TECH.opacity },
    },
    active_component: config.active_component,
  };
}
