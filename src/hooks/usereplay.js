// src/hooks/usereplay.js
// WO-1091 — Time-travel: decode persisted frame log, expose seek interface

import { useState, useCallback, useEffect } from 'react';
import { decodeSignalBatch, fromBase64 }    from '../../core/codec/signal-bridge';

export function usereplay(autoLoad = false) {
    const [history,      setHistory]      = useState([]); // EtrSignal[][]
    const [currentIndex, setCurrentIndex] = useState(0);
    const [total,        setTotal]        = useState(0);
    const [loading,      setLoading]      = useState(false);

    const load = useCallback(async (limit = 100) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/signals/replay?limit=${limit}`);
            if (!res.ok) throw new Error(`/api/signals/replay ${res.status}`);
            const { frames, total: t } = await res.json();
            const decoded = frames.map(entry => {
                try { return { signals: decodeSignalBatch(fromBase64(entry.frame)), seq: entry.seq, ts: entry.ts, compliance: entry.compliance }; }
                catch { return { signals: [], seq: entry.seq, ts: entry.ts, compliance: 'INVALID' }; }
            });
            setHistory(decoded);
            setTotal(t);
            setCurrentIndex(Math.max(0, decoded.length - 1));
        } catch (err) {
            console.warn('[WO-1091] replay load failed:', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const seek = useCallback((n) => {
        setCurrentIndex(prev => Math.max(0, Math.min(history.length - 1, n)));
    }, [history.length]);

    useEffect(() => { if (autoLoad) load(); }, [autoLoad, load]);

    const current = history[currentIndex] ?? { signals: [], seq: null, ts: null, compliance: null };

    return { history, currentIndex, current, seek, total, loading, load };
}
