export interface VaultParams {
  targetLTV: number;
  defendICR: number;
  emergencyICR: number;
  skimThresholdBps: number;
  spendableShare: number;
}

export interface VaultState {
  lastSkimPrice: bigint;
  lastSeenPrice: bigint;
  spendableMusd: bigint;
  smusdShares: bigint;
  createdAt: bigint;
}

export interface VaultSnapshot {
  address: `0x${string}`;
  owner: `0x${string}`;
  params: VaultParams;
  state: VaultState;
  icrBps: number;
  debt: bigint;
  collateral: bigint;
}

export type Action = 'SKIM' | 'DEFEND' | 'HOLD' | 'ACCRUE';

export interface DecisionLog {
  vault: `0x${string}`;
  action: Action;
  reason: string;
  txHash?: `0x${string}`;
  timestamp: number;
}
