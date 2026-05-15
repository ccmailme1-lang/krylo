export interface TruthComment {
  id: string;
  text: string;
  source: string;
  date: string; // YYYY-MM-DD
}

export interface TruthData {
  signal_score: number;
  truth_statement: string;
  truth_supporting: string;
  definition: string;
  origin: string;
  usage: string;
  comments: TruthComment[];
  signals: any[];
  patterns: any[];
  tags: string[];
  ground: Record<string, any>;
}

export const FALLBACK_DATA: TruthData = {
  signal_score: 0,
  truth_statement: "SYSTEM SAFE MODE: API UNAVAILABLE",
  truth_supporting: "The Truth Engine is operating on local heuristics due to a connection drop.",
  definition: "Signal definition unavailable.",
  origin: "—",
  usage: "—",
  comments: [],
  signals: [],
  patterns: [],
  tags: ["safe-mode", "local"],
  ground: { source: "internal-recovery" }
} as const;
