import { Moon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Eyebrow } from "./Eyebrow";

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 transition-colors hover:bg-white/[0.08]">
      <div className="text-xs text-white/50 font-mono">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`text-ink ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

export function ShadowSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <Card variant="ink" className="!p-8 md:!p-12 relative">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60"
                style={{ backgroundImage: "url(/shadow-night-warmth.webp)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-shadow-900 via-shadow-900/85 to-shadow-900/60" />
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/40 blur-3xl pointer-events-none animate-float" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Eyebrow tone="light" icon={<Moon className="w-3.5 h-3.5" />} label="The Shadow" />
                <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] leading-[1.08] text-balance mt-5">
                  Spend the dollars. <em className="italic font-normal text-amber-300">Keep the BNB.</em>
                </h2>
                <p className="text-white/70 mt-4 text-pretty leading-relaxed">
                  The Shadow is your spendable balance — MUSD borrowed against your
                  BNB. Withdraw to a card, save it in sMUSD, or both. Your BNB just
                  sits there appreciating.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-7 max-w-md">
                  <Stat label="Borrow APR" value="1%" sub="fixed at open" />
                  <Stat label="Vault APR" value="~5%" sub="sMUSD savings" />
                  <Stat label="Max LTV" value="90%" sub="CDP cap" />
                  <Stat label="On-chain" value="2 contracts" sub="lean by design" />
                </div>
              </div>
              <div className="bg-surface rounded-3xl p-6 shadow-pop relative">
                <div className="text-xs uppercase tracking-[0.18em] text-amber-600 font-mono mb-1">
                  Available now
                </div>
                <AnimatedNumber
                  value={2847.32}
                  durationMs={1400}
                  format={(n) =>
                    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                  className="block text-5xl font-semibold tabular-nums tracking-tight text-ink"
                />
                <div className="text-sm text-muted mt-1">MUSD spendable</div>
                <div className="grid grid-cols-3 gap-2 mt-6">
                  {["Withdraw", "Top up", "Save"].map((a, i) => (
                    <div
                      key={a}
                      className={`rounded-2xl py-3 px-2 text-center text-sm font-medium transition-colors ${
                        i === 0 ? "bg-ink text-white" : "bg-surface-soft text-ink hover:bg-cream-300"
                      }`}
                    >
                      {a}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 border-t border-line space-y-3">
                  <Row label="BNB locked" value="0.847 BNB" />
                  <Row label="In sMUSD vault" value="$12,420" />
                  <Row label="ICR · health" value="218% · Safe" mono />
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
