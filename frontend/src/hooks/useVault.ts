"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { isAddress, zeroAddress } from "viem";
import { CERMIN_FACTORY_ABI, CERMIN_VAULT_ABI, CONTRACTS } from "@/lib/contracts";

export interface VaultStateData {
  lastSkimPrice: bigint;
  lastSeenPrice: bigint;
  spendableMusd: bigint;
  smusdShares: bigint;
  createdAt: bigint;
}

export interface VaultParamsData {
  targetLTV: number;
  defendICR: number;
  emergencyICR: number;
  skimThresholdBps: number;
  spendableShare: number;
}

const STATIC_REFRESH = 60_000;
const DYNAMIC_REFRESH = 20_000;

export function useVault() {
  const { address } = useAccount();

  const {
    data: vaultAddressData,
    isLoading: vaultLoading,
    isError: vaultError,
  } = useReadContract({
    address: CONTRACTS.CERMIN_FACTORY,
    abi: CERMIN_FACTORY_ABI,
    functionName: "vaultOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: STATIC_REFRESH,
    },
  });

  const vault = useMemo(() => {
    if (!vaultAddressData) return undefined;
    const v = vaultAddressData as string;
    return isAddress(v) && v !== zeroAddress ? (v as `0x${string}`) : undefined;
  }, [vaultAddressData]);

  const hasVault = !!vault;

  const { data: staticData, isLoading: staticLoading } = useReadContracts({
    contracts: hasVault
      ? [
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "params" },
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "owner" },
        ]
      : [],
    query: {
      enabled: hasVault,
      staleTime: Infinity,
    },
  });

  // Dynamic reads are batched into one multicall by wagmi.
  const {
    data: dynamicData,
    isLoading: dynamicLoading,
    isError: dynamicError,
  } = useReadContracts({
    contracts: hasVault
      ? [
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "state" },
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "getICR" },
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "getDebt" },
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "getCollateral" },
          { address: vault, abi: CERMIN_VAULT_ABI, functionName: "getShadow" },
        ]
      : [],
    query: {
      enabled: hasVault,
      refetchInterval: DYNAMIC_REFRESH,
      staleTime: DYNAMIC_REFRESH / 2,
    },
  });

  return useMemo(() => {
    const params = staticData?.[0]?.result as VaultParamsData | undefined;
    const state = dynamicData?.[0]?.result as VaultStateData | undefined;
    const icr = dynamicData?.[1]?.result as bigint | undefined;
    const debt = dynamicData?.[2]?.result as bigint | undefined;
    const collateral = dynamicData?.[3]?.result as bigint | undefined;
    const shadow = dynamicData?.[4]?.result as readonly [bigint, bigint] | undefined;

    return {
      vaultAddress: vault,
      hasVault,
      state,
      params,
      icr,
      debt,
      collateral,
      shadow,
      isLoading: vaultLoading || (hasVault && (staticLoading || dynamicLoading)),
      isError: vaultError || (hasVault && dynamicError),
    };
  }, [
    vault,
    hasVault,
    staticData,
    dynamicData,
    vaultLoading,
    staticLoading,
    dynamicLoading,
    vaultError,
    dynamicError,
  ]);
}
