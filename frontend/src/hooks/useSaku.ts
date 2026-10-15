"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { parseEventLogs, zeroAddress, type PublicClient } from "viem";
import { CERMIN_LENS_ABI, CERMIN_SAKU_ABI, CERMIN_VAULT_V11_ABI } from "@/lib/abis.generated";
import { SAKU, sakuDeployed } from "@/lib/saku";
import { CONTRACTS, PRICE_FEED_ABI } from "@/lib/contracts";
import demoLedger from "@/lib/demoLedger.gen.json";

const REFRESH = 15_000;

export interface ScheduleRow {
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
  due: number;
  nextDueAt: bigint;
}

/** Live BNB/USD from the price feed (simulated MockPriceFeed on testnet). */
export function useFeedPrice() {
  const enabled = CONTRACTS.PRICE_FEED !== zeroAddress;
  const { data, isLoading, isError } = useReadContract({
    address: CONTRACTS.PRICE_FEED,
    abi: PRICE_FEED_ABI,
    functionName: "fetchPrice",
    query: { enabled, refetchInterval: REFRESH },
  });
  return { price: data as bigint | undefined, isLoading: enabled && isLoading, isError: enabled && isError };
}

/** Everything Lens knows about a vault at a (hypothetical) price. */
export function useLensSnapshot(vault: `0x${string}` | undefined, price: bigint | undefined) {
  const enabled = !!vault && vault !== zeroAddress && !!price && price > 0n && sakuDeployed();
  return useReadContract({
    address: SAKU.LENS,
    abi: CERMIN_LENS_ABI,
    functionName: "snapshot",
    args: enabled ? [vault!, price!] : undefined,
    query: { enabled, refetchInterval: REFRESH },
  });
}

/** What defend() and a Saku payment would do at a hypothetical price. */
export function useLensWhatIf(
  vault: `0x${string}` | undefined,
  price: bigint | undefined,
  sakuAmount: bigint,
) {
  const enabled = !!vault && vault !== zeroAddress && !!price && price > 0n && sakuDeployed();
  const { data, isLoading, isError } = useReadContracts({
    contracts: enabled
      ? [
          { address: SAKU.LENS, abi: CERMIN_LENS_ABI, functionName: "previewDefend", args: [vault!, price!] },
          {
            address: SAKU.LENS,
            abi: CERMIN_LENS_ABI,
            functionName: "previewSaku",
            args: [vault!, SAKU.SAKU, sakuAmount, price!],
          },
          { address: SAKU.LENS, abi: CERMIN_LENS_ABI, functionName: "snapshot", args: [vault!, price!] },
        ]
      : [],
    query: { enabled, placeholderData: (prev) => prev },
  });
  return {
    defend: data?.[0]?.result,
    saku: data?.[1]?.result as readonly [number, bigint, bigint, bigint] | undefined,
    snapshot: data?.[2]?.result,
    isLoading,
    isError,
  };
}

/** Saku schedules paid by a vault, with due counts. */
export function useVaultSchedules(vault: `0x${string}` | undefined) {
  const client = usePublicClient();
  const enabled = !!client && !!vault && vault !== zeroAddress && sakuDeployed();
  return useQuery({
    queryKey: ["saku-schedules", vault],
    enabled,
    refetchInterval: REFRESH,
    queryFn: () => readSchedules(client!, "schedulesOfVault", vault!),
  });
}

/** Saku schedules that pay a recipient (the child's view). */
export function useRecipientSchedules(recipient: `0x${string}` | undefined) {
  const client = usePublicClient();
  const enabled = !!client && !!recipient && recipient !== zeroAddress && sakuDeployed();
  return useQuery({
    queryKey: ["saku-recipient", recipient],
    enabled,
    refetchInterval: REFRESH,
    queryFn: () => readSchedules(client!, "schedulesOfRecipient", recipient!),
  });
}

async function readSchedules(
  client: PublicClient,
  fn: "schedulesOfVault" | "schedulesOfRecipient",
  who: `0x${string}`,
): Promise<ScheduleRow[]> {
  const ids = (await client.readContract({
    address: SAKU.SAKU,
    abi: CERMIN_SAKU_ABI,
    functionName: fn,
    args: [who],
  })) as readonly bigint[];
  const rows = await Promise.all(
    ids.map(async (id) => {
      const [s, due, next] = await Promise.all([
        client.readContract({ address: SAKU.SAKU, abi: CERMIN_SAKU_ABI, functionName: "getSchedule", args: [id] }),
        client.readContract({ address: SAKU.SAKU, abi: CERMIN_SAKU_ABI, functionName: "dueCount", args: [id] }),
        client.readContract({ address: SAKU.SAKU, abi: CERMIN_SAKU_ABI, functionName: "nextDueAt", args: [id] }),
      ]);
      return { id, ...s, due: Number(due), nextDueAt: next } as ScheduleRow;
    }),
  );
  return rows.reverse();
}

/** Owner-granted allowance and policy for Saku on a vault. */
export function useSakuAllowance(vault: `0x${string}` | undefined) {
  const enabled = !!vault && vault !== zeroAddress && sakuDeployed();
  const { data, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address: vault!, abi: CERMIN_VAULT_V11_ABI, functionName: "spendAllowance", args: [SAKU.SAKU] },
          { address: vault!, abi: CERMIN_VAULT_V11_ABI, functionName: "sakuPolicy" },
          { address: vault!, abi: CERMIN_VAULT_V11_ABI, functionName: "owner" },
        ]
      : [],
    query: { enabled, refetchInterval: REFRESH },
  });
  return {
    allowance: data?.[0]?.result as bigint | undefined,
    policy: data?.[1]?.result as { floorBufferBps: number; stressBps: number } | undefined,
    owner: data?.[2]?.result as `0x${string}` | undefined,
    refetch,
  };
}

export type LedgerKind = "paid" | "held" | "defended" | "skimmed" | "created" | "cancelled";

export interface LedgerEntry {
  kind: LedgerKind;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  scheduleId?: bigint;
  amount?: bigint;
  recipient?: `0x${string}`;
  paymentNo?: number;
  reason?: number;
  icrBps?: bigint;
  icrAfterBps?: bigint;
  price?: bigint;
  timestamp?: number;
  /** Read from the frozen demo receipts (demoLedger.gen.json), not from live logs. */
  frozen?: boolean;
}

// BSC testnet makes ~190k blocks a day, and public RPCs keep event logs for only
// a couple of days (publicnode: ~480k blocks); older ranges come back empty rather
// than failing. So only ask for the window the RPC still holds. The demo vault's
// 6 Oct run is frozen from its receipts (scripts/snapshot-demo-ledger.mjs).
const LOG_LOOKBACK = BigInt(process.env.NEXT_PUBLIC_LOG_LOOKBACK_BLOCKS || "450000");
// Scan in the widest range the RPC accepts (publicnode: 50k; fall back to 5k),
// a few ranges at a time, and remember how far each vault has been read so a
// refetch only reads new blocks.
let chunk = 49_999n;
const SMALL_CHUNK = 4_999n;
const WORKERS = 4;
const ledgerCache = new Map<string, { to: bigint; entries: LedgerEntry[] }>();

async function scanChunk(c: PublicClient, vault: `0x${string}`, from: bigint, to: bigint): Promise<LedgerEntry[]> {
  try {
    return await readChunk(c, vault, from, to);
  } catch (e) {
    if (to - from <= SMALL_CHUNK) throw e;
    chunk = SMALL_CHUNK; // this RPC refuses wide ranges; stay small from now on
    const out: LedgerEntry[] = [];
    for (let f = from; f <= to; f += SMALL_CHUNK + 1n) {
      out.push(...(await readChunk(c, vault, f, f + SMALL_CHUNK > to ? to : f + SMALL_CHUNK)));
    }
    return out;
  }
}

async function scanRange(c: PublicClient, vault: `0x${string}`, from: bigint, to: bigint): Promise<LedgerEntry[]> {
  const ranges: [bigint, bigint][] = [];
  for (let f = from; f <= to; f += chunk + 1n) ranges.push([f, f + chunk > to ? to : f + chunk]);
  const out: LedgerEntry[] = [];
  let next = 0;
  const worker = async () => {
    while (next < ranges.length) {
      const [f, t] = ranges[next++]!;
      out.push(...(await scanChunk(c, vault, f, t)));
    }
  };
  await Promise.all(Array.from({ length: Math.min(WORKERS, ranges.length) }, worker));
  return out;
}

/**
 * The on-chain "passbook": every Saku payment and hold for a vault, plus the
 * vault's own defend/skim, read from event logs (no indexer) for the blocks the
 * RPC still holds, after the frozen demo history when there is one.
 */
export function useLedger(vault: `0x${string}` | undefined) {
  const client = usePublicClient();
  const enabled = !!client && !!vault && vault !== zeroAddress && sakuDeployed();
  return useQuery({
    queryKey: ["saku-ledger", vault],
    enabled,
    refetchInterval: 20_000,
    queryFn: async (): Promise<LedgerEntry[]> => {
      const c = client!;
      const key = vault!.toLowerCase();
      const latest = await c.getBlockNumber();
      const cached = ledgerCache.get(key);
      const snap = frozenLedger(vault!);
      const max = (a: bigint, b: bigint) => (a > b ? a : b);
      let from0 = cached ? cached.to + 1n : SAKU.DEPLOY_BLOCK;
      if (snap) from0 = max(from0, snap.coversTo + 1n);
      from0 = max(from0, latest > LOG_LOOKBACK ? latest - LOG_LOOKBACK : 0n);
      const fresh = from0 <= latest ? await scanRange(c, vault!, from0, latest) : [];
      const seen = new Set<string>();
      const out = [...(cached?.entries ?? snap?.entries ?? []), ...fresh].filter((e) => {
        const k = `${e.txHash}-${e.logIndex}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      out.sort((x, y) => (x.blockNumber === y.blockNumber ? y.logIndex - x.logIndex : Number(y.blockNumber - x.blockNumber)));
      // Timestamps for the newest 40 entries (one getBlock per distinct block not seen yet).
      const blocks = [...new Set(out.slice(0, 40).filter((e) => e.timestamp === undefined).map((e) => e.blockNumber))];
      const times = new Map<bigint, number>();
      await Promise.all(
        blocks.map(async (b) => {
          const blk = await c.getBlock({ blockNumber: b });
          times.set(b, Number(blk.timestamp));
        }),
      );
      const entries = out.map((e) => (e.timestamp === undefined && times.has(e.blockNumber) ? { ...e, timestamp: times.get(e.blockNumber) } : e));
      ledgerCache.set(key, { to: latest, entries });
      return entries;
    },
  });
}

/** One block range of Saku events for a vault plus the vault's own defend/skim. */
async function readChunk(c: PublicClient, vault: `0x${string}`, from: bigint, to: bigint): Promise<LedgerEntry[]> {
  const [sakuLogs, vaultLogs] = await Promise.all([
    c.getContractEvents({ address: SAKU.SAKU, abi: CERMIN_SAKU_ABI, fromBlock: from, toBlock: to }),
    c.getContractEvents({ address: vault, abi: CERMIN_VAULT_V11_ABI, fromBlock: from, toBlock: to }),
  ]);
  return toEntries(sakuLogs, vaultLogs, vault);
}

let frozen: { coversTo: bigint; entries: LedgerEntry[] } | null | undefined;

/**
 * The demo vault's 6 Oct passbook, decoded from the raw logs in demoLedger.gen.json with
 * the same ABIs as live logs. Null for any other vault.
 */
function frozenLedger(vault: `0x${string}`) {
  if (vault.toLowerCase() !== demoLedger.vault.toLowerCase()) return null;
  if (frozen === undefined) {
    const saku = demoLedger.saku.toLowerCase();
    const logs = demoLedger.logs.map((l) => ({
      address: l.address as `0x${string}`,
      topics: l.topics as [`0x${string}`, ...`0x${string}`[]],
      data: l.data as `0x${string}`,
      blockHash: l.blockHash as `0x${string}`,
      blockNumber: BigInt(l.blockNumber),
      transactionHash: l.transactionHash as `0x${string}`,
      transactionIndex: Number(l.transactionIndex),
      logIndex: Number(l.logIndex),
      removed: false,
    }));
    const times = demoLedger.blockTimes as Record<string, number>;
    const entries = toEntries(
      parseEventLogs({ abi: CERMIN_SAKU_ABI, logs: logs.filter((l) => l.address.toLowerCase() === saku) }),
      parseEventLogs({ abi: CERMIN_VAULT_V11_ABI, logs: logs.filter((l) => l.address.toLowerCase() !== saku) }),
      vault,
    ).map((e) => ({ ...e, timestamp: times[String(e.blockNumber)], frozen: true }));
    frozen = { coversTo: BigInt(demoLedger.coversToBlock), entries };
  }
  return frozen;
}

type DecodedLog = {
  eventName: string;
  args: unknown;
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
  logIndex: number | null;
};

function toEntries(sakuLogs: readonly DecodedLog[], vaultLogs: readonly DecodedLog[], vault: `0x${string}`): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const l of sakuLogs) {
    const a = l.args as Record<string, unknown>;
    if (a.vault && (a.vault as string).toLowerCase() !== vault.toLowerCase()) continue;
    const base = {
      blockNumber: l.blockNumber!,
      txHash: l.transactionHash!,
      logIndex: l.logIndex!,
      scheduleId: a.id as bigint,
    };
    if (l.eventName === "AllowancePaid")
      out.push({
        ...base,
        kind: "paid",
        amount: a.amount as bigint,
        recipient: a.recipient as `0x${string}`,
        paymentNo: Number(a.paymentNo),
        icrBps: a.icrBps as bigint,
      });
    else if (l.eventName === "AllowanceHeld")
      out.push({ ...base, kind: "held", reason: Number(a.reason), icrBps: a.icrBps as bigint, price: a.price as bigint });
    else if (l.eventName === "ScheduleCreated")
      out.push({ ...base, kind: "created", amount: a.amount as bigint, recipient: a.recipient as `0x${string}` });
    else if (l.eventName === "ScheduleCancelled") out.push({ ...base, kind: "cancelled" });
  }
  for (const l of vaultLogs) {
    const a = l.args as Record<string, unknown>;
    const base = { blockNumber: l.blockNumber!, txHash: l.transactionHash!, logIndex: l.logIndex! };
    if (l.eventName === "Defended")
      out.push({
        ...base,
        kind: "defended",
        amount: a.repaid as bigint,
        icrBps: a.icrBefore as bigint,
        icrAfterBps: a.icrAfter as bigint,
      });
    else if (l.eventName === "Skimmed")
      out.push({ ...base, kind: "skimmed", amount: (a.toSpendable as bigint) + (a.toVault as bigint), price: a.priceAtSkim as bigint });
  }
  return out;
}
