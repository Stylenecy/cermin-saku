import type { PublicClient } from 'viem';
import { CERMIN_FACTORY_ABI } from '../abis/CerminFactory.js';
import { CERMIN_VAULT_ABI } from '../abis/CerminVault.js';
import { PRICE_FEED_ABI } from '../abis/PriceFeed.js';
import type { Config } from '../config.js';
import type { Action, VaultParams, VaultSnapshot, VaultState } from '../types.js';
import { withRetry } from '../rpc/retry.js';

const BPS = 10_000;

export async function listVaults(client: PublicClient, config: Config): Promise<readonly `0x${string}`[]> {
  return withRetry(() =>
    client.readContract({
      address: config.CERMIN_FACTORY_ADDRESS,
      abi: CERMIN_FACTORY_ABI,
      functionName: 'allVaults',
    }),
  ) as Promise<readonly `0x${string}`[]>;
}

/**
 * Fetches the BNB price and vault list in parallel. With the http transport's
 * `batch` option enabled, both requests share a single HTTP roundtrip.
 */
export async function fetchPriceAndVaults(
  client: PublicClient,
  config: Config,
): Promise<{ price: bigint; vaults: readonly `0x${string}`[] }> {
  const [price, vaults] = await Promise.all([
    withRetry(() =>
      client.readContract({
        address: config.PRICE_FEED_ADDRESS,
        abi: PRICE_FEED_ABI,
        functionName: 'fetchPrice',
      }),
    ),
    listVaults(client, config),
  ]);
  return { price: price as bigint, vaults };
}

/**
 * Reads the six vault fields in parallel. The http transport batches them
 * into a single JSON-RPC payload, so this is one HTTP roundtrip per vault —
 * regardless of whether the chain has Multicall3 deployed.
 */
export async function snapshotVault(client: PublicClient, vault: `0x${string}`): Promise<VaultSnapshot> {
  const [owner, params, state, icr, debt, collateral] = await Promise.all([
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'owner' })),
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'params' })),
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'state' })),
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'getICR' })),
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'getDebt' })),
    withRetry(() => client.readContract({ address: vault, abi: CERMIN_VAULT_ABI, functionName: 'getCollateral' })),
  ]) as [`0x${string}`, VaultParams, VaultState, bigint, bigint, bigint];

  return {
    address: vault,
    owner,
    params,
    state,
    icrBps: Number(icr),
    debt,
    collateral,
  };
}

export interface Decision {
  action: Action;
  /** ICR (bps) the defend gate actually used: live when the feed is sane,
   *  otherwise the vault's cached getICR() as a degraded-feed fallback. */
  icrBps: number;
  reason: string;
}

const ICR_PRECISION = 10n ** 18n;
// A vault with no debt is infinitely collateralised — never a defend candidate.
const ICR_NO_DEBT = Number.MAX_SAFE_INTEGER;

/**
 * Live ICR in basis points: on-chain collateral and debt valued at the live
 * feed price. This is the exact quantity CerminVault.defend() recomputes
 * on-chain (TroveManager.getCurrentICR at fetchPrice()).
 *
 * We must NOT use the vault's getICR() view for the defend decision: it is
 * cached at `lastSeenPrice` and only refreshes inside open/skim/defend, so
 * between state-changing ops it goes stale and reports the ICR at an old, often
 * higher price. A falling BNB price would then leave a vault sliding toward
 * liquidation while getICR() still reads "healthy" — and the keeper, gating on
 * that cached value, would never trigger the defend the position needs.
 */
export function liveIcrBps(collateral: bigint, debt: bigint, price: bigint): number {
  if (debt === 0n) return ICR_NO_DEBT;
  return Number((collateral * price * BigInt(BPS)) / (debt * ICR_PRECISION));
}

export function decide(snap: VaultSnapshot, currentPrice: bigint, priceSane = true): Decision {
  // Defense gate. Prefer the LIVE ICR (collateral/debt at the live price). Fall
  // back to the cached on-chain getICR() only when the off-chain feed is out of
  // band — stale-but-real beats no signal — but never gate on it while the feed
  // is healthy, or the cache lag would hide a real drop toward liquidation.
  const icrBps = priceSane ? liveIcrBps(snap.collateral, snap.debt, currentPrice) : snap.icrBps;

  if (icrBps < snap.params.defendICR) {
    const priceNote = priceSane
      ? `BNB at $${(Number(currentPrice / 10n ** 16n) / 100).toFixed(0)}. `
      : 'price feed out of band — using cached ICR. ';
    return {
      action: 'DEFEND',
      icrBps,
      reason: `${priceNote}ICR ${(icrBps / 100).toFixed(1)}% is below the defend threshold of ${(snap.params.defendICR / 100).toFixed(1)}%.`,
    };
  }

  // Skim relies on a trustworthy price move; pause it when the feed is out of band.
  const last = snap.state.lastSkimPrice;
  if (priceSane && last > 0n && currentPrice > last) {
    const moveBps = Number(((currentPrice - last) * BigInt(BPS)) / last);
    if (moveBps >= snap.params.skimThresholdBps) {
      return {
        action: 'SKIM',
        icrBps,
        reason: `BNB up ${(moveBps / 100).toFixed(2)}% since last skim, past the ${(snap.params.skimThresholdBps / 100).toFixed(1)}% threshold. Drawing new MUSD capacity.`,
      };
    }
  }

  return {
    action: 'HOLD',
    icrBps,
    reason: priceSane
      ? 'Vault is healthy and no skim threshold crossed.'
      : 'Vault is healthy; price feed out of band, skim paused.',
  };
}
