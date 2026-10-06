"use client";

import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useLensWhatIf, type ScheduleRow } from "@/hooks/useSaku";
import { CERMIN_SAKU_ABI } from "@/lib/abis.generated";
import { SAKU, STATUS_TEXT, decodeLabel, periodLabel, statusName } from "@/lib/saku";
import { formatTxError, truncateAddress } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/chains";
import { Envelope, type EnvelopeState } from "./Envelope";
import { Rp } from "./Money";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const h = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(h);
  }, [intervalMs]);
  return now;
}

function countdown(sec: number, lang: "id" | "en") {
  if (sec <= 0) return lang === "id" ? "jatuh tempo" : "due now";
  const u = lang === "id" ? { d: " hari", h: " jam", m: " mnt", s: " dtk" } : { d: "d", h: "h", m: "m", s: "s" };
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3_600);
  const m = Math.floor((sec % 3_600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}${u.d} ${h}${u.h}`;
  if (h > 0) return `${h}${u.h} ${m}${u.m}`;
  return `${m}${u.m} ${String(s).padStart(2, "0")}${u.s}`;
}

function ScheduleCard({
  s,
  vault,
  livePrice,
  canCancel,
}: {
  s: ScheduleRow;
  vault: `0x${string}`;
  livePrice: bigint | undefined;
  canCancel: boolean;
}) {
  const { t, lang } = useLang();
  const now = useNow();
  const qc = useQueryClient();
  const { saku } = useLensWhatIf(vault, livePrice, s.amount);
  const status = saku ? statusName(Number(saku[0])) : undefined;
  const finished = s.paid >= s.periods || s.cancelled;
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) {
      qc.invalidateQueries({ queryKey: ["saku-schedules"] });
      qc.invalidateQueries({ queryKey: ["saku-ledger"] });
      reset();
    }
  }, [isSuccess, qc, reset]);

  const envState: EnvelopeState = finished
    ? "paid"
    : s.due > 0
      ? status && status !== "Ok"
        ? "held"
        : "due"
      : "upcoming";
  const secsToNext = Number(s.nextDueAt) - now;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-cream-300 bg-surface shadow-soft p-5 sm:flex-row sm:items-center">
      <Envelope state={envState} className="w-24 shrink-0 sm:w-28" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-bold text-ink">{decodeLabel(s.label) || t("Uang saku", "Allowance")}</h3>
          <span className="font-mono text-xs text-muted">#{s.id.toString()}</span>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          <Rp wei={s.amount} className="font-semibold text-ink" /> · {periodLabel(s.period, lang)} ·{" "}
          {t("ke", "to")}{" "}
          <a className="font-mono text-tinta underline-offset-2 hover:underline" href={`${EXPLORER_URL}/address/${s.recipient}`} target="_blank" rel="noreferrer">
            {truncateAddress(s.recipient)}
          </a>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={s.periods}
            aria-valuenow={s.paid}
            aria-label={t("pembayaran terlaksana", "payments made")}
          >
            <div className="h-full bg-daun" style={{ width: `${(s.paid / s.periods) * 100}%` }} />
          </div>
          <span className="text-xs text-muted tabular">
            {s.paid}/{s.periods} {t("dibayar", "paid")}
          </span>
        </div>
        <p className="mt-2 text-sm">
          {s.cancelled ? (
            <span className="text-muted">{t("Dibatalkan pemilik vault.", "Cancelled by the vault owner.")}</span>
          ) : finished ? (
            <span className="text-daun">{t("Selesai — semua amplop terkirim.", "Done — every envelope delivered.")}</span>
          ) : s.due > 0 ? (
            <span className={status === "Ok" ? "text-daun" : "text-stempel"}>
              {s.due} {t("pembayaran jatuh tempo", "payment(s) due")} ·{" "}
              {status ? (lang === "id" ? STATUS_TEXT[status].id : STATUS_TEXT[status].en) : "…"}
            </span>
          ) : (
            <span className="text-muted tabular">
              {t("Amplop berikutnya", "Next envelope")}: {countdown(secsToNext, lang)}
            </span>
          )}
        </p>
        {error && <p className="mt-2 text-xs text-stempel">{formatTxError(error, 160)}</p>}
      </div>
      {canCancel && !finished && (
        <button
          type="button"
          disabled={isPending || confirming}
          onClick={() => writeContract({ address: SAKU.SAKU, abi: CERMIN_SAKU_ABI, functionName: "cancel", args: [s.id] })}
          className="self-start rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted hover:border-stempel hover:text-stempel disabled:opacity-50 sm:self-center"
        >
          {isPending || confirming ? t("Membatalkan…", "Cancelling…") : t("Batalkan", "Cancel")}
        </button>
      )}
    </article>
  );
}

export function ScheduleCards({
  schedules,
  vault,
  livePrice,
  ownerView,
  isLoading,
  isError,
}: {
  schedules: ScheduleRow[] | undefined;
  vault: `0x${string}` | undefined;
  livePrice: bigint | undefined;
  ownerView: boolean;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const { t } = useLang();
  const { address } = useAccount();
  if (isLoading) return <p className="text-sm text-muted">{t("Memuat jadwal…", "Loading schedules…")}</p>;
  if (isError) return <p className="text-sm text-stempel">{t("Gagal membaca jadwal dari kontrak.", "Could not read schedules from the contract.")}</p>;
  if (!schedules || schedules.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
        {t("Belum ada amplop terjadwal.", "No scheduled envelopes yet.")}
      </p>
    );
  return (
    <div className="grid gap-3">
      {schedules.map((s) => (
        <ScheduleCard key={s.id.toString()} s={s} vault={vault ?? s.vault} livePrice={livePrice} canCancel={ownerView && !!address} />
      ))}
    </div>
  );
}
