"use client";

import { useCallback, useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACTS, SAVINGS_VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

export type DepositPhase = "idle" | "approving" | "depositing" | "done";

/** Direct (wallet-side) LP into the savings vault: approve→deposit, withdraw, claim. */
export function useSavingsActions() {
  const queryClient = useQueryClient();
  const [depositPhase, setDepositPhase] = useState<DepositPhase>("idle");
  const [pending, setPending] = useState<bigint | null>(null);

  const approve = useWriteContract();
  const deposit = useWriteContract();
  const withdraw = useWriteContract();
  const claim = useWriteContract();

  const approveRcpt = useWaitForTransactionReceipt({ hash: approve.data });
  const depositRcpt = useWaitForTransactionReceipt({ hash: deposit.data });
  const withdrawRcpt = useWaitForTransactionReceipt({ hash: withdraw.data });
  const claimRcpt = useWaitForTransactionReceipt({ hash: claim.data });

  // Auto-fire deposit once the MUSD approve confirms.
  useEffect(() => {
    if (depositPhase === "approving" && approveRcpt.isSuccess && pending) {
      setDepositPhase("depositing");
      deposit.writeContract({
        address: CONTRACTS.SAVINGS_VAULT,
        abi: SAVINGS_VAULT_ABI,
        functionName: "deposit",
        args: [pending],
      });
    }
  }, [depositPhase, approveRcpt.isSuccess, pending, deposit]);

  useEffect(() => {
    if (depositRcpt.isSuccess) setDepositPhase("done");
    if (depositRcpt.isSuccess || withdrawRcpt.isSuccess || claimRcpt.isSuccess) {
      queryClient.invalidateQueries();
    }
  }, [depositRcpt.isSuccess, withdrawRcpt.isSuccess, claimRcpt.isSuccess, queryClient]);

  const doDeposit = useCallback(
    (amount: bigint, allowance: bigint) => {
      approve.reset();
      deposit.reset();
      setPending(amount);
      if (allowance < amount) {
        setDepositPhase("approving");
        approve.writeContract({
          address: CONTRACTS.MUSD,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACTS.SAVINGS_VAULT, amount],
        });
      } else {
        setDepositPhase("depositing");
        deposit.writeContract({
          address: CONTRACTS.SAVINGS_VAULT,
          abi: SAVINGS_VAULT_ABI,
          functionName: "deposit",
          args: [amount],
        });
      }
    },
    [approve, deposit],
  );

  const doWithdraw = useCallback(
    (amount: bigint) => {
      withdraw.reset();
      withdraw.writeContract({
        address: CONTRACTS.SAVINGS_VAULT,
        abi: SAVINGS_VAULT_ABI,
        functionName: "withdraw",
        args: [amount],
      });
    },
    [withdraw],
  );

  const doClaim = useCallback(() => {
    claim.reset();
    claim.writeContract({
      address: CONTRACTS.SAVINGS_VAULT,
      abi: SAVINGS_VAULT_ABI,
      functionName: "claimYield",
      args: [],
    });
  }, [claim]);

  const resetDeposit = useCallback(() => {
    setDepositPhase("idle");
    setPending(null);
    approve.reset();
    deposit.reset();
  }, [approve, deposit]);

  return {
    deposit: doDeposit,
    withdraw: doWithdraw,
    claim: doClaim,
    resetDeposit,
    depositPhase,
    isDepositing:
      depositPhase === "approving" ||
      depositPhase === "depositing" ||
      approve.isPending ||
      approveRcpt.isLoading ||
      deposit.isPending ||
      depositRcpt.isLoading,
    isWithdrawing: withdraw.isPending || withdrawRcpt.isLoading,
    isClaiming: claim.isPending || claimRcpt.isLoading,
    depositError: approve.error ?? deposit.error,
    withdrawError: withdraw.error,
    claimError: claim.error,
  };
}
