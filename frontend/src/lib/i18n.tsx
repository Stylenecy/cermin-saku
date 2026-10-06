"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Two-language UI (Bahasa Indonesia first, English second). Strings live next
 * to the component as pairs — t("Uang saku", "Allowance") — so a translation
 * can never drift away from the text it translates.
 */
export type Lang = "id" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (id: string, en: string) => string;
}

const STORAGE_KEY = "cermin-saku:lang";

const Ctx = createContext<LangCtx>({
  lang: "id",
  setLang: () => {},
  t: (id) => id,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "id") setLangState(saved);
    } catch {
      // storage blocked (private mode): stay on Bahasa Indonesia
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: (id: string, en: string) => (lang === "id" ? id : en) }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

/** Small ID | EN switch for the nav. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className={`inline-flex items-center rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold ${className}`}
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-2 py-1 uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-tinta ${
            lang === l ? "bg-tinta text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
