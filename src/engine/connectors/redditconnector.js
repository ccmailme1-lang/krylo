// WO-2019 — Reddit Connector
// Post velocity × upvote quality for a topic (last 24h).
// Formula: min(100, (post_count × avgUpvoteRatio / 50) × 100)
// Domain: MEDIA

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runRedditSync(topic) {
  try {
    const res = await fetch(`/api/reddit-search?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const posts = data.data?.children ?? [];
    const count = posts.length;
    const avgRatio = count
      ? posts.reduce((s, p) => s + (p.data?.upvote_ratio ?? 0.5), 0) / count
      : 0;

    const signal = clamp(Math.round(Math.min(100, (count * avgRatio / 50) * 100)), 0, 100);
    const conf   = clamp(0.3 + Math.min(1, count / 25) * 0.5, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'REDDIT', domain: 'MEDIA', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.DAILY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'REDDIT', domain: 'MEDIA', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
