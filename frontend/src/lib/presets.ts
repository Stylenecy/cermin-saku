export interface VaultParams {
  targetLTV: number;
  defendICR: number;
  emergencyICR: number;
  skimThresholdBps: number;
  spendableShare: number;
}

export type RiskKey = "conservative" | "balanced" | "aggressive";
export type GoalLabel = "forever" | "spendNow";

export const PRESETS: Record<RiskKey, VaultParams> = {
  conservative: {
    targetLTV: 4_000,
    defendICR: 17_000,
    emergencyICR: 14_000,
    skimThresholdBps: 800,
    spendableShare: 3_000,
  },
  balanced: {
    targetLTV: 5_000,
    defendICR: 14_000,
    emergencyICR: 12_000,
    skimThresholdBps: 500,
    spendableShare: 5_000,
  },
  aggressive: {
    targetLTV: 7_000,
    defendICR: 12_500,
    emergencyICR: 11_800,
    skimThresholdBps: 300,
    spendableShare: 7_000,
  },
};

// Goal is purely a UI framing — both branches use the same on-chain params.
export const GOAL_LABELS: Record<GoalLabel, { title: string; tagline: string; badge: string }> = {
  forever: {
    title: 'Forever Allowance',
    tagline: 'Earn sustainable yield indefinitely. BNB never sold.',
    badge: 'Pension',
  },
  spendNow: {
    title: 'Spend Now, Reclaim Later',
    tagline: 'Borrow MUSD against BNB; repay it on your timeline.',
    badge: 'Goal',
  },
};
