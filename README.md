<div align="center">

# Cermin Saku

**An allowance from your BNB that knows when to hold back.**
*Uang saku dari BNB-mu, yang tahu kapan harus menahan diri.*

Scheduled allowances paid from a BNB vault on BNB Chain. The vault contract itself refuses a payment
when the position is not safe, and pays it once it is. BNB is never sold.

Built on **Cermin** by Kiel (MIT) · Indonesia Web3 Hackathon 2026 · BSC testnet

<!-- PROOF-LINKS:START -->
Live app: *pending* · Demo video: *pending* · On-chain proof page: *pending* · [Contracts on BscScan](#contracts)
<!-- PROOF-LINKS:END -->

</div>

---

## The problem, in one family

A parent in Medan holds BNB and wants to send a monthly allowance to a child at university in Jogja.
Selling BNB every month gives up the upside. Borrowing against it works (that is what
[Cermin](https://github.com/yeheskieltame/Cermin) automates) but an allowance that keeps flowing while
BNB falls can drain exactly the money the position needs to avoid liquidation.

**Cermin Saku** turns the borrowed balance (Cermin's "Shadow") into scheduled envelopes for someone
else, with one rule enforced by the contract, not by the app: *survival money comes first*.

## Proof

| What | Evidence | How to check |
|---|---|---|
| Contracts tested | **76 forge tests passing**: 33 original Cermin + 28 Saku unit/fuzz + 7 Lens + 8 invariant (64 runs × 64 calls each) | `cd contracts && forge test` |
| Payment never made while unsafe | invariant `invariant_NoUnsafePayment` + fuzz `testFuzz_NeverPaysBelowFloor` | [`test/saku/`](contracts/test/saku) |
| Saku never moves more than granted | invariants `invariant_PaidNeverExceedsGranted`, `invariant_AllowanceAccounting` | same |
| BNB collateral never decreases | `invariant_CollateralNeverDecreases` | same |
| Lens = real execution | fuzz `testFuzz_PreviewDefendEqualsDefend`, `testFuzz_PreviewSkimEqualsSkim`, `testFuzz_PausePriceIsExactBoundary` | [`CerminLens.t.sol`](contracts/test/saku/CerminLens.t.sol) |
| Keeper logic tested | **18 node:test passing** (12 original + 6 Saku) | `cd agent && npm test` |
| Full flow rehearsed on a local chain | open → pay ×2 → price drop → `AllowanceHeld(IcrBelowFloor)` → keeper `defend()` → recovery → paid again | [`docs/LOCAL-REHEARSAL.md`](docs/LOCAL-REHEARSAL.md) |
| BSC testnet deployment from our own wallet | CerminSaku [`0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df`](https://testnet.bscscan.com/address/0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df) and 8 more, source on Sourcify | [Contracts](#contracts) |
| CI | GitHub Actions: forge build + test, keeper typecheck + test, web typecheck + lint + build | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

## Judge path (5 minutes, no wallet needed)

1. Open the **proof page** (`/bukti` on the live app): a real demo vault on BSC testnet, its scheduled envelopes, and the passbook of every payment and hold, read from event logs.
2. Find an envelope stamped **DITAHAN** (held). Click its transaction: the `AllowanceHeld` event carries the reason (`IcrBelowFloor` or `ReserveTooThin`), the ICR and the price at that moment. No MUSD moved.
3. Drag the **"If BNB goes to Rp X"** slider. Every number is returned by `CerminLens` via `eth_call`, the same math the vault executes.
4. Read [`CerminVault.sol` → `_sakuStatus`](contracts/src/CerminVault.sol) (the two gates) and [`CerminSaku.sol` → `release`](contracts/src/CerminSaku.sol) (pay or hold).
5. Run `forge test` and look at [`SakuInvariant.t.sol`](contracts/test/saku/SakuInvariant.t.sol).

## How a payment is decided

```mermaid
sequenceDiagram
    autonumber
    participant K as Keeper (or anyone)
    participant S as CerminSaku
    participant V as CerminVault v1.1
    participant F as PriceFeed
    participant C as Child wallet
    K->>S: release(scheduleId)
    S->>S: is a period due? (else revert NothingDue)
    S->>F: fetchPrice()
    S->>V: sakuStatus(Saku, amount, price)
    alt both gates pass
        S->>V: withdrawSpendableFor(amount, child)
        V->>F: fetchPrice() and re-check both gates
        V->>C: transfer MUSD (from the spendable bucket only)
        S-->>K: AllowancePaid(id, amount, paymentNo, ICR)
    else a gate fails
        S-->>K: AllowanceHeld(id, reason, ICR, price) — no money moves, period stays owed
    end
```

### The two gates (in `CerminVault._sakuStatus`)

| Gate | Rule | Default (Balanced preset) |
|---|---|---|
| 1. Health floor | `ICR ≥ defendICR + floorBuffer` | keeper defends at 140%, so allowances stop below **150%** |
| 2. Crash reserve | `spendable − amount + savings ≥ repay that defend() would need to restore defendICR after a stress% drop` | must survive another **30%** fall |

The owner can make the policy stricter (`setSakuPolicy`, buffer 5–50 points, stress 10–70%) but cannot turn it off.
The owner's allowance (`setSpendAllowance`) is a hard cap on everything Saku may ever move. Payments come only out of
the spendable bucket; savings stay as the defense reserve and BNB collateral is never touched. The owner's own
`withdrawSpendable` keeps Cermin's original behaviour: Saku constrains money that leaves on *someone else's* schedule.

## Provenance

> **Provenance.** Cermin's vault engine (CerminVault + CerminFactory + keeper) was written by Yeheskiel Yunus Tame (Kiel) in May 2026 for the Mezo Hackathon 2, where it won 1st place in the Bitcoin Banking track ([original repo](https://github.com/yeheskieltame/Cermin), MIT). Kiel ported it to BNB Chain in late September 2026 with a mock Liquity-style CDP, because no Liquity-compatible CDP exists on BSC. **Built during this hackathon (5–7 Oct 2026) by Dex Bennett:** Cermin Saku (scheduled allowances paid from the Shadow only while the BNB position is safe), CerminLens (what-if price view), a Bahasa Indonesia + Rupiah interface, our own BSC testnet deployment, tests and CI. Every line we added is in commits dated 5–7 Oct; see [`CONTRIBUTIONS.md`](CONTRIBUTIONS.md).

The first commit of this repository ([`e767fde`](https://github.com/Stylenecy/cermin-saku/commit/e767fde)) is Kiel's published code, unchanged.
Kiel's own notes from the port are kept in [`docs/upstream-*.md`](docs).

## Architecture

```mermaid
flowchart LR
    Parent["Parent wallet"] -->|"createVault · setSpendAllowance · createSchedule"| Vault
    Parent --> Saku
    subgraph New["Built for Cermin Saku"]
        Saku["CerminSaku<br/>schedules · release()"]
        Lens["CerminLens<br/>what-if views"]
        KeeperS["Keeper: releaseDue"]
    end
    subgraph Kiel["Cermin (Kiel, MIT)"]
        Factory["CerminFactory"] -->|clones| Vault["CerminVault v1.1<br/>+ spend allowance + 2 gates"]
        KeeperK["Keeper: skim / defend"]
    end
    subgraph CDP["Mock Liquity-style CDP (testnet)"]
        BO["BorrowerOperations"]; TM["TroveManager"]; PF["MockPriceFeed"]; M["MockMUSD"]; SV["MockSavingsVault"]
    end
    KeeperS -->|"release(id)"| Saku
    KeeperK -->|"defend / skim"| Vault
    Saku -->|"withdrawSpendableFor"| Vault
    Vault -->|"MUSD"| Child["Child wallet"]
    Vault --> BO & TM & PF & M & SV
    Lens -.->|reads| Vault
```

## Contracts

<!-- CONTRACTS:START -->
**BSC testnet (chain 97)**, deployed from `0xE2D734318ffCF581b0de67FF188964CE99343BF4` at block 135154187. Source verified on [Sourcify](https://repo.sourcify.dev/97/0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df). Every transaction: [`docs/TESTNET-DEPLOY.md`](docs/TESTNET-DEPLOY.md).

| Contract | Address | Role |
|---|---|---|
| CerminSaku | [`0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df`](https://testnet.bscscan.com/address/0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df) | new · schedules, `release`, holds |
| CerminLens | [`0x3287Be66C493d24B492c300A179B33f1a7A0B6bc`](https://testnet.bscscan.com/address/0x3287Be66C493d24B492c300A179B33f1a7A0B6bc) | new · what-if price views |
| CerminFactory | [`0x1dD819Fafc6B649dCfE682a6d165d7d8CA4C4013`](https://testnet.bscscan.com/address/0x1dD819Fafc6B649dCfE682a6d165d7d8CA4C4013) | Kiel · clones vaults |
| CerminVaultImpl | [`0x23a865ed98d471398C2b161c3C4A2fCBC129257c`](https://testnet.bscscan.com/address/0x23a865ed98d471398C2b161c3C4A2fCBC129257c) | Kiel + Saku gates (v1.1 implementation) |
| PriceFeed | [`0xab5D57Fc63C9D7D271312ffbbB8a658A883A1389`](https://testnet.bscscan.com/address/0xab5D57Fc63C9D7D271312ffbbB8a658A883A1389) | simulated BNB/USD (MockPriceFeed, seeded from Chainlink) |
| MUSD | [`0xAc319a7FffEEd3D5e1Ae7a776151168Bd0dCfe59`](https://testnet.bscscan.com/address/0xAc319a7FffEEd3D5e1Ae7a776151168Bd0dCfe59) | mock stablecoin |
| BorrowerOperations | [`0xd5F721410C2E2A373bdFA8AD6f43a78E3C6fC462`](https://testnet.bscscan.com/address/0xd5F721410C2E2A373bdFA8AD6f43a78E3C6fC462) | mock CDP |
| TroveManager | [`0x083D1955830Fe4D1039a2DcedbEfA52a1Df8fB81`](https://testnet.bscscan.com/address/0x083D1955830Fe4D1039a2DcedbEfA52a1Df8fB81) | mock CDP |
| SavingsVault | [`0x0A668Cbd794a7c7Bb17dfcC6CeD60cc092BF53C4`](https://testnet.bscscan.com/address/0x0A668Cbd794a7c7Bb17dfcC6CeD60cc092BF53C4) | mock savings (sMUSD) |
| Demo vault | [`0xfe1742bcfe1836d080f690526cd739bbae192a03`](https://testnet.bscscan.com/address/0xfe1742bcfe1836d080f690526cd739bbae192a03) | the vault shown on `/bukti` |
<!-- CONTRACTS:END -->

| Contract | Source | Role |
|---|---|---|
| `CerminSaku` | [src/CerminSaku.sol](contracts/src/CerminSaku.sol) | **new** · schedules, permissionless `release`, holds |
| `CerminLens` | [src/CerminLens.sol](contracts/src/CerminLens.sol) | **new** · price lines, previews of defend / skim / Saku |
| `CerminVault` v1.1 | [src/CerminVault.sol](contracts/src/CerminVault.sol) | Kiel's vault + spend allowance + the two gates (`git diff e767fde -- contracts/src/CerminVault.sol`) |
| `CerminFactory` | [src/CerminFactory.sol](contracts/src/CerminFactory.sol) | Kiel's, unchanged |
| Mock CDP | [test/mocks](contracts/test/mocks) | Kiel's mocks; admin functions made owner-only for a public testnet |

Demo parameters: the BNB price feed is a **simulated** `MockPriceFeed` owned by our deployer, seeded from Chainlink
BNB/USD on BSC testnet at deploy time, so drops can be shown on demand. Min debt / gas compensation are deploy-time
settings (Mezo uses 2,000 / 200 MUSD; the testnet demo uses 20 / 2 so a faucet-sized vault works at a real BNB price).

## Run it

**Contracts**
```bash
cd contracts
git clone --depth 1 --branch v5.6.1 https://github.com/OpenZeppelin/openzeppelin-contracts.git lib/openzeppelin-contracts
git clone --depth 1 --branch v1.16.2 https://github.com/foundry-rs/forge-std.git lib/forge-std
forge test
```

**Full local rehearsal (Anvil):** see [`docs/LOCAL-REHEARSAL.md`](docs/LOCAL-REHEARSAL.md): deploy, open a vault, schedule an
allowance, run the keeper, move the simulated price and watch payments get held and resumed.

**Web**
```bash
cd frontend && npm ci
npm run dev   # testnet addresses come from frontend/.env.production, written by scripts/post-deploy.mjs
```

**Deploy (BSC testnet, one command)**
```bash
bash scripts/deploy-testnet.sh   # keys from ./wallets.env (gitignored): deploy, Sourcify, demo vault, wire web + keeper + README
bash scripts/rehearse-fork.sh    # same script against a local anvil fork of BSC testnet, no tBNB spent
```

**Keeper**
```bash
cd agent && npm ci && npm test
# env: PRIVATE_KEY, CERMIN_FACTORY_ADDRESS, PRICE_FEED_ADDRESS, SAKU_ADDRESS (see agent/.env.example)
npm run dev
```

## Limits we own up to

- **Mock CDP.** BNB Chain has no Liquity-style CDP; the vault runs on Kiel's mock stack. MUSD is play money, and the mock does not execute liquidations.
- **Simulated price.** The demo feed is owner-settable so a crash can be shown. The 110% "liquidation line" is the rule a real CDP would enforce.
- **One keeper.** Our keeper is a single process. `release()` is permissionless and the vault re-checks every payment, so a missing keeper delays payments; it cannot make an unsafe one.
- **Rupiah is display only.** An indicative USD/IDR rate (ExchangeRate-API, with a dated fallback). No bank off-ramp; that is roadmap.
- **Not audited.** Hackathon code on testnet.

## Roadmap

Real CDP backend on BNB Chain (Venus / Lista adapter) · IDR off-ramp partner · recipient-side spending limits ·
multiple keepers.

## License

MIT, see [LICENSE](LICENSE). Copyright © 2026 Yeheskiel Yunus Tame (Cermin) and © 2026 Dex Bennett (Cermin Saku additions).
