import { bsc, bscTestnet } from "viem/chains";

// BNB Chain: BSC testnet (97) by default, BSC mainnet (56) when
// NEXT_PUBLIC_CHAIN_ID=56.
export const activeChain =
  process.env.NEXT_PUBLIC_CHAIN_ID === "56" ? bsc : bscTestnet;

export const EXPLORER_URL = activeChain.blockExplorers.default.url;
