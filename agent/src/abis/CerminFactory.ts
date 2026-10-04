export const VAULT_PARAMS_TUPLE = [
  { name: 'targetLTV', type: 'uint16' },
  { name: 'defendICR', type: 'uint16' },
  { name: 'emergencyICR', type: 'uint16' },
  { name: 'skimThresholdBps', type: 'uint16' },
  { name: 'spendableShare', type: 'uint16' },
] as const;

export const CERMIN_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createVault',
    inputs: [
      { name: 'params', type: 'tuple', components: VAULT_PARAMS_TUPLE },
      { name: 'maxBorrow', type: 'uint256' },
      { name: 'upperHint', type: 'address' },
      { name: 'lowerHint', type: 'address' },
    ],
    outputs: [{ name: 'vault', type: 'address' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'vaultOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allVaults',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'VaultCreated',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'vault', type: 'address', indexed: true },
      { name: 'params', type: 'tuple', components: VAULT_PARAMS_TUPLE, indexed: false },
    ],
  },
] as const;
