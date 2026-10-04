import { Network } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { OrchestrationDiagram } from "@/components/landing/LandingArt";
import { Eyebrow } from "./Eyebrow";

export function Orchestration() {
  return (
    <section className="relative py-20 md:py-28 border-y border-line/60 bg-surface/30">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl mb-12">
          <Eyebrow icon={<Network className="w-3.5 h-3.5" />} label="What Cermin does" note="orchestration" />
          <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] leading-[1.08] text-balance mt-5">
            It doesn&apos;t reinvent DeFi.{" "}
            <em className="italic font-normal text-amber-600">It orchestrates BNB Chain.</em>
          </h2>
          <p className="text-muted mt-4 text-pretty leading-relaxed">
            Cermin never custodies your funds. It wires together the CDP trove, MUSD,
            savings vault and price feed — then automates the only two moves that matter:
            skim the peaks, defend the dips.
          </p>
        </Reveal>
        <Reveal>
          <OrchestrationDiagram />
        </Reveal>
      </div>
    </section>
  );
}
