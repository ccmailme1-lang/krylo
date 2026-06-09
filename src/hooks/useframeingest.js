// src/hooks/useframeingest.js
// WO-1090 — ABI frame ingestion hook: decode boundary before dispatch to surfaces

import { useState, useEffect, useCallback } from 'react';
import { decodeSignalBatch, fromBase64 } from '../../core/codec/signal-bridge';

export function useframeingest(query) {
    const [signals,   setSignals]   = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [latencyMs, setLatencyMs] = useState(null);

    const fetchFrames = useCallback(async (q) => {
        if (!q) { setSignals([]); return; }
        setLoading(true);
        const t0 = performance.now();
        try {
            const res = await fetch('/api/signals/frames', {
                method:  'POST',
                headers: { 'content-type': 'application/json' },
                body:    JSON.stringify({ query: q }),
            });
            if (res.status === 404) { setSignals([]); return; }
            if (!res.ok) throw new Error(`/api/signals/frames ${res.status}`);
            const { frame } = await res.json();
            const decoded = decodeSignalBatch(fromBase64(frame));
            const ms = performance.now() - t0;
            setLatencyMs(Math.round(ms));
            setSignals(decoded);
            console.log(`[WO-1090] ${decoded.length} events decoded, ${ms.toFixed(1)}ms`);
        } catch (err) {
            console.warn('[WO-1090] frame ingest fallback:', err.message);
            setSignals([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFrames(query); }, [query, fetchFrames]);

    return { signals, loading, latencyMs };
}
