import { anvil, bsc, bscTestnet } from 'viem/chains';

// BNB Chain. BSC testnet (97) by default; set CHAIN_ID=56 for mainnet,
// 31337 for a local Anvil rehearsal.
export function getChain(chainId: number) {
  if (chainId === anvil.id) return anvil;
  return chainId === bsc.id ? bsc : bscTestnet;
}
