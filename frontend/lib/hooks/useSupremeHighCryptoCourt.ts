"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SupremeHighCryptoCourt from "../contracts/SupremeHighCryptoCourt";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import type { CourtCase, CourtCaseSummary } from "../contracts/types";

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

export function useSubmitCase() {
  const contract = useCourtContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (caseText: string) => {
      if (!contract) {
        throw new Error("Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
      }
      if (!address) {
        throw new Error("Connect your wallet before filing a case.");
      }

      const submitted = await contract.submitCase(caseText);
      let caseId = submitted.caseId;

      if (caseId === null) {
        const recent = await contract.getRecentCases(10);
        const match = recent.find((item) => item.submitter.toLowerCase() === address.toLowerCase());
        caseId = match?.case_id ?? null;
      }

      if (caseId === null) {
        throw new Error("Case was accepted, but the case id could not be recovered. Open Archives to find it.");
      }

      return caseId;
    },
    onSuccess: (caseId) => {
      queryClient.invalidateQueries({ queryKey: ["court-cases"] });
      router.push(`/case/${caseId}`);
    },
  });
}
