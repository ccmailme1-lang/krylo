// WO-2019 — PubMed Connector
// Research publication count for a topic (last 12 months).
// Formula: min(100, result_count / 500 × 100)
// Domain: KNOWLEDGE

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runPubmedSync(topic) {
  try {
    const res = await fetch(`/api/pubmed?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const count = parseInt(data.esearchresult?.count ?? '0', 10);

    const signal = clamp(Math.round(Math.min(100, (count / 500) * 100)), 0, 100);
    const conf   = clamp(0.4 + Math.min(1, count / 200) * 0.5, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'PUBMED', domain: 'KNOWLEDGE', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.QUARTERLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'PUBMED', domain: 'KNOWLEDGE', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
