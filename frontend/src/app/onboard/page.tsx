"use client";

export const dynamic = "force-dynamic";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useVault } from "@/hooks/useVault";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useBtcPrice } from "@/hooks/useBtcPrice";

export default function OnboardPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { hasVault, isLoading } = useVault();
  const { btcPriceUsd } = useBtcPrice();

  useEffect(() => {
    if (!isConnected) {
      router.replace("/");
    }
  }, [isConnected, router]);

  useEffect(() => {
    if (!isLoading && hasVault) {
      router.replace("/dashboard");
    }
  }, [isLoading, hasVault, router]);

  if (!isConnected || isLoading) {
    return (
      <div className="bg-app min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cream-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (hasVault) return null;

  const price = btcPriceUsd > 0 ? btcPriceUsd : 95_000; // testnet fallback

  return (
    <OnboardingWizard
      btcPriceUsd={price}
      onComplete={() => router.push("/dashboard")}
    />
  );
}
