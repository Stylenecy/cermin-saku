import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSaku, decodeLabel, SAKU_STATUS, statusReason } from './saku.js';

const MIN = 60_000;

test('safe status releases the allowance', () => {
  const d = decideSaku('Ok', undefined, 0, 5 * MIN);
  assert.equal(d.action, 'RELEASE');
});

test('first unsafe sighting records an on-chain hold', () => {
  for (const s of ['IcrBelowFloor', 'ReserveTooThin', 'AllowanceExceeded', 'InsufficientSpendable'] as const) {
    const d = decideSaku(s, undefined, 1_000, 5 * MIN);
    assert.equal(d.action, 'RECORD_HOLD', s);
    assert.match(d.reason, /^HOLD: /);
  }
});

test('repeat holds wait out the cooldown (no spam)', () => {
  const t0 = 10 * MIN;
  assert.equal(decideSaku('IcrBelowFloor', t0, t0 + MIN, 5 * MIN).action, 'WAIT');
  assert.equal(decideSaku('IcrBelowFloor', t0, t0 + 5 * MIN - 1, 5 * MIN).action, 'WAIT');
  assert.equal(decideSaku('IcrBelowFloor', t0, t0 + 5 * MIN, 5 * MIN).action, 'RECORD_HOLD');
});

test('recovery releases immediately even inside the hold cooldown', () => {
  const t0 = 10 * MIN;
  assert.equal(decideSaku('Ok', t0, t0 + 1, 5 * MIN).action, 'RELEASE');
});

test('status list matches ICerminVault.SakuStatus order', () => {
  assert.deepEqual([...SAKU_STATUS], ['Ok', 'AllowanceExceeded', 'InsufficientSpendable', 'IcrBelowFloor', 'ReserveTooThin']);
  for (const s of SAKU_STATUS) assert.ok(statusReason(s).length > 10);
});

test('bytes32 labels decode to text', () => {
  const label = ('0x' + Buffer.from('Uang saku Rara').toString('hex').padEnd(64, '0')) as `0x${string}`;
  assert.equal(decodeLabel(label), 'Uang saku Rara');
});
