"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { SiteNav } from "@/components/ui/SiteNav";

export function Topbar({ launchHref }: { launchHref: string | null }) {
  return (
    <SiteNav
      links={[
        { href: "#how", label: "How it works" },
        { href: "#features", label: "Features" },
        { href: "#faq", label: "FAQ" },
      ]}
      right={
        launchHref ? (
          <Link href={launchHref} className={buttonClasses({ variant: "primary", size: "sm" })}>
            <span className="hidden sm:inline">Open dashboard</span>
            <span className="sm:hidden">Open</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button variant="primary" size="sm" onClick={openConnectModal}>
                <span className="hidden sm:inline">Launch app</span>
                <span className="sm:hidden">Launch</span>
              </Button>
            )}
          </ConnectButton.Custom>
        )
      }
    />
  );
}
