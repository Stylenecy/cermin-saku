"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { CONTRACTS, SAVINGS_VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

const REFRESH = 20_000;

/**
 * Reads the savings vault pool + the connected wallet's *direct* sMUSD
 * position (distinct from the savings the CerminVault auto-manages, which
 * comes from useVault's getShadow).
 */
export function useSavings() {
  const { address } = useAccount();

  const { data, isLoading, isError } = useReadContracts({
    contracts: address
      ? [
          { address: CONTRACTS.SAVINGS_VAULT, abi: SAVINGS_VAULT_ABI, functionName: "totalSupply" },
          { address: CONTRACTS.SAVINGS_VAULT, abi: SAVINGS_VAULT_ABI, functionName: "balanceOf", args: [address] },
          { address: CONTRACTS.SAVINGS_VAULT, abi: SAVINGS_VAULT_ABI, functionName: "claimableYield", args: [address] },
          { address: CONTRACTS.MUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: CONTRACTS.MUSD, abi: ERC20_ABI, functionName: "allowance", args: [address, CONTRACTS.SAVINGS_VAULT] },
        ]
      : [],
    query: { enabled: !!address, refetchInterval: REFRESH, staleTime: REFRESH / 2 },
  });

  return useMemo(
    () => ({
      poolTvl: (data?.[0]?.result as bigint | undefined) ?? 0n,
      userShares: (data?.[1]?.result as bigint | undefined) ?? 0n,
      userYield: (data?.[2]?.result as bigint | undefined) ?? 0n,
      walletMusd: (data?.[3]?.result as bigint | undefined) ?? 0n,
      allowance: (data?.[4]?.result as bigint | undefined) ?? 0n,
      isLoading,
      isError,
    }),
    [data, isLoading, isError],
  );
}
