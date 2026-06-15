// WO-1744 — TEP Context Schema v1
// The single accumulator that flows through the TEP pipeline.
// Each slot is owned by exactly one node (enforced by write contracts in tepbindings.js).
//
// Slot ownership:
//   raw          — provided by caller (pipeline entry point)
//   weak         — WEAK_SIGNAL_DETECTOR (WO-1726)
//   nonConsensus — NON_CONSENSUS_ANALYZER (WO-1734)
//   meta         — META_SIGNAL_REGISTRY (WO-1743)

// ── Primitive types ───────────────────────────────────────────────────────────

export interface Signal {
  domain:      string;
  signal:      number;    // 0–100 pressure score
  confidence:  number;    // 0–1
  source?:     string;
  ts?:         number;    // epoch ms
}

export interface WeakSignal extends Signal {
  slope:         number;
  _epistemicTier: 'WEAK';
  promotable:    false;
}

export interface EmergingSignal extends WeakSignal {
  _emergingFlag: true;
}

export type NCClassification = 'DIVERGING' | 'CONVERGING' | 'AMBIGUOUS';

// ── Slot definitions ──────────────────────────────────────────────────────────

// Provided by caller — minimum viable pipeline entry
export interface RawSlot {
  signals: Signal[];
}

// Written by WEAK_SIGNAL_DETECTOR
export interface WeakSlot {
  weakSignals:     WeakSignal[];
  emergingSignals: EmergingSignal[];
}

// Written by NON_CONSENSUS_ANALYZER
export interface NonConsensusSlot {
  crossDomainEmergenceDetected: boolean;
  emergingDomains:              string[];
  knowledgeAlignment:           number;
  capitalAlignment:             number;
  consensusDelta:               number;
  gapOpenMs:                    number;
  populationAgreement:          number;
  classification:               NCClassification;
  consensusArriving:            boolean;
  _epistemicTier:               'NC';
}

// Written by META_SIGNAL_REGISTRY
export interface MetaSlot {
  registryVersion:     string;
  ncClassification:    NCClassification | null;
  ncConsensusDelta:    number | null;
  crossDomainDetected: boolean;
  consensusArriving:   boolean;
  availableSignals:    string[];
  ts:                  number;
}

// ── Root context ──────────────────────────────────────────────────────────────

export interface TepContext {
  raw:            RawSlot;           // Always required
  weak?:          WeakSlot;          // Present after WEAK_SIGNAL_DETECTOR
  nonConsensus?:  NonConsensusSlot;  // Present after NON_CONSENSUS_ANALYZER
  meta?:          MetaSlot;          // Present after META_SIGNAL_REGISTRY
}

// ── Node contract type ────────────────────────────────────────────────────────

export interface NodeContract {
  read:  string[];   // dot-notation paths that must exist in ctx before execution
  write: string[];   // top-level slot keys this node is permitted to write
}

export interface TEPNode {
  id:       string;
  tier:     number;
  contract: NodeContract;
  execute:  (ctx: TepContext) => { patch: Partial<TepContext> };
}

// ── Trace entry ───────────────────────────────────────────────────────────────

export interface TraceEntry {
  nodeId:     string;
  tier:       number | null;
  durationMs: number;
  input:      TepContext;
  output:     Partial<TepContext>;
}
