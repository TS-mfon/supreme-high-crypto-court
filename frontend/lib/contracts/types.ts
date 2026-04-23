import type { JudgeId } from "../judges";

export type JudgeEvaluation = {
  score: number;
  reasoning: string;
  key_point: string;
  verdict_word: string;
  quantitative_axes?: QuantitativeAxes;
};

export type QuantitativeAxes = {
  innovation: number;
  execution: number;
  decentralization: number;
  adoption: number;
  strategic_fit: number;
};

export type ComprehensiveNarrative = {
  decision_basis: string;
  why_rejected: string[];
  improvements: string[];
  suggestions: string[];
};

export type MarketNarrative = {
  sentiment_take: string;
  market_risks: string[];
  market_opportunities: string[];
  timing_note: string;
};

export type MarketSnapshot = {
  market_mood: string;
  market_cap_signal: number;
  volume_signal: number;
  top_assets: Record<string, { price: number; range_position: number }>;
};

export type AnalysisMode = "standard" | "critical" | "comprehensive" | "market";

export type CourtCase = {
  case_id: number;
  submitter: string;
  case_text: string;
  analysis_mode: AnalysisMode;
  evaluations: Record<JudgeId, JudgeEvaluation>;
  quant_summary?: QuantitativeAxes | null;
  narrative_summary?: ComprehensiveNarrative | MarketNarrative | null;
  market_snapshot?: MarketSnapshot | null;
  final_score: number;
  verdict: string;
  created_at: string;
};

export type CourtCaseSummary = {
  case_id: number;
  submitter: string;
  analysis_mode: AnalysisMode;
  case_preview: string;
  final_score: number;
  verdict: string;
  created_at: string;
};

export type RecoveredCourtCase = {
  case_id: number | null;
  case_text: string;
  analysis_mode: AnalysisMode;
  evaluations: Record<JudgeId, JudgeEvaluation>;
  quant_summary?: QuantitativeAxes | null;
  narrative_summary?: ComprehensiveNarrative | MarketNarrative | null;
  market_snapshot?: MarketSnapshot | null;
  final_score: number;
  verdict: string;
  created_at: string;
  crypto_relevance_reason?: string;
  is_crypto_case?: boolean;
};

export type TransactionReceipt = {
  status?: number;
  statusName?: string;
  data?: Record<string, unknown>;
  txDataDecoded?: Record<string, unknown>;
  hash?: string;
  txId?: string;
  consensus_data?: {
    leader_receipt?: Array<Record<string, any>>;
    votes?: Record<string, string>;
  };
  [key: string]: unknown;
};
