"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SupremeHighCryptoCourt from "../contracts/SupremeHighCryptoCourt";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import type { CourtCase, CourtCaseSummary, TransactionReceipt } from "../contracts/types";

export function useCourtContract(): SupremeHighCryptoCourt | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) {
      return null;
    }
    return new SupremeHighCryptoCourt(contractAddress, address, studioUrl);
  }, [address, contractAddress, studioUrl]);
}

export function useCourtCase(caseId: number | null) {
  const contract = useCourtContract();

  return useQuery<CourtCase, Error>({
    queryKey: ["court-case", caseId],
    queryFn: async () => {
      if (!contract || caseId === null) {
        throw new Error("Court contract is not configured.");
      }
      return contract.getCase(caseId);
    },
    enabled: !!contract && caseId !== null && Number.isFinite(caseId),
    staleTime: 5000,
  });
}

export function useRecentCases(limit = 12) {
  const contract = useCourtContract();

  return useQuery<CourtCaseSummary[], Error>({
    queryKey: ["court-cases", limit],
    queryFn: async () => {
      if (!contract) {
        return [];
      }
      return contract.getRecentCases(limit);
    },
    enabled: !!contract,
    staleTime: 5000,
  });
}

export function useCourtTransaction(txHash: string | null) {
  const contract = useCourtContract();

  return useQuery<TransactionReceipt, Error>({
    queryKey: ["court-transaction", txHash],
    queryFn: async () => {
      if (!contract || !txHash) {
        throw new Error("Transaction hash is not available.");
      }
      return contract.getTransactionReceipt(txHash);
    },
    enabled: !!contract && !!txHash,
    refetchInterval: (query) => {
      const statusName = query.state.data?.statusName;
      if (!statusName || ["PENDING", "PROPOSING", "COMMITTING", "REVEALING"].includes(statusName)) {
        return 5000;
      }
      return false;
    },
    staleTime: 1000,
  });
}

export function useSubmitCase() {
  const contract = useCourtContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ caseText, mode }: { caseText: string; mode: "standard" | "critical" }) => {
      if (!contract) {
        throw new Error("Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
      }
      if (!address) {
        throw new Error("Connect your wallet before filing a case.");
      }

      const submitted = await contract.submitCase(caseText, mode);
      let caseId = submitted.caseId;

      if (caseId === null && submitted.recoveredCase) {
        return {
          mode: "receipt" as const,
          txHash: submitted.txHash,
        };
      }

      if (caseId === null) {
        const recent = await contract.getRecentCases(10);
        const match = recent.find((item) => item.submitter.toLowerCase() === address.toLowerCase());
        caseId = match?.case_id ?? null;
      }

      if (caseId === null) {
        return {
          mode: "receipt" as const,
          txHash: submitted.txHash,
        };
      }

      return {
        mode: "case" as const,
        caseId,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["court-cases"] });
      if (result.mode === "case") {
        router.push(`/case/${result.caseId}`);
        return;
      }
      router.push(`/tx/${result.txHash}`);
    },
  });
}
