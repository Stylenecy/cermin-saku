"use client";

import { useLang } from "@/lib/i18n";
import { useLedger, type LedgerEntry } from "@/hooks/useSaku";
import { STATUS_TEXT, statusName } from "@/lib/saku";
import { EXPLORER_URL } from "@/lib/chains";
import { truncateAddress } from "@/lib/utils";
import { Rp, RpPrice } from "./Money";

function when(ts: number | undefined, lang: "id" | "en") {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function Row({ e }: { e: LedgerEntry }) {
  const { t, lang } = useLang();
  let tag: React.ReactNode;
  let body: React.ReactNode;
  switch (e.kind) {
    case "paid":
      tag = <span className="rounded-md bg-daun px-2 py-0.5 text-xs font-bold text-white">{t("DIBAYAR", "PAID")}</span>;
      body = (
        <>
          <Rp wei={e.amount} className="font-semibold text-ink" /> → {truncateAddress(e.recipient ?? "")}
          <span className="text-muted"> · {t("ke", "no.")}-{e.paymentNo} · ICR {(Number(e.icrBps) / 100).toFixed(0)}%</span>
        </>
      );
      break;
    case "held": {
      const s = statusName(e.reason ?? 0);
      tag = <span className="stamp text-stempel">{t("Ditahan", "Held")}</span>;
      body = (
        <>
          <span className="text-ink">{lang === "id" ? STATUS_TEXT[s].id : STATUS_TEXT[s].en}</span>
          <span className="text-muted">
            {" "}
            · ICR {(Number(e.icrBps) / 100).toFixed(1)}% · BNB <RpPrice price={e.price} />
          </span>
        </>
      );
      break;
    }
    case "defended":
      tag = <span className="rounded-md bg-kunyit px-2 py-0.5 text-xs font-bold text-white">{t("DIBELA", "DEFENDED")}</span>;
      body = (
        <>
          {t("Keeper mencicil utang", "Keeper repaid debt")} <Rp wei={e.amount} className="font-semibold text-ink" showUsd={false} />
          <span className="text-muted">
            {" "}
            · ICR {(Number(e.icrBps) / 100).toFixed(0)}% → {(Number(e.icrAfterBps) / 100).toFixed(0)}%
          </span>
        </>
      );
      break;
    case "skimmed":
      tag = <span className="rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-white">SKIM</span>;
      body = (
        <>
          {t("BNB naik, Shadow bertambah", "BNB rose, Shadow grew")} <Rp wei={e.amount} sign="+" showUsd={false} />
        </>
      );
      break;
    case "created":
      tag = <span className="rounded-md border border-tinta px-2 py-0.5 text-xs font-bold text-tinta">{t("JADWAL", "SCHEDULE")}</span>;
      body = (
        <>
          {t("Amplop baru", "New envelope")} <Rp wei={e.amount} showUsd={false} /> → {truncateAddress(e.recipient ?? "")}
        </>
      );
      break;
    case "cancelled":
      tag = <span className="rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted">{t("DIBATALKAN", "CANCELLED")}</span>;
      body = <>{t("Jadwal dibatalkan pemilik vault", "Schedule cancelled by the vault owner")}</>;
      break;
  }
  return (
    <li className="ledger-row grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 py-3 sm:grid-cols-[7.5rem_auto_1fr_auto] sm:items-center">
      <span className="col-span-2 font-mono text-xs text-muted tabular sm:col-span-1">{when(e.timestamp, lang)}</span>
      <span className="self-start sm:self-center">{tag}</span>
      <span className="min-w-0 text-sm leading-relaxed">{body}</span>
      <a
        href={`${EXPLORER_URL}/tx/${e.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="col-span-2 font-mono text-xs text-tinta underline-offset-2 hover:underline sm:col-span-1"
      >
        {e.txHash.slice(0, 10)}…
      </a>
    </li>
  );
}

/** The passbook: every payment, hold, defend and skim, newest first, from event logs. */
export function Ledger({ vault, limit = 30 }: { vault: `0x${string}` | undefined; limit?: number }) {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useLedger(vault);
  return (
    <section aria-labelledby="ledger-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ledger-title" className="text-xl text-ink">
          {t("Buku catatan on-chain", "On-chain passbook")}
        </h2>
        <span className="text-xs text-muted">{t("dari event log, tanpa indexer", "from event logs, no indexer")}</span>
      </div>
      {isLoading && <p className="mt-4 text-sm text-muted">{t("Membaca event dari BNB Chain…", "Reading events from BNB Chain…")}</p>}
      {isError && (
        <p className="mt-4 text-sm text-stempel">
          {t("Gagal membaca log dari RPC.", "Could not read logs from the RPC.")}{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            {t("Coba lagi", "Retry")}
          </button>
        </p>
      )}
      {data && data.length === 0 && (
        <p className="mt-4 text-sm text-muted">{t("Belum ada catatan untuk vault ini.", "No entries for this vault yet.")}</p>
      )}
      {data && data.length > 0 && (
        <ol className="mt-3">
          {data.slice(0, limit).map((e) => (
            <Row key={`${e.txHash}-${e.logIndex}`} e={e} />
          ))}
        </ol>
      )}
    </section>
  );
}
