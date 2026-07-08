// useDomainMetrics — read-only projection over domainmetricsstore.js.
// Per the [J] Join classification: NO calculation beyond what
// getDomainAverage() already does (simple averaging of already-computed
// real values), NO mutation, NO persistence. Selects the latest averaged
// snapshot for a domain and exposes it to the UI.
import { useState, useEffect, useCallback } from 'react';
import { getDomainAverage } from '../engine/domainmetricsstore.js';

export function useDomainMetrics(domainId) {
  const [data, setData] = useState(null);

  const refresh = useCallback(() => {
    if (!domainId) { setData(null); return; }
    setData(getDomainAverage(domainId));
  }, [domainId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, isLoading: false, refresh };
}
