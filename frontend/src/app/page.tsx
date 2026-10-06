"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { zeroAddress } from "viem";
import { useLang } from "@/lib/i18n";
import { SAKU, sakuDeployed } from "@/lib/saku";
import { useFeedPrice, useVaultSchedules } from "@/hooks/useSaku";
import { SakuNav, SakuFooter } from "@/components/saku/SakuNav";
import { EnvelopeTimeline } from "@/components/saku/EnvelopeTimeline";
import { LensPanel } from "@/components/saku/LensPanel";
import { buttonClasses } from "@/components/ui/Button";

const REPO = "https://github.com/Stylenecy/cermin-saku";

export default function HomePage() {
  const { t } = useLang();
  const demo = SAKU.DEMO_VAULT !== zeroAddress ? SAKU.DEMO_VAULT : undefined;
  const { price } = useFeedPrice();
  const schedules = useVaultSchedules(demo);
  const next = schedules.data?.find((x) => !x.cancelled && x.paid < x.periods);

  return (
    <div className="min-h-screen">
      <SakuNav />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="text-sm font-semibold text-tinta">
              {t("BNB Chain · testnet · dibangun di atas Cermin (Kiel, MIT)", "BNB Chain · testnet · built on Cermin (Kiel, MIT)")}
            </p>
            <h1 className="mt-4 text-[2.4rem] leading-[1.06] text-ink sm:text-6xl">
              {t("Uang saku dari BNB-mu, yang tahu kapan harus menahan diri.", "An allowance from your BNB that knows when to hold back.")}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              {t(
                "Orang tua di Medan menjadwalkan uang saku untuk anaknya yang kuliah di Jogja, dibayar dari vault BNB tanpa menjual BNB. Saat posisi mendekati bahaya, kontraknya sendiri yang menahan pembayaran, lalu membayarnya lagi begitu aman.",
                "A parent in Medan schedules an allowance for a child at university in Jogja, paid from a BNB vault without selling BNB. When the position nears danger, the contract itself holds the payment, and pays it once the vault is safe again.",
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/bukti" className={buttonClasses({ variant: "primary", size: "xl" })}>
                {t("Lihat pembayaran on-chain", "See the on-chain payments")}
              </Link>
              <Link href="/saku" className={buttonClasses({ variant: "secondary", size: "xl" })}>
                {t("Jadwalkan uang saku", "Schedule an allowance")}
              </Link>
            </div>
          </div>
          <EnvelopeTimeline />
        </section>

        {/* ── The two gates ────────────────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="max-w-3xl text-3xl leading-tight text-ink sm:text-4xl">
              {t("Setiap amplop harus lolos dua gerbang di dalam kontrak vault", "Every envelope must pass two gates inside the vault contract")}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              {t(
                "Bukan aturan di aplikasi, bukan janji keeper. Vault menghitung ulang dengan harga terkini setiap kali Saku meminta uang, dan menolak kalau salah satu gagal.",
                "Not an app rule, not a keeper promise. The vault recomputes at the live price every time Saku asks for money, and refuses if either gate fails.",
              )}
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p className="font-mono text-sm text-tinta">01</p>
                <h3 className="mt-2 text-2xl font-bold text-ink">{t("Posisi harus sehat", "The position must be healthy")}</h3>
                <p className="mt-3 leading-relaxed text-ink-2">
                  {t(
                    "Rasio jaminan (ICR) harus di atas garis bela keeper ditambah 10 poin. Contoh preset Seimbang: keeper membela di 140%, jadi uang saku berhenti di bawah 150%. Uang untuk bertahan didahulukan.",
                    "The collateral ratio (ICR) must sit above the keeper's defend line plus 10 points. Balanced preset: the keeper defends at 140%, so allowances stop below 150%. Money for survival comes first.",
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p className="font-mono text-sm text-tinta">02</p>
                <h3 className="mt-2 text-2xl font-bold text-ink">{t("Cadangan harus tahan banting", "The reserve must survive a crash")}</h3>
                <p className="mt-3 leading-relaxed text-ink-2">
                  {t(
                    "Setelah membayar, sisa saldo pakai + tabungan harus cukup untuk membela vault kalau BNB jatuh 30% lagi. Pemilik boleh memperketat aturan ini, tidak boleh mematikannya.",
                    "After paying, the remaining spendable + savings must still be enough to defend the vault if BNB fell another 30%. The owner may tighten this rule, never switch it off.",
                  )}
                </p>
              </div>
            </div>
            <ul className="mt-8 grid gap-3 text-sm text-ink-2 sm:grid-cols-3">
              <li className="rounded-xl border border-line px-4 py-3">
                <span className="font-bold text-stempel">{t("Ditahan, bukan hilang.", "Held, not lost.")}</span>{" "}
                {t("Amplop yang ditahan tetap terutang dan dibayar begitu aman.", "A held envelope stays owed and is paid once safe.")}
              </li>
              <li className="rounded-xl border border-line px-4 py-3">
                <span className="font-bold text-ink">{t("Batas keras.", "Hard cap.")}</span>{" "}
                {t("Saku tidak bisa memindahkan lebih dari izin yang diberikan pemilik.", "Saku can never move more than the owner's allowance.")}
              </li>
              <li className="rounded-xl border border-line px-4 py-3">
                <span className="font-bold text-ink">{t("BNB tidak disentuh.", "BNB untouched.")}</span>{" "}
                {t("Uang saku hanya keluar dari saldo pakai; jaminan BNB tidak pernah dijual.", "Allowances only leave the spendable bucket; BNB collateral is never sold.")}
              </li>
            </ul>
          </div>
        </section>

        {/* ── Try it ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="max-w-3xl text-3xl leading-tight text-ink sm:text-4xl">
            {t("Geser harga BNB. Tanya kontraknya apa yang terjadi.", "Move the BNB price. Ask the contract what happens.")}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            {t(
              "Panel ini memanggil kontrak CerminLens pada vault demo kami dengan harga hipotetis. Jawabannya angka yang sama dengan yang akan dieksekusi vault.",
              "This panel calls the CerminLens contract on our demo vault at a hypothetical price. The answers are the same numbers the vault would execute.",
            )}
          </p>
          <div className="mt-8">
            {sakuDeployed() && demo ? (
              <LensPanel vault={demo} livePrice={price} sakuAmount={next?.amount ?? 0n} />
            ) : (
              <p className="rounded-2xl border border-dashed border-kunyit bg-kunyit-soft p-6 text-sm">
                {t("Lens aktif begitu kontrak testnet dideploy.", "Lens goes live once the testnet contracts are deployed.")}
              </p>
            )}
          </div>
        </section>

        {/* ── Provenance ───────────────────────────────────────────────── */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-3xl text-ink sm:text-4xl">{t("Siapa membuat apa", "Who built what")}</h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-line p-6">
                <p className="text-sm font-semibold text-muted">{t("Dari Cermin · Kiel · Mei 2026 · MIT", "From Cermin · Kiel · May 2026 · MIT")}</p>
                <p className="mt-3 leading-relaxed text-ink-2">
                  {t(
                    "Mesin vault (CerminVault + CerminFactory), skim saat BNB naik, defend saat BNB turun, dan keeper deterministik ditulis oleh Yeheskiel Yunus Tame (Kiel) untuk Mezo Hackathon 2, juara 1 track Bitcoin Banking. Kiel memindahkannya ke BNB Chain pada akhir September 2026.",
                    "The vault engine (CerminVault + CerminFactory), skim on rises, defend on drops, and the deterministic keeper were written by Yeheskiel Yunus Tame (Kiel) for Mezo Hackathon 2, 1st place in the Bitcoin Banking track. Kiel ported it to BNB Chain in late September 2026.",
                  )}
                </p>
                <a className="mt-4 inline-block text-sm font-semibold text-tinta hover:underline" href="https://github.com/yeheskieltame/Cermin" target="_blank" rel="noreferrer">
                  github.com/yeheskieltame/Cermin
                </a>
              </div>
              <div className="rounded-2xl border-2 border-tinta p-6">
                <p className="text-sm font-semibold text-tinta">{t("Baru · Dex Bennett · 5–7 Okt 2026", "New · Dex Bennett · 5–7 Oct 2026")}</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2">
                  <li>{t("Kontrak CerminSaku: jadwal uang saku yang ditahan bila tidak aman", "CerminSaku contract: allowance schedules held when unsafe")}</li>
                  <li>{t("Vault v1.1: izin belanja berbatas + dua gerbang aman", "Vault v1.1: capped spend allowance + two safety gates")}</li>
                  <li>{t("CerminLens: 'kalau BNB jadi X' dari kontrak", "CerminLens: 'what if BNB goes to X' from the contract")}</li>
                  <li>{t("Keeper membayar amplop jatuh tempo", "Keeper pays due envelopes")}</li>
                  <li>{t("Tampilan Bahasa Indonesia + Rupiah", "Bahasa Indonesia + Rupiah interface")}</li>
                  <li>{t("Deploy BSC testnet dari dompet sendiri, tes fuzz + invariant, CI", "BSC testnet deploy from our own wallet, fuzz + invariant tests, CI")}</li>
                </ul>
                <a className="mt-4 inline-block text-sm font-semibold text-tinta hover:underline" href={`${REPO}/blob/main/CONTRIBUTIONS.md`} target="_blank" rel="noreferrer">
                  {t("Rincian per commit: CONTRIBUTIONS.md", "Per-commit detail: CONTRIBUTIONS.md")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Limits ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl text-ink sm:text-4xl">{t("Batas yang kami akui", "Limits we own up to")}</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-3 leading-relaxed text-ink-2 md:grid-cols-2">
            <li>
              <b>{t("CDP tiruan.", "Mock CDP.")}</b>{" "}
              {t("BNB Chain belum punya CDP gaya Liquity; vault berjalan di atas tumpukan tiruan (MUSD tiruan, tanpa likuidasi sungguhan).", "BNB Chain has no Liquity-style CDP yet; the vault runs on a mock stack (mock MUSD, no real liquidations).")}
            </li>
            <li>
              <b>{t("Harga disimulasikan.", "Simulated price.")}</b>{" "}
              {t("Feed harga tiruan dimiliki deployer kami supaya penurunan bisa didemokan. Nilai awal diambil dari Chainlink BNB/USD testnet.", "The mock price feed is owned by our deployer so drops can be demoed. Its starting value was read from Chainlink BNB/USD testnet.")}
            </li>
            <li>
              <b>{t("Satu keeper.", "One keeper.")}</b>{" "}
              {t("Keeper kami satu proses. Tapi release() terbuka untuk siapa saja, dan vault tetap memeriksa sendiri.", "Our keeper is a single process. But release() is open to anyone, and the vault still checks for itself.")}
            </li>
            <li>
              <b>{t("Belum ke Rupiah sungguhan.", "No real Rupiah yet.")}</b>{" "}
              {t("Rupiah hanya tampilan dengan kurs indikatif. Penukaran ke rekening bank adalah rencana, bukan fitur.", "Rupiah is display only at an indicative rate. Cash-out to a bank account is roadmap, not a feature.")}
            </li>
          </ul>
        </section>
      </main>
      <SakuFooter />
    </div>
  );
}
