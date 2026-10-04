import { http } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { activeChain } from "./chains";

// viem's default BSC RPCs reject the activity feed's eth_getLogs (BNB dataseed:
// "limit exceeded" at any range; thirdweb: max 1000 blocks). publicnode serves
// 5k-block ranges on both networks.
const DEFAULT_RPC_URL =
  activeChain.id === 56
    ? "https://bsc-rpc.publicnode.com"
    : "https://bsc-testnet-rpc.publicnode.com";

const RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC_URL || DEFAULT_RPC_URL;

type WagmiConfig = ReturnType<typeof getDefaultConfig>;

let cached: WagmiConfig | undefined;

/**
 * Build the wagmi config lazily, on the client only.
 *
 * RainbowKit's getDefaultConfig eagerly initializes the WalletConnect
 * connector, which reads/writes localStorage. Evaluating it during SSR throws
 * `this.localStorage.getItem is not a function`, which blanks the whole page.
 * Calling this from a client-only mount point keeps it off the server.
 */
export function createWagmiConfig(): WagmiConfig {
  if (!cached) {
    cached = getDefaultConfig({
      appName: "Cermin",
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "cermin-hackathon-demo",
      chains: [activeChain],
      transports: {
        [activeChain.id]: http(RPC_URL, {
          batch: { batchSize: 64, wait: 16 },
          retryCount: 2,
          retryDelay: 250,
        }),
      },
      ssr: false,
    });
  }
  return cached;
}
