// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {SakuBase} from "./SakuBase.t.sol";
import {CerminLens} from "../../src/CerminLens.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";

/// @notice CerminLens: price lines are exact boundaries, previews equal real execution.
contract CerminLensTest is SakuBase {
    function test_Lines_AtOpen() public view {
        // debt 50k, coll 1 BNB. 110% → $55k, 140% → $70k, 150% → $75k, skim +5% → $105k.
        CerminLens.Lines memory l = lens.lines(address(vault));
        assertEq(l.liquidationPrice, 55_000e18);
        assertEq(l.defendPrice, 70_000e18);
        assertEq(l.sakuPausePrice, 75_000e18);
        assertEq(l.skimPrice, 105_000e18);
    }

    function test_Snapshot_MatchesVault() public view {
        CerminLens.Snapshot memory s = lens.snapshot(address(vault), 80_000e18);
        assertEq(s.price, 80_000e18);
        assertEq(s.collateral, 1e18);
        assertEq(s.debt, 50_000e18);
        assertEq(s.icrBps, 16_000);
        assertEq(s.spendable, 25_000e18);
        assertEq(s.savings, 25_000e18);
        assertEq(s.defendICR, 14_000);
        assertEq(s.sakuFloorICR, 15_000);
        assertEq(s.sakuStressBps, 3_000);
        assertEq(s.lines.sakuPausePrice, 75_000e18);
    }

    function test_EmptyVaultHasNoLines() public {
        vm.startPrank(parent);
        vault.close();
        vm.stopPrank();
        CerminLens.Lines memory l = lens.lines(address(vault));
        assertEq(l.liquidationPrice, 0);
        assertFalse(lens.previewDefend(address(vault), 1e18).wouldDefend);
    }

    function test_PreviewSaku_EqualsVault() public view {
        (ICerminVault.SakuStatus a,,,) = lens.previewSaku(address(vault), address(saku), 1e18, 72_000e18);
        assertEq(uint8(a), uint8(ICerminVault.SakuStatus.AllowanceExceeded));
    }

    /// The pause price is the exact boundary of the health gate.
    function testFuzz_PausePriceIsExactBoundary(uint256 crash) public {
        // Move debt around with a real defend so the boundary is non-trivial.
        crash = bound(crash, 40_000e18, 69_000e18);
        priceFeed.setPrice(crash);
        vault.defend(address(0), address(0));

        uint256 p = lens.lines(address(vault)).sakuPausePrice;
        assertGe(_icrAt(p), _floor(), "at the line: allowed");
        assertLt(_icrAt(p - 1), _floor(), "one wei below: held");
    }

    /// previewDefend == defend(), field by field.
    function testFuzz_PreviewDefendEqualsDefend(uint256 price, uint256 yield_) public {
        price = bound(price, 20_000e18, 90_000e18);
        yield_ = bound(yield_, 0, 2_000e18);
        if (yield_ > 0) {
            musd.mint(address(this), yield_);
            musd.approve(address(savingsVault), yield_);
            savingsVault.accrueYield(yield_);
        }
        priceFeed.setPrice(price);
        uint256 claim = savingsVault.claimableYield(address(vault));

        CerminLens.DefendPreview memory d = lens.previewDefend(address(vault), price);
        uint256 debtBefore = vault.getDebt();
        ICerminVault.VaultState memory before = vault.state();

        if (!d.wouldDefend) {
            vm.expectRevert();
            vault.defend(address(0), address(0));
            return;
        }
        vault.defend(address(0), address(0));
        ICerminVault.VaultState memory afterS = vault.state();
        assertEq(debtBefore - vault.getDebt(), d.repay, "repay");
        assertEq(before.smusdShares - afterS.smusdShares, d.fromSavings, "from savings");
        assertEq(before.spendableMusd + claim - afterS.spendableMusd, d.fromSpendable, "from spendable");
        assertEq(vault.getICR(), d.icrAfterBps, "icr after");
    }

    /// previewSkim == skim(), field by field.
    function testFuzz_PreviewSkimEqualsSkim(uint256 price) public {
        price = bound(price, 90_000e18, 400_000e18);
        priceFeed.setPrice(price);
        CerminLens.SkimPreview memory k = lens.previewSkim(address(vault), price);
        uint256 debtBefore = vault.getDebt();
        ICerminVault.VaultState memory before = vault.state();

        if (!k.wouldSkim) {
            vm.expectRevert();
            vault.skim(address(0), address(0));
            return;
        }
        vault.skim(address(0), address(0));
        ICerminVault.VaultState memory afterS = vault.state();
        assertEq(vault.getDebt() - debtBefore, k.capacity, "capacity");
        assertEq(afterS.spendableMusd - before.spendableMusd, k.toSpendable, "to spendable");
        assertEq(afterS.smusdShares - before.smusdShares, k.toSavings, "to savings");
    }
}
