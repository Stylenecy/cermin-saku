"use client";

export const dynamic = "force-dynamic";

import { zeroAddress } from "viem";
import { useLang } from "@/lib/i18n";
import { SAKU, sakuDeployed } from "@/lib/saku";
import { EXPLORER_URL } from "@/lib/chains";
import { useFeedPrice, useLensSnapshot, useVaultSchedules } from "@/hooks/useSaku";
import { SakuNav, SakuFooter } from "@/components/saku/SakuNav";
import { LensPanel } from "@/components/saku/LensPanel";
import { Ledger } from "@/components/saku/Ledger";
import { ScheduleCards } from "@/components/saku/ScheduleCards";
import { ContractList } from "@/components/saku/ContractList";
import { Rp, RpPrice, RateNote } from "@/components/saku/Money";
import { truncateAddress } from "@/lib/utils";
import { formatBps, formatNum } from "@/lib/idr";

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{children}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function BuktiPage() {
  const { t, lang } = useLang();
  const vault = SAKU.DEMO_VAULT !== zeroAddress ? SAKU.DEMO_VAULT : undefined;
  const { price, isError: priceError } = useFeedPrice();
  const snap = useLensSnapshot(vault, price);
  const schedules = useVaultSchedules(vault);
  const s = snap.data;
  const next = schedules.data?.find((x) => !x.cancelled && x.paid < x.periods);

  return (
    <div className="min-h-screen">
      <SakuNav />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-tinta">{t("Bukti on-chain", "On-chain proof")}</p>
        <h1 className="mt-2 max-w-3xl text-3xl leading-tight text-ink sm:text-5xl">
          {t("Satu vault sungguhan, dibaca langsung dari BNB Chain", "One real vault, read straight from BNB Chain")}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted">
          {t(
            "Halaman ini tidak butuh dompet. Semua angka dibaca dari kontrak lewat RPC publik: vault demo milik deployer kami, jadwal uang sakunya, dan setiap pembayaran atau penahanan yang tercatat sebagai event.",
            "No wallet needed. Every number is read from the contracts over a public RPC: our deployer's demo vault, its allowance schedules, and every payment or hold recorded as an event.",
          )}
        </p>

        {!sakuDeployed() || !vault ? (
          <div className="mt-10 rounded-2xl border border-dashed border-kunyit bg-kunyit-soft p-6 text-sm text-ink">
            {t(
              "Kontrak Cermin Saku belum dideploy ke jaringan ini (alamat belum diisi). Begitu deploy BSC testnet selesai, halaman ini terisi otomatis.",
              "Cermin Saku contracts are not deployed on this network yet (addresses not set). Once the BSC testnet deploy is done, this page fills in automatically.",
            )}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={t("Harga BNB (simulasi)", "BNB price (simulated)")} note={price ? `$${formatNum(Number(price) / 1e18, lang, 2)}` : priceError ? t("feed tidak terjangkau", "feed unreachable") : "…"}>
                <RpPrice price={price} />
              </Stat>
              <Stat label={t("Jaminan", "Collateral")} note={t("tidak pernah dijual", "never sold")}>
                {s ? `${formatNum(Number(s.collateral) / 1e18, lang, 2)} BNB` : "…"}
              </Stat>
              <Stat label="ICR" note={s ? `${t("Saku berhenti di bawah", "Saku pauses below")} ${s.sakuFloorICR / 100}%` : undefined}>
                {s ? formatBps(s.icrBps, lang, 1) : "…"}
              </Stat>
              <Stat label={t("Saldo pakai", "Spendable")} note={s ? <>{t("tabungan", "savings")} <Rp wei={s.savings} showUsd={false} /></> : undefined}>
                <Rp wei={s?.spendable} showUsd={false} />
              </Stat>
            </div>
            <p className="mt-3 text-xs text-muted">
              {t("Vault demo", "Demo vault")}:{" "}
              <a className="font-mono text-tinta hover:underline" href={`${EXPLORER_URL}/address/${vault}`} target="_blank" rel="noreferrer">
                {truncateAddress(vault)}
              </a>
            </p>

            <h2 className="mt-12 text-2xl text-ink">{t("Amplop yang dijadwalkan", "Scheduled envelopes")}</h2>
            <div className="mt-4">
              <ScheduleCards
                schedules={schedules.data}
                vault={vault}
                livePrice={price}
                ownerView={false}
                isLoading={schedules.isLoading}
                isError={schedules.isError}
              />
            </div>

            <div className="mt-10">
              <LensPanel vault={vault} livePrice={price} sakuAmount={next?.amount ?? 0n} />
            </div>
            <div className="mt-10">
              <Ledger vault={vault} />
            </div>
          </>
        )}

        <div className="mt-10">
          <ContractList />
        </div>
        <RateNote className="mt-6" />
      </main>
      <SakuFooter />
    </div>
  );
}
