# Contributions

This repository starts from **Cermin** by Yeheskiel Yunus Tame (Kiel), MIT
([original](https://github.com/yeheskieltame/Cermin), Mezo Hackathon 2, May 2026; BNB Chain port by Kiel, late September 2026).
Commit [`e767fde`](https://github.com/Stylenecy/cermin-saku/commit/e767fde) is Kiel's published code, unchanged
(source: `bcc-ukdw/seed-bnb` at `52671ce`, folder `Cermin/`; the Mezo pitch deck, Mezo logo files, a blog copy and
three Mezo-era screenshots were left out of the import).

Everything below was built by **Dex Bennett** during Indonesia Web3 Hackathon 2026, 5–7 October 2026.
To see exactly what changed in Kiel's files: `git diff e767fde -- contracts/src agent/src frontend/src`.

## What is new

| Area | New | Changed from Cermin |
|---|---|---|
| Contracts | `CerminSaku.sol` (schedules, permissionless `release`, holds), `CerminLens.sol` (price lines, previews) | `CerminVault.sol` v1.1: spend allowance for a delegated spender, the two Saku safety gates (`_sakuStatus`), Saku policy, min debt / gas compensation as deploy-time immutables. `ICerminVault.sol` extended. Mocks: admin functions made owner-only; gas compensation configurable. `Deploy.s.sol` rewritten for the full stack + JSON manifest |
| Tests | `test/saku/`: 28 Saku unit + fuzz, 7 Lens (preview equals execution, exact pause-price boundary), 8 invariant (paid ≤ granted, allowance accounting, no unsafe payment, ledger = balances, BNB never decreases, spendable backed, periods bounded, positive control) | Kiel's 33 tests kept; only `setUp` adapted to the new constructors (logic untouched) |
| Keeper | `monitors/saku.ts`, `executors/release.ts`, `scripts/demo.ts`, `abis/generated.ts`, 6 node:test cases | `index.ts` runs Saku after skim/defend; `config.ts` (SAKU_ADDRESS, hold cooldown, chain 31337); `chain.ts` (Anvil) |
| Web | Landing, `/bukti` (no-wallet proof page), `/saku` (schedule envelopes), `/terima` (recipient view), Lens panel, on-chain passbook, ID/EN switch, Rupiah display with a labelled indicative rate | New palette and type (see `docs/DESIGN.md`), Kiel's dashboard and onboarding translated |
| Ops | GitHub Actions CI, local Anvil rehearsal, own BSC testnet deployment (fresh deployer) | Kiel's port notes moved to `docs/upstream-*` |

## Commit log (newest last)

<!-- COMMITS:START -->
| Commit | Date (WIB) | What |
|---|---|---|
| `e767fde` | 5 Oct 03:54 | Import Cermin by Kiel, unchanged |
| `c913c57` | 5 Oct 04:1x | Contracts: Saku, Lens, vault v1.1, hardened mocks, 76 tests |
| `a40687f` | 5 Oct 04:4x | Keeper: pay due allowances, record holds on-chain |
| `8c15ca2` | 5 Oct 04:4x | README, provenance, CI, local rehearsal |
<!-- COMMITS:END -->
