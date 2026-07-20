// src/hooks/useEntitySignal.js
// KRYL-1085 — absence is an explicit classified state (§22), never a placeholder number.
// Previously this hook seeded { pressure: 42, volatility: 0.38 } and kept those values on
// failure, so an unresolved entity rendered identically to a live reading. It now returns
// null values plus a status; consumers must gate on RESOLVED before displaying anything.
import { useState, useEffect, useCallback } from 'react';

export const ENTITY_SIGNAL_STATUS = Object.freeze({
  ABSENT:      'ABSENT',       // no entity bound — structural absence
  PENDING:     'PENDING',      // request in flight — temporal absence
  RESOLVED:    'RESOLVED',     // live reading returned
  UNAVAILABLE: 'UNAVAILABLE',  // fetch failed or payload incomplete — anomalous absence
});

const unresolved = (status) => ({ pressure: null, volatility: null, status });

export function useEntitySignal(title) {
  const [signal, setSignal] = useState(() =>
    unresolved(title ? ENTITY_SIGNAL_STATUS.PENDING : ENTITY_SIGNAL_STATUS.ABSENT));
  const [error, setError] = useState(null);

  const resolveEntitySignal = useCallback(async (entityTitle) => {
    setError(null);

    if (!entityTitle) {
      setSignal(unresolved(ENTITY_SIGNAL_STATUS.ABSENT));
      return;
    }

    setSignal(unresolved(ENTITY_SIGNAL_STATUS.PENDING));

    try {
      const res = await fetch(`/api/signals/entity?q=${encodeURIComponent(entityTitle)}`);

      if (!res.ok) throw new Error(`Signal fetch failed: ${res.status}`);

      const data = await res.json();

      // A missing field is not a reading. No `?? 42` defaults — an incomplete payload
      // is UNAVAILABLE, same as a failed request.
      if (typeof data?.pressure !== 'number' || typeof data?.volatility !== 'number') {
        throw new Error('Incomplete signal payload');
      }

      setSignal({
        pressure:   Math.max(0, Math.min(100, data.pressure)),
        volatility: Math.max(0, Math.min(1,   data.volatility)),
        status:     ENTITY_SIGNAL_STATUS.RESOLVED,
      });
    } catch (err) {
      console.warn(`[EntitySignal] Unresolved for "${entityTitle}"`, err);
      setError(err.message);
      setSignal(unresolved(ENTITY_SIGNAL_STATUS.UNAVAILABLE));
    }
  }, []);

  useEffect(() => {
    resolveEntitySignal(title);
  }, [title, resolveEntitySignal]);

  return {
    ...signal,
    loading:  signal.status === ENTITY_SIGNAL_STATUS.PENDING,
    resolved: signal.status === ENTITY_SIGNAL_STATUS.RESOLVED,
    error,
    resolveEntitySignal,
  };
}
