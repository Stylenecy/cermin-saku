import { type Hash, type PublicClient, type WalletClient, maxUint256 } from 'viem';
import { SAVINGS_VAULT_ABI } from '../abis/SavingsVault.js';
import { ERC20_ABI } from '../abis/ERC20.js';
import { withRetry } from '../rpc/retry.js';
import { enqueueWrite } from '../rpc/txQueue.js';

const SECONDS_PER_YEAR = 31_536_000n;
const MIN_AMOUNT = 10n ** 14n; // 0.0001 MUSD — skip dust to avoid spam txs
const RECEIPT_TIMEOUT_MS = 120_000;

export interface AccrueParams {
  savingsVault: `0x${string}`;
  musd: `0x${string}`;
  aprBps: number;
  /** Bounded elapsed seconds since the last accrual. */
  dtSeconds: number;
}

export interface AccrueResult {
  amount: bigint;
  txHash?: Hash;
  approveTxHash?: Hash;
  /** Set when nothing was injected (reason). */
  skipped?: string;
}

/**
 * Streams a timestamp-proportional slice of yield into the savings vault,
 * standing in for Mezo's PCV on testnet. Amount = TVL × APR × dt / year,
 * distributed pro-rata to sMUSD holders by the vault's index.
 */
export async function executeAccrueYield(
  publicClient: PublicClient,
  walletClient: WalletClient,
  p: AccrueParams,
): Promise<AccrueResult> {
  const account = walletClient.account;
  if (!account) throw new Error('walletClient has no account');

  const totalSupply = await withRetry(() =>
    publicClient.readContract({
      address: p.savingsVault,
      abi: SAVINGS_VAULT_ABI,
      functionName: 'totalSupply',
    }),
  );
  if (totalSupply === 0n) return { amount: 0n, skipped: 'no sMUSD holders' };

  const dt = BigInt(Math.max(0, Math.floor(p.dtSeconds)));
  const amount = (totalSupply * BigInt(p.aprBps) * dt) / (10_000n * SECONDS_PER_YEAR);
  if (amount < MIN_AMOUNT) return { amount, skipped: 'below dust floor' };

  const balance = await withRetry(() =>
    publicClient.readContract({
      address: p.musd,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  );
  if (balance < amount) return { amount, skipped: 'keeper MUSD balance too low' };

  // Approve once (max) so later cycles skip the approve tx entirely.
  let approveTxHash: Hash | undefined;
  const allowance = await withRetry(() =>
    publicClient.readContract({
      address: p.musd,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, p.savingsVault],
    }),
  );
  if (allowance < amount) {
    const { request } = await withRetry(() =>
      publicClient.simulateContract({
        address: p.musd,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [p.savingsVault, maxUint256],
        account,
      }),
    );
    // Route through the same serial queue as skim/defend so the keeper's nonce
    // stays sequential even if this ever overlaps the vault loop.
    approveTxHash = await enqueueWrite(async () => {
      const hash = await walletClient.writeContract(request);
      await withRetry(() => publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS }));
      return hash;
    });
  }

  const { request } = await withRetry(() =>
    publicClient.simulateContract({
      address: p.savingsVault,
      abi: SAVINGS_VAULT_ABI,
      functionName: 'accrueYield',
      args: [amount],
      account,
    }),
  );
  const txHash = await enqueueWrite(async () => {
    const hash = await walletClient.writeContract(request);
    const receipt = await withRetry(() =>
      publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS }),
    );
    if (receipt.status === 'reverted') throw new Error(`accrueYield reverted on-chain (${hash})`);
    return hash;
  });
  return { amount, txHash, approveTxHash };
}
