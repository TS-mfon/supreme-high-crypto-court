import { createClient, simplifyTransactionReceipt } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CourtCase, CourtCaseSummary, RecoveredCourtCase, TransactionReceipt } from "./types";
import type { JudgeId } from "../judges";

function toPlain(value: any): any {
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([key, item]) => [key, toPlain(item)]));
  }

  if (Array.isArray(value)) {
    return value.map(toPlain);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]));
  }

  return value;
}

function normalizeCase(value: any): CourtCase {
  const plain = toPlain(value);
  return {
    case_id: Number(plain.case_id),
    submitter: String(plain.submitter),
    case_text: String(plain.case_text),
    evaluations: plain.evaluations,
    final_score: Number(plain.final_score),
    verdict: String(plain.verdict),
    created_at: String(plain.created_at),
  };
}

function normalizeSummary(value: any): CourtCaseSummary {
  const plain = toPlain(value);
  return {
    case_id: Number(plain.case_id),
    submitter: String(plain.submitter),
    case_preview: String(plain.case_preview),
    final_score: Number(plain.final_score),
    verdict: String(plain.verdict),
    created_at: String(plain.created_at),
  };
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function normalizeRecoveredCase(value: any, caseText = ""): RecoveredCourtCase | null {
  if (!isObject(value) || !isObject(value.evaluations)) {
    return null;
  }

  return {
    case_id: value.case_id === undefined || value.case_id === null ? null : Number(value.case_id),
    case_text: typeof value.case_text === "string" ? value.case_text : caseText,
    evaluations: value.evaluations as Record<JudgeId, any>,
    final_score: Number(value.final_score ?? 0),
    verdict: String(value.verdict ?? "UNAVAILABLE"),
    created_at: String(value.created_at ?? "0"),
    crypto_relevance_reason:
      value.crypto_relevance_reason === undefined ? undefined : String(value.crypto_relevance_reason),
    is_crypto_case:
      typeof value.is_crypto_case === "boolean" ? value.is_crypto_case : undefined,
  };
}

function decodeRecoveredPayload(payload: unknown, caseText = ""): RecoveredCourtCase | null {
  if (isObject(payload) && "readable" in payload && typeof payload.readable === "string") {
    const readable = payload.readable.trim();
    const directJson = extractJsonObject(readable) ?? readable;

    try {
      return normalizeRecoveredCase(JSON.parse(directJson), caseText);
    } catch {
      return null;
    }
  }

  if (typeof payload === "string") {
    const directJson = extractJsonObject(payload) ?? payload;
    try {
      return normalizeRecoveredCase(JSON.parse(directJson), caseText);
    } catch {
      return null;
    }
  }

  if (isObject(payload)) {
    return normalizeRecoveredCase(payload, caseText);
  }

  return null;
}

function extractRecoveredCase(receipt: TransactionReceipt, caseText = ""): RecoveredCourtCase | null {
  const leaderReceipts = Array.isArray(receipt.consensus_data?.leader_receipt)
    ? receipt.consensus_data?.leader_receipt
    : [];

  for (const leaderReceipt of leaderReceipts) {
    if (!isObject(leaderReceipt?.eq_outputs)) {
      continue;
    }

    for (const value of Object.values(leaderReceipt.eq_outputs)) {
      const payload = isObject(value) && "payload" in value ? value.payload : value;
      const recovered = decodeRecoveredPayload(payload, caseText);
      if (recovered) {
        return recovered;
      }
    }
  }

  return null;
}

function extractCaseId(receipt: TransactionReceipt): number | null {
  const candidates = [
    receipt.data?.result,
    receipt.data?.returnValue,
    receipt.data?.return_value,
    receipt.txDataDecoded?.result,
    receipt.txDataDecoded?.returnValue,
    receipt.txDataDecoded?.return_value,
    receipt.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export default class SupremeHighCryptoCourt {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;
  private address?: string | null;
  private studioUrl?: string;

  constructor(contractAddress: string, address?: string | null, studioUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.address = address;
    this.studioUrl = studioUrl;
    this.client = this.createConfiguredClient();
  }

  private createConfiguredClient() {
    const config: any = { chain: studionet };
    if (this.address) {
      config.account = this.address as `0x${string}`;
    }
    if (this.studioUrl) {
      config.endpoint = this.studioUrl;
    }
    return createClient(config);
  }

  async getCase(caseId: number): Promise<CourtCase> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_case",
      args: [caseId],
    });

    return normalizeCase(result);
  }

  async getCaseSummary(caseId: number): Promise<CourtCaseSummary> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_case_summary",
      args: [caseId],
    });

    return normalizeSummary(result);
  }

  async getCaseCount(): Promise<number> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_case_count",
      args: [],
    });

    return Number(result) || 0;
  }

  async getRecentCases(limit = 12): Promise<CourtCaseSummary[]> {
    const result: any = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_recent_cases",
      args: [limit],
    });

    const plain = toPlain(result);
    if (!Array.isArray(plain)) {
      return [];
    }
    return plain.map(normalizeSummary);
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
    const transaction = await this.client.getTransaction({
      hash: txHash as any,
    });

    return simplifyTransactionReceipt(transaction as any) as TransactionReceipt;
  }

  async submitCase(
    caseText: string,
  ): Promise<{
    txHash: string;
    caseId: number | null;
    receipt: TransactionReceipt | null;
    recoveredCase: RecoveredCourtCase | null;
  }> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_case",
      args: [caseText],
      value: BigInt(0),
    });

    let receipt: TransactionReceipt | null = null;

    try {
      receipt = (await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 60,
        interval: 5000,
      })) as TransactionReceipt;
    } catch {
      try {
        receipt = await this.getTransactionReceipt(txHash);
      } catch {
        receipt = null;
      }
    }

    const caseId = receipt ? extractCaseId(receipt) : null;
    const recoveredCase = receipt ? extractRecoveredCase(receipt, caseText) : null;

    return {
      txHash,
      caseId,
      receipt,
      recoveredCase,
    };
  }
}
