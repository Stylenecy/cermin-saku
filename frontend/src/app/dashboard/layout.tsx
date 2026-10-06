"use client";

import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { SiteNav } from "@/components/ui/SiteNav";
import { useLang } from "@/lib/i18n";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen text-ink">
      <SiteNav
        links={[
          { href: "/#how", label: t("Cara kerja", "How it works") },
          { href: "/#features", label: t("Fitur", "Features") },
          { href: "/#faq", label: t("Tanya jawab", "FAQ") },
        ]}
        right={
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        }
      />
      {children}
    </div>
  );
}
