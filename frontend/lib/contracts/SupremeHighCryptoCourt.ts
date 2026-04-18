import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CourtCase, CourtCaseSummary, TransactionReceipt } from "./types";

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

function extractCaseId(receipt: TransactionReceipt): number | null {
  const candidates = [
    receipt.data?.result,
    receipt.data?.returnValue,
    receipt.data?.return_value,
    receipt.txDataDecoded?.result,
    receipt.txDataDecoded?.returnValue,
    receipt.txDataDecoded?.return_value,
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

  async submitCase(caseText: string): Promise<{ caseId: number | null; receipt: TransactionReceipt }> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_case",
      args: [caseText],
      value: BigInt(0),
    });

    const receipt = (await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 60,
      interval: 5000,
    })) as TransactionReceipt;

    return {
      caseId: extractCaseId(receipt),
      receipt,
    };
  }
}
