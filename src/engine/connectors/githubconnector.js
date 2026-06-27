// WO-2019 — GitHub Connector
// Structural open-source activity signal for a topic.
// Formula: 0.40×normLog(repoCount,6) + 0.35×normLog(avgStars,5) + 0.25×recencyRate → 0-100
// Domain: TECHNOLOGY

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function normLog(n, maxOOM) { return Math.min(1, Math.log10(Math.max(n, 1)) / maxOOM); }

export async function runGithubSync(topic) {
  try {
    const res = await fetch(`/api/github?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const repoCount = data.total_count ?? 0;
    const items     = data.items ?? [];
    const avgStars  = items.length
      ? items.reduce((s, r) => s + (r.stargazers_count ?? 0), 0) / items.length
      : 0;
    const cutoff    = Date.now() - 7 * 86_400_000;
    const recent    = items.filter(r => r.pushed_at && new Date(r.pushed_at).getTime() > cutoff).length;
    const recency   = items.length ? recent / items.length : 0;

    const raw    = 0.40 * normLog(repoCount, 6) + 0.35 * normLog(avgStars, 5) + 0.25 * recency;
    const signal = clamp(Math.round(raw * 100), 0, 100);
    const conf   = clamp(0.4 + Math.min(1, repoCount / 1000) * 0.5, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'GITHUB', domain: 'TECHNOLOGY', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.DAILY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'GITHUB', domain: 'TECHNOLOGY', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
