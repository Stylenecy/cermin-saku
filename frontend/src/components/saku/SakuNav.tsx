"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Logo } from "@/components/ui/Logo";
import { LangToggle, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SakuNav({ wallet = true }: { wallet?: boolean }) {
  const { t } = useLang();
  const path = usePathname();
  const links = [
    { href: "/bukti", label: t("Bukti on-chain", "On-chain proof") },
    { href: "/saku", label: t("Atur uang saku", "Manage allowances") },
    { href: "/terima", label: t("Untuk penerima", "For recipients") },
    { href: "/dashboard", label: t("Vault", "Vault") },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur pad-safe-top">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" aria-label="Cermin Saku" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label={t("Utama", "Main")} className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className={cn(
                "py-1 font-medium transition-colors hover:text-tinta",
                path === l.href ? "text-tinta underline decoration-2 underline-offset-8" : "text-muted",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LangToggle />
          {wallet && <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" label={t("Hubungkan", "Connect")} />}
        </div>
      </div>
      <nav aria-label={t("Utama (ponsel)", "Main (mobile)")} className="flex gap-4 overflow-x-auto border-t border-line px-4 py-2 text-sm scrollbar-hide md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={path === l.href ? "page" : undefined}
            className={cn("shrink-0 font-medium", path === l.href ? "text-tinta" : "text-muted")}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SakuFooter() {
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[2fr_1fr]">
        <div>
          <p className="font-semibold text-ink">Cermin Saku</p>
          <p className="mt-2 max-w-xl leading-relaxed">
            {t(
              "Dibangun di atas Cermin karya Kiel (Yeheskiel Yunus Tame), lisensi MIT. Uang saku terjadwal, tampilan Rupiah, Lens, dan deployment testnet ini dibuat oleh Dex Bennett untuk Indonesia Web3 Hackathon 2026.",
              "Built on Cermin by Kiel (Yeheskiel Yunus Tame), MIT license. Scheduled allowances, the Rupiah view, Lens and this testnet deployment were built by Dex Bennett for Indonesia Web3 Hackathon 2026.",
            )}
          </p>
          <p className="mt-2">
            {t(
              "Testnet saja: MUSD adalah token tiruan, harga BNB disimulasikan oleh feed tiruan. Bukan nasihat keuangan.",
              "Testnet only: MUSD is a mock token and the BNB price comes from a simulated feed. Not financial advice.",
            )}
          </p>
        </div>
        <ul className="space-y-2">
          <li>
            <a className="text-tinta hover:underline" href="https://github.com/Stylenecy/cermin-saku" target="_blank" rel="noreferrer">
              GitHub · Stylenecy/cermin-saku
            </a>
          </li>
          <li>
            <a className="text-tinta hover:underline" href="https://github.com/yeheskieltame/Cermin" target="_blank" rel="noreferrer">
              {t("Cermin asli (Kiel)", "Original Cermin (Kiel)")}
            </a>
          </li>
          <li>
            <a className="text-tinta hover:underline" href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noreferrer">
              {t("Faucet tBNB", "tBNB faucet")}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
