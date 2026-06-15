// WO-1744 — TEP Adapter Layer
// Bridges domain engines (WO-1726, WO-1734, WO-1743) to TEP node format.
// TEP core (tep.js) stays domain-free — all signal logic is isolated here.
//
// Architecture: Option A (LOCKED). No domain imports in tep.js. Ever.

import { detectWeakSignals }   from './weaksignaldetector.js';
import { analyzeNonConsensus } from './nonconsensusdetector.js';
import { META_SIGNALS }        from './metasignals.js';

// Tier constants — coarse linting only, not execution order (see KNOWN_LIMITATIONS.md)
export const TIER = {
  RAW:           0,
  WEAK:          1,
  NON_CONSENSUS: 2,
  META:          3,
  SYNTHESIS:     4,
};

// ── Node: WEAK_SIGNAL_DETECTOR ────────────────────────────────────────────────
// WO-1726. Reads raw signals, classifies below-threshold + velocity-rising signals.
export function makeWeakSignalNode() {
  return {
    id:   'WEAK_SIGNAL_DETECTOR',
    tier: TIER.WEAK,
    contract: {
      read:  ['raw.signals'],
      write: ['weak'],
    },
    execute(ctx) {
      const result = detectWeakSignals(ctx.raw.signals);
      return { patch: { weak: result } };
    },
  };
}

// ── Node: NON_CONSENSUS_ANALYZER ─────────────────────────────────────────────
// WO-1734. Reads emerging signals + raw signals, computes divergence + classification.
// Depends on WEAK node having run first (enforced by read contract on weak.emergingSignals).
export function makeNonConsensusNode() {
  return {
    id:   'NON_CONSENSUS_ANALYZER',
    tier: TIER.NON_CONSENSUS,
    contract: {
      read:  ['weak.emergingSignals', 'raw.signals'],
      write: ['nonConsensus'],
    },
    execute(ctx) {
      const result = analyzeNonConsensus(ctx.weak.emergingSignals, ctx.raw.signals);
      return { patch: { nonConsensus: result } };
    },
  };
}

// ── Node: META_SIGNAL_REGISTRY ────────────────────────────────────────────────
// WO-1743. Reads nonConsensus state, writes meta slot with registry snapshot.
// No trigger logic here — meta-signal trigger definitions live in metasignals.js only.
export function makeMetaSignalNode() {
  return {
    id:   'META_SIGNAL_REGISTRY',
    tier: TIER.META,
    contract: {
      read:  ['nonConsensus'],
      write: ['meta'],
    },
    execute(ctx) {
      const nc = ctx.nonConsensus;
      return {
        patch: {
          meta: {
            registryVersion:     META_SIGNALS.PLATFORM_FORMATION.version,
            ncClassification:    nc?.classification                 ?? null,
            ncConsensusDelta:    nc?.consensusDelta                 ?? null,
            crossDomainDetected: nc?.crossDomainEmergenceDetected   ?? false,
            consensusArriving:   nc?.consensusArriving              ?? false,
            availableSignals:    Object.keys(META_SIGNALS),
            ts:                  Date.now(),
          },
        },
      };
    },
  };
}

// ── Default pipeline ──────────────────────────────────────────────────────────
// Standard three-node sequence: WEAK → NC → META.
// Callers may build custom pipelines by composing node factories directly.
export function buildDefaultPipeline() {
  return [
    makeWeakSignalNode(),
    makeNonConsensusNode(),
    makeMetaSignalNode(),
  ];
}
