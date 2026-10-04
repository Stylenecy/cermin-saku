"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits, isAddress, zeroAddress } from "viem";
import { CONTRACTS, PRICE_FEED_ABI } from "@/lib/contracts";

const PRICE_REFRESH_MS = 60_000;

export function useBtcPrice() {
  const hasFeed =
    isAddress(CONTRACTS.PRICE_FEED) && CONTRACTS.PRICE_FEED !== zeroAddress;

  const { data, isLoading, isError } = useReadContract({
    address: CONTRACTS.PRICE_FEED,
    abi: PRICE_FEED_ABI,
    functionName: "fetchPrice",
    query: {
      enabled: hasFeed,
      refetchInterval: PRICE_REFRESH_MS,
      staleTime: PRICE_REFRESH_MS / 2,
    },
  });

  const btcPriceUsd = useMemo(() => {
    if (data === undefined) return 0;
    return Number(formatUnits(data as bigint, 18));
  }, [data]);

  return { btcPriceUsd, isLoading: hasFeed && isLoading, isError: hasFeed && isError };
}
