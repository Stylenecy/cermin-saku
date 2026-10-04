import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, liveIcrBps } from './vaults.js';
import type { VaultParams, VaultSnapshot, VaultState } from '../types.js';

const PRICE = 100_000n * 10n ** 18n; // $100k, 1e18-scaled
const DEBT = 2_000n * 10n ** 18n; // 2,000 MUSD
const ICR_PRECISION = 10n ** 18n;
const BPS = 10_000n;

const baseParams: VaultParams = {
  targetLTV: 5000,
  defendICR: 14000,
  emergencyICR: 12000,
  skimThresholdBps: 500,
  spendableShare: 5000,
};

const baseState: VaultState = {
  lastSkimPrice: PRICE,
  lastSeenPrice: PRICE,
  spendableMusd: 0n,
  smusdShares: 0n,
  createdAt: 0n,
};

/** Collateral (BTC wei) that produces `targetBps` LIVE ICR at `price` for `debt`. */
function collForIcr(targetBps: number, price: bigint, debt: bigint = DEBT): bigint {
  return (BigInt(targetBps) * ICR_PRECISION * debt) / (BPS * price);
}

function snap(over: {
  icrBps?: number; // the vault's cached getICR() view
  collateral?: bigint;
  debt?: bigint;
  params?: Partial<VaultParams>;
  state?: Partial<VaultState>;
} = {}): VaultSnapshot {
  return {
    address: '0x0000000000000000000000000000000000000001',
    owner: '0x0000000000000000000000000000000000000002',
    params: { ...baseParams, ...over.params },
    state: { ...baseState, ...over.state },
    icrBps: over.icrBps ?? 20000,
    debt: over.debt ?? DEBT,
    collateral: over.collateral ?? 1n * 10n ** 18n,
  };
}

test('liveIcrBps mirrors collateral * price / debt', () => {
  assert.equal(liveIcrBps(collForIcr(13000, PRICE), DEBT, PRICE), 13000);
  assert.equal(liveIcrBps(1n * 10n ** 18n, DEBT, PRICE), 500000); // 1 BTC vs 2k debt @ $100k
});

test('liveIcrBps treats zero debt as infinitely safe (never defends)', () => {
  assert.equal(liveIcrBps(1n * 10n ** 18n, 0n, PRICE), Number.MAX_SAFE_INTEGER);
});

test('DEFEND when the live ICR is below defendICR', () => {
  const d = decide(snap({ collateral: collForIcr(13000, PRICE) }), PRICE);
  assert.equal(d.action, 'DEFEND');
  assert.equal(d.icrBps, 13000);
});

// Regression for the stale-cache bug: getICR() is cached at lastSeenPrice and
// can read "healthy" while the live price has dropped the real ICR below the
// defend line. The keeper MUST act on the live ratio, not the cached view.
test('ignores a stale-healthy cached getICR and defends on the live drop', () => {
  const d = decide(
    snap({ icrBps: 20000 /* cache says 200% */, collateral: collForIcr(12000, PRICE) /* live 120% */ }),
    PRICE,
  );
  assert.equal(d.action, 'DEFEND');
  assert.equal(d.icrBps, 12000);
});

test('HOLD when healthy and price is unchanged', () => {
  assert.equal(decide(snap({ state: { lastSkimPrice: PRICE } }), PRICE).action, 'HOLD');
});

test('SKIM when price rose past the threshold', () => {
  const last = 100_000n * 10n ** 18n;
  const now = 106_000n * 10n ** 18n; // +6% > 5% threshold
  assert.equal(
    decide(snap({ params: { skimThresholdBps: 500 }, state: { lastSkimPrice: last } }), now).action,
    'SKIM',
  );
});

test('HOLD when price rose but below the threshold', () => {
  const last = 100_000n * 10n ** 18n;
  const now = 102_000n * 10n ** 18n; // +2% < 5%
  assert.equal(
    decide(snap({ params: { skimThresholdBps: 500 }, state: { lastSkimPrice: last } }), now).action,
    'HOLD',
  );
});

test('no SKIM when lastSkimPrice is zero (never skimmed)', () => {
  assert.equal(decide(snap({ state: { lastSkimPrice: 0n } }), PRICE).action, 'HOLD');
});

test('DEFEND takes priority over a skim-worthy move', () => {
  const now = 200_000n * 10n ** 18n; // +100%, but the live ICR is unhealthy
  assert.equal(
    decide(snap({ collateral: collForIcr(13000, now), state: { lastSkimPrice: PRICE } }), now).action,
    'DEFEND',
  );
});

test('HOLD when price fell (no skim on a downward move)', () => {
  const last = 100_000n * 10n ** 18n;
  const now = 95_000n * 10n ** 18n;
  assert.equal(decide(snap({ state: { lastSkimPrice: last } }), now).action, 'HOLD');
});

// When the off-chain feed is out of band we cannot trust a live ICR, so the
// cached on-chain getICR() is the safest available signal — defend still fires.
test('degraded feed: falls back to cached getICR and DEFENDs when it is low', () => {
  const d = decide(snap({ icrBps: 13000, collateral: 1n * 10n ** 18n /* live would be huge */ }), PRICE, false);
  assert.equal(d.action, 'DEFEND');
  assert.equal(d.icrBps, 13000);
});

test('degraded feed: HOLDs when cached getICR is healthy and pauses skim', () => {
  const last = 100_000n * 10n ** 18n;
  const now = 200_000n * 10n ** 18n; // skim-worthy, but feed is out of band
  const d = decide(snap({ icrBps: 20000, state: { lastSkimPrice: last } }), now, false);
  assert.equal(d.action, 'HOLD');
});
