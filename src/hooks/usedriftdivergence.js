// usedriftdivergence.js — KRYL-1052: compute DRIFT per domain, OUTSIDE the R3F Canvas.
//
// For each cone: build the STRUCTURAL facet (from the cone's own pressure) + capture the
// NARRATIVE facet (GDELT), then run computeDivergence — which routes through the full
// admission engine (independence · reproducibility · policy) before AS-DIFF. The result
// map { [domain]: divergenceResult } is threaded down to the cone HUD. A withheld result
// (missing narrative, shared lineage, failed admission) renders as AWAITING, never faked.

import { useEffect, useState } from 'react';
import { makeStructuralFacet, makeNarrativeFacet, captureNarrative, DOMAIN_TOPIC } from '../engine/facetproducers.js';
import { computeDivergence } from '../engine/signalfacet.js';

export function useDriftDivergence(coneState, active) {
  const [map, setMap] = useState({});

  // key the effect on the domain+pressure signature so it re-runs when the field moves,
  // not on every render (coneState is a fresh array each pass).
  const sig = active && coneState?.length
    ? coneState.map(c => `${c.domain}:${Math.round(c.pressure ?? 0)}`).join('|')
    : '';

  useEffect(() => {
    if (!active || !coneState?.length) { setMap({}); return; }
    let cancelled = false;
    // Populate each cone as its narrative resolves — the proxy serializes GDELT ≥5s apart,
    // so cones flip from AWAITING to grounded progressively rather than all at once.
    coneState.forEach(async (c) => {
      const domain     = c.domain;
      const structural = makeStructuralFacet({
        domain, intensity: c.pressure ?? 0, volatility: c.volatility ?? 0,
      });
      const observation = await captureNarrative(domain, DOMAIN_TOPIC[domain] ?? domain);
      if (cancelled) return;
      const narrative = makeNarrativeFacet({ domain, observation }); // null if no evidence
      const result    = computeDivergence('DRIFT', { STRUCTURAL: structural, NARRATIVE: narrative });
      setMap(prev => ({ ...prev, [domain]: result }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sig]);

  return map;
}
