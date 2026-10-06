"use client";

import { useLang } from "@/lib/i18n";

export function TrustStrip() {
  const { t } = useLang();
  const items = [
    t("BNB Chain · testnet", "BNB Chain · testnet"),
    t("BNB tidak pernah dijual", "BNB is never sold"),
    t("Uang saku terjadwal", "Scheduled allowances"),
    t("Ditahan otomatis saat bahaya", "Held automatically when unsafe"),
    t("Kontrak terverifikasi", "Verified contracts"),
    t("Tanpa kustodian", "Non-custodial"),
    t("Angka dalam Rupiah", "Amounts in Rupiah"),
  ];
  return (
    <section className="border-y border-line/70 bg-surface/50 overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-canvas to-transparent" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...items, ...items].map((it, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6 py-4 text-sm text-muted font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${i % 2 ? "bg-leaf-500" : "bg-amber-400"}`} />
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
