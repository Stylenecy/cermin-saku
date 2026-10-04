// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";
import {SakuBase} from "./SakuBase.t.sol";
import {CerminVault} from "../../src/CerminVault.sol";
import {CerminSaku} from "../../src/CerminSaku.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";
import {MockPriceFeed} from "../mocks/MockPriceFeed.sol";
import {MockMUSD} from "../mocks/MockMUSD.sol";
import {MockTroveManager} from "../mocks/MockTroveManager.sol";

/// @notice Random sequences of price moves, time jumps, keeper actions, owner
///         spending and allowance changes. Records every payment so the
///         invariants can check the whole history.
contract SakuHandler is Test {
    CerminVault internal vault;
    CerminSaku internal saku;
    MockPriceFeed internal feed;
    MockMUSD internal musd;
    MockTroveManager internal tm;
    address internal parent;
    uint256[] internal ids;

    uint256 public ghostGranted; // sum of every allowance cap ever granted
    uint256 public ghostLastGrant; // the cap currently in force
    uint256 public ghostPaidSinceGrant; // paid since that cap was set
    uint256 public ghostPaid; // sum of AllowancePaid
    uint256 public ghostUnsafePayments; // payments made while ICR < floor or reserve thin
    uint256 public ghostHeld;
    uint256 public ghostReleased;
    uint256 public ghostInitialColl;

    constructor(
        CerminVault vault_,
        CerminSaku saku_,
        MockPriceFeed feed_,
        MockMUSD musd_,
        MockTroveManager tm_,
        address parent_,
        uint256[] memory ids_
    ) {
        vault = vault_;
        saku = saku_;
        feed = feed_;
        musd = musd_;
        tm = tm_;
        parent = parent_;
        ids = ids_;
        ghostInitialColl = vault_.getCollateral();
    }

    function movePrice(uint256 price) external {
        price = bound(price, 30_000e18, 250_000e18);
        feed.setPrice(price);
    }

    function warp(uint256 dt) external {
        vm.warp(block.timestamp + bound(dt, 1, 45 days));
    }

    function release(uint256 seed) external {
        uint256 id = ids[seed % ids.length];
        if (saku.dueCount(id) == 0) return;
        CerminSaku.Schedule memory s = saku.getSchedule(id);
        if (s.cancelled || s.paid >= s.periods) return;

        uint256 price = feed.price();
        (ICerminVault.SakuStatus st, uint256 icr, uint256 after_, uint256 needed) =
            vault.sakuStatus(address(saku), s.amount, price);
        uint256 floor_ = uint256(vault.params().defendICR) + vault.sakuPolicy().floorBufferBps;

        bool paid = saku.release(id);
        if (paid) {
            ghostPaid += s.amount;
            ghostPaidSinceGrant += s.amount;
            ghostReleased++;
            if (icr < floor_ || after_ < needed || st != ICerminVault.SakuStatus.Ok) ghostUnsafePayments++;
        } else {
            ghostHeld++;
        }
    }

    function defend() external {
        try vault.defend(address(0), address(0)) {} catch {}
    }

    function skim() external {
        try vault.skim(address(0), address(0)) {} catch {}
    }

    function ownerSpends(uint256 amount) external {
        uint256 spendable = vault.state().spendableMusd;
        if (spendable == 0) return;
        amount = bound(amount, 1, spendable);
        vm.prank(parent);
        vault.withdrawSpendable(amount, parent);
    }

    function regrant(uint256 cap) external {
        cap = bound(cap, 0, 30_000e18);
        // Re-granting replaces the cap; the ghost counts it as new budget.
        vm.prank(parent);
        vault.setSpendAllowance(address(saku), cap);
        ghostGranted += cap;
        ghostLastGrant = cap;
        ghostPaidSinceGrant = 0;
    }

    function tightenPolicy(uint16 floorBuffer, uint16 stress) external {
        floorBuffer = uint16(bound(floorBuffer, 500, 5_000));
        stress = uint16(bound(stress, 1_000, 7_000));
        vm.prank(parent);
        vault.setSakuPolicy(floorBuffer, stress);
    }

    function scheduleIds() external view returns (uint256[] memory) {
        return ids;
    }
}

contract SakuInvariantTest is SakuBase {
    SakuHandler internal handler;
    address[] internal recipients;

    function setUp() public override {
        super.setUp();
        address rara = makeAddr("rara");
        address budi = makeAddr("budi");
        recipients.push(rara);
        recipients.push(budi);

        uint256[] memory ids = new uint256[](3);
        vm.startPrank(parent);
        ids[0] = saku.createSchedule(rara, 1_500e18, 30 days, 24, 0, "rara");
        ids[1] = saku.createSchedule(budi, 700e18, 7 days, 52, 0, "budi");
        ids[2] = saku.createSchedule(rara, 5_000e18, 90 days, 4, uint64(block.timestamp + 10 days), "semester");
        vm.stopPrank();

        handler = new SakuHandler(vault, saku, priceFeed, musd, troveManager, parent, ids);
        priceFeed.setOwner(address(handler));
        handler.regrant(20_000e18);

        targetContract(address(handler));
    }

    /// Saku can never move more than the owner ever granted.
    function invariant_PaidNeverExceedsGranted() public view {
        assertLe(handler.ghostPaid(), handler.ghostGranted());
    }

    /// The cap is consumed exactly by what was paid since it was set.
    function invariant_AllowanceAccounting() public view {
        assertEq(vault.spendAllowance(address(saku)) + handler.ghostPaidSinceGrant(), handler.ghostLastGrant());
    }

    /// Every single payment passed both safety gates at the price it was made.
    function invariant_NoUnsafePayment() public view {
        assertEq(handler.ghostUnsafePayments(), 0);
    }

    /// Recipients received exactly what the ledger says; Saku holds nothing.
    function invariant_RecipientsMatchLedger() public view {
        uint256 total;
        for (uint256 i; i < recipients.length; ++i) {
            total += musd.balanceOf(recipients[i]);
        }
        assertEq(total, handler.ghostPaid());
        assertEq(musd.balanceOf(address(saku)), 0);
    }

    /// Schedules never pay more periods than promised.
    function invariant_PaidPeriodsBounded() public view {
        uint256[] memory ids = handler.scheduleIds();
        uint256 sum;
        for (uint256 i; i < ids.length; ++i) {
            CerminSaku.Schedule memory s = saku.getSchedule(ids[i]);
            assertLe(s.paid, s.periods);
            sum += uint256(s.paid) * s.amount;
        }
        assertEq(sum, handler.ghostPaid());
    }

    /// BNB is never sold: collateral only ever stays or grows.
    function invariant_CollateralNeverDecreases() public view {
        assertGe(vault.getCollateral(), handler.ghostInitialColl());
    }

    /// The vault's MUSD always covers its spendable bookkeeping.
    function invariant_SpendableIsBacked() public view {
        assertGe(musd.balanceOf(address(vault)), vault.state().spendableMusd);
    }

    /// Positive control: the handler really can produce a payment AND a
    /// safety hold, so the invariants above are not passing vacuously.
    function test_HandlerReachesPaidAndHeld() public {
        handler.release(0); // schedule 0 due at start, allowance 20k, ICR 200% → paid
        assertEq(handler.ghostReleased(), 1);
        handler.movePrice(70_000e18); // ICR 140% < 150% floor
        handler.warp(31 days);
        handler.release(0);
        assertEq(handler.ghostHeld(), 1);
        assertEq(handler.ghostUnsafePayments(), 0);
    }
}
