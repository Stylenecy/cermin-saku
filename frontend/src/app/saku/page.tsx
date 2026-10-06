"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useLang } from "@/lib/i18n";
import { useVault } from "@/hooks/useVault";
import { useFeedPrice, useSakuAllowance, useVaultSchedules } from "@/hooks/useSaku";
import { sakuDeployed, bps } from "@/lib/saku";
import { SakuNav, SakuFooter } from "@/components/saku/SakuNav";
import { CreateSchedule } from "@/components/saku/CreateSchedule";
import { ScheduleCards } from "@/components/saku/ScheduleCards";
import { LensPanel } from "@/components/saku/LensPanel";
import { Ledger } from "@/components/saku/Ledger";
import { Rp, RateNote } from "@/components/saku/Money";
import { buttonClasses } from "@/components/ui/Button";

export default function SakuPage() {
  const { t } = useLang();
  const { isConnected } = useAccount();
  const v = useVault();
  const { price } = useFeedPrice();
  const vault = v.vaultAddress;
  const { allowance, policy } = useSakuAllowance(vault);
  const schedules = useVaultSchedules(vault);
  const spendable = v.shadow ? v.shadow[0] : v.state?.spendableMusd;
  const next = schedules.data?.find((x) => !x.cancelled && x.paid < x.periods);

  return (
    <div className="min-h-screen">
      <SakuNav />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-tinta">{t("Atur uang saku", "Manage allowances")}</p>
        <h1 className="mt-2 max-w-3xl text-3xl leading-tight text-ink sm:text-5xl">
          {t("Amplop terjadwal dari vault BNB‑mu", "Scheduled envelopes from your BNB vault")}
        </h1>

        {!sakuDeployed() ? (
          <p className="mt-8 rounded-2xl border border-dashed border-kunyit bg-kunyit-soft p-6 text-sm">
            {t("Kontrak Saku belum dideploy di jaringan ini.", "Saku contracts are not deployed on this network yet.")}
          </p>
        ) : !isConnected ? (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <p className="max-w-xl leading-relaxed text-muted">
              {t(
                "Hubungkan dompet pemilik vault untuk menjadwalkan uang saku. Mau lihat dulu tanpa dompet? Buka vault demo kami.",
                "Connect the vault owner's wallet to schedule allowances. Want to look first without a wallet? Open our demo vault.",
              )}
            </p>
            <Link href="/bukti" className={`${buttonClasses({ variant: "secondary", size: "lg" })} mt-5`}>
              {t("Lihat vault demo on-chain", "See the on-chain demo vault")}
            </Link>
          </div>
        ) : v.isLoading ? (
          <p className="mt-8 text-sm text-muted">{t("Membaca vault…", "Reading vault…")}</p>
        ) : !v.hasVault || !vault ? (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <p className="max-w-xl leading-relaxed text-muted">
              {t(
                "Dompet ini belum punya vault. Uang saku dibayar dari saldo pakai vault, jadi buka vault dulu dengan menyetor BNB.",
                "This wallet has no vault yet. Allowances are paid from the vault's spendable balance, so open a vault by depositing BNB first.",
              )}
            </p>
            <Link href="/onboard" className={`${buttonClasses({ variant: "primary", size: "lg" })} mt-5`}>
              {t("Buka vault dengan BNB", "Open a vault with BNB")}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t("Saldo pakai", "Spendable")}</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  <Rp wei={spendable} showUsd={false} />
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t("Izin Saku tersisa", "Saku allowance left")}</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  <Rp wei={allowance} showUsd={false} />
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t("Aturan aman", "Safety rule")}</p>
                <p className="mt-1 text-sm text-ink">
                  {policy && v.params
                    ? t(
                        `Bayar hanya bila ICR ≥ ${bps(v.params.defendICR + policy.floorBufferBps)}% dan cadangan tahan BNB turun ${bps(policy.stressBps)}% lagi`,
                        `Pay only if ICR ≥ ${bps(v.params.defendICR + policy.floorBufferBps)}% and the reserve survives another ${bps(policy.stressBps)}% drop`,
                      )
                    : "…"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <CreateSchedule vault={vault} spendable={spendable} allowance={allowance} />
            </div>

            <h2 className="mt-12 text-2xl text-ink">{t("Amplopmu", "Your envelopes")}</h2>
            <div className="mt-4">
              <ScheduleCards
                schedules={schedules.data}
                vault={vault}
                livePrice={price}
                ownerView
                isLoading={schedules.isLoading}
                isError={schedules.isError}
              />
            </div>
            <div className="mt-10">
              <LensPanel vault={vault} livePrice={price} sakuAmount={next?.amount ?? schedules.data?.[0]?.amount ?? 0n} sakuPending={!!next} />
            </div>
            <div className="mt-10">
              <Ledger vault={vault} />
            </div>
          </>
        )}
        <RateNote className="mt-6" />
      </main>
      <SakuFooter />
    </div>
  );
}
