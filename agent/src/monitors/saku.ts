import type { PublicClient } from 'viem';
import { CERMIN_SAKU_ABI, CERMIN_VAULT_V11_ABI } from '../abis/generated.js';
import { withRetry } from '../rpc/retry.js';

/** Mirrors ICerminVault.SakuStatus. */
export const SAKU_STATUS = [
  'Ok',
  'AllowanceExceeded',
  'InsufficientSpendable',
  'IcrBelowFloor',
  'ReserveTooThin',
] as const;
export type SakuStatus = (typeof SAKU_STATUS)[number];

export interface SakuSchedule {
  id: bigint;
  vault: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  period: bigint;
  start: bigint;
  periods: number;
  paid: number;
  cancelled: boolean;
  label: `0x${string}`;
}

export interface DueSchedule {
  schedule: SakuSchedule;
  due: number;
}

export type SakuAction = 'RELEASE' | 'RECORD_HOLD' | 'WAIT';

export interface SakuDecision {
  action: SakuAction;
  status: SakuStatus;
  reason: string;
}

const STATUS_REASON: Record<SakuStatus, string> = {
  Ok: 'position is safe — paying the allowance',
  AllowanceExceeded: 'the owner\'s spend allowance for Saku is used up',
  InsufficientSpendable: 'not enough spendable MUSD in the vault',
  IcrBelowFloor: 'ICR is below the Saku floor (defendICR + buffer) — defense comes first',
  ReserveTooThin: 'paying would leave too little reserve to survive the stress drop',
};

export function statusReason(status: SakuStatus): string {
  return STATUS_REASON[status];
}

/**
 * Decide what the keeper does with one due schedule.
 *
 * - Safe → RELEASE (money moves).
 * - Unsafe → the contract would only emit AllowanceHeld. We still send that
 *   release once per `holdCooldownMs` so the refusal is on-chain evidence, but
 *   not every cycle (no spam, no wasted gas). In between: WAIT.
 */
export function decideSaku(
  status: SakuStatus,
  lastHoldAt: number | undefined,
  now: number,
  holdCooldownMs: number,
): SakuDecision {
  if (status === 'Ok') return { action: 'RELEASE', status, reason: statusReason(status) };
  if (lastHoldAt === undefined || now - lastHoldAt >= holdCooldownMs) {
    return { action: 'RECORD_HOLD', status, reason: `HOLD: ${statusReason(status)}` };
  }
  return { action: 'WAIT', status, reason: `HOLD (already recorded): ${statusReason(status)}` };
}

/** All schedules that have at least one payment due right now. */
export async function listDueSchedules(client: PublicClient, saku: `0x${string}`): Promise<DueSchedule[]> {
  const count = await withRetry(() =>
    client.readContract({ address: saku, abi: CERMIN_SAKU_ABI, functionName: 'scheduleCount' }),
  );
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  const rows = await Promise.all(
    ids.map(async id => {
      const [s, due] = await Promise.all([
        withRetry(() => client.readContract({ address: saku, abi: CERMIN_SAKU_ABI, functionName: 'getSchedule', args: [id] })),
        withRetry(() => client.readContract({ address: saku, abi: CERMIN_SAKU_ABI, functionName: 'dueCount', args: [id] })),
      ]);
      const schedule: SakuSchedule = {
        id,
        vault: s.vault,
        recipient: s.recipient,
        amount: s.amount,
        period: s.period,
        start: s.start,
        periods: s.periods,
        paid: s.paid,
        cancelled: s.cancelled,
        label: s.label,
      };
      return { schedule, due: Number(due) };
    }),
  );
  return rows.filter(r => r.due > 0 && !r.schedule.cancelled && r.schedule.paid < r.schedule.periods);
}

/** The vault's own verdict on paying `amount` through Saku at `price`. */
export async function previewStatus(
  client: PublicClient,
  saku: `0x${string}`,
  s: SakuSchedule,
  price: bigint,
): Promise<{ status: SakuStatus; icrBps: bigint }> {
  const [status, icrBps] = await withRetry(() =>
    client.readContract({
      address: s.vault,
      abi: CERMIN_VAULT_V11_ABI,
      functionName: 'sakuStatus',
      args: [saku, s.amount, price],
    }),
  );
  return { status: SAKU_STATUS[status] ?? 'Ok', icrBps };
}

/** bytes32 label → readable string (trailing zero bytes dropped). */
export function decodeLabel(label: `0x${string}`): string {
  const hex = label.slice(2).replace(/(00)+$/, '');
  return Buffer.from(hex, 'hex').toString('utf8');
}
