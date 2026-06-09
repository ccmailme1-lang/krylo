// src/hooks/useEntitySignal.js (new)
import { useState, useEffect, useCallback } from 'react';

export function useEntitySignal(title) {
  const [signal, setSignal] = useState({ pressure: 42, volatility: 0.38, loading: true });
  const [error, setError] = useState(null);

  const resolveEntitySignal = useCallback(async (entityTitle) => {
    if (!entityTitle) {
      setSignal({ pressure: 42, volatility: 0.38, loading: false });
      return;
    }

    try {
      const res = await fetch(`/api/signals/entity?q=${encodeURIComponent(entityTitle)}`);

      if (!res.ok) throw new Error(`Signal fetch failed: ${res.status}`);

      const data = await res.json();

      setSignal({
        pressure: Math.max(0, Math.min(100, data.pressure ?? 42)),
        volatility: Math.max(0, Math.min(1, data.volatility ?? 0.38)),
        loading: false
      });
    } catch (err) {
      console.warn(`[EntitySignal] Failed for "${entityTitle}"`, err);
      setError(err.message);
      setSignal(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    resolveEntitySignal(title);
  }, [title, resolveEntitySignal]);

  return { ...signal, resolveEntitySignal };
}
