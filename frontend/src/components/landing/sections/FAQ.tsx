"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, HelpCircle } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "./Eyebrow";
import { useLang } from "@/lib/i18n";

export function FAQ() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(0);
  const qs = [
    {
      q: t("Apakah BNB-ku dijual?", "Is my BNB ever sold?"),
      a: t(
        "Tidak pernah. BNB dikunci sebagai jaminan di vault yang hanya bisa ditutup olehmu. Uang saku diambil dari dolar yang dipinjam di atasnya.",
        "Never. Your BNB is locked as collateral in a vault only you can close. The allowance is paid from dollars borrowed against it.",
      ),
    },
    {
      q: t("Apa yang terjadi kalau BNB anjlok?", "What happens if BNB crashes?"),
      a: t(
        "Pembayaran berikutnya diperiksa kontrak lebih dulu. Kalau posisi terlalu dekat zona bahaya, uang saku ditahan dan penjaga membela vault memakai tabungan cadangan, jauh sebelum garis likuidasi 110%. Begitu aman, amplop yang tertunda dibayar.",
        "The next payment is checked by the contract first. If the position is too close to danger, the allowance is held and the guard defends the vault from the savings reserve, well before the 110% liquidation line. Once it is safe, the owed envelopes are paid.",
      ),
    },
    {
      q: t("Anakku perlu apa untuk menerima?", "What does my child need to receive it?"),
      a: t(
        "Cukup alamat dompet. Uang saku masuk dalam dolar digital (MUSD). Di halaman penerima ia bisa melihat jadwal, yang sudah masuk, dan alasannya kalau ada yang ditahan.",
        "Just a wallet address. The allowance arrives in digital dollars (MUSD). On the recipient page they can see the schedule, what has arrived, and why if one is held.",
      ),
    },
    {
      q: t("Siapa yang memegang danaku?", "Who holds my funds?"),
      a: t(
        "Kamu. Setiap vault adalah kontrak milikmu sendiri. Cermin Saku hanya bisa mengirim uang saku sebatas izin yang kamu berikan, dan jadwal bisa dibatalkan kapan saja.",
        "You do. Every vault is your own contract. Cermin Saku can only send allowances within the limit you grant, and any schedule can be cancelled at any time.",
      ),
    },
    {
      q: t("Sudah bisa dipakai dengan uang sungguhan?", "Can I use it with real money yet?"),
      a: t(
        "Belum. Saat ini berjalan di BNB Chain testnet dengan dolar dan harga BNB tiruan, untuk uji coba. Versi mainnet butuh mitra pinjaman di BNB Chain dan penukaran ke Rupiah.",
        "Not yet. It runs on BNB Chain testnet with test dollars and a simulated BNB price. Mainnet needs a lending partner on BNB Chain and a Rupiah off-ramp.",
      ),
    },
  ];
  return (
    <section id="faq" className="relative overflow-hidden py-20 md:py-28 scroll-mt-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.55]"
          style={{ backgroundImage: "url(/saku-faq-open-meadow.webp)" }}
        />
        <div className="absolute inset-0 bg-canvas/42" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center mb-12 flex flex-col items-center">
          <Eyebrow icon={<HelpCircle className="w-3.5 h-3.5" />} label={t("Tanya jawab", "FAQ")} />
          <h2 className="font-serif text-3xl md:text-[2.75rem] font-medium tracking-[-0.02em] mt-5">
            {t("Yang sering ditanyakan", "Common questions")}
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
