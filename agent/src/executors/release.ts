import { decodeEventLog, type Hash, type PublicClient, type WalletClient } from 'viem';
import { CERMIN_SAKU_ABI } from '../abis/generated.js';
import { withRetry } from '../rpc/retry.js';
import { enqueueWrite } from '../rpc/txQueue.js';

const RECEIPT_TIMEOUT_MS = 120_000;

export interface ReleaseResult {
  hash: Hash;
  /** 'paid' = AllowancePaid emitted; 'held' = AllowanceHeld emitted. */
  outcome: 'paid' | 'held';
}

/**
 * Call CerminSaku.release(id). Permissionless: the keeper can only trigger a
 * payment the vault itself approves (or record that it was held).
 */
export async function executeRelease(
  publicClient: PublicClient,
  walletClient: WalletClient,
  saku: `0x${string}`,
  id: bigint,
): Promise<ReleaseResult> {
  const account = walletClient.account;
  if (!account) throw new Error('walletClient has no account');

  const { request } = await withRetry(() =>
    publicClient.simulateContract({
      address: saku,
      abi: CERMIN_SAKU_ABI,
      functionName: 'release',
      args: [id],
      account,
    }),
  );

  return enqueueWrite(async () => {
    const hash = await walletClient.writeContract(request);
    const receipt = await withRetry(() => publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS }));
    if (receipt.status === 'reverted') throw new Error(`release reverted on-chain (${hash})`);
    let outcome: ReleaseResult['outcome'] = 'held';
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== saku.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: CERMIN_SAKU_ABI, data: log.data, topics: log.topics });
        if (ev.eventName === 'AllowancePaid') outcome = 'paid';
      } catch {
        // not a Saku event
      }
    }
    return { hash, outcome };
  });
}
