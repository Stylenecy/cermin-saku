"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Zap, ShieldCheck, Bot, Sparkles, TrendingUp, Lock } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Reveal } from "@/components/ui/Reveal";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "./Eyebrow";
import { PeakVisual } from "./PeakVisual";

type Tone = "sage" | "amber" | "info" | "peach";

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
  tone: Tone;
  span: string;
  layout: "big" | "banner" | "compact";
  visual?: ReactNode;
}

const TONES: Record<Tone, string> = {
  sage: "bg-success/15 text-success",
  amber: "bg-amber-50 text-amber-700",
  info: "bg-info/12 text-info",
  peach: "bg-peach-200 text-amber-700",
};

function IconTile({ icon, tone }: { icon: ReactNode; tone: Tone }) {
  return (
    <div
      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${TONES[tone]}`}
    >
      {icon}
    </div>
  );
}

/* "Auto-yield" — compounding bars climbing toward ~5% APR. */
function YieldVisual() {
  const bars = [24, 32, 30, 42, 50, 60, 70, 84];
  return (
    <div className="relative h-full w-full min-h-[96px] rounded-2xl bg-gradient-to-b from-success/[0.1] to-surface border border-success/15 overflow-hidden p-3 flex items-end gap-1.5">
      <span className="absolute top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-surface/90 border border-success/20 px-2 py-0.5 text-[10px] font-mono text-success shadow-sm">
        ~5% APR
      </span>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-amber-300/80 to-success transition-all"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function FeatureCard({
  index,
  icon,
  title,
  body,
  tone,
  layout,
  visual,
}: Feature & { index: string }) {
  if (layout === "banner") {
    return (
      <Card className="!p-6 group h-full flex flex-col md:flex-row md:items-center gap-6" interactive>
        <div className="md:flex-1">
          <div className="flex items-center justify-between mb-4">
            <IconTile icon={icon} tone={tone} />
            <span className="font-mono text-xs text-muted-2 tabular-nums">{index}</span>
          </div>
          <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
          <p className="text-sm text-muted mt-2 leading-relaxed text-pretty max-w-md">{body}</p>
        </div>
        <div className="md:w-[42%] shrink-0 h-28 md:h-full md:max-h-[128px]">{visual}</div>
      </Card>
    );
  }
  if (layout === "big") {
    return (
      <Card className="!p-6 group h-full flex flex-col" interactive>
        <div className="flex items-center justify-between mb-4">
          <IconTile icon={icon} tone={tone} />
          <span className="font-mono text-xs text-muted-2 tabular-nums">{index}</span>
        </div>
        <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
        <p className="text-sm text-muted mt-2 leading-relaxed text-pretty max-w-sm">{body}</p>
        <div className="mt-5 flex-1 min-h-[140px]">{visual}</div>
      </Card>
    );
  }
  return (
    <Card className="!p-6 group h-full flex flex-col" interactive>
      <div className="flex items-center justify-between mb-4">
        <IconTile icon={icon} tone={tone} />
        <span className="font-mono text-xs text-muted-2 tabular-nums">{index}</span>
      </div>
      <h3 className="font-semibold text-base tracking-tight">{title}</h3>
      <p className="text-sm text-muted mt-1.5 leading-relaxed text-pretty flex-1">{body}</p>
    </Card>
  );
}

export function Features() {
  const features: Feature[] = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Skims on every peak",
      body: "When BNB pumps past your threshold, the vault draws fresh MUSD and tops up your Shadow — automatically.",
      tone: "amber",
      span: "sm:col-span-2 lg:col-span-2 lg:row-span-2",
      layout: "big",
      visual: <PeakVisual />,
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "BNB stays untouched",
      body: "Collateral never leaves the CDP trove — only the borrowed dollars move.",
      tone: "sage",
      span: "",
      layout: "compact",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Non-custodial",
      body: "Every vault is a clone you alone control. Cermin can't touch your funds.",
      tone: "peach",
      span: "",
      layout: "compact",
    },
    {
      icon: <Bot className="w-5 h-5" />,
      title: "Defends every dip",
      body: "The keeper — or anyone — repays debt the instant your ICR drops, before liquidation.",
      tone: "info",
      span: "",
      layout: "compact",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Live in 60 seconds",
      body: "Connect, pick a preset, sign once. Your Shadow is running before your coffee's cold.",
      tone: "sage",
      span: "",
      layout: "compact",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Auto-yield on idle",
      body: "Idle dollars route into the sMUSD savings vault at ~5% APR — compounding while you sleep.",
      tone: "amber",
      span: "sm:col-span-2 lg:col-span-4",
      layout: "banner",
      visual: <YieldVisual />,
    },
  ];
  return (
    <section id="features" className="relative overflow-hidden py-20 md:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.5]"
          style={{ backgroundImage: "url(/features-tranquil-town.webp)" }}
        />
        <div className="absolute inset-0 bg-canvas/45" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl mb-14">
          <Eyebrow icon={<Sparkles className="w-3.5 h-3.5" />} label="Features" note="why Cermin" />
          <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] leading-[1.08] text-balance mt-5">
            A bank account that <em className="italic font-normal text-amber-600">runs itself.</em>
          </h2>
        </Reveal>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:auto-rows-[200px]"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 26 } }}
              className={`${f.span} [&>*]:h-full`}
            >
              <FeatureCard index={String(i + 1).padStart(3, "0")} {...f} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
