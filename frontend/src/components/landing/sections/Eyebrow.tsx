import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* OwnaFarm-style technical chip: icon · mono caption · optional note. */
export function Eyebrow({
  icon,
  label,
  note,
  tone = "muted",
}: {
  icon?: ReactNode;
  label: string;
  note?: string;
  tone?: "muted" | "light";
}) {
  const dark = tone === "light";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5",
        dark ? "border-white/15 bg-white/5" : "border-cream-300 bg-surface/70 backdrop-blur",
      )}
    >
      <span className="text-amber-500 flex items-center">{icon}</span>
      <span
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.18em]",
          dark ? "text-cream-100" : "text-ink",
        )}
      >
        {label}
      </span>
      {note && (
        <>
          <span className={cn("w-px h-3", dark ? "bg-white/20" : "bg-cream-400")} />
          <span className={cn("font-mono text-[11px]", dark ? "text-white/50" : "text-muted-2")}>
            {note}
          </span>
        </>
      )}
    </div>
  );
}
