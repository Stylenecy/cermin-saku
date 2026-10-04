import type { Address } from 'viem';

const ZERO: Address = '0x0000000000000000000000000000000000000000';

/**
 * Returns insertion hints for Mezo's SortedTroves.
 *
 * Mezo accepts the zero-address pair as a "no hint" fallback — the chain walks the
 * full list itself, costing more gas but always working. For the hackathon scope
 * we use that fallback unconditionally; production would walk the linked list and
 * return a tighter `(prev, next)` pair to save gas.
 */
export async function computeHints(): Promise<{ upperHint: Address; lowerHint: Address }> {
  return { upperHint: ZERO, lowerHint: ZERO };
}
