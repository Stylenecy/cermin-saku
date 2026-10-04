# Cermin — Pre-Mainnet Audit & Launch Plan

_Internal review, June 2026. Prepared after the hackathon win, as the first step toward mainnet._

> **Disclaimer.** This is an **internal code review** of the Cermin contracts, not a substitute for a professional third-party audit. It is meant to (1) catch issues early and cheaply, and (2) define the path and checklist to mainnet. A formal external audit is a required step in the plan below.

---

## 1. Executive summary

The on-chain surface is small and disciplined: two contracts (`CerminVault`, `CerminFactory`), non-custodial, with a permissionless `defend()`. The core money logic (open → skim → defend → close) is written with good security hygiene: custom errors, checks-effects-interactions ordering, a reentrancy guard on every state-changing function, `SafeERC20`, immutable Mezo addresses, on-chain price reads, and an implementation that is init-locked in its constructor. The internal review found **no critical exploit in Cermin's own logic**.

Mainnet readiness, however, is **not** primarily a code-quality question — it hinges on a handful of integration and process blockers:

1. **The savings-vault assumption is unverified against the real Mezo contract** (1:1 + `claimYield` vs. an ERC-4626-style exchange rate). This is the single biggest technical risk.
2. **All Mezo interfaces were verified against testnet (matsnet) only.** Mainnet addresses and ABIs must be re-verified.
3. **Tests run entirely against mocks.** No fork tests against real Mezo yet.
4. **No external audit yet.**
5. A **post-close lockout** UX bug prevents a user from ever creating a second vault.

Everything below is organized as: what's solid → findings by severity → the savings-vault question → a phased launch plan → a checklist.

---

## 2. Scope & method

**Reviewed:**

- `contracts/src/CerminVault.sol`
- `contracts/src/CerminFactory.sol`
- `contracts/src/interfaces/ICerminVault.sol`, `ICerminFactory.sol`
- `contracts/src/interfaces/mezo/*` (BorrowerOperations, TroveManager, PriceFeed, SavingsVault, MUSD, SortedTroves)
- `contracts/script/Deploy.s.sol`
- `contracts/foundry.toml`
- `contracts/test/*` (coverage assessment)

**Method:** manual line-by-line review against the security patterns in `CLAUDE.md` and standard Solidity/DeFi failure modes (reentrancy, access control, oracle trust, accounting/rounding, upgrade/clone init, external-call ordering). Observational only — no formal verification or fuzzing was performed in this pass.

---

## 3. What's solid (keep it)

- **Tiny attack surface.** Two custom contracts; the heavy lifting (CDP, liquidations, price) is Mezo's audited code.
- **Reentrancy.** Every state-changing external function carries `nonReentrant`; `createVault` too.
- **CEI discipline.** State is updated before external calls in `open`, `skim`, `defend`, `close` (e.g., `smusdShares`/`spendableMusd` decremented before `withdraw`/`repay`).
- **Clone safety.** The implementation constructor sets `_initialized = true` and `_opened = true`, so the implementation itself can't be initialized or opened.
- **Atomic create.** `CerminFactory.createVault` does clone → `initialize` → `open` in one transaction, so there is no window to hijack a half-initialized clone.
- **Token hygiene.** `SafeERC20` + `forceApprove` throughout.
- **Parameter bounds.** `_validateParams` enforces LTV ∈ [10%, 90%], `emergencyICR ≥ 115%`, `defendICR > emergencyICR`, skim threshold ∈ [1%, 50%], and a 1000 bps buffer below the open-time ICR.
- **Permissionless defense.** Anyone can call `defend()`, so safety doesn't depend on the keeper being online.
- **No admin keys over funds.** Non-upgradeable, no custody.

---

## 4. Findings by severity

Severity = likelihood × impact for a **mainnet** deployment with real BTC.

### 🔴 Blockers — must resolve before mainnet

| ID | Title | Where | Recommendation |
|----|-------|-------|----------------|
| B-1 | **Savings-vault interface unverified vs. real Mezo** | `interfaces/mezo/ISavingsVault.sol`; `CerminVault._allocateBorrowed` (1:1 mint, line ~301), `defend` (`withdraw(fromVault)`, ~249), `getShadow` (~280) | Confirm the real `MUSDSavingsRate` ABI/semantics on Mezo mainnet before integrating. If it is exchange-rate (ERC-4626-style), the 1:1 share accounting is wrong and must be replaced with a thin adapter. See §5. |
| B-2 | **Mezo interfaces verified on testnet only** | all `interfaces/mezo/*` (NatSpec says "verified on matsnet 2026-05-18") | Re-verify every Mezo **mainnet** address and ABI (BorrowerOperations, TroveManager, PriceFeed, MUSD, SavingsRate). Confirm function selectors and the `openTrove`/`withdrawMUSD` fee model match. |
| B-3 | **Deploy script ships a test mock** | `script/Deploy.s.sol` (imports `test/mocks/MockSavingsVault`, lines 7, 52–55) | For mainnet, make `MEZO_SAVINGS_VAULT` **required** (revert if zero); remove the mock import and fallback so no test artifact can reach production. |
| B-4 | **No external audit** | whole repo | Engage a reputable firm (see §6, Phase 3) before any real-value deployment. |
| B-5 | **Tests run against mocks only** | `test/` (Mock* for every Mezo dependency) | Add fork tests against real Mezo before mainnet (see B-2, Phase 2). |

### 🟠 High

| ID | Title | Where | Recommendation |
|----|-------|-------|----------------|
| H-1 | **Post-close lockout** | `CerminFactory.createVault` `vaultOf` guard (line 29); `close()` never clears `vaultOf` and the clone's `_opened` stays `true` | After a user closes, they can neither reopen the dead clone (`AlreadyOpened`) nor create a new one (`VaultAlreadyExists`). Decide a model: allow re-create when the prior trove is closed (check `getTroveStatus`), let `close()` notify the factory to clear `vaultOf`, or support reopening a clone. |
| H-2 | **Real-protocol test coverage** | `test/integration` (25 tests, all mocked) | Beyond fork tests, raise coverage on `skim`/`defend`/`close` edge cases (fee drift, partial defend, yield interaction) against real Mezo behavior. |

### 🟡 Medium

| ID | Title | Where | Recommendation |
|----|-------|-------|----------------|
| M-1 | **`close()` can require the owner to pre-approve MUSD** | `close()` lines 124–131 | The Mezo borrow fee is part of debt, so `toBurn = debt − GAS_COMP` can exceed vault holdings by ~the fee. The owner must hold+approve the shortfall or `close` reverts. Surface this clearly in the UI (or pre-flight the exact amount), and confirm the gas-comp/fee math against mainnet. |
| M-2 | **No fee cap on Mezo borrows** | `skim` → `withdrawMUSD`; `IBorrowerOperations` (Mezo dropped `_maxFeePercentage`) | A skim borrows new debt at whatever the protocol fee is at that moment, with no cap. Low likelihood, but document it and consider a sanity bound in the keeper before triggering skim. |
| M-3 | **Safety depends on someone calling `defend()`** | `defend` is permissionless but unincentivized | If the keeper is down, anyone *can* defend but no one is *paid* to. Add a small defense reward (post-audit) so third parties keep vaults safe; keep the keeper as primary. |
| M-4 | **Harden deploy & release process** | `script/Deploy.s.sol` | Separate mainnet deploy script, deterministic addresses, source verification, and a documented post-deploy config handoff to agent/frontend. |

### 🔵 Low / Informational

| ID | Title | Where | Note |
|----|-------|-------|------|
| L-1 | Compiler version | `foundry.toml` `solc 0.8.33`; `CLAUDE.md` says `0.8.24` | Pin one version, align the docs, and make sure the auditor's tooling covers it. `via_ir = true` is on — confirm no known codegen issues for the chosen release. |
| L-2 | `getICR()` is cached/stale | `CerminVault` lines 261–268 | View returns ICR at `lastSeenPrice` (oracle reverts under STATICCALL). Fine for display; make sure the UI labels it as last-updated, not live. |
| L-3 | Unused error | `ICerminVault.InsufficientFundsToClose` (line 43) | Dead declaration — remove or use. |
| L-4 | `open()` is permissionless | `CerminVault.open` | Harmless today because the factory opens atomically, but consider `onlyFactory`/`onlyOwner` for defense-in-depth and clarity. |
| L-5 | BTC return via low-level `call` to owner | `close()` lines 140–144 | If an owner is a contract that rejects ETH, `close` reverts. EOAs are fine; note for smart-contract-wallet users. |
| L-6 | No pause / circuit breaker | by design | Non-upgradeable = trustless, but a discovered bug has no remediation except users closing. See the open decision in §7. |

---

## 5. The savings-vault question (the #1 integration risk)

Cermin's `ISavingsVault` assumes a **rebase-style** contract:

- `deposit(amount)` mints `amount` sMUSD **1:1**,
- `withdraw(amount)` burns 1:1,
- yield accrues separately and is taken with `claimYield()` / previewed with `claimableYield()`.

Cermin's accounting relies on this 1:1 assumption: `_allocateBorrowed` does `smusdShares += toVault` (no conversion), `defend` calls `withdraw(fromVault)` treating shares as MUSD, and `getShadow` reports `smusdShares + claimableYield`.

**But Mezo's public docs describe the MUSD Savings Vault as exchange-rate based** ("yield is embedded in the sMUSD exchange rate; 1 sMUSD becomes redeemable for more than 1 MUSD"), which is the ERC-4626 pattern (`deposit(assets, receiver)` returns *shares ≠ assets*, `redeem`/`convertToAssets`). The two descriptions are contradictory.

**If the real contract is ERC-4626 and Cermin integrates as-is, accounting breaks**: shares wouldn't equal MUSD, `withdraw(shares)` semantics differ, and `getShadow` would misreport balances — potentially under-repaying in `defend` (a safety issue) or stranding value.

**Required action (Phase 1):**

1. Open the verified `MUSDSavingsRate` on the Mezo **mainnet** explorer (interface cites proxy `0xb4D498029af77680cD1eF828b967f010d06C51CC`, impl `0x874e281725b75bc9Ac138e17768a7471199d7f2c`) and read the actual ABI.
2. Check which model it is by selector:
   - Rebase → `deposit(uint256)`, `withdraw(uint256)`, `claimYield()`, `claimableYield(address)`.
   - ERC-4626 → `deposit(uint256,address)`, `redeem(uint256,address,address)`, `convertToAssets/Shares`, `previewRedeem`.
3. If rebase and selectors match → the current code is correct; lock it in with fork tests.
4. If ERC-4626 → write a small adapter that stores **shares**, converts on read (`convertToAssets`) for `getShadow`, and redeems by assets in `defend`/`close`. Keep this isolated behind `ISavingsVault` so vault logic barely changes.

Note: Mezo had **not** deployed the savings contract on matsnet at hackathon time, which is exactly why the testnet build uses `MockSavingsVault`. The mock is interface-faithful to Cermin's *assumption* — it does not prove the *real* contract matches. This must be closed before mainnet.

---

## 6. Mainnet launch plan (phased)

Indicative durations assume a solo/small team; audit scheduling is the long pole.

### Phase 0 — Fix internal findings & harden _(≈1 week)_
- Resolve H-1 (post-close lockout) — pick and implement a re-create/reopen model.
- B-3 + M-4: mainnet deploy script with required real addresses, no test imports.
- L-1/L-3/L-4/L-5: compiler pin + doc alignment, remove dead error, consider `onlyFactory` on `open`, document smart-wallet `close` edge.
- M-1: pre-flight the exact close amount in the UI.

### Phase 1 — Savings-vault integration verification _(≈1 week, blocking)_
- Execute §5. Confirm the real model; build an adapter if needed.
- Decide testnet yield-simulation story for the dress rehearsal (keeper-seeded vs. real, depending on Mezo testnet availability).

### Phase 2 — Fork tests & coverage _(≈1–2 weeks)_
- Foundry fork tests against **real Mezo mainnet** state: full open → skim → defend → close, plus edge cases (fee drift, partial defend, emergency overshoot, yield claim during defend).
- Re-verify all Mezo mainnet addresses/ABIs (B-2). Hit/raise coverage targets in `CLAUDE.md`.
- Run `slither`/static analysis; add invariant/fuzz tests for accounting (shares ↔ MUSD, ICR monotonicity in defend).

### Phase 3 — External audit _(≈3–6 weeks incl. scheduling)_
- Engage a reputable firm. Scope is genuinely small (2 contracts + adapter) → faster and cheaper than typical.
- Candidates to quote: Trail of Bits, Spearbit/Cantina, OpenZeppelin, Zellic, Trust/Guardian. Also consider a **Mezo-recommended** auditor for ecosystem familiarity.
- Provide this document, the spec, and the fork-test suite to shorten ramp-up.

### Phase 4 — Remediate audit findings _(≈1–2 weeks)_
- Fix, get fix-review sign-off, freeze the audited commit.

### Phase 5 — Testnet dress rehearsal _(≈1 week)_
- Deploy the audited build to matsnet (with the real savings vault if Mezo has shipped it; otherwise the interface-matched mock) and run the full lifecycle + keeper end-to-end, including failure drills (keeper offline → third-party defend).

### Phase 6 — Legal / KYB / ops _(parallel, start early)_
- KYB, entity, and any jurisdiction/compliance review for a consumer financial app. Treat the regulatory framing seriously and take qualified advice (this document is not legal advice).
- Incident runbook, on-call, monitoring/alerting (ICR thresholds, keeper liveness, gas balance, oracle sanity).

### Phase 7 — Guarded mainnet launch _(launch)_
- Deploy + verify contracts. Start **conservative**: deposit caps / allowlist / a capped number of vaults, so blast radius is bounded while real-world behavior is observed.
- Keeper on redundant infra (not a single free-tier cron), with gas preflight and watchdog already built.
- Public dashboards for vault health and keeper status.

### Phase 8 — Post-launch hardening _(ongoing)_
- M-3: ship a small permissionless-defense reward to decentralize safety.
- Gradually raise caps as confidence grows; consider a bug bounty (e.g., Immunefi).
- Then resume product roadmap (mobile, custom strategies, fiat off-ramp).

---

## 7. Pre-mainnet checklist

- [ ] B-1 Real `MUSDSavingsRate` model confirmed; adapter written if ERC-4626
- [ ] B-2 All Mezo **mainnet** addresses + ABIs re-verified
- [ ] B-3 Mainnet deploy script requires real savings vault; no test imports
- [ ] B-5 Fork-test suite green against real Mezo
- [ ] H-1 Post-close lockout resolved
- [ ] M-1 Close-amount pre-flight in UI; fee/gas-comp math confirmed on mainnet
- [ ] L-1 Compiler version pinned and documented; `via_ir` reviewed
- [ ] Static analysis (slither) + invariant/fuzz tests pass
- [ ] B-4 External audit complete; findings remediated; commit frozen
- [ ] Phase 5 testnet dress rehearsal passed (incl. keeper-down drill)
- [ ] KYB / legal review done
- [ ] Monitoring, alerting, incident runbook in place
- [ ] Launch caps / allowlist configured
- [ ] Keeper on redundant infra with funded gas wallet

---

## 8. Open decisions for you

1. **Re-create model after close (H-1):** allow a fresh vault once the old trove is closed, or support reopening the clone? (Recommend: factory allows re-create when prior trove status = closed.)
2. **Circuit breaker (L-6):** stay fully trustless, or add a minimal factory-level pause that only blocks **new** vault creation (never touches existing user funds)? Trade-off: safety vs. purity.
3. **Defense incentive (M-3):** add a small reward for permissionless `defend()` callers at launch, or post-launch?
4. **Launch guardrails:** deposit cap and/or allowlist for v1? Suggested starting point: cap per-vault BTC and total vaults for the first weeks.
5. **Audit firm + budget:** which firm, and target window? This sets the critical-path timeline.

---

_Prepared as an internal pre-audit review. Pair it with a professional audit before any real-value deployment._
