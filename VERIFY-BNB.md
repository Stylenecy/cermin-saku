# Cermin — BNB Chain verification (2026-09-25)

Verdict: **WORKS on BSC forks.** The mock CDP stack deploys and runs the full open → skim → defend → withdraw → close
flow on a BSC testnet fork, and the keeper agent skims and defends on its own. The Chainlink BNB/USD adapter was
proven against the **real BSC mainnet feed** on a mainnet fork. Three bugs were fixed (see below). No real-network writes were made.

Environment: anvil forks of BSC testnet (`bsc-testnet-rpc.publicnode.com`, chain 97) and BSC mainnet
(`bsc-dataseed.bnbchain.org`, chain 56), with anvil default keys. The EIP-7702 code on those accounts was cleared
first (see Notes). The env files were written to a scratch dir, not the repo.

## Checks

| Check | Result | Notes |
|---|---|---|
| `forge build` | PASS | Lint notes only |
| `forge test` | PASS | 33/33, before and after the fixes |
| Fork deploy, mock stack (testnet fork) | PASS | MockPriceFeed, MockMUSD, MockTroveManager, MockBorrowerOperations, MockSavingsVault, CerminVault impl, CerminFactory; 4.62M gas |
| Core flow via cast (testnet fork, mock price $60k) | PASS | `createVault` with 0.1 BNB → debt 3,000 MUSD, ICR 200%, 900 spendable / 2,100 vault. Price $66k → `skim` → debt 3,300. Price $45k → `defend` → debt 3,000, ICR 150%. `withdrawSpendable(100)` passed. `close()` → debt 0 and **0.1 BNB returned** |
| Chainlink adapter, **real BSC mainnet feed** (mainnet fork) | PASS | Deployed via `CHAINLINK_BNB_USD_FEED=0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`. `fetchPrice()` = 779.2995e18, so the 8-decimal feed scales correctly. `createVault` with 6 BNB at the live price → debt 2,337.9 MUSD (= 6 × 779.3 × 50%). After `evm_increaseTime 3601`, `fetchPrice`/`skim` revert with `StalePrice` as designed |
| Chainlink adapter, real BSC testnet feed (testnet fork) | PASS (after fix) | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` → `fetchPrice()` = 779.78e18, `MAX_STALENESS` = 7200 |
| Agent typecheck + tests | PASS | `tsc --noEmit`, 12/12 |
| Agent (keeper) on fork | PASS | `/health` returned status ok. With price +10% it sent a SKIM tx on its own; after dropping the price to $45k (ICR 136%) it sent a DEFEND tx. Yield drip reached the accrual path and correctly skipped below the dust floor over a short window |
| Frontend `tsc --noEmit` + `next build` | PASS | Next 14.2.35, 9 static pages, built with fork env |
| Frontend run (`next start` :3133, fork RPC + addresses) | PASS | `/`, `/onboard` and `/dashboard` return 200; fork RPC and factory address are inlined; no Mezo/matsnet or wrong-network strings |
| Address checks (real BSC, read-only) | PASS | BNB/USD mainnet `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`: code present, "BNB / USD", 8 decimals, updates every ~33s. BNB/USD testnet `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`: code present, "BNB / USD", 8 decimals, **updates only about hourly (gaps up to 3,603s)**. No other BSC addresses are hardcoded (the CDP is mocked by design) |

## Bugs fixed

1. **Testnet Chainlink staleness** (`contracts/script/Deploy.s.sol`, `contracts/.env.example`). The testnet feed's
   heartbeat is about 3,600s and a 3,603s gap was observed, so the old default `CHAINLINK_MAX_STALENESS=3600` would make
   `fetchPrice()`, and with it open/skim/defend, intermittently revert with `StalePrice` on testnet. The default is now
   7,200s on chain 97 and 3,600s elsewhere, and `.env.example` leaves it blank. Both verified feed addresses are now
   listed in `.env.example`.
2. **Frontend crash with the documented env** (`frontend/src/lib/wagmi.ts`). `.env.example` has a blank
   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=`, but the code used `??`, so `""` was passed to RainbowKit, which throws
   "No projectId found" on the client. Changed to `||` so the demo ID fallback applies.
3. **Activity feed broken on default RPCs** (`frontend/src/lib/wagmi.ts`, `frontend/.env.example`). With
   `NEXT_PUBLIC_BSC_RPC_URL` unset, the frontend fell back to viem's defaults. BNB's `data-seed-prebsc-1-s1`
   (and `bsc-dataseed`) return "limit exceeded" for `eth_getLogs` at any range (checked down to 10 blocks), and thirdweb
   (viem's mainnet default) caps at 1,000 blocks, so the 4,999-block feed chunks always failed. The default is now
   `bsc-testnet-rpc.publicnode.com` / `bsc-rpc.publicnode.com`, both verified to serve 5k-block `eth_getLogs`.
4. **Keeper silently failing on closed vaults** (`agent/src/index.ts`). Closed vaults stay in `allVaults()`, and their
   `getICR()` view panics with an overflow: the trove manager returns `uint256.max` for zero debt, which is Liquity
   semantics, and `_icrBps` multiplies that by 10,000. Every cycle then reported `failed: N` with no log line. The keeper
   now skips zero-debt vaults and logs any other snapshot error. The vault contract was left unchanged; the frontend
   already falls back gracefully.

## Notes / gotchas

- On real BSC testnet and mainnet, anvil default accounts #0–#4 carry **EIP-7702 delegation code** (`0xef0100…`, sweeper
  bots). On a fork, any BNB sent to them (for example the collateral `close()` returns) gets forwarded away. It looked
  like `close()` was losing the user's BNB until I ran `cast rpc anvil_setCode <addr> 0x`. This is not a Cermin bug.
- Mainnet forks from `bsc-rpc.publicnode.com` fail after ~1 minute (it needs an archive token). Fork from
  `bsc-dataseed.bnbchain.org` and act quickly, or use an archive RPC.

## Steps remaining for a real BSC testnet deploy

1. Create a fresh deployer key and a keeper key; do **not** reuse `.deployer-wallet` / `.wallet-test-strategies.json`
   (Mezo era). Fund them from https://www.bnbchain.org/en/testnet-faucet.
2. Deploy: ~4.62M gas × 0.1 gwei ≈ **0.0005 tBNB**.
   ```bash
   cd contracts
   PRIVATE_KEY=… MOCK_BNB_PRICE=60000000000000000000000 \
     forge script script/Deploy.s.sol:Deploy --rpc-url https://bsc-testnet-rpc.publicnode.com --broadcast \
     [--verify --etherscan-api-key $BSCSCAN_API_KEY]
   ```
   Use the mock feed with a high price so a faucet-sized 0.1 tBNB clears the 2,000 MUSD minimum debt, and `setPrice()`
   to demo skim/defend. For real pricing, set `CHAINLINK_BNB_USD_FEED=0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`
   instead; at ~$780/BNB a vault then needs about **5.2 tBNB** of collateral.
3. Demo user: ~0.1 tBNB of collateral plus ~0.001 for gas. Keeper: ~0.01 tBNB for gas; if `YIELD_ENABLED=true`, also
   mint it some MockMUSD. **Total ≈ 0.15 tBNB with the mock feed.**
4. `agent/.env`: set `CHAIN_ID=97`, `BSC_RPC_URL`, `PRIVATE_KEY` (keeper), `CERMIN_FACTORY_ADDRESS`, `PRICE_FEED_ADDRESS`,
   `MUSD_ADDRESS` and `SAVINGS_VAULT_ADDRESS`.
   `frontend/.env.local`: set the `NEXT_PUBLIC_*` addresses and a real `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
5. Mainnet is still blocked: there is no real Liquity-style CDP on BSC, and the mocks have open `mint`/`setPrice`.

## Real BSC Testnet deploy (2026-09-25)

Deployed with `script/Deploy.s.sol` to **real BSC testnet (chainId 97)** from the group deployer
`0x5856C41047731b765Ca75a6E04Af9415516d1c38`, gas price 0.1 gwei, deploy block 132,984,106.
Addresses are also in `contracts/deployments/bsc-testnet.json` and `.env.bsc-testnet`. Not verified on BscScan (no `ETHERSCAN_API_KEY`/`BSCSCAN_API_KEY` in env).

**Price feed choice:** the real Chainlink testnet feed (`0x2514…7526`, ~$780) does **not** fit: the 2,000 MUSD minimum debt at 50% LTV needs ~5.2 tBNB of collateral. So the deploy uses `MockPriceFeed` with `MOCK_BNB_PRICE=120000e18` ($120,000/BNB), which lets a 0.04 tBNB vault open with 2,400 MUSD debt.

| Contract | Address |
|---|---|
| CerminFactory | [0x4A832Cf199B236ecE52c7AFC50F355d0a1eB1930](https://testnet.bscscan.com/address/0x4A832Cf199B236ecE52c7AFC50F355d0a1eB1930) |
| CerminVault impl | [0x930403144279aF3E980621765Fb5d6d5A28a2667](https://testnet.bscscan.com/address/0x930403144279aF3E980621765Fb5d6d5A28a2667) |
| MockPriceFeed | [0xf59178E78ED1056ACD16d0a4968713fFe028da5F](https://testnet.bscscan.com/address/0xf59178E78ED1056ACD16d0a4968713fFe028da5F) |
| MockMUSD | [0x3Bffc923F1e4636fE8E09a76b2bfc57AD27A3007](https://testnet.bscscan.com/address/0x3Bffc923F1e4636fE8E09a76b2bfc57AD27A3007) |
| MockTroveManager | [0xb63bDC5bEBD4Abd24530Fb7cd2d4f34A8FCD52D7](https://testnet.bscscan.com/address/0xb63bDC5bEBD4Abd24530Fb7cd2d4f34A8FCD52D7) |
| MockBorrowerOperations | [0x2f7D1bB2622Fd1F47E6581E4a6fCD952b9FC16Bc](https://testnet.bscscan.com/address/0x2f7D1bB2622Fd1F47E6581E4a6fCD952b9FC16Bc) |
| MockSavingsVault | [0x719049BecbA18f255c5Da01E9653013313C66F85](https://testnet.bscscan.com/address/0x719049BecbA18f255c5Da01E9653013313C66F85) |

### Smoke flow on real testnet (cast, all receipts status 1)

| Step | Tx | Result |
|---|---|---|
| `createVault((5000,16000,13000,1000,3000),0,0,0)` + 0.04 tBNB | [0xb72e9dbb…](https://testnet.bscscan.com/tx/0xb72e9dbbac40903584383eea68e9819f4b3ed3b0eb85e928142201c33d1dd335) | vault [0x11d157ee…CD75](https://testnet.bscscan.com/address/0x11d157eec22340C651b268F0884683aCff47CD75); debt 2,400 MUSD, ICR 200%, 720 spendable / 1,680 vault |
| `setPrice(132000e18)` (+10%) | [0x0d4ca645…](https://testnet.bscscan.com/tx/0x0d4ca6456136f00706a31c13d817270db034374d67bde739f3d6f33d747cda62) | |
| `skim` | [0x4630460d…](https://testnet.bscscan.com/tx/0x4630460de2e20bb4dae80d6d67b67f0d7894261a77f2675ba38ed6f5fe311884) | debt 2,640 MUSD |
| `setPrice(90000e18)` | [0x09c262a4…](https://testnet.bscscan.com/tx/0x09c262a46a0cad8ed2502efe8f1b4a6c1e36e4a7e011c17771e4827bfe1a5769) | |
| `defend` | [0xb2467e31…](https://testnet.bscscan.com/tx/0xb2467e31e34f6b221640f58c21fe81282fb348c4e42c2fd4331bc2fa937b757d) | debt 2,250 MUSD, ICR 160% |
| `withdrawSpendable(100e18)` | [0x6032a5e8…](https://testnet.bscscan.com/tx/0x6032a5e8d1a3636b9fdf05732174ab18c4e5978753e61c408b7f91ba848c1e60) | user received 100 MUSD |
| MUSD `approve(vault)` | [0xcca9356d…](https://testnet.bscscan.com/tx/0xcca9356da743d4914eef93fa2f3b49934722a8bdc7b84a95e90c8ad8440cb447) | |
| `close` | [0xd0265b56…](https://testnet.bscscan.com/tx/0xd0265b56f907f34a2830d3e727d2bc03191e2c6fbdbc4963ac3a99209d515680) | debt 0, **0.04 tBNB returned**, 200 MUSD remainder to owner |

The mock price was left at $90,000 after the smoke flow.

**Gas spent:** the wallet went from 0.300000 to 0.299440 tBNB, so **~0.00056 tBNB** in total (deploy 4523773 gas ≈ 0.00045 tBNB at 0.1 gwei; the smoke flow used the rest).

**Frontend:** `next build` with `.env.bsc-testnet` values, then `next start -p 3130`: `/`, `/onboard` and `/dashboard` returned 200, the factory address is inlined in the bundle, and there are no matsnet strings. The server was stopped afterwards.

**What works live:** deploy, open, skim, defend, withdrawSpendable, close (collateral returned), and the frontend build against real addresses.
**What's left:** the keeper agent is not run against live testnet (it needs its own funded key, and `YIELD_ENABLED` needs MockMUSD); BscScan verification; a real WalletConnect project ID; a real CDP for mainnet.
