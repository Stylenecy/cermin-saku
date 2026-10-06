# BSC testnet deployment (6 Oct 2026)

Deployed by `scripts/deploy-testnet.sh` from our own wallet `0xE2D734318ffCF581b0de67FF188964CE99343BF4` (chain 97), starting at
block 135154187. Every transaction below has status 1. All nine contracts are source-verified on
Sourcify with an **exact match** (creation and runtime bytecode): https://repo.sourcify.dev/97/0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df

The simulated BNB/USD feed was seeded from Chainlink BNB/USD on BSC testnet at deploy time: **$781.02**.
Testnet gas price was 0.1 gwei; the whole deployment cost about 0.0007 tBNB.

## Contract deployment

| Step | Tx | Block | Gas |
|---|---|---|---|
| deploy MockPriceFeed | [`0x2d9d3b3b…`](https://testnet.bscscan.com/tx/0x2d9d3b3b371a9a3af2e403c0029afd986b77753f82c32246bdb3366f3e13c978) | 135154224 | 229,738 |
| deploy MockMUSD | [`0xe976a9d9…`](https://testnet.bscscan.com/tx/0xe976a9d95d87d4c50f478b50227cac18a80405d1f985693fe9b8eca660282200) | 135154228 | 612,129 |
| deploy MockTroveManager | [`0xa327b579…`](https://testnet.bscscan.com/tx/0xa327b579117262e56cd3526e0aa35f845293a600dbc193e23808b68483a3d899) | 135154230 | 321,787 |
| deploy MockBorrowerOperations | [`0xba7368c5…`](https://testnet.bscscan.com/tx/0xba7368c55aa75242c7313a9e62da20d1970e57cd64efbe450a927b62b284728e) | 135154236 | 699,819 |
| MockTroveManager.setBorrowerOps | [`0x19370a0d…`](https://testnet.bscscan.com/tx/0x19370a0d8fc78356268352c30f3fac670643b39a2bea2a770def651fa6b2b0c5) | 135154242 | 44,038 |
| MockMUSD.setMinter | [`0xdd3621ed…`](https://testnet.bscscan.com/tx/0xdd3621ed8513d71ffbccd0d5b658b529d927e1d3bc8911dab06665b41552be69) | 135154248 | 44,332 |
| MockBorrowerOperations.setGasComp | [`0xe405d84a…`](https://testnet.bscscan.com/tx/0xe405d84a93cd6fe702eda0efeaecfe71a262a0ea5fdcc0bd1863d015b1fb1438) | 135154254 | 26,650 |
| deploy MockSavingsVault | [`0x729ed49d…`](https://testnet.bscscan.com/tx/0x729ed49da7e02490e7bc017fff93dfe3493586df33b3c8b201625eb50b6fc812) | 135154261 | 778,427 |
| deploy CerminVault | [`0x3124ccf6…`](https://testnet.bscscan.com/tx/0x3124ccf684e84f800480bc794c83337a9dad28e2a7fd57e3c0172d3ad1961ec6) | 135154267 | 2,264,258 |
| deploy CerminFactory | [`0xdcddfb58…`](https://testnet.bscscan.com/tx/0xdcddfb580f6604aac5ae53c960078ae8e091d27417832e345a93b5988b63d25f) | 135154272 | 375,593 |
| deploy CerminSaku | [`0xeaf9a338…`](https://testnet.bscscan.com/tx/0xeaf9a3381eefcf690da641d5a024528ef6f845485ead81abe909f23acfd42727) | 135154277 | 939,160 |
| deploy CerminLens | [`0xfb1ec86e…`](https://testnet.bscscan.com/tx/0xfb1ec86e2beba3db255df8b0c888074fab60e8a6d3d0fa05e7e5faf431d4bd65) | 135154284 | 1,106,955 |

## Demo setup

| Step | Tx | Block |
|---|---|---|
| send 0.01 tBNB to keeper `0x2E68…47E` | [`0xb8b4bebe…`](https://testnet.bscscan.com/tx/0xb8b4bebec6374c65de0e1add1519948cbfeff330a64ec1cc6b4f3a8a27122ff6) | 135154479 |
| open demo vault (0.07 BNB, Balanced) → `0xfE17…2a03` | [`0xfbc92704…`](https://testnet.bscscan.com/tx/0xfbc92704959f1836a2e0a9c29510a777c6ba7a6e88af987868c86a9fc1a1cbe7) | 135154512 |
| grant Saku a 20 MUSD spend allowance | [`0x45c652bd…`](https://testnet.bscscan.com/tx/0x45c652bd75d3cfb5126a4ea209e5d91e23941f38f95cb4f538335130c6f1b200) | 135154533 |
| schedule "Uang saku Rara": 1 MUSD / 300 s × 12 | [`0xfb00ba52…`](https://testnet.bscscan.com/tx/0xfb00ba5237e4512fa883fc61b8a69e5389b8503aff038375384b780322d46896) | 135154556 |

State right after setup: collateral 0.07 BNB, debt 27.34 MUSD, ICR 200.0%, spendable 13.67 MUSD, savings
13.67 MUSD. Lines: liquidation $429.56 · keeper defends $546.71 · **Saku pauses $585.76** · skim $820.07.

## Demo run (keeper live)

<!-- DEMO-RUN:START -->
*In progress.*
<!-- DEMO-RUN:END -->
