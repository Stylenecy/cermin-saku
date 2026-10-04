// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {CerminVault} from "../../src/CerminVault.sol";
import {CerminFactory} from "../../src/CerminFactory.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";

import {MockBorrowerOperations} from "../mocks/MockBorrowerOperations.sol";
import {MockTroveManager} from "../mocks/MockTroveManager.sol";
import {MockPriceFeed} from "../mocks/MockPriceFeed.sol";
import {MockSavingsVault} from "../mocks/MockSavingsVault.sol";
import {MockMUSD} from "../mocks/MockMUSD.sol";

contract CerminVaultTest is Test {
    CerminVault internal impl;
    CerminFactory internal factory;
    CerminVault internal vault;

    MockBorrowerOperations internal borrowerOps;
    MockTroveManager internal troveManager;
    MockPriceFeed internal priceFeed;
    MockSavingsVault internal savingsVault;
    MockMUSD internal musd;

    address internal user = makeAddr("user");
    address internal keeper = makeAddr("keeper");

    uint256 internal constant BTC_PRICE = 100_000e18;
    uint256 internal constant ONE_BTC = 1e18;

    function _balancedParams() internal pure returns (ICerminVault.VaultParams memory) {
        return ICerminVault.VaultParams({
            targetLTV: 5_000,        // 50%
            defendICR: 14_000,       // 140%
            emergencyICR: 12_000,    // 120%
            skimThresholdBps: 500,   // 5%
            spendableShare: 5_000    // 50%
        });
    }

    function setUp() public {
        musd = new MockMUSD();
        troveManager = new MockTroveManager();
        borrowerOps = new MockBorrowerOperations(address(musd), address(troveManager));
        troveManager.setBorrowerOps(address(borrowerOps));
        priceFeed = new MockPriceFeed(BTC_PRICE);
        savingsVault = new MockSavingsVault(address(musd));

        impl = new CerminVault(
            address(borrowerOps),
            address(troveManager),
            address(priceFeed),
            address(musd),
            address(savingsVault)
        );
        factory = new CerminFactory(address(impl));

        vm.deal(user, 100 ether);
    }

    function _open(uint256 btc) internal returns (CerminVault v) {
        vm.prank(user);
        address vaultAddr = factory.createVault{value: btc}(_balancedParams(), 0, address(0), address(0));
        v = CerminVault(payable(vaultAddr));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Open
    // ─────────────────────────────────────────────────────────────────────────

    function test_Open_AllocatesSpendableAndVault() public {
        vault = _open(ONE_BTC);

        // 1 BTC × $100k × 50% = $50k borrow. Half spendable, half to vault.
        ICerminVault.VaultState memory s = vault.state();
        assertEq(s.spendableMusd, 25_000e18, "spendable bucket");
        assertGt(s.smusdShares, 0, "vault shares minted");
        assertEq(troveManager.debt(address(vault)), 50_000e18, "trove debt");
        assertEq(troveManager.collateral(address(vault)), ONE_BTC, "trove coll");
        assertEq(s.lastSkimPrice, BTC_PRICE, "skim baseline price");
        assertEq(vault.owner(), user, "owner");
    }

    function test_Open_RevertsWhenBorrowBelowMinDebt() public {
        // Need at least 2000 MUSD debt. At 50% LTV that means $4000 BTC value → 0.04 BTC.
        // Try 0.01 BTC → $1000 borrow → below min.
        vm.deal(user, 1 ether);
        vm.prank(user);
        vm.expectRevert(ICerminVault.MinDebtNotMet.selector);
        factory.createVault{value: 0.01 ether}(_balancedParams(), 0, address(0), address(0));
    }

    function test_Open_HonoursMaxBorrowCap() public {
        vm.prank(user);
        vm.expectRevert(ICerminVault.BorrowExceedsCap.selector);
        factory.createVault{value: ONE_BTC}(_balancedParams(), 10_000e18, address(0), address(0));
    }

    function test_Open_RevertsWhenVaultExists() public {
        _open(ONE_BTC);
        vm.deal(user, 5 ether);
        vm.prank(user);
        vm.expectRevert();
        factory.createVault{value: ONE_BTC}(_balancedParams(), 0, address(0), address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Skim
    // ─────────────────────────────────────────────────────────────────────────

    function test_Skim_AddsCapacityWhenPriceRises() public {
        vault = _open(ONE_BTC);
        priceFeed.setPrice(BTC_PRICE * 11 / 10); // +10%

        uint256 spendableBefore = vault.state().spendableMusd;

        vm.prank(keeper);
        vault.skim(address(0), address(0));

        ICerminVault.VaultState memory s = vault.state();
        assertGt(s.spendableMusd, spendableBefore, "spendable grew");
        // 1 BTC × $110k × 50% = $55k cap, debt 50k → 5k new capacity
        assertEq(s.spendableMusd - spendableBefore, 2_500e18, "skim spendable share");
        assertEq(troveManager.debt(address(vault)), 55_000e18, "debt increased");
        assertEq(s.lastSkimPrice, BTC_PRICE * 11 / 10);
    }

    function test_Skim_RevertsBelowThreshold() public {
        vault = _open(ONE_BTC);
        priceFeed.setPrice(BTC_PRICE * 1001 / 1000); // +0.1%, below 5% threshold

        vm.expectRevert(ICerminVault.PriceMoveBelowThreshold.selector);
        vault.skim(address(0), address(0));
    }

    function test_Skim_RevertsWhenPriceFlat() public {
        vault = _open(ONE_BTC);

        vm.expectRevert(ICerminVault.PriceMoveBelowThreshold.selector);
        vault.skim(address(0), address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Defend
    // ─────────────────────────────────────────────────────────────────────────

    function test_Defend_DrainsVaultThenRepays() public {
        vault = _open(ONE_BTC);

        // BTC drops to $65k → ICR = 130%, below the 140% defend threshold.
        priceFeed.setPrice(65_000e18);

        uint256 debtBefore = troveManager.debt(address(vault));
        uint256 sharesBefore = vault.state().smusdShares;

        vm.prank(keeper);
        vault.defend(address(0), address(0));

        uint256 debtAfter = troveManager.debt(address(vault));
        assertLt(debtAfter, debtBefore, "debt repaid");
        assertLt(vault.state().smusdShares, sharesBefore, "vault drained first");
    }

    function test_Defend_RevertsWhenIcrAboveThreshold() public {
        vault = _open(ONE_BTC);
        // No price drop; ICR is 200%, above defendICR=140%.
        vm.expectRevert(ICerminVault.ICRAboveDefend.selector);
        vault.defend(address(0), address(0));
    }

    function test_Defend_HarvestsYieldThenDrainsPrincipal() public {
        // Under MUSDSavingsRate (rebase), defend must claimYield() first so the
        // pending yield contributes to repay before any sMUSD principal is
        // burned. Heavy BTC drop forces a deep drain.
        vault = _open(ONE_BTC);

        // 1,000 MUSD of protocol yield accrues to the vault's only depositor
        // (= the Cermin vault).
        musd.mint(address(this), 1_000e18);
        musd.approve(address(savingsVault), 1_000e18);
        savingsVault.accrueYield(1_000e18);

        // Catastrophic drop → needRepay > sMUSD principal.
        priceFeed.setPrice(30_000e18);

        vm.prank(keeper);
        vault.defend(address(0), address(0));

        assertEq(vault.state().smusdShares, 0, "principal fully drained");
        assertEq(savingsVault.claimableYield(address(vault)), 0, "yield harvested");
    }

    function test_Defend_DrainsSpendableWhenVaultInsufficient() public {
        vault = _open(ONE_BTC);
        // BTC → $35k → ICR = 70%. With emergency overshoot (target ICR 160%):
        //   targetDebt = 1e18 * 35000e18 * 10000 / (16000 * 1e18) = 21,875 MUSD
        //   needRepay  = 50,000 - 21,875 = 28,125 MUSD
        // Vault holds 25k of sMUSD, spendable holds 25k → vault drains first,
        // then 3,125 comes out of spendable.
        priceFeed.setPrice(35_000e18);

        uint256 spendableBefore = vault.state().spendableMusd;
        uint256 sharesBefore = vault.state().smusdShares;
        assertGt(sharesBefore, 0, "preconditions");

        vm.prank(keeper);
        vault.defend(address(0), address(0));

        assertEq(vault.state().smusdShares, 0, "vault drained first");
        assertLt(vault.state().spendableMusd, spendableBefore, "spendable also used");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Withdraw / Close
    // ─────────────────────────────────────────────────────────────────────────

    function test_WithdrawSpendable_OwnerOnly() public {
        vault = _open(ONE_BTC);

        vm.prank(keeper);
        vm.expectRevert(ICerminVault.NotOwner.selector);
        vault.withdrawSpendable(1_000e18, keeper);

        vm.prank(user);
        vault.withdrawSpendable(1_000e18, user);
        assertEq(musd.balanceOf(user), 1_000e18);
        assertEq(vault.state().spendableMusd, 24_000e18);
    }

    function test_Close_ReturnsBtcAndExcessMusd() public {
        vault = _open(ONE_BTC);

        // Simulate protocol yield arriving to the savings vault (1,000 MUSD).
        // Yield accrues to the vault's only sMUSD holder = the Cermin vault.
        musd.mint(address(this), 1_000e18);
        musd.approve(address(savingsVault), 1_000e18);
        savingsVault.accrueYield(1_000e18);

        uint256 btcBefore = user.balance;

        vm.prank(user);
        vault.close();

        assertEq(troveManager.debt(address(vault)), 0, "debt cleared");
        assertEq(troveManager.collateral(address(vault)), 0, "coll returned");
        assertEq(user.balance, btcBefore + ONE_BTC, "btc back");
        assertGt(musd.balanceOf(user), 0, "musd remainder paid");
    }

    function test_Close_RevertsWhenOwnerCannotTopUp() public {
        vault = _open(ONE_BTC);

        // Mock BO charges no fee → trove debt == borrow. close() needs
        // (debt − GAS_COMP) which is 200 MUSD less than borrow, so vault is
        // actually over-funded and would succeed on the mock. Force a
        // shortfall by inflating trove debt directly.
        uint256 borrowAmount = troveManager.debt(address(vault));
        troveManager.setTrove(address(vault), ONE_BTC, borrowAmount + 1_000e18);

        // Owner does not approve nor hold extra MUSD → safeTransferFrom reverts.
        vm.prank(user);
        vm.expectRevert();
        vault.close();
    }

    function test_Close_PullsShortfallFromOwner() public {
        vault = _open(ONE_BTC);

        // Inflate trove debt by 200 MUSD to simulate Mezo's gas comp + fee.
        // After accounting for GAS_COMP refund, owner must top up the leftover.
        uint256 borrowAmount = troveManager.debt(address(vault));
        troveManager.setTrove(address(vault), ONE_BTC, borrowAmount + 1_000e18);

        // Owner gets 1000 MUSD from elsewhere + approves the vault.
        musd.mint(user, 1_000e18);
        vm.startPrank(user);
        musd.approve(address(vault), 1_000e18);

        uint256 ownerMusdBefore = musd.balanceOf(user);
        vault.close();
        vm.stopPrank();

        assertEq(troveManager.debt(address(vault)), 0, "debt cleared");
        assertEq(troveManager.collateral(address(vault)), 0, "coll returned");
        // Net: owner spent at most 1000 MUSD top-up minus any leftover refund.
        assertLe(ownerMusdBefore - musd.balanceOf(user), 1_000e18, "spent <= top-up cap");
    }

    function test_Close_OwnerOnly() public {
        vault = _open(ONE_BTC);
        vm.prank(keeper);
        vm.expectRevert(ICerminVault.NotOwner.selector);
        vault.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization safety
    // ─────────────────────────────────────────────────────────────────────────

    function test_Implementation_CannotBeInitialized() public {
        vm.expectRevert(ICerminVault.AlreadyInitialized.selector);
        impl.initialize(user, _balancedParams());
    }

    function test_Implementation_OpenReverts() public {
        // Regression for M-01: even with funded BTC, the implementation must
        // reject open() so a griefer cannot create a trove on the impl and
        // lock funds permanently.
        vm.deal(address(this), 1 ether);
        vm.expectRevert(ICerminVault.AlreadyOpened.selector);
        impl.open{value: ONE_BTC}(0, address(0), address(0));
    }

    function test_Clone_CannotBeInitializedTwice() public {
        vault = _open(ONE_BTC);
        vm.expectRevert(ICerminVault.AlreadyInitialized.selector);
        vault.initialize(user, _balancedParams());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deposit
    // ─────────────────────────────────────────────────────────────────────────

    function test_Deposit_AddsCollateral() public {
        vault = _open(ONE_BTC);
        uint256 collBefore = troveManager.collateral(address(vault));

        vm.prank(user);
        vault.deposit{value: 0.5 ether}(address(0), address(0));

        assertEq(troveManager.collateral(address(vault)), collBefore + 0.5 ether);
    }

    function test_Deposit_ZeroValueIsNoop() public {
        vault = _open(ONE_BTC);
        uint256 collBefore = troveManager.collateral(address(vault));
        vm.prank(user);
        vault.deposit(address(0), address(0));
        assertEq(troveManager.collateral(address(vault)), collBefore);
    }

    function test_Deposit_OwnerOnly() public {
        vault = _open(ONE_BTC);
        vm.deal(keeper, 1 ether);
        vm.prank(keeper);
        vm.expectRevert(ICerminVault.NotOwner.selector);
        vault.deposit{value: 0.1 ether}(address(0), address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Withdraw spendable bounds
    // ─────────────────────────────────────────────────────────────────────────

    function test_WithdrawSpendable_RevertsWhenInsufficient() public {
        vault = _open(ONE_BTC);
        uint256 available = vault.state().spendableMusd;
        vm.prank(user);
        vm.expectRevert(ICerminVault.InsufficientSpendable.selector);
        vault.withdrawSpendable(available + 1, user);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Skim edges
    // ─────────────────────────────────────────────────────────────────────────

    function test_Skim_RevertsWhenNoCapacity() public {
        vault = _open(ONE_BTC);
        // Bump price 6% (above 5% threshold) → maxBorrow = 1 BTC × $106k × 50% = 53k.
        // Inflate the trove debt to exactly that cap so skim finds no capacity.
        priceFeed.setPrice(BTC_PRICE * 106 / 100);
        troveManager.setTrove(address(vault), ONE_BTC, 53_000e18);

        vm.expectRevert(ICerminVault.NoSkimCapacity.selector);
        vault.skim(address(0), address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Factory dup
    // ─────────────────────────────────────────────────────────────────────────

    function test_Factory_RevertsOnDuplicateVault() public {
        _open(ONE_BTC);
        vm.deal(user, ONE_BTC);
        vm.prank(user);
        vm.expectRevert(); // VaultAlreadyExists from factory
        factory.createVault{value: ONE_BTC}(_balancedParams(), 0, address(0), address(0));
    }
}
