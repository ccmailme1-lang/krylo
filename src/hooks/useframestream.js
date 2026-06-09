// src/hooks/useframestream.js
// WO-1093 — SSE frame stream consumer with backpressure signaling

import { useState, useEffect, useRef, useCallback } from 'react';
import { decodeSignalBatch, fromBase64 }            from '../../core/codec/signal-bridge';

const SLOW_LAG_MS    = 600;   // signal 'slow' if lag exceeds this
const RECOVER_LAG_MS = 150;   // signal 'normal' once lag drops below this
const PRESSURE_DEBOUNCE_MS = 2000;

export function useframestream({ enabled = false } = {}) {
    const [latest,       setLatest]       = useState(null);
    const [pressure,     setPressure]     = useState(null);
    const [lagMs,        setLagMs]        = useState(0);
    const [stats,        setStats]        = useState({ received: 0, decoded: 0, errors: 0 });
    const [domainScores, setDomainScores] = useState(null);

    const esRef         = useRef(null);
    const clientLevel   = useRef('normal');
    const pressureTimer = useRef(null);

    const sendPressure = useCallback((level) => {
        if (level === clientLevel.current) return;
        clientLevel.current = level;
        clearTimeout(pressureTimer.current);
        pressureTimer.current = setTimeout(() => {
            fetch('/api/signals/pressure', {
                method:  'POST',
                headers: { 'content-type': 'application/json' },
                body:    JSON.stringify({ level }),
            }).catch(() => {});
        }, PRESSURE_DEBOUNCE_MS);
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const es = new EventSource('/api/signals/stream');
        esRef.current = es;

        es.addEventListener('pressure', (e) => {
            try { setPressure(JSON.parse(e.data)); } catch { /* ignore */ }
        });

        es.addEventListener('domain', (e) => {
            try { setDomainScores(JSON.parse(e.data)); } catch { /* ignore */ }
        });

        es.onmessage = (e) => {
            try {
                const { frame, lagMs: serverLag, pressure: p } = JSON.parse(e.data);
                const t0 = performance.now();
                const signals = decodeSignalBatch(fromBase64(frame));
                const decodeMs = performance.now() - t0;
                const totalLag = serverLag + decodeMs;

                setLatest(signals);
                setLagMs(Math.round(totalLag));
                if (p) setPressure(p);

                setStats(s => ({ received: s.received + 1, decoded: s.decoded + 1, errors: s.errors }));

                // Backpressure: signal server based on observed lag
                if (totalLag > SLOW_LAG_MS)       sendPressure('slow');
                else if (totalLag < RECOVER_LAG_MS) sendPressure('normal');

            } catch {
                setStats(s => ({ ...s, errors: s.errors + 1 }));
            }
        };

        es.onerror = () => {
            // EventSource auto-reconnects; reset client pressure on reconnect
            sendPressure('normal');
        };

        return () => {
            es.close();
            clearTimeout(pressureTimer.current);
        };
    }, [enabled, sendPressure]);

    return { latest, pressure, lagMs, stats, domainScores };
}
