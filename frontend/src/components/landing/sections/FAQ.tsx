"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, HelpCircle } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "./Eyebrow";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const qs = [
    {
      q: "Is my BNB ever sold?",
      a: "Never. Your BNB is locked as collateral in a CDP trove that only you can close. Cermin just orchestrates the borrowed dollars on top.",
    },
    {
      q: "What happens on a BNB crash?",
      a: "When your ICR drops below your defense threshold, anyone (including the keeper bot) can call defend(), which uses your sMUSD savings to repay debt and lift the ICR back up — well before the CDP's 110% liquidation line.",
    },
    {
      q: "Who controls the vault?",
      a: "You. Each user gets their own clone contract with sole authority to open, close, and withdraw. Cermin can't touch your funds.",
    },
    {
      q: "What's the actual yield?",
      a: "MUSD savings (sMUSD) yield is variable — currently ~5% APR. Cermin doesn't add any spread; you get whatever the savings vault pays.",
    },
  ];
  return (
    <section id="faq" className="relative overflow-hidden py-20 md:py-28 scroll-mt-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.55]"
          style={{ backgroundImage: "url(/faq-open-meadow.webp)" }}
        />
        <div className="absolute inset-0 bg-canvas/42" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center mb-12 flex flex-col items-center">
          <Eyebrow icon={<HelpCircle className="w-3.5 h-3.5" />} label="FAQ" />
          <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] mt-5">
            Common questions
          </h2>
        </Reveal>
        <div className="space-y-3">
          {qs.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 50}>
                <div
                  className={`rounded-2xl bg-surface border shadow-soft overflow-hidden transition-colors ${
                    isOpen ? "border-amber-200" : "border-cream-300 hover:border-amber-200"
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-medium text-ink"
                  >
                    {item.q}
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 text-amber-500 transition-transform duration-300 ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: EASE_OUT }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted px-5 pb-5 leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
