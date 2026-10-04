// Mezo MUSDSavingsRate (and Cermin's MockSavingsVault) — rebase/claim-style,
// NOT ERC4626. sMUSD mints 1:1 with MUSD; yield accrues via a global index and
// is claimed separately. `accrueYield` mirrors the protocol's PCV pushing fees
// in (distributed pro-rata to sMUSD holders).
export const SAVINGS_VAULT_ABI = [
  {
    type: 'function',
    name: 'accrueYield',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimableYield',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
