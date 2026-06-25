// src/engine/aggregation.js
// WO-1101 — Aggregation Layer
// Pure function: liveSignals[] → ConeState[]
// Stateless. No history. No frame dependency. Same input = identical output.

/**
 * @param {Array<{ domain: string, leverage: number, volatility: number }>} signals
 * @returns {Array<{ domain: string, pressure: number, volatility: number }>}
 */
export function aggregateSignals(signals = []) {
  const buckets = {};

  for (const sig of signals) {
    const domain = sig.domain ?? 'unknown';
    if (!buckets[domain]) buckets[domain] = [];
    buckets[domain].push(sig);
  }

  return Object.entries(buckets).map(([domain, sigs]) => {
    const count = sigs.length;
    const avgLeverage  = sigs.reduce((s, x) => s + (x.leverage  ?? 0), 0) / count;
    const avgVolatility = sigs.reduce((s, x) => s + (x.volatility ?? 0), 0) / count;

    const pressure = Math.min(100, Math.max(0, avgLeverage));

    return {
      domain,
      pressure,
      volatility: Math.min(1, Math.max(0, avgVolatility)),
    };
  });
}
