export interface TruthData {
  signal_score: number;
  truth_statement: string;
  truth_supporting: string;
  signals: any[];
  patterns: any[];
  tags: string[];
  ground: Record<string, any>;
}

export const FALLBACK_DATA: TruthData = {
  signal_score: 0,
  truth_statement: "SYSTEM SAFE MODE: API UNAVAILABLE",
  truth_supporting: "The Truth Engine is operating on local heuristics due to a connection drop.",
  signals: [],
  patterns: [],
  tags: ["safe-mode", "local"],
  ground: { source: "internal-recovery" }
} as const;