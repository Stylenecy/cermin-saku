# Cermin — Migration to BNB Chain

Original target: **Mezo Matsnet** (chainId 31611, native BTC gas/collateral, Mezo MUSD trove system).
New target: **BNB Smart Chain** — BSC testnet (97) by default, BSC mainnet (56) supported via config.

## Key design decision

Cermin is a thin orchestrator over a Liquity-style CDP (Mezo's BorrowerOperations / TroveManager /
PriceFeed / MUSD / MUSDSavingsRate). **Mezo does not exist on BNB Chain**, so:

- `CerminVault` / `CerminFactory` logic is **unchanged**. All CDP addresses were already constructor
  arguments, and collateral is still the chain's native coin (`msg.value`) — which is now **BNB**.
- `script/Deploy.s.sol` now deploys the existing Liquity-style mock stack from `contracts/test/mocks`
  (MockMUSD, MockTroveManager, MockBorrowerOperations, MockSavingsVault) whenever the `CDP_*` env vars
  are blank. Point `CDP_BORROWER_OPS` / `CDP_TROVE_MANAGER` / `CDP_MUSD` (+ optional `CDP_SAVINGS_VAULT`,
  `CDP_PRICE_FEED`) at a real Liquity-compatible CDP on BSC to skip the mocks.
- Price feed: `CHAINLINK_BNB_USD_FEED` set → deploys new `src/oracles/ChainlinkPriceFeedAdapter.sol`
  (Chainlink aggregator → 1e18 `fetchPrice()`, with staleness check); otherwise an owner-settable
  `MockPriceFeed` seeded with `MOCK_BNB_PRICE` (default $600).
- The stablecoin stays named **MUSD** (MockMUSD, 18 decimals) — it is the CDP's own debt token, not a
  bridged stable, so USDT/USDC addresses are not used.

## What changed

### contracts/
- `foundry.toml`: `bsc_testnet` / `bsc` RPC endpoints (`BSC_TESTNET_RPC`, `BSC_RPC`) and BscScan verification
  (`BSCSCAN_API_KEY`, `chain = 97/56`) replace `mezo_testnet`.
- `script/Deploy.s.sol`: rewritten to deploy the mock CDP stack + price feed on demand (see above).
- `src/oracles/ChainlinkPriceFeedAdapter.sol`: new.
- `script/TestnetSmoke.s.sol`: **deleted** (hardcoded Mezo matsnet factory/HintHelpers/SortedTroves).
- `.env.example`, `README.md`: BSC vars / instructions.
- `broadcast/Deploy.s.sol/31611`: old Mezo deploy artifacts left in place (historical, gitignored).
- Interfaces still live in `src/interfaces/mezo/` (path kept to avoid churn; they are generic Liquity-style).

### agent/ (keeper)
- `src/chain.ts`: `bsc` / `bscTestnet` from `viem/chains`, selected by `CHAIN_ID` (97 default, 56).
- `src/config.ts`: `MEZO_TESTNET_RPC` → `BSC_RPC_URL` (defaults to BSC testnet RPC), `MEZO_PRICE_FEED_ADDRESS` →
  `PRICE_FEED_ADDRESS`, `MEZO_SORTED_TROVES_ADDRESS` → `SORTED_TROVES_ADDRESS`; `MUSD_ADDRESS` /
  `SAVINGS_VAULT_ADDRESS` no longer default to Mezo addresses (blank = unset; yield drip skips with a warning).
- Log/reason strings BTC → BNB. `.env.example`, `README.md`, `Dockerfile` comment updated.

### frontend/ (Next.js + wagmi + RainbowKit)
- `src/lib/chains.ts`: `activeChain` = `bscTestnet` (or `bsc` when `NEXT_PUBLIC_CHAIN_ID=56`) + `EXPLORER_URL`.
- `src/lib/wagmi.ts`: uses `activeChain`; RPC override `NEXT_PUBLIC_BSC_RPC_URL`.
- `src/lib/contracts.ts`: Mezo matsnet default addresses removed → zero-address until env is filled.
- Explorer links (tx/address) → BscScan via `EXPLORER_URL`.
- Activity feed `eth_getLogs` chunk 10k → 5k blocks (public BSC RPC limits).
- UI copy: BTC/Bitcoin → BNB, Mezo → BNB Chain / CDP, network label from `activeChain.name`, footer links →
  BNB Chain docs / BscScan / BNB faucet; lucide `Bitcoin` icon → `Coins`.
- `.env.example`: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_BSC_RPC_URL`, contract address vars.
- Internal identifiers (`useBtcPrice`, `btcAmount`, `BtcBalanceCard`, event arg `btcReturned`) intentionally
  kept to keep the diff small.

### Root
- `README.md`: rebranded to BNB Chain; network table, deploy instructions, CDP-backend section.
- `BLUEPRINT.md`, `CLAUDE.md`, `MAINNET_PLAN.md`, `SUBMISSION.txt`, pitch decks, `video/`: **not** changed
  (historical Mezo hackathon material).

## Verification

- `forge build` ✅, `forge test` ✅ 33/33 passing.
- `forge script script/Deploy.s.sol` in-memory simulation (no RPC, no broadcast) ✅ — full mock stack + factory deploys.
- agent: `tsc --noEmit` ✅, `npm test` ✅ 12/12.
- frontend: `tsc --noEmit` ✅ (`next build` not run).
- Nothing deployed; no transactions sent.

## TODO

1. Fund a deployer with tBNB (https://www.bnbchain.org/en/testnet-faucet) and deploy:
   ```bash
   cd contracts && cp .env.example .env   # set PRIVATE_KEY, BSCSCAN_API_KEY
   set -a; source .env; set +a
   forge script script/Deploy.s.sol:Deploy --rpc-url bsc_testnet --private-key $PRIVATE_KEY --broadcast \
     --verify --etherscan-api-key $BSCSCAN_API_KEY
   ```
2. Copy printed addresses into `agent/.env` (`CERMIN_FACTORY_ADDRESS`, `PRICE_FEED_ADDRESS`, `MUSD_ADDRESS`,
   `SAVINGS_VAULT_ADDRESS`) and `frontend/.env.local` (`NEXT_PUBLIC_*`); update the README address table.
3. **Min debt vs. faucet size**: the vault enforces 2,000 MUSD minimum debt. At ~$600/BNB and 50% LTV that is
   ~6.7 tBNB of collateral. For a faucet-sized demo, deploy with a higher `MOCK_BNB_PRICE` or `setPrice()` on
   the mock feed (it's also how you demo skim/defend). With a real Chainlink feed, consider lowering
   `MIN_MUSD_DEBT` / `GAS_COMP` in `CerminVault` (and `MockBorrowerOperations`) — not done, to keep logic intact.
4. Chainlink BNB/USD aggregator address for `CHAINLINK_BNB_USD_FEED`: look up on https://data.chain.link
   (not hardcoded on purpose).
5. Mainnet: no real Liquity-compatible CDP is wired up; the mocks have open `mint`/`setPrice` and are
   **testnet-only**.
6. Frontend: WalletConnect project ID; an RPC with `eth_getLogs` support if the public endpoint rejects the activity-feed queries.
7. Note: `.deployer-wallet` and `.wallet-test-strategies.json` in this folder hold keys from the Mezo era
   (gitignored) — don't reuse them on BSC mainnet.
