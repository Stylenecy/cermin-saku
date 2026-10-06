import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

export type NavLink = { href: string; label: string };

/**
 * Floating, rounded navigation shared by the landing and the dashboard.
 * Sticks a constant gap below the top edge (pt on the header, so the pill
 * keeps the same offset whether at rest or stuck during scroll).
 */
export function SiteNav({
  links,
  right,
}: {
  links?: NavLink[];
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:pt-4 pad-safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full glass border border-line/60 px-4 pr-3 sm:px-6 sm:pr-4 h-14 sm:h-16 shadow-[0_10px_34px_-14px_rgba(58,53,48,0.4)]">
        <Link
          href="/"
          aria-label="Cermin home"
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          <Logo />
        </Link>

        {links && links.length > 0 ? (
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative py-1 transition-colors hover:text-ink after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full"
              >
                {l.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
