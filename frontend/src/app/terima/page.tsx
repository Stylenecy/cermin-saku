"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useLang } from "@/lib/i18n";
import { useFeedPrice, useRecipientSchedules } from "@/hooks/useSaku";
import { SAKU, sakuDeployed } from "@/lib/saku";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { SakuNav, SakuFooter } from "@/components/saku/SakuNav";
import { ScheduleCards } from "@/components/saku/ScheduleCards";
import { Rp, RateNote } from "@/components/saku/Money";

/** The child's side: what is coming, what arrived, and why one was held. */
export default function TerimaPage() {
  const { t } = useLang();
  const { address } = useAccount();
  const [input, setInput] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("alamat");
    if (q && isAddress(q)) setInput(q);
    else if (address) setInput(address);
  }, [address]);
  const who = isAddress(input) ? (input as `0x${string}`) : undefined;
  const { price } = useFeedPrice();
  const schedules = useRecipientSchedules(who);
  const { data: balance } = useReadContract({
    address: CONTRACTS.MUSD,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: who ? [who] : undefined,
    query: { enabled: !!who && sakuDeployed(), refetchInterval: 15_000 },
  });

  return (
    <div className="min-h-screen">
      <SakuNav />
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-tinta">{t("Untuk penerima", "For recipients")}</p>
        <h1 className="mt-2 text-3xl leading-tight text-ink sm:text-5xl">{t("Uang sakumu, dari mana dan kapan", "Your allowance: where from, and when")}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          {t(
            "Tempel alamat dompetmu (atau hubungkan dompet). Kamu akan melihat amplop yang dijadwalkan untukmu, yang sudah sampai, dan kalau ada yang ditahan, alasannya.",
            "Paste your wallet address (or connect). You'll see the envelopes scheduled for you, the ones that arrived, and if one was held, why.",
          )}
        </p>
        <label className="mt-6 block text-sm font-semibold text-ink">
          {t("Alamat dompet penerima", "Recipient wallet address")}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            placeholder="0x…"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink focus:border-tinta focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </label>
        {input && !who && <p className="mt-2 text-sm text-kunyit">{t("Alamat belum valid.", "Not a valid address yet.")}</p>}

        {who && (
          <>
            <div className="mt-6 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t("Saldo MUSD diterima", "MUSD received")}</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                <Rp wei={balance as bigint | undefined} />
              </p>
            </div>
            <h2 className="mt-10 text-2xl text-ink">{t("Amplop untukmu", "Envelopes for you")}</h2>
            <div className="mt-4">
              <ScheduleCards
                schedules={schedules.data}
                vault={undefined}
                livePrice={price}
                ownerView={false}
                isLoading={schedules.isLoading}
                isError={schedules.isError}
              />
            </div>
          </>
        )}
        <RateNote className="mt-8" />
        <p className="mt-2 text-xs text-muted">
          {t(
            "Testnet: MUSD di sini adalah token tiruan tanpa nilai. Penukaran ke Rupiah belum ada (rencana).",
            "Testnet: MUSD here is a mock token with no value. Cash-out to Rupiah does not exist yet (roadmap).",
          )}
        </p>
        <p className="sr-only">{SAKU.SAKU}</p>
      </main>
      <SakuFooter />
    </div>
  );
}
