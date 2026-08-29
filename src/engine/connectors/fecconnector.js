// WO-2039B — FEC Campaign Finance Signal Connector
// Signal: number of active PAC committees filing this election cycle
// Domain:  CAPITAL only (total money in motion → structural pressure on policy/markets)
// Formula: min(100, count / 5000 × 100)  [5000 active PACs = peak cycle]
// Decay: QUARTERLY — cycle-level filing activity changes over weeks not days
//
// WO-1 (2026-08-29): the MEDIA dispatch was `CAPITAL signal × 0.85` — a rescaled
// relabel of a CAPITAL-domain variable (PAC committee count), not an independent
// MEDIA observation. That fails the shared-source distinct-facet AC
// (specs/SPEC-domain-substrate-integration-contract.md). Removed. A real FEC→MEDIA
// facet needs the independent-expenditure / ad-spend endpoint (Class D, not wired).

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runFecSync() {
  const ts = Date.now();
  try {
    const res = await fetch('/api/fec');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // pagination.count = total PAC committees with filings this cycle
    const count = json?.pagination?.count ?? 0;

    // One CAPITAL signal from the PAC committee count. (No MEDIA dispatch — see header.)
    const signal = clamp(Math.round(Math.min(100, (count / 5000) * 100)), 0, 100);

    surfaceRouter.dispatchBatch([
      {
        source: 'FEC', domain: 'CAPITAL', signal,
        confidence: 0.70, ts, decay: DECAY.QUARTERLY,
        polarity: signal >= 30 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      },
    ]);
    return { count, signal };
  } catch {
    surfaceRouter.dispatchBatch([
      { source: 'FEC', domain: 'CAPITAL', signal: 0, confidence: 0, ts },
    ]);
    return null;
  }
}
