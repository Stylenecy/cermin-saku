"use client";

import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 2,
      },
    },
  });
}

// RainbowKit reads localStorage during init, which breaks SSR. Until mount we
// render a brand-colored shell so the page frame appears immediately.
function MountShell() {
  return (
    <div
      aria-hidden="true"
      className="bg-app min-h-screen w-full"
      suppressHydrationWarning
    />
  );
}

// Provider tree lives in its own component so it only renders after mount.
// The wagmi config (and the WalletConnect connector it spins up) is created
// here via useState, guaranteeing it never runs on the server.
function Web3Inner({ children }: { children: React.ReactNode }) {
  const [config] = useState(createWagmiConfig);
  const [queryClient] = useState(makeQueryClient);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <MountShell />;

  return <Web3Inner>{children}</Web3Inner>;
}
