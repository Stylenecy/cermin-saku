"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/wallet/Connect";
import { ArrowRight } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { SiteNav } from "@/components/ui/SiteNav";
import { LangToggle } from "@/components/ui/LangToggle";
import { useLang } from "@/lib/i18n";

export function Topbar({ launchHref }: { launchHref: string | null }) {
  const { t } = useLang();
  return (
    <SiteNav
      links={[
        { href: "#how", label: t("Cara kerja", "How it works") },
        { href: "#hitung", label: t("Hitung", "Calculator") },
        { href: "#faq", label: t("Tanya jawab", "FAQ") },
      ]}
      right={
        <>
          <LangToggle className="hidden sm:inline-flex" />
          {launchHref ? (
            <Link href={launchHref} className={buttonClasses({ variant: "primary", size: "sm" })}>
              <span className="hidden sm:inline">{t("Buka dasbor", "Open dashboard")}</span>
              <span className="sm:hidden">{t("Buka", "Open")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button variant="primary" size="sm" onClick={openConnectModal}>
                  <span className="hidden sm:inline">{t("Buka aplikasi", "Launch app")}</span>
                  <span className="sm:hidden">{t("Masuk", "Launch")}</span>
                </Button>
              )}
            </ConnectButton.Custom>
          )}
        </>
      }
    />
  );
}
