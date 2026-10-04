import { bsc, bscTestnet } from 'viem/chains';

// BNB Chain. BSC testnet (97) by default; set CHAIN_ID=56 for mainnet.
export function getChain(chainId: number) {
  return chainId === bsc.id ? bsc : bscTestnet;
}
