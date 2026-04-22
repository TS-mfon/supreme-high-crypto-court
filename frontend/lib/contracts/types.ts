import type { JudgeId } from "../judges";

export type JudgeEvaluation = {
  score: number;
  reasoning: string;
  key_point: string;
  verdict_word: string;
};

export type CourtCase = {
  case_id: number;
  submitter: string;
  case_text: string;
  evaluations: Record<JudgeId, JudgeEvaluation>;
  final_score: number;
  verdict: string;
  created_at: string;
};

export type CourtCaseSummary = {
  case_id: number;
  submitter: string;
  case_preview: string;
  final_score: number;
  verdict: string;
  created_at: string;
};

export type RecoveredCourtCase = {
  case_id: number | null;
  case_text: string;
  evaluations: Record<JudgeId, JudgeEvaluation>;
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
