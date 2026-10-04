"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter } from "next/navigation";
import { parseEther, zeroAddress } from "viem";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { PRESETS, GOAL_LABELS, type RiskKey, type GoalLabel } from "@/lib/presets";
import { simulate } from "@/lib/simulation";
import { CONTRACTS, CERMIN_FACTORY_ABI } from "@/lib/contracts";
import { formatUsd, formatTxError } from "@/lib/utils";
import { EXPLORER_URL, activeChain } from "@/lib/chains";
import {
  Coins,
  Target,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

interface WizardState {
  btcAmount: string;
  btcPriceUsd: number;
  goal: GoalLabel | null;
  risk: RiskKey | null;
}

const TOTAL_STEPS = 5;

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 44 : -44, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -44 : 44, opacity: 0 }),
};

// The CDP enforces a 2,000 MUSD minimum debt (1,800 + 200 gas). The borrow at open
// is collateralValue * targetLTV, so a small deposit / low LTV reverts with
// MinDebtNotMet(). Check it client-side against the live BNB price so the wizard
// never lets a user sign a transaction that is doomed to revert on-chain.
const MIN_MUSD_DEBT = 2_000;

function minDebtCheck(btcAmount: string, btcPriceUsd: number, targetLTV: number) {
  const btc = parseFloat(btcAmount || "0");
  const ltv = targetLTV / 10_000;
  const borrow = btc * btcPriceUsd * ltv;
  const meets = borrow >= MIN_MUSD_DEBT;
  const minBtc =
    btcPriceUsd > 0 && ltv > 0 ? MIN_MUSD_DEBT / (btcPriceUsd * ltv) : 0;
  return { borrow, meets, minBtc };
}

function StepHeader({
  step,
  total,
  onBack,
}: {
  step: number;
  total: number;
  onBack: (() => void) | null;
}) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="flex items-center gap-4 mb-8">
      <button
        onClick={onBack ?? undefined}
        disabled={!onBack}
        className="w-10 h-10 rounded-full bg-surface border border-cream-300 shadow-sm flex items-center justify-center disabled:opacity-30 hover:border-amber-200 hover:-translate-y-px transition-all duration-200 active:translate-y-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-cream-300 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-shadow-900 transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted tabular-nums">
        {step + 1} / {total}
      </span>
    </div>
  );
}

function StepDeposit({
  state,
  onChange,
  onNext,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const usdValue = parseFloat(state.btcAmount || "0") * state.btcPriceUsd;
  const priceReady = state.btcPriceUsd > 0;
  // The lowest possible minimum is the highest-LTV preset (Aggressive). Require
  // at least that, so whatever strategy the user picks next is always valid.
  const maxLtv = Math.max(...Object.values(PRESETS).map((p) => p.targetLTV));
  const floor = minDebtCheck(state.btcAmount, state.btcPriceUsd, maxLtv);
  const balancedMin = minDebtCheck("0", state.btcPriceUsd, PRESETS.balanced.targetLTV).minBtc;
  const conservativeMin = minDebtCheck("0", state.btcPriceUsd, PRESETS.conservative.targetLTV).minBtc;
  const amountEntered = parseFloat(state.btcAmount || "0") > 0;
  const valid = amountEntered && (!priceReady || floor.meets);
  const presets = ["0.07", "0.10", "0.25", "0.50"];

  return (
    <div className="space-y-7">
      <div>
        <Badge variant="amber" className="mb-3">
          <Coins className="w-3 h-3" />
          Step 1
        </Badge>
        <h2 className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink leading-tight">
          How much BNB do you want to <em className="italic font-normal">vault</em>?
        </h2>
        <p className="text-muted text-sm mt-2">
          Your BNB stays locked. Only the borrowed dollars get spent.
        </p>
      </div>

      <Input
        variant="big"
        type="number"
        placeholder="0.00"
        min="0.001"
        step="0.001"
        value={state.btcAmount}
        onChange={(e) => onChange({ btcAmount: e.target.value })}
        suffix="BNB"
      />

      {usdValue > 0 ? (
        <p className="text-sm text-muted text-right -mt-3">≈ {formatUsd(usdValue)}</p>
      ) : (
        <p className="text-sm text-muted text-right -mt-3">
          BNB ≈ {formatUsd(state.btcPriceUsd, 0)}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ btcAmount: p })}
            className={`h-11 rounded-full text-sm font-medium transition-all duration-200 tabular-nums ${
              state.btcAmount === p
                ? "bg-ink text-white shadow-soft"
                : "bg-surface border border-cream-300 text-ink hover:border-amber-200 hover:-translate-y-px"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {amountEntered && priceReady && !floor.meets && (
        <p className="text-xs text-amber-700 -mt-3">
          Too small to open any vault — deposit at least{" "}
          <span className="font-medium">{floor.minBtc.toFixed(4)} BNB</span>.
        </p>
      )}

      <Card variant="soft" className="!p-4">
        {priceReady ? (
          <p className="text-xs text-muted leading-relaxed">
            <span className="font-medium text-ink">
              Minimum {floor.minBtc.toFixed(4)} BNB
            </span>{" "}
            to open a vault at {formatUsd(state.btcPriceUsd, 0)}/BNB. Safer
            strategies need more: Balanced ≥ {balancedMin.toFixed(4)} BNB,
            Conservative ≥ {conservativeMin.toFixed(4)} BNB. The CDP enforces a
            2,000 MUSD minimum loan.
          </p>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            Fetching live BNB price…
          </p>
        )}
      </Card>

      <Button variant="primary" size="xl" className="w-full" onClick={onNext} disabled={!valid}>
        Continue
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepGoal({
  state,
  onChange,
  onNext,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const options: { key: GoalLabel; icon: React.ReactNode }[] = [
    { key: "forever", icon: <Shield className="w-5 h-5" /> },
    { key: "spendNow", icon: <Target className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Badge variant="amber" className="mb-3">Step 2</Badge>
        <h2 className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink leading-tight">
          What&apos;s your <em className="italic font-normal">goal</em>?
        </h2>
        <p className="text-muted text-sm mt-2">
          Same vault either way — this just frames the experience.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const meta = GOAL_LABELS[opt.key];
          const selected = state.goal === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange({ goal: opt.key })}
              className={`w-full text-left rounded-3xl p-5 transition-all duration-200 flex items-start gap-4 ${
                selected
                  ? "bg-ink text-white shadow-lift"
                  : "bg-surface border border-cream-300 hover:border-amber-200 hover:-translate-y-0.5 hover:shadow-soft"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  selected ? "bg-white/15 text-white" : "bg-amber-50 text-amber-700"
                }`}
              >
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-semibold">{meta.title}</p>
                  <Badge variant={selected ? "amber" : "default"}>{meta.badge}</Badge>
                </div>
                <p className={`text-sm ${selected ? "text-white/70" : "text-muted"}`}>
                  {meta.tagline}
                </p>
              </div>
              {selected && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>

      <Button variant="primary" size="xl" className="w-full" onClick={onNext} disabled={!state.goal}>
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepRisk({
  state,
  onChange,
  onNext,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const options: {
    key: RiskKey;
    title: string;
    ltv: string;
    drop: string;
    desc: string;
    badge?: string;
  }[] = [
    {
      key: "conservative",
      title: "Conservative",
      ltv: "40% LTV",
      drop: "~58% drop tolerance",
      desc: "Lower yield, maximum protection. Perfect for BNB maxis.",
    },
    {
      key: "balanced",
      title: "Balanced",
      ltv: "50% LTV",
      drop: "~30% drop tolerance",
      desc: "Optimal risk-reward balance for most users.",
      badge: "Recommended",
    },
    {
      key: "aggressive",
      title: "Aggressive",
      ltv: "70% LTV",
      drop: "~12% drop tolerance",
      desc: "Maximum yield, tighter safety margins.",
    },
  ];

  // The selected preset must clear the min-debt floor for the entered deposit.
  const canContinue =
    !!state.risk &&
    (state.btcPriceUsd <= 0 ||
      minDebtCheck(state.btcAmount, state.btcPriceUsd, PRESETS[state.risk].targetLTV)
        .meets);

  return (
    <div className="space-y-7">
      <div>
        <Badge variant="amber" className="mb-3">
          <TrendingUp className="w-3 h-3" />
          Step 3
        </Badge>
        <h2 className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink leading-tight">
          Pick your <em className="italic font-normal">risk profile</em>
        </h2>
        <p className="text-muted text-sm mt-2">
          Sets your borrow ratio and defense thresholds.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const selected = state.risk === opt.key;
          const check = minDebtCheck(
            state.btcAmount,
            state.btcPriceUsd,
            PRESETS[opt.key].targetLTV,
          );
          const affordable = state.btcPriceUsd <= 0 || check.meets;
          return (
            <button
              key={opt.key}
              onClick={() => affordable && onChange({ risk: opt.key })}
              disabled={!affordable}
              className={`w-full text-left rounded-3xl p-5 transition-all duration-200 ${
                !affordable
                  ? "bg-surface-soft border border-line opacity-60 cursor-not-allowed"
                  : selected
                    ? "bg-ink text-white shadow-lift"
                    : "bg-surface border border-cream-300 hover:border-amber-200 hover:-translate-y-0.5 hover:shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">{opt.title}</p>
                  {opt.badge && <Badge variant="amber">⭐ {opt.badge}</Badge>}
                </div>
                {selected && affordable && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selected && affordable ? "bg-white/15 text-white" : "bg-amber-50 text-amber-700"}`}>
                  {opt.ltv}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selected && affordable ? "bg-white/15 text-white" : "bg-success/15 text-success"}`}>
                  {opt.drop}
                </span>
              </div>
              <p className={`text-sm ${selected && affordable ? "text-white/70" : "text-muted"}`}>
                {opt.desc}
              </p>
              {!affordable && (
                <p className="text-xs text-amber-700 mt-2">
                  Needs ≥ {check.minBtc.toFixed(4)} BNB — you entered{" "}
                  {state.btcAmount || "0"} BNB. Go back to deposit more.
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="primary"
        size="xl"
        className="w-full"
        onClick={onNext}
        disabled={!state.risk || !canContinue}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepPreview({
  state,
  onNext,
}: {
  state: WizardState;
  onNext: () => void;
  onBack: () => void;
}) {
  const params = PRESETS[state.risk ?? "balanced"];
  const btcNum = parseFloat(state.btcAmount || "0");
  const sim = simulate(btcNum, state.btcPriceUsd, params);
  const debt = minDebtCheck(state.btcAmount, state.btcPriceUsd, params.targetLTV);

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="amber" className="mb-3">
          <Zap className="w-3 h-3" />
          Step 4
        </Badge>
        <h2 className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink leading-tight">
          Your <em className="italic font-normal text-amber-600">Shadow</em> preview
        </h2>
        <p className="text-muted text-sm mt-2">
          Estimated income from {btcNum.toFixed(4)} BNB.
        </p>
      </div>

      <Card variant="accent" className="!p-6">
        <p className="text-xs uppercase tracking-wider text-white/80">Monthly income</p>
        <p className="text-5xl font-semibold tabular-nums tracking-tight mt-1">
          ${fmt(sim.monthlyIncome)}
        </p>
        <p className="text-sm text-white/80 mt-1">
          ≈ ${fmt(sim.annualIncome)} per year
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-5">
          <p className="text-xs text-muted">Spendable now</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            ${fmt(sim.spendableNow)}
          </p>
          <p className="text-xs text-muted mt-0.5">unlocked at open</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs text-muted">Drop tolerance</p>
          <p className="text-2xl font-semibold tabular-nums text-success mt-1">
            ~{(sim.btcDropTolerance * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-muted mt-0.5">before defense</p>
        </Card>
      </div>

      <Card variant="soft" className="!p-5 space-y-3">
        <Row label="Total borrowed" value={`${fmt(sim.totalBorrowed)} MUSD`} />
        <Row label="Into sMUSD vault" value={`${fmt(sim.inVault)} MUSD`} />
        <Row
          label="Strategy"
          value={`${GOAL_LABELS[state.goal ?? "forever"].badge} · ${state.risk}`}
          capitalize
        />
      </Card>

      {!debt.meets && state.btcPriceUsd > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1">
          <p className="text-xs font-medium text-amber-800">
            Deposit too small for this strategy
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            At {formatUsd(state.btcPriceUsd, 0)}/BNB and {params.targetLTV / 100}%
            LTV, {btcNum.toFixed(4)} BNB borrows only ~${debt.borrow.toFixed(0)}{" "}
            MUSD — under the 2,000 MUSD minimum. Deposit at least{" "}
            <span className="font-medium">{debt.minBtc.toFixed(4)} BNB</span>, or
            pick a higher-LTV strategy.
          </p>
        </div>
      )}

      <Button
        variant="primary"
        size="xl"
        className="w-full"
        onClick={onNext}
        disabled={!debt.meets && state.btcPriceUsd > 0}
      >
        Create vault <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-medium text-ink ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function StepConfirm({
  state,
  onSuccess,
}: {
  state: WizardState;
  onSuccess: () => void;
}) {
  const params = PRESETS[state.risk ?? "balanced"];
  const queryClient = useQueryClient();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: receiptReady,
  } = useWaitForTransactionReceipt({ hash: txHash });
  const [opening, setOpening] = useState(false);

  // A fetched receipt is not the same as a successful transaction: a reverted
  // tx still returns a receipt (status "reverted"). Only treat an explicit
  // "success" status as a created vault, otherwise the UI lies and the
  // dashboard then correctly finds no vault and bounces back to onboarding.
  const txSucceeded = receiptReady && receipt?.status === "success";
  const txReverted = receiptReady && receipt?.status === "reverted";

  // Safety net: block signing if the borrow would fall under the CDP min debt.
  const debt = minDebtCheck(state.btcAmount, state.btcPriceUsd, params.targetLTV);
  const blockedByMinDebt = !debt.meets && state.btcPriceUsd > 0;

  // The factory's vaultOf(address) read is cached (staleTime). Refresh it
  // before leaving so the dashboard sees the freshly created vault instead of
  // the pre-creation zero address — otherwise the dashboard bounces back here.
  const handleOpenDashboard = useCallback(async () => {
    setOpening(true);
    await Promise.race([
      queryClient.invalidateQueries().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    onSuccess();
  }, [queryClient, onSuccess]);

  const handleCreate = () => {
    const btcNum = parseFloat(state.btcAmount || "0");
    const btcWei = parseEther(btcNum.toFixed(18) as `${number}`);
    writeContract({
      address: CONTRACTS.CERMIN_FACTORY,
      abi: CERMIN_FACTORY_ABI,
      functionName: "createVault",
      args: [params, 0n, zeroAddress, zeroAddress],
      value: btcWei,
    });
  };

  if (txSucceeded) {
    return (
      <div className="space-y-7 animate-fade-in text-center">
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto animate-soft-pulse">
          <CheckCircle2 className="w-10 h-10 text-success animate-scale-in" />
        </div>
        <div>
          <h2 className="font-serif text-3xl font-medium tracking-[-0.02em]">
            Vault <em className="italic font-normal text-success">created</em>
          </h2>
          <p className="text-muted text-sm mt-2 max-w-sm mx-auto">
            Your Cermin vault is live on BSC testnet. The Shadow is active and the
            keeper bot is watching.
          </p>
        </div>
        {txHash && (
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-amber-600 hover:text-amber-700"
          >
            View transaction ↗
          </a>
        )}
        <Button
          variant="primary"
          size="xl"
          className="w-full"
          onClick={handleOpenDashboard}
          loading={opening}
          disabled={opening}
        >
          Open dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="amber" className="mb-3">Step 5</Badge>
        <h2 className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink leading-tight">
          Confirm &amp; <em className="italic font-normal">sign</em>
        </h2>
        <p className="text-muted text-sm mt-2">
          One transaction creates and funds your vault.
        </p>
      </div>

      <Card variant="soft" className="!p-0 overflow-hidden">
        <div className="divide-y divide-line">
          <Field label="Depositing" value={`${state.btcAmount} BNB`} />
          <Field
            label="Strategy"
            value={`${GOAL_LABELS[state.goal ?? "forever"].badge} · ${state.risk}`}
            capitalize
          />
          <Field label="Network" value={activeChain.name} />
          <Field label="BNB stays" value="Locked · Never sold" valueClass="text-success" />
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <p className="text-xs text-rose-700 leading-relaxed">
            {formatTxError(error)}
          </p>
        </div>
      )}

      {txReverted && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-1">
          <p className="text-xs font-medium text-rose-800">
            Transaction reverted — no vault was created.
          </p>
          <p className="text-xs text-rose-700 leading-relaxed">
            The tx was mined but failed on-chain. Most likely the deposit is
            below the 2,000 MUSD minimum debt, or your wallet is on the
            wrong network. Adjust and try again.
          </p>
          {txHash && (
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-rose-800 underline"
            >
              Inspect transaction ↗
            </a>
          )}
        </div>
      )}

      {blockedByMinDebt && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1">
          <p className="text-xs font-medium text-amber-800">
            Deposit below the 2,000 MUSD minimum
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {state.btcAmount || "0"} BNB at {formatUsd(state.btcPriceUsd, 0)}/BNB
            and {params.targetLTV / 100}% LTV borrows only ~$
            {debt.borrow.toFixed(0)} MUSD. Go back and deposit at least{" "}
            <span className="font-medium">{debt.minBtc.toFixed(4)} BNB</span>.
          </p>
        </div>
      )}

      <Button
        variant="primary"
        size="xl"
        className="w-full"
        onClick={handleCreate}
        loading={isPending || isConfirming}
        disabled={isPending || isConfirming || blockedByMinDebt}
      >
        {isPending
          ? "Waiting for wallet…"
          : isConfirming
          ? "Confirming on-chain…"
          : "Sign & create vault"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  valueClass,
  capitalize,
}: {
  label: string;
  value: string;
  valueClass?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={`text-sm font-medium ${valueClass ?? "text-ink"} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

interface OnboardingWizardProps {
  btcPriceUsd: number;
  onComplete: () => void;
}

export function OnboardingWizard({ btcPriceUsd, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [state, setState] = useState<WizardState>({
    btcAmount: "",
    btcPriceUsd,
    goal: null,
    risk: null,
  });

  // Keep the live BNB price flowing into the wizard. The price feed may resolve
  // after mount; without this, every calculation would use the stale snapshot
  // captured at mount (often the fallback price).
  useEffect(() => {
    setState((s) => (s.btcPriceUsd === btcPriceUsd ? s : { ...s, btcPriceUsd }));
  }, [btcPriceUsd]);

  const patch = useCallback(
    (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p })),
    [],
  );
  const next = useCallback(() => {
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);
  const back = useCallback(() => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Step 0 back exits the wizard to landing; the confirm step locks back.
  const onBack =
    step === TOTAL_STEPS - 1 ? null : step === 0 ? () => router.push("/") : back;

  return (
    <div className="bg-app min-h-[100svh]">
      <header className="glass border-b border-line/60 sticky top-0 z-30">
        <div className="mx-auto max-w-xl px-5 h-14 flex items-center justify-between pad-safe-top">
          <Link href="/" aria-label="Cermin home" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Open vault</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-6">
        <StepHeader step={step} total={TOTAL_STEPS} onBack={onBack} />

        <Card className="!p-6 sm:!p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: EASE_OUT }}
            >
              {step === 0 && <StepDeposit state={state} onChange={patch} onNext={next} />}
              {step === 1 && <StepGoal state={state} onChange={patch} onNext={next} />}
              {step === 2 && <StepRisk state={state} onChange={patch} onNext={next} />}
              {step === 3 && <StepPreview state={state} onNext={next} onBack={back} />}
              {step === 4 && <StepConfirm state={state} onSuccess={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </Card>
      </main>
    </div>
  );
}
