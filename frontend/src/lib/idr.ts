"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Indicative USD → IDR rate for display only. MUSD is a dollar stablecoin;
 * the contracts never see Rupiah. Live rate from open.er-api.com
 * (ExchangeRate-API, free tier, CORS-enabled); if that fails we fall back to
 * the rate read when this file was written, and say so in the UI.
 */
export const FALLBACK_USD_IDR = 17_888.61;
export const FALLBACK_AS_OF = "2026-10-04T00:02:32Z";
const SOURCE = "ExchangeRate-API (open.er-api.com)";

export interface UsdIdr {
  rate: number;
  asOf: string; // ISO timestamp of the rate
  source: string;
  live: boolean;
}

async function fetchRate(): Promise<UsdIdr> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`rate ${res.status}`);
  const j = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  const rate = j.rates?.IDR;
  if (j.result !== "success" || !rate || rate < 1_000 || rate > 100_000) throw new Error("bad rate");
  return {
    rate,
    asOf: new Date((j.time_last_update_unix ?? 0) * 1000).toISOString(),
    source: SOURCE,
    live: true,
  };
}

export function useUsdIdr(): UsdIdr {
  const { data } = useQuery({
    queryKey: ["usd-idr"],
    queryFn: fetchRate,
    staleTime: 60 * 60_000,
    retry: 1,
  });
  return data ?? { rate: FALLBACK_USD_IDR, asOf: FALLBACK_AS_OF, source: SOURCE, live: false };
}

const idrFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const idrCompact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

/** Rp 1.234.567 */
export function formatIdr(value: number): string {
  return idrFmt.format(Math.round(value)).replace(/ /g, " ");
}

/** Rp 14,2 jt — for axis labels and tight spots. */
export function formatIdrCompact(value: number): string {
  return `Rp ${idrCompact.format(value)}`;
}

/** 18-decimal MUSD (≈ USD) amount → Rupiah. */
export function musdToIdr(wei: bigint, rate: number): number {
  return (Number(wei) / 1e18) * rate;
}

/** Rupiah → 18-decimal MUSD, rounded down to a whole cent. */
export function idrToMusdWei(idr: number, rate: number): bigint {
  const cents = Math.floor((idr / rate) * 100);
  return BigInt(cents) * 10n ** 16n;
}

export function formatAsOf(iso: string, lang: "id" | "en"): string {
  const d = new Date(iso);
  return d.toLocaleString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  });
}

/** A plain number in the reader's convention: 143,4 (id) or 143.4 (en). */
export function formatNum(value: number, lang: "id" | "en", digits = 0): string {
  return value.toLocaleString(lang === "id" ? "id-ID" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Basis points (14340) as a percent string: "143,4%". */
export function formatBps(bps: bigint | number | undefined, lang: "id" | "en", digits = 1): string {
  return bps === undefined ? "…" : `${formatNum(Number(bps) / 100, lang, digits)}%`;
}
