"use client";

import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** ID | EN switch, sized to sit next to the nav button. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className={cn("inline-flex items-center rounded-full border border-line/80 bg-surface/70 p-0.5 text-xs font-medium", className)}
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-7 min-w-[2.25rem] rounded-full px-2 uppercase tracking-wide transition-colors",
            lang === l ? "bg-ink text-cream-50" : "text-muted hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
