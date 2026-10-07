# Cermin Saku — threat model and known limits

Scope: `CerminSaku`, the Saku gates in `CerminVault` v1.1, `CerminLens`, and the keeper's allowance payer, as deployed
on BSC testnet (chain 97). The underlying Cermin vault engine and the mock CDP are upstream (MIT). Not audited.

| Risk | What can happen | What the code does today | What production needs |
|---|---|---|---|
| **Bad or stale price** | A wrong price could let a payment through or hold it needlessly | On testnet the feed is a `MockPriceFeed` the deployer sets (seeded from Chainlink BNB/USD) so a crash can be demonstrated. `release()` reads the price, and the vault reads it again inside `withdrawSpendableFor` before moving money | A production oracle (e.g. Chainlink on BSC) with staleness and deviation checks, and a defined behaviour when it is unavailable (hold, never pay) |
| **Spam on `release()`** | `release()` is permissionless, so anyone can call it while a payment is held | A held call moves no money; it costs the caller gas and emits `AllowanceHeld`. The keeper waits between retries of a held schedule (`SAKU_HOLD_COOLDOWN_MS`) | An on-chain retry interval per schedule or emitting a hold only when the reason changes, to keep event logs clean |
| **Keeper down** | Payments stop being released automatically; defense does not run | Correctness does not depend on the keeper: anyone can call `release()`, and the vault re-checks. Defense (`defend()`) does depend on someone running it | Several independent keepers or an automation network, with an incentive for whoever executes |
| **Crash larger than the reserve** | A fall beyond the stress assumption can still reach liquidation on a real CDP | Gate 2 keeps enough to defend after a further 30% drop by default; the owner can tune it from 10% to 70% (`setSakuPolicy`) but cannot switch it off | Stress values chosen from real volatility data, user-facing guidance on the trade-off |
| **Interest while payments are held** | On a real lending backend, debt grows while allowances are paused | The mock CDP charges no interest, so the demo does not show this cost; Lens does not model interest yet | Model interest in Lens and in the gates' reserve calculation |
| **Stablecoin and off-ramp** | The recipient holds a stablecoin; it can depeg, and it is not Rupiah | MUSD is a test token. Rupiah amounts are display only (indicative rate) | A chosen production stablecoin, and Rupiah delivery only through a licensed partner |
| **Over-spending** | A schedule pays more than the owner allowed | The vault only lets CerminSaku spend within the owner's spend allowance; invariant tests check paid ≤ granted and allowance accounting | Same, plus an external audit |
| **Upgrades and admin keys** | An admin could change behaviour after deposit | Vaults are EIP-1167 clones of a fixed implementation; CerminSaku has no admin. Testnet-only mocks (price feed, CDP gas compensation) have an owner | No owner-controlled price or CDP parameters on mainnet |

What the tests prove: 7 invariants (64 runs × 64 random calls each) and fuzz tests show the gates and accounting hold
**given the price the feed returns and the mock CDP's behaviour**. They do not prove behaviour on a real CDP or under
oracle failure.
