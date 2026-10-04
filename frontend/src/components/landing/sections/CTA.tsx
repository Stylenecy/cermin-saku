"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function CTA({
  launchHref,
  onLaunch,
}: {
  launchHref: string | null;
  onLaunch?: () => void;
}) {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.5]"
          style={{ backgroundImage: "url(/cta-dawn-path.webp)" }}
        />
        <div className="absolute inset-0 bg-canvas/45" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <Card variant="accent" className="!p-10 md:!p-16 text-center relative">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-70"
                style={{ backgroundImage: "url(/cta-dawn-path.webp)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-shadow-900 via-shadow-900/80 to-shadow-900/65" />
            </div>
            <div className="relative z-10">
              <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-[-0.02em] text-white text-balance leading-[1.06]">
                Open your Shadow in <em className="italic font-normal text-amber-300">under 60 seconds.</em>
              </h2>
              <p className="text-white/85 mt-5 max-w-xl mx-auto leading-relaxed">
                Connect a wallet, pick Balanced, sign once. Your BNB stays whole.
              </p>
              <div className="mt-8 flex justify-center">
                {launchHref && onLaunch ? (
                  <Button variant="secondary" size="xl" onClick={onLaunch}>
                    Go to dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <Button variant="secondary" size="xl" onClick={openConnectModal}>
                        Launch app
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </ConnectButton.Custom>
                )}
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
