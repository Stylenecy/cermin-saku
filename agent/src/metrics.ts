/**
 * In-memory keeper metrics. A single mutable object threaded through the cycle
 * and exposed by the health server — enough for liveness, alerting, and a quick
 * "is the keeper actually doing anything" read without an external TSDB.
 */
export interface Metrics {
  startedAt: number;
  cyclesRun: number;
  cyclesFailed: number;
  lastCycleStart: number | null;
  lastCycleEnd: number | null;
  lastCycleMs: number | null;
  lastSuccessAt: number | null;
  running: boolean;
  txSubmitted: number;
  txFailed: number;
  vaultsSeen: number;
  /** Decimal-wei string (BigInt isn't JSON-serializable). */
  keeperBalanceWei: string | null;
  keeper: string | null;
  lowGas: boolean;
  lastError: string | null;
}

export function createMetrics(): Metrics {
  return {
    startedAt: Date.now(),
    cyclesRun: 0,
    cyclesFailed: 0,
    lastCycleStart: null,
    lastCycleEnd: null,
    lastCycleMs: null,
    lastSuccessAt: null,
    running: false,
    txSubmitted: 0,
    txFailed: 0,
    vaultsSeen: 0,
    keeperBalanceWei: null,
    keeper: null,
    lowGas: false,
    lastError: null,
  };
}
