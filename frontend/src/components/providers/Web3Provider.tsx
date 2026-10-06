"use client";

import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider, useLogin, type PrivyClientConfig } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { usePathname, useRouter } from "next/navigation";
import { createPrivyWagmiConfig, createWagmiConfig } from "@/lib/wagmi";
import { activeChain } from "@/lib/chains";
import { PRIVY_APP_ID, PRIVY_ENABLED } from "@/lib/privy";
import { useLang } from "@/lib/i18n";
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

// Brown-ink accent for the connect button and modals, as on the landing buttons.
const RK_THEME = lightTheme({ accentColor: "#1F1B17", accentColorForeground: "#FCFBF8", borderRadius: "large" });

// Provider tree lives in its own component so it only renders after mount.
// The wagmi config (and the WalletConnect connector it spins up) is created
// here via useState, guaranteeing it never runs on the server.
function Web3Inner({ children }: { children: React.ReactNode }) {
  const [config] = useState(createWagmiConfig);
  const [queryClient] = useState(makeQueryClient);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={RK_THEME}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// A fresh sign-in from the landing page goes straight into the app.
function LandOnDashboard() {
  const router = useRouter();
  const path = usePathname();
  useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated && path === "/") router.push("/dashboard");
    },
  });
  return null;
}

// Sign-in with Google, email or a wallet. Anyone without a wallet gets one
// made for them on login, so a parent never has to install an extension.
function PrivyInner({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [wagmiConfig] = useState(createPrivyWagmiConfig);
  const [queryClient] = useState(makeQueryClient);
  const config: PrivyClientConfig = {
    loginMethods: ["google", "email", "wallet"],
    appearance: {
      theme: "light",
      accentColor: "#1F1B17",
      logo: "/logo-192.png",
      landingHeader: t("Masuk ke Cermin Saku", "Sign in to Cermin Saku"),
      loginMessage: t(
        "Pakai Google atau email. Dompetmu dibuat otomatis.",
        "Use Google or email. Your wallet is created for you.",
      ),
      walletChainType: "ethereum-only",
      showWalletLoginFirst: false,
    },
    embeddedWallets: {
      ethereum: { createOnLogin: "users-without-wallets" },
      showWalletUIs: true,
    },
    defaultChain: activeChain,
    supportedChains: [activeChain],
  };

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>
          <LandOnDashboard />
          {children}
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <MountShell />;

  return PRIVY_ENABLED ? <PrivyInner>{children}</PrivyInner> : <Web3Inner>{children}</Web3Inner>;
}
