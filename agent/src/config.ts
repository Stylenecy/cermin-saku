import { z } from 'zod';

const Hex = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(v => v as `0x${string}`);

// Blank env values (e.g. `MUSD_ADDRESS=`) are treated as unset.
const OptHex = z.preprocess(v => (v === '' ? undefined : v), Hex.optional());

const ConfigSchema = z.object({
  BSC_RPC_URL: z.string().url().default('https://data-seed-prebsc-1-s1.bnbchain.org:8545'),
  CHAIN_ID: z.coerce.number().int().refine(v => v === 97 || v === 56, 'CHAIN_ID must be 97 or 56').default(97),
  PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(v => v as `0x${string}`),
  CERMIN_FACTORY_ADDRESS: Hex,
  PRICE_FEED_ADDRESS: Hex,
  // Reserved for production hint generation; unused while computeHints() returns
  // the 0x0 "no hint" pair, so it's optional to keep deploy config minimal.
  SORTED_TROVES_ADDRESS: OptHex,
  POLL_INTERVAL_MS: z.coerce.number().default(600_000),
  DB_PATH: z.string().default('./data/cermin.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ── Savings-yield simulation ────────────────────────────────────────────
  // A production savings vault is fed by real protocol fees.
  // On testnet (mock vault) nothing pushes yield, so the keeper streams a
  // small, timestamp-proportional amount each interval to mirror that — i.e.
  // it plays the role of PCV. Off by default; the signer must hold MUSD.
  // Addresses printed by contracts/script/Deploy.s.sol (mock stack on BSC).
  MUSD_ADDRESS: OptHex,
  SAVINGS_VAULT_ADDRESS: OptHex,
  YIELD_ENABLED: z.string().optional().default('false').transform(v => v === 'true'),
  YIELD_APR_BPS: z.coerce.number().int().min(0).max(50_000).default(500),
  YIELD_MIN_INTERVAL_MS: z.coerce.number().default(3_600_000),
  YIELD_MAX_CATCHUP_MS: z.coerce.number().default(86_400_000),

  // ── Keeper safety / observability ───────────────────────────────────────
  // Warn when the signer's BNB (gas) balance drops below this. Out-of-gas means
  // skim/defend silently fail — and a missed defend risks liquidation. 1e15 wei
  // = 0.001 BNB. Accepts a decimal-wei string to dodge JS number precision.
  GAS_WARN_THRESHOLD_WEI: z.string().default('1000000000000000').transform(v => BigInt(v)),
  // Health server. Railway injects PORT for its healthcheck; index prefers that.
  HEALTH_PORT: z.coerce.number().int().positive().default(8080),
  // A single cycle should finish well within the poll interval; if it runs
  // longer the watchdog marks the process unhealthy so the platform can restart.
  CYCLE_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
