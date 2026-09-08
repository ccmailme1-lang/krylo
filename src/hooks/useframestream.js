// src/hooks/useframestream.js
// WO-1093 — SSE frame stream consumer with backpressure signaling

import { useState, useEffect, useRef, useCallback } from 'react';
import { decodeSignalBatch, fromBase64 }            from '../../core/codec/signal-bridge';

const SLOW_LAG_MS    = 600;   // signal 'slow' if lag exceeds this
const RECOVER_LAG_MS = 150;   // signal 'normal' once lag drops below this
const PRESSURE_DEBOUNCE_MS = 2000;

// 2026-09-08 — EventSource has no built-in retry cap: left alone, a target that never accepts
// the connection retries forever (confirmed live: 800+ reconnect-driven state updates in
// minutes, cascading re-renders through the whole App tree including the cone Canvas). Managing
// reconnection manually here instead of relying on the browser's native auto-reconnect, so it
// gives up after a bounded number of attempts rather than retrying indefinitely.
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2000; // doubles each attempt: 2s, 4s, 8s, 16s, 32s

export function useframestream({ enabled = false } = {}) {
    const [latest,       setLatest]       = useState(null);
    const [pressure,     setPressure]     = useState(null);
    const [lagMs,        setLagMs]        = useState(0);
    const [stats,        setStats]        = useState({ received: 0, decoded: 0, errors: 0 });
    const [domainScores, setDomainScores] = useState(null);
    const [streamState,  setStreamState]  = useState('connecting'); // 'connecting' | 'open' | 'gave-up'

    const esRef          = useRef(null);
    const clientLevel    = useRef('normal');
    const pressureTimer  = useRef(null);
    const retryCountRef  = useRef(0);
    const reconnectTimer = useRef(null);

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
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;
            setStreamState('connecting');

            const es = new EventSource('/api/signals/stream');
            esRef.current = es;

            es.addEventListener('pressure', (e) => {
                try { setPressure(JSON.parse(e.data)); } catch { /* ignore */ }
            });

            es.addEventListener('domain', (e) => {
                try { setDomainScores(JSON.parse(e.data)); } catch { /* ignore */ }
            });

            es.onopen = () => {
                retryCountRef.current = 0; // connection succeeded -- reset the backoff counter
                setStreamState('open');
            };

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
                // Close explicitly -- this stops the browser's own infinite native auto-reconnect.
                // Reconnection past this point is entirely manual, capped, and backed off below.
                es.close();
                if (cancelled) return;

                sendPressure('normal');
                setStats(s => ({ ...s, errors: s.errors + 1 }));

                retryCountRef.current += 1;
                if (retryCountRef.current > MAX_RECONNECT_ATTEMPTS) {
                    console.warn(`[useframestream] giving up after ${MAX_RECONNECT_ATTEMPTS} failed reconnect attempts -- /api/signals/stream unreachable.`);
                    setStreamState('gave-up');
                    return;
                }
                const delay = RECONNECT_BASE_DELAY_MS * (2 ** (retryCountRef.current - 1));
                reconnectTimer.current = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            cancelled = true;
            esRef.current?.close();
            clearTimeout(pressureTimer.current);
            clearTimeout(reconnectTimer.current);
        };
    }, [enabled, sendPressure]);

    return { latest, pressure, lagMs, stats, domainScores, streamState };
}
