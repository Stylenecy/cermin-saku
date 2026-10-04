"use client";

export const dynamic = "force-dynamic";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/landing/sections/Topbar";
import { Hero } from "@/components/landing/sections/Hero";
import { TrustStrip } from "@/components/landing/sections/TrustStrip";
import { HowItWorks } from "@/components/landing/sections/HowItWorks";
import { Orchestration } from "@/components/landing/sections/Orchestration";
import { Features } from "@/components/landing/sections/Features";
import { ShadowSection } from "@/components/landing/sections/ShadowSection";
import { FAQ } from "@/components/landing/sections/FAQ";
import { CTA } from "@/components/landing/sections/CTA";
import { Footer } from "@/components/landing/sections/Footer";

export default function HomePage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Connecting always lands on the dashboard. The dashboard is the single
  // authority on vault state: it shows the vault if one exists, or routes a
  // vault-less user into onboarding. The landing never guesses, so a returning
  // owner is never sent to the wizard.
  const launchHref = isConnected ? "/dashboard" : null;
  const onLaunch = launchHref ? () => router.push(launchHref) : undefined;

  return (
    <div className="min-h-screen text-ink">
      <Topbar launchHref={launchHref} />
      <Hero launchHref={launchHref} onLaunch={onLaunch} />
      <TrustStrip />
      <HowItWorks />
      <Orchestration />
      <Features />
      <ShadowSection />
      <FAQ />
      <CTA launchHref={launchHref} onLaunch={onLaunch} />
      <Footer />
    </div>
  );
}
