import { VAULT_PARAMS_TUPLE } from './CerminFactory.js';

const VAULT_STATE_TUPLE = [
  { name: 'lastSkimPrice', type: 'uint256' },
  { name: 'lastSeenPrice', type: 'uint256' },
  { name: 'spendableMusd', type: 'uint256' },
  { name: 'smusdShares', type: 'uint256' },
  { name: 'createdAt', type: 'uint64' },
] as const;

export const CERMIN_VAULT_ABI = [
  // ── views ─────────────────────────────────────────────────────────────────
  { type: 'function', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getICR', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getDebt', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getCollateral', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  {
    type: 'function',
    name: 'getShadow',
    inputs: [],
    outputs: [
      { name: 'spendable', type: 'uint256' },
      { name: 'vaultValue', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'params',
    inputs: [],
    outputs: [{ name: '', type: 'tuple', components: VAULT_PARAMS_TUPLE }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'state',
    inputs: [],
    outputs: [{ name: '', type: 'tuple', components: VAULT_STATE_TUPLE }],
    stateMutability: 'view',
  },

  // ── owner actions ─────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'withdrawSpendable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'upperHint', type: 'address' },
      { name: 'lowerHint', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'close',
    inputs: [
      { name: 'upperHint', type: 'address' },
      { name: 'lowerHint', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── permissionless ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'skim',
    inputs: [
      { name: 'upperHint', type: 'address' },
      { name: 'lowerHint', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'defend',
    inputs: [
      { name: 'upperHint', type: 'address' },
      { name: 'lowerHint', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── events ────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'Skimmed',
    inputs: [
      { name: 'priceAtSkim', type: 'uint256', indexed: false },
      { name: 'toSpendable', type: 'uint256', indexed: false },
      { name: 'toVault', type: 'uint256', indexed: false },
      { name: 'newDebt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Defended',
    inputs: [
      { name: 'icrBefore', type: 'uint256', indexed: false },
      { name: 'icrAfter', type: 'uint256', indexed: false },
      { name: 'repaid', type: 'uint256', indexed: false },
      { name: 'fromVault', type: 'uint256', indexed: false },
      { name: 'fromSpendable', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SpendableWithdrawn',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CollateralAdded',
    inputs: [{ name: 'amount', type: 'uint256', indexed: false }],
  },
  {
    type: 'event',
    name: 'Closed',
    inputs: [
      { name: 'btcReturned', type: 'uint256', indexed: false },
      { name: 'musdRemainder', type: 'uint256', indexed: false },
    ],
  },
] as const;
