import { Layers, Coins, SlidersHorizontal, Wallet, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { IsoArt } from "@/components/landing/LandingArt";
import { Eyebrow } from "./Eyebrow";

export function HowItWorks() {
  const steps = [
    {
      n: "001",
      title: "Deposit BNB",
      body:
        "Lock as much BNB as you want. It sits in a CDP trove — yours, never sold. Cermin only ever touches the dollars borrowed against it.",
      icon: <Coins className="w-7 h-7" />,
      variant: "diamond" as const,
    },
    {
      n: "002",
      title: "Pick a strategy",
      body:
        "Conservative, Balanced or Aggressive. One choice sets your borrow ratio, skim threshold and the ICR lines where defense kicks in.",
      icon: <SlidersHorizontal className="w-7 h-7" />,
      variant: "square" as const,
    },
    {
      n: "003",
      title: "Live on the Shadow",
      body:
        "Cermin borrows MUSD against your BNB and routes it to spend or to the sMUSD savings vault — topping up on every peak, defending every dip.",
      icon: <Wallet className="w-7 h-7" />,
      variant: "circle" as const,
    },
  ];

  return (
    <section id="how" className="relative overflow-hidden py-20 md:py-28 scroll-mt-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.55]"
          style={{ backgroundImage: "url(/how-it-works-three-scenes.webp)" }}
        />
        <div className="absolute inset-0 bg-canvas/45" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl mb-16">
          <Eyebrow icon={<Layers className="w-3.5 h-3.5" />} label="How it works" note="deposit → spend" />
          <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] leading-[1.08] text-balance mt-5">
            Three steps. One vault. <em className="italic font-normal text-amber-600">Zero sales.</em>
          </h2>
          <p className="text-muted mt-4 text-pretty leading-relaxed">
            Cermin is a thin app that orchestrates CDP primitives on BNB Chain — so the risk model
            is the chain&apos;s, not ours.
          </p>
        </Reveal>

        <div className="space-y-16 md:space-y-24">
          {steps.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={s.n} className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                <Reveal className={flip ? "md:order-2" : ""}>
                  <IsoArt icon={s.icon} variant={s.variant} />
                </Reveal>
                <Reveal delay={120} className={flip ? "md:order-1" : ""}>
                  <div className="font-mono text-sm text-amber-500 tabular-nums mb-3">{s.n}</div>
                  <h3 className="font-serif text-2xl md:text-[2rem] font-medium tracking-[-0.01em] mb-3">
                    {s.title}
                  </h3>
                  <p className="text-muted leading-relaxed text-pretty max-w-md">{s.body}</p>
                  {i === 0 && (
                    <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-mint" />
                      Min ~0.05 BNB
                    </div>
                  )}
                  {i === 1 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      <Badge variant="default">Conservative</Badge>
                      <Badge variant="amber">Balanced ⭐</Badge>
                      <Badge variant="default">Aggressive</Badge>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="mt-5 inline-flex items-center gap-2 text-xs text-success font-mono">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Auto-skim on BNB peaks
                    </div>
                  )}
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
