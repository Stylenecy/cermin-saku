// Mezo's PriceFeed exposes fetchPrice() (non-view on-chain) as the canonical
// reader; lastGoodPrice() reverts on the live feed. The agent reads via eth_call
// (readContract), which never sends a transaction and costs no gas regardless of
// the declared mutability — so we mark fetchPrice as "view" to satisfy viem typing.
export const PRICE_FEED_ABI = [
  {
    type: 'function',
    name: 'fetchPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastGoodPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
