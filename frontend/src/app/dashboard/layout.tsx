"use client";

import type { ReactNode } from "react";
import { SakuNav, SakuFooter } from "@/components/saku/SakuNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      <SakuNav />
      {children}
      <SakuFooter />
    </div>
  );
}
