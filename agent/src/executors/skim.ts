import type { Hash, PublicClient, WalletClient } from 'viem';
import { CERMIN_VAULT_ABI } from '../abis/CerminVault.js';
import { computeHints } from '../hints/sortedTroves.js';
import { withRetry } from '../rpc/retry.js';
import { enqueueWrite } from '../rpc/txQueue.js';

const RECEIPT_TIMEOUT_MS = 120_000;

export async function executeSkim(
  publicClient: PublicClient,
  walletClient: WalletClient,
  vault: `0x${string}`,
): Promise<Hash> {
  const account = walletClient.account;
  if (!account) throw new Error('walletClient has no account');

  const { upperHint, lowerHint } = await computeHints();
  // Simulating is a read — safe to run concurrently across vaults. Only the
  // write is serialized (via the queue) so the signer's nonce stays sequential.
  const { request } = await withRetry(() =>
    publicClient.simulateContract({
      address: vault,
      abi: CERMIN_VAULT_ABI,
      functionName: 'skim',
      args: [upperHint, lowerHint],
      account,
    }),
  );

  return enqueueWrite(async () => {
    const hash = await walletClient.writeContract(request);
    const receipt = await withRetry(() =>
      publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS }),
    );
    if (receipt.status === 'reverted') throw new Error(`skim reverted on-chain (${hash})`);
    return hash;
  });
}
