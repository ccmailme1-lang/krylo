// WO-2019 — GDELT Connector
// Article volume for a topic in the last 24 hours.
// Formula: min(100, article_count / 200 × 100)
// Domain: MEDIA

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runGdeltSync(topic) {
  try {
    const res = await fetch(`/api/gdelt-doc?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data     = await res.json();
    const articles = data.articles ?? [];
    const count    = articles.length;

    // Weight by tone (negative tone = structural fracture signal)
    const avgTone  = articles.length
      ? articles.reduce((s, a) => s + (parseFloat(a.tone ?? '0') || 0), 0) / articles.length
      : 0;
    const signal   = clamp(Math.round(Math.min(100, (count / 200) * 100)), 0, 100);
    const polarity = avgTone >= 0 ? POLARITY.POSITIVE : POLARITY.NEGATIVE;
    const conf     = clamp(0.3 + Math.min(1, count / 100) * 0.6, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'GDELT', domain: 'MEDIA', signal, confidence: conf,
      ts: Date.now(), polarity, decay: DECAY.DAILY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'GDELT', domain: 'MEDIA', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
