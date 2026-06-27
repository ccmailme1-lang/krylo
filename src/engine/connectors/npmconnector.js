// WO-2019 — npm Connector
// Package ecosystem activity for a topic via registry search.
// Formula: blend of result count and average popularity score → 0-100
// Domain: TECHNOLOGY

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runNpmSync(topic) {
  try {
    const res = await fetch(`/api/npm?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data    = await res.json();
    const total   = data.total ?? 0;
    const objects = data.objects ?? [];
    const avgPop  = objects.length
      ? objects.reduce((s, o) => s + (o.score?.detail?.popularity ?? 0), 0) / objects.length
      : 0;

    // Blend: 60% count density (capped at 500 pkgs), 40% popularity
    const countScore = Math.min(100, (total / 500) * 100);
    const popScore   = avgPop * 100;
    const signal     = clamp(Math.round(0.60 * countScore + 0.40 * popScore), 0, 100);
    const conf       = clamp(0.3 + Math.min(1, total / 200) * 0.6, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'NPM', domain: 'TECHNOLOGY', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.WEEKLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'NPM', domain: 'TECHNOLOGY', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
