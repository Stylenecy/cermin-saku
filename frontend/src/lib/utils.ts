import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatBtc(wei: bigint): string {
  const btc = Number(wei) / 1e18;
  return btc.toFixed(6) + " BNB";
}

export function formatMusd(wei: bigint): string {
  const amount = Number(wei) / 1e18;
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " MUSD"
  );
}

export function formatIcr(icrBps: bigint | number): string {
  const n = typeof icrBps === "bigint" ? Number(icrBps) : icrBps;
  return (n / 100).toFixed(1) + "%";
}

/** Hex stroke color for the ICR ring (warm semantic scale). */
export function icrToColor(icrBps: number): string {
  if (icrBps >= 20000) return "#6B8E5A"; // sage
  if (icrBps >= 16000) return "#C77A3A"; // amber
  if (icrBps >= 13500) return "#A85F26"; // deep amber
  return "#A84A3A"; // brick
}

/** Tailwind text color class for the same threshold scale. */
export function icrToTextClass(icrBps: number): string {
  if (icrBps >= 20000) return "text-success";
  if (icrBps >= 16000) return "text-warning";
  if (icrBps >= 13500) return "text-amber-700";
  return "text-danger";
}

export function icrLabel(icrBps: number): string {
  if (icrBps >= 30000) return "Healthy";
  if (icrBps >= 20000) return "Safe";
  if (icrBps >= 15000) return "Caution";
  if (icrBps >= 12500) return "Danger";
  return "Critical";
}

export function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

/** Prefer viem's BaseError.shortMessage; fall back to a truncated message. */
export function formatTxError(err: unknown, max = 240): string {
  if (!err) return "";
  if (typeof err === "object" && err !== null) {
    const e = err as { shortMessage?: string; message?: string };
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message.length > max ? e.message.slice(0, max) + "…" : e.message;
  }
  const s = String(err);
  return s.length > max ? s.slice(0, max) + "…" : s;
}
