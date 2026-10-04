"use client";

import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { SiteNav } from "@/components/ui/SiteNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      <SiteNav
        links={[
          { href: "/#how", label: "How it works" },
          { href: "/#features", label: "Features" },
          { href: "/#faq", label: "FAQ" },
        ]}
        right={
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        }
      />
      {children}
    </div>
  );
}
