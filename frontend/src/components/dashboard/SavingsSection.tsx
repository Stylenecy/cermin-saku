"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { DepositPhase } from "@/hooks/useSavingsActions";
import { PiggyBank, TrendingUp, Sparkles, Layers } from "lucide-react";

const usd2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

interface SavingsSectionProps {
  poolTvl: bigint;
  aprPct: number;
  vaultSavings: bigint; // CerminVault's sMUSD value (principal + yield), auto-managed
  vaultPrincipal: bigint; // CerminVault's smusdShares (principal only)
  userShares: bigint; // direct wallet sMUSD
  userYield: bigint; // direct wallet claimable yield
  walletMusd: bigint;
  allowance: bigint;
  onDeposit: (amount: bigint, allowance: bigint) => void;
  onWithdraw: (amount: bigint) => void;
  onClaim: () => void;
  depositPhase: DepositPhase;
  isDepositing: boolean;
  isWithdrawing: boolean;
  isClaiming: boolean;
}

export function SavingsSection(p: SavingsSectionProps) {
  const tvl = Number(p.poolTvl) / 1e18;
  const vaultVal = Number(p.vaultSavings) / 1e18;
  const vaultPrin = Number(p.vaultPrincipal) / 1e18;
  const vaultYield = Math.max(0, vaultVal - vaultPrin);
  const userPrin = Number(p.userShares) / 1e18;
  const userYield = Number(p.userYield) / 1e18;
  const wallet = Number(p.walletMusd) / 1e18;
  const sharePct = tvl > 0 ? ((vaultPrin + userPrin) / tvl) * 100 : 0;
  const totalEarning = vaultVal + userPrin + userYield;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-cream-300 bg-surface/70 backdrop-blur px-3 py-1.5">
          <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">MUSD Savings</span>
          <span className="w-px h-3 bg-cream-400" />
          <span className="font-mono text-[11px] text-muted-2">1 pool · sMUSD</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 [&>*]:h-full">
        <PoolCard tvl={tvl} aprPct={p.aprPct} sharePct={sharePct} />
        <PositionCard
          vaultVal={vaultVal}
          vaultYield={vaultYield}
          userPrin={userPrin}
          userYield={userYield}
          totalEarning={totalEarning}
          onClaim={p.onClaim}
          isClaiming={p.isClaiming}
        />
        <ManageCard
          walletMusd={wallet}
          userShares={userPrin}
          allowance={p.allowance}
          onDeposit={(wei, allowance) => p.onDeposit(wei > p.walletMusd ? p.walletMusd : wei, allowance)}
          onWithdraw={(wei) => p.onWithdraw(wei > p.userShares ? p.userShares : wei)}
          depositPhase={p.depositPhase}
          isDepositing={p.isDepositing}
          isWithdrawing={p.isWithdrawing}
        />
      </div>
    </section>
  );
}

/* ── Pool overview ──────────────────────────────────────────────────────── */
function PoolCard({ tvl, aprPct, sharePct }: { tvl: number; aprPct: number; sharePct: number }) {
  return (
    <Card glow className="relative overflow-hidden flex flex-col">
      <svg
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 text-amber-400/10"
        viewBox="0 0 200 200"
        fill="none"
      >
        {[40, 64, 88].map((r) => (
          <circle key={r} cx="150" cy="55" r={r} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-amber-500 tabular-nums">A</span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Savings Pool</p>
            <p className="text-muted-2 text-xs">Savings vault · sMUSD</p>
          </div>
        </div>
        <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </span>
      </div>

      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-2 font-mono">Total value locked</p>
        <AnimatedNumber
          value={tvl}
          format={(n) => `$${usd0(n)}`}
          className="block text-3xl font-semibold text-ink tabular-nums tracking-tight mt-1.5"
        />
      </div>

      <div className="relative grid grid-cols-2 gap-px mt-5 rounded-2xl overflow-hidden bg-line/70 border border-cream-300">
        <div className="bg-surface px-3.5 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-2 font-mono">APR</div>
          <div className="text-sm font-semibold tabular-nums text-success mt-1">~{aprPct.toFixed(0)}%</div>
        </div>
        <div className="bg-surface px-3.5 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-2 font-mono">Your share</div>
          <div className="text-sm font-semibold tabular-nums text-ink mt-1">{sharePct.toFixed(2)}%</div>
        </div>
      </div>

      <p className="relative text-[11px] text-muted-2 mt-auto pt-4 leading-relaxed">
        Variable — paid from protocol fees. APR shown is an estimate (testnet yield
        is keeper-seeded).
      </p>
    </Card>
  );
}

/* ── Your position ──────────────────────────────────────────────────────── */
function PositionCard({
  vaultVal,
  vaultYield,
  userPrin,
  userYield,
  totalEarning,
  onClaim,
  isClaiming,
}: {
  vaultVal: number;
  vaultYield: number;
  userPrin: number;
  userYield: number;
  totalEarning: number;
  onClaim: () => void;
  isClaiming: boolean;
}) {
  return (
    <Card className="relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-amber-500 tabular-nums">B</span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Your savings</p>
            <p className="text-muted-2 text-xs">Earning right now</p>
          </div>
        </div>
        <span className="w-8 h-8 rounded-full bg-success/12 text-success flex items-center justify-center">
          <TrendingUp className="w-4 h-4" />
        </span>
      </div>

      <div className="mb-1">
        <AnimatedNumber
          value={totalEarning}
          format={(n) => `$${usd2(n)}`}
          className="block text-3xl font-semibold text-ink tabular-nums tracking-tight"
        />
        <p className="text-sm text-muted-2 mt-1">sMUSD across both positions</p>
      </div>

      <div className="grid grid-cols-1 gap-px mt-4 rounded-2xl overflow-hidden bg-line/70 border border-cream-300">
        <Line label="In your vault (auto)" value={`$${usd2(vaultVal)}`} sub={`+$${usd2(vaultYield)} yield`} />
        <Line label="Direct deposits (you)" value={`$${usd2(userPrin)}`} sub={userYield > 0 ? `+$${usd2(userYield)} claimable` : "no yield yet"} subAccent={userYield > 0 ? "text-success" : undefined} />
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant={userYield > 0 ? "soft" : "ghost"}
          size="sm"
          className="w-full"
          onClick={onClaim}
          loading={isClaiming}
          disabled={isClaiming || userYield <= 0}
        >
          <Sparkles className="w-4 h-4" />
          {userYield > 0 ? `Claim $${usd2(userYield)} yield` : "No yield to claim"}
        </Button>
      </div>
    </Card>
  );
}

function Line({
  label,
  value,
  sub,
  subAccent,
}: {
  label: string;
  value: string;
  sub: string;
  subAccent?: string;
}) {
  return (
    <div className="bg-surface px-3.5 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-ink font-medium">{label}</div>
        <div className={`text-[11px] font-mono ${subAccent ?? "text-muted-2"}`}>{sub}</div>
      </div>
      <div className="text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

/* ── Manual LP (deposit / withdraw) ─────────────────────────────────────── */
function ManageCard({
  walletMusd,
  userShares,
  allowance,
  onDeposit,
  onWithdraw,
  depositPhase,
  isDepositing,
  isWithdrawing,
}: {
  walletMusd: number;
  userShares: number;
  allowance: bigint;
  onDeposit: (amount: bigint, allowance: bigint) => void;
  onWithdraw: (amount: bigint) => void;
  depositPhase: DepositPhase;
  isDepositing: boolean;
  isWithdrawing: boolean;
}) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const max = mode === "deposit" ? walletMusd : userShares;

  const validation = useMemo(() => {
    const v = parseFloat(amount);
    if (!amount) return { ok: false, reason: null as string | null };
    if (isNaN(v) || v <= 0) return { ok: false, reason: "Enter a positive amount" };
    if (v > max) return { ok: false, reason: mode === "deposit" ? "More than your wallet MUSD" : "More than you deposited" };
    return { ok: true, reason: null };
  }, [amount, max, mode]);

  const submit = () => {
    if (!validation.ok) return;
    let wei: bigint;
    try {
      wei = parseUnits(amount as `${number}`, 18);
    } catch {
      return;
    }
    if (mode === "deposit") onDeposit(wei, allowance);
    else onWithdraw(wei);
    setAmount("");
  };

  const busy = mode === "deposit" ? isDepositing : isWithdrawing;
  const label =
    mode === "deposit"
      ? depositPhase === "approving"
        ? "Approving MUSD…"
        : depositPhase === "depositing"
          ? "Depositing…"
          : "Deposit to savings"
      : "Withdraw";

  return (
    <Card className="relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-amber-500 tabular-nums">C</span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Manual LP</p>
            <p className="text-muted-2 text-xs">Direct to the savings vault</p>
          </div>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-surface-soft border border-cream-300 p-1 mb-4 self-start">
        {(["deposit", "withdraw"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setAmount("");
            }}
            className={`px-3.5 h-8 rounded-full text-xs font-medium capitalize transition-all ${
              mode === m ? "bg-ink text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            placeholder={`Amount (${mode === "deposit" ? "MUSD" : "sMUSD"})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="0.01"
            className="w-full bg-surface border border-cream-300 rounded-xl px-3.5 py-2.5 pr-16 text-sm text-ink caret-amber-500 placeholder-muted-2 focus:outline-none focus:border-amber-300 focus:shadow-ring transition-all duration-200"
          />
          <button
            onClick={() => setAmount(max > 0 ? String(max) : "")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider text-amber-600 hover:text-amber-700"
          >
            Max
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-2">
          <span>{mode === "deposit" ? "Wallet" : "Deposited"}</span>
          <span className="tabular-nums">{usd2(max)} {mode === "deposit" ? "MUSD" : "sMUSD"}</span>
        </div>
        {validation.reason && <p className="text-[11px] text-danger">{validation.reason}</p>}
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={submit}
          loading={busy}
          disabled={!validation.ok || busy}
        >
          {label}
        </Button>
        <p className="text-[10px] text-muted-2 mt-2 leading-relaxed text-center">
          Separate from your vault&apos;s auto-savings — sMUSD goes to your wallet.
        </p>
      </div>
    </Card>
  );
}
