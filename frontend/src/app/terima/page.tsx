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
      <main className="mx-auto max-w-4xl px-6 pb-10 pt-10">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-cream-300 bg-surface/70 backdrop-blur px-3 py-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">{t("Untuk penerima", "For recipients")}</span>
        </div>
        <h1 className="font-serif text-[2rem] md:text-[2.5rem] font-medium tracking-[-0.02em] text-ink leading-tight">
          {t("Uang sakumu, ", "Your allowance, ")}
          <em className="italic font-normal text-amber-600">{t("dari mana dan kapan", "from where and when")}</em>
        </h1>
        <p className="mt-2.5 max-w-2xl leading-relaxed text-muted">
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
            className="mt-2 w-full rounded-2xl border border-cream-300 bg-surface px-4 py-3.5 font-mono text-sm text-ink shadow-sm focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200/50"
          />
        </label>
        {input && !who && <p className="mt-2 text-sm text-kunyit">{t("Alamat belum valid.", "Not a valid address yet.")}</p>}

        {who && (
          <>
            <div className="mt-6 rounded-3xl border border-cream-300 bg-surface shadow-soft px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t("Saldo MUSD diterima", "MUSD received")}</p>
              <p className="mt-1 font-serif text-3xl font-medium text-ink">
                <Rp wei={balance as bigint | undefined} />
              </p>
            </div>
            <h2 className="mt-10 font-serif text-2xl md:text-[1.75rem] font-medium tracking-[-0.02em] text-ink">
              {t("Amplop ", "Envelopes ")}
              <em className="italic font-normal text-amber-600">{t("untukmu", "for you")}</em>
            </h2>
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
        <p className="sr-only">{SAKU.SAKU}</p>
      </main>
      <SakuFooter />
    </div>
  );
}
