import { http } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig as createPrivyConfig } from "@privy-io/wagmi";
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
const transport = () =>
  http(RPC_URL, {
    batch: { batchSize: 64, wait: 16 },
    retryCount: 2,
    retryDelay: 250,
  });

/** wagmi config for Privy sign-in: Privy supplies the connectors (embedded or external wallet). */
export function createPrivyWagmiConfig() {
  return createPrivyConfig({
    chains: [activeChain],
    // only the active chain is ever used; the cast covers activeChain's 56 | 97 union type
    transports: { [activeChain.id]: transport() } as Record<56 | 97, ReturnType<typeof transport>>,
    ssr: false,
  });
}

export function createWagmiConfig(): WagmiConfig {
  if (!cached) {
    cached = getDefaultConfig({
      appName: "Cermin",
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "cermin-hackathon-demo",
      chains: [activeChain],
      transports: { [activeChain.id]: transport() },
      ssr: false,
    });
  }
  return cached;
}
