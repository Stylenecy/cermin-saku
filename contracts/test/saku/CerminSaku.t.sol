// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {SakuBase} from "./SakuBase.t.sol";
import {CerminSaku} from "../../src/CerminSaku.sol";
import {CerminVault} from "../../src/CerminVault.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";

/// @notice Cermin Saku: scheduling, release, safety holds, permissions.
contract CerminSakuTest is SakuBase {
    event AllowancePaid(
        uint256 indexed id,
        address indexed vault,
        address indexed recipient,
        uint256 amount,
        uint32 paymentNo,
        uint256 icrBps
    );
    event AllowanceHeld(
        uint256 indexed id, address indexed vault, ICerminVault.SakuStatus reason, uint256 icrBps, uint256 price
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Scheduling
    // ─────────────────────────────────────────────────────────────────────────

    function test_Create_StoresSchedule() public {
        uint256 id = _schedule(1_000e18, MONTH, 12);
        CerminSaku.Schedule memory s = saku.getSchedule(id);
        assertEq(s.vault, address(vault));
        assertEq(s.recipient, child);
        assertEq(s.amount, 1_000e18);
        assertEq(s.period, MONTH);
        assertEq(s.periods, 12);
        assertEq(s.start, block.timestamp);
        assertEq(s.label, LABEL);
        assertEq(saku.scheduleCount(), 1);
        assertEq(saku.schedulesOfVault(address(vault))[0], id);
        assertEq(saku.schedulesOfRecipient(child)[0], id);
        assertEq(saku.dueCount(id), 1, "first payment due immediately");
    }

    function test_Create_RevertsWithoutVault() public {
        vm.prank(stranger);
        vm.expectRevert(CerminSaku.NoVault.selector);
        saku.createSchedule(child, 1e18, MONTH, 1, 0, LABEL);
    }

    function test_Create_RejectsBadInputs() public {
        vm.startPrank(parent);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(address(0), 1e18, MONTH, 1, 0, LABEL);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(address(vault), 1e18, MONTH, 1, 0, LABEL);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(child, 0, MONTH, 1, 0, LABEL);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(child, 1e18, 59, 1, 0, LABEL);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(child, 1e18, MONTH, 0, 0, LABEL);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(child, 1e18, MONTH, 121, 0, LABEL);
        vm.warp(1_000_000);
        vm.expectRevert(CerminSaku.InvalidSchedule.selector);
        saku.createSchedule(child, 1e18, MONTH, 1, 999_999, LABEL);
        vm.stopPrank();
    }

    function test_Create_FutureStartNotDueYet() public {
        vm.prank(parent);
        uint256 id = saku.createSchedule(child, 1e18, MONTH, 3, uint64(block.timestamp + 1 days), LABEL);
        assertEq(saku.dueCount(id), 0);
        vm.expectRevert(CerminSaku.NothingDue.selector);
        saku.release(id);
        vm.warp(block.timestamp + 1 days);
        assertEq(saku.dueCount(id), 1);
    }

    function test_UnknownSchedule_Reverts() public {
        vm.expectRevert(CerminSaku.UnknownSchedule.selector);
        saku.release(7);
        vm.expectRevert(CerminSaku.UnknownSchedule.selector);
        saku.getSchedule(7);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Release — the happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_Release_PaysChildFromSpendable() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        uint256 collBefore = vault.getCollateral();
        uint256 spendBefore = vault.state().spendableMusd;
        uint256 savingsBefore = vault.state().smusdShares;

        vm.expectEmit(true, true, true, true, address(saku));
        emit AllowancePaid(id, address(vault), child, 1_000e18, 1, 20_000);
        vm.prank(keeper);
        assertTrue(saku.release(id));

        assertEq(musd.balanceOf(child), 1_000e18, "child paid");
        assertEq(vault.state().spendableMusd, spendBefore - 1_000e18, "spendable down");
        assertEq(vault.state().smusdShares, savingsBefore, "savings untouched");
        assertEq(vault.getCollateral(), collBefore, "BNB never touched");
        assertEq(vault.spendAllowance(address(saku)), 11_000e18, "allowance consumed");
        assertEq(musd.balanceOf(address(saku)), 0, "Saku never holds funds");
        assertEq(saku.getSchedule(id).paid, 1);
        assertEq(saku.dueCount(id), 0);
        assertEq(saku.nextDueAt(id), block.timestamp + MONTH);
    }

    function test_Release_NothingDueUntilNextPeriod() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        saku.release(id);
        vm.expectRevert(CerminSaku.NothingDue.selector);
        saku.release(id);
        vm.warp(block.timestamp + MONTH - 1);
        vm.expectRevert(CerminSaku.NothingDue.selector);
        saku.release(id);
        vm.warp(block.timestamp + 1);
        assertTrue(saku.release(id));
        assertEq(musd.balanceOf(child), 2_000e18);
    }

    function test_Release_CatchesUpMissedPeriods() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        vm.warp(block.timestamp + 3 * MONTH);
        assertEq(saku.dueCount(id), 4, "periods 1..4 owed");
        for (uint256 i; i < 4; ++i) {
            assertTrue(saku.release(id));
        }
        assertEq(musd.balanceOf(child), 4_000e18);
        assertEq(saku.dueCount(id), 0);
    }

    function test_Release_StopsAfterLastPeriod() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 2);
        vm.warp(block.timestamp + 10 * MONTH);
        assertEq(saku.dueCount(id), 2, "capped at total periods");
        saku.release(id);
        saku.release(id);
        vm.expectRevert(CerminSaku.ScheduleInactive.selector);
        saku.release(id);
        assertEq(saku.nextDueAt(id), 0);
        assertEq(musd.balanceOf(child), 2_000e18);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Holds — the contract says no
    // ─────────────────────────────────────────────────────────────────────────

    function test_Hold_WithoutAllowance() public {
        uint256 id = _schedule(1_000e18, MONTH, 12);
        vm.expectEmit(true, true, false, true, address(saku));
        emit AllowanceHeld(id, address(vault), ICerminVault.SakuStatus.AllowanceExceeded, 20_000, PRICE);
        assertFalse(saku.release(id));
        assertEq(musd.balanceOf(child), 0);
        assertEq(saku.dueCount(id), 1, "still owed");
    }

    function test_Hold_AllowanceCapIsHardCeiling() public {
        _grant(2_500e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        vm.warp(block.timestamp + 5 * MONTH);
        assertTrue(saku.release(id));
        assertTrue(saku.release(id));
        assertFalse(saku.release(id), "third payment exceeds the 2,500 cap");
        assertEq(musd.balanceOf(child), 2_000e18);
    }

    /// The headline rule: BNB falls, the position nears danger, the
    /// allowance is HELD — and paid once the position is safe again.
    function test_Hold_WhenIcrBelowFloor_ThenResumes() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);

        // Floor = defendICR 140% + 10 pts = 150%. ICR 145% at $72.5k.
        priceFeed.setPrice(72_500e18);
        assertEq(_icrAt(72_500e18), 14_500);
        vm.expectEmit(true, true, false, true, address(saku));
        emit AllowanceHeld(id, address(vault), ICerminVault.SakuStatus.IcrBelowFloor, 14_500, 72_500e18);
        assertFalse(saku.release(id));
        assertEq(musd.balanceOf(child), 0, "nothing paid while unsafe");
        assertEq(saku.dueCount(id), 1, "deferred, not lost");

        priceFeed.setPrice(80_000e18); // ICR 160%
        assertTrue(saku.release(id));
        assertEq(musd.balanceOf(child), 1_000e18);
    }

    function test_Hold_ExactlyAtFloorPays() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        priceFeed.setPrice(75_000e18); // ICR exactly 150%
        assertEq(_icrAt(75_000e18), _floor());
        assertTrue(saku.release(id));
    }

    function test_Hold_ReserveTooThin() public {
        // Strictest policy: the reserve must survive a 70% crash. At open
        // (ICR 200%), restoring 140% after a 70% drop needs ~28.6k repaid;
        // reserves are 50k, so at most ~21.4k may leave.
        vm.prank(parent);
        vault.setSakuPolicy(1_000, 7_000);
        _grant(50_000e18);
        (,,, uint256 needed) = vault.sakuStatus(address(saku), 0, PRICE);
        uint256 targetDebt = (uint256(1e18) * 30_000e18 * 10_000) / (uint256(14_000) * 1e18);
        assertEq(needed, 50_000e18 - targetDebt, "~28.6k must stay as crash reserve");

        vm.prank(parent);
        uint256 big = saku.createSchedule(child, 22_000e18, MONTH, 1, 0, LABEL);
        vm.prank(parent);
        uint256 ok = saku.createSchedule(child, 21_000e18, MONTH, 1, 0, LABEL);

        vm.expectEmit(true, true, false, false, address(saku));
        emit AllowanceHeld(big, address(vault), ICerminVault.SakuStatus.ReserveTooThin, 0, 0);
        assertFalse(saku.release(big));
        assertTrue(saku.release(ok));
    }

    function test_Hold_AfterDefendDrainedSavings() public {
        // BNB crashes to $55k (ICR 110%, below emergency): the keeper defends
        // with savings first. The parent has also spent 20k of the Shadow.
        // ICR is healthy again (160%), but if the parent asked the vault to
        // survive another halving (stress 50%), Saku will not hand out the
        // cushion that defense would need.
        _grant(25_000e18);
        vm.prank(parent);
        vault.setSakuPolicy(1_000, 5_000);
        priceFeed.setPrice(55_000e18);
        vm.prank(keeper);
        vault.defend(address(0), address(0));
        assertEq(vault.state().smusdShares, 9_375e18, "savings spent on defense");
        assertEq(vault.getDebt(), 34_375e18);
        vm.prank(parent);
        vault.withdrawSpendable(20_000e18, parent);

        (ICerminVault.SakuStatus st, uint256 icr, uint256 after_, uint256 needed) =
            vault.sakuStatus(address(saku), 20_000e18, 55_000e18);
        assertEq(icr, 16_000, "healthy: 160% >= 150% floor");
        assertEq(uint8(st), uint8(ICerminVault.SakuStatus.InsufficientSpendable), "only 5k left");

        (st,, after_, needed) = vault.sakuStatus(address(saku), 5_000e18, 55_000e18);
        assertLt(after_, needed, "paying 5k would leave 9.4k < 14.7k needed");
        assertEq(uint8(st), uint8(ICerminVault.SakuStatus.ReserveTooThin));

        vm.prank(parent);
        uint256 id = saku.createSchedule(child, 5_000e18, MONTH, 1, 0, LABEL);
        assertFalse(saku.release(id));
        assertEq(musd.balanceOf(child), 0);
    }

    function test_Hold_ClosedVault() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        vm.startPrank(parent);
        vault.close();
        vm.stopPrank();
        assertFalse(saku.release(id));
        assertEq(musd.balanceOf(child), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Defense in depth — the vault re-checks
    // ─────────────────────────────────────────────────────────────────────────

    function test_Vault_DirectDelegatedSpendIsGated() public {
        vm.prank(parent);
        vault.setSpendAllowance(stranger, 5_000e18);

        priceFeed.setPrice(70_000e18); // ICR 140%
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ICerminVault.SakuBlocked.selector, ICerminVault.SakuStatus.IcrBelowFloor)
        );
        vault.withdrawSpendableFor(1_000e18, stranger);

        priceFeed.setPrice(PRICE);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ICerminVault.SakuBlocked.selector, ICerminVault.SakuStatus.AllowanceExceeded)
        );
        vault.withdrawSpendableFor(5_001e18, stranger);

        vm.prank(stranger);
        vault.withdrawSpendableFor(5_000e18, stranger);
        assertEq(musd.balanceOf(stranger), 5_000e18);
        assertEq(vault.spendAllowance(stranger), 0);
    }

    function test_Vault_NoAllowanceNoSpend() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ICerminVault.SakuBlocked.selector, ICerminVault.SakuStatus.AllowanceExceeded)
        );
        vault.withdrawSpendableFor(1, stranger);
    }

    function test_Vault_CannotSpendMoreThanSpendable() public {
        vm.prank(parent);
        vault.setSpendAllowance(stranger, type(uint256).max);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ICerminVault.SakuBlocked.selector, ICerminVault.SakuStatus.InsufficientSpendable)
        );
        vault.withdrawSpendableFor(25_000e18 + 1, stranger);
    }

    function test_Vault_OwnerWithdrawIsUnchanged() public {
        // The owner's own withdrawal keeps Kiel's semantics (not gated): Saku
        // only constrains money that leaves on someone else's schedule.
        priceFeed.setPrice(72_000e18);
        vm.prank(parent);
        vault.withdrawSpendable(1_000e18, parent);
        assertEq(musd.balanceOf(parent), 1_000e18);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permissions & policy
    // ─────────────────────────────────────────────────────────────────────────

    function test_Cancel_OnlyVaultOwner() public {
        uint256 id = _schedule(1_000e18, MONTH, 12);
        vm.prank(stranger);
        vm.expectRevert(CerminSaku.NotVaultOwner.selector);
        saku.cancel(id);

        vm.prank(parent);
        saku.cancel(id);
        assertTrue(saku.getSchedule(id).cancelled);
        assertEq(saku.dueCount(id), 0);
        vm.expectRevert(CerminSaku.ScheduleInactive.selector);
        saku.release(id);
        vm.prank(parent);
        vm.expectRevert(CerminSaku.ScheduleInactive.selector);
        saku.cancel(id);
    }

    function test_Revoke_AllowanceStopsEverything() public {
        _grant(12_000e18);
        uint256 id = _schedule(1_000e18, MONTH, 12);
        _grant(0);
        assertFalse(saku.release(id));
        assertEq(musd.balanceOf(child), 0);
    }

    function test_SetSpendAllowance_OwnerOnly() public {
        vm.prank(stranger);
        vm.expectRevert(ICerminVault.NotOwner.selector);
        vault.setSpendAllowance(stranger, 1);
    }

    function test_SakuPolicy_DefaultsAndBounds() public {
        ICerminVault.SakuPolicy memory pol = vault.sakuPolicy();
        assertEq(pol.floorBufferBps, 1_000);
        assertEq(pol.stressBps, 3_000);

        vm.startPrank(parent);
        vm.expectRevert(ICerminVault.InvalidSakuPolicy.selector);
        vault.setSakuPolicy(499, 3_000); // floor cannot be removed
        vm.expectRevert(ICerminVault.InvalidSakuPolicy.selector);
        vault.setSakuPolicy(5_001, 3_000);
        vm.expectRevert(ICerminVault.InvalidSakuPolicy.selector);
        vault.setSakuPolicy(1_000, 999); // must survive at least -10%
        vm.expectRevert(ICerminVault.InvalidSakuPolicy.selector);
        vault.setSakuPolicy(1_000, 7_001);
        vault.setSakuPolicy(2_000, 5_000);
        vm.stopPrank();
        assertEq(vault.sakuPolicy().floorBufferBps, 2_000);

        vm.prank(stranger);
        vm.expectRevert(ICerminVault.NotOwner.selector);
        vault.setSakuPolicy(2_000, 5_000);
    }

    function test_Implementation_RejectsGasCompAboveMinDebt() public {
        vm.expectRevert(ICerminVault.InvalidParams.selector);
        new CerminVault(
            address(borrowerOps),
            address(troveManager),
            address(priceFeed),
            address(musd),
            address(savingsVault),
            100e18,
            100e18
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz
    // ─────────────────────────────────────────────────────────────────────────

    /// dueCount is exactly "periods elapsed since start, capped, minus paid".
    function testFuzz_DueCount(uint64 period, uint32 periods, uint64 elapsed) public {
        period = uint64(bound(period, 60, 365 days));
        periods = uint32(bound(periods, 1, 120));
        elapsed = uint64(bound(elapsed, 0, uint256(period) * 200));
        vm.prank(parent);
        uint256 id = saku.createSchedule(child, 1e18, period, periods, 0, LABEL);
        vm.warp(block.timestamp + elapsed);
        uint256 expected = uint256(elapsed) / period + 1;
        if (expected > periods) expected = periods;
        assertEq(saku.dueCount(id), expected);
    }

    /// The status the UI/keeper sees is exactly what the vault enforces.
    function testFuzz_StatusMatchesExecution(uint256 price, uint256 amount, uint256 cap) public {
        price = bound(price, 30_000e18, 300_000e18);
        amount = bound(amount, 1, 30_000e18);
        cap = bound(cap, 0, 40_000e18);
        vm.prank(parent);
        vault.setSpendAllowance(stranger, cap);
        priceFeed.setPrice(price);

        (ICerminVault.SakuStatus st,,,) = vault.sakuStatus(stranger, amount, price);
        vm.prank(stranger);
        if (st == ICerminVault.SakuStatus.Ok) {
            vault.withdrawSpendableFor(amount, stranger);
            assertEq(musd.balanceOf(stranger), amount);
        } else {
            vm.expectRevert(abi.encodeWithSelector(ICerminVault.SakuBlocked.selector, st));
            vault.withdrawSpendableFor(amount, stranger);
        }
    }

    /// No price makes a delegated payment go through below the floor.
    function testFuzz_NeverPaysBelowFloor(uint256 price) public {
        price = bound(price, 10_000e18, 500_000e18);
        _grant(type(uint256).max);
        uint256 id = _schedule(100e18, MONTH, 1);
        priceFeed.setPrice(price);
        bool paid = saku.release(id);
        if (_icrAt(price) < _floor()) assertFalse(paid);
        if (paid) assertGe(_icrAt(price), _floor());
    }
}

