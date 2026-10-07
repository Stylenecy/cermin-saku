// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {SakuBase} from "./SakuBase.t.sol";

/// @notice Gate 2 end to end: if an allowance payment passes both gates, then
///         after a further fall of `stressBps` the reserve left is enough for
///         defend() to bring the position back to at least defendICR.
///         (Below emergencyICR, defend() aims higher, at defendICR + 20 points,
///         and spends everything available; it may stop short of that higher
///         target, but never below the defense line.)
contract SakuStressTest is SakuBase {
    function testFuzz_PaidAllowanceLeavesEnoughToDefendAfterStress(
        uint256 priceSeed,
        uint256 amountSeed,
        uint256 stressSeed
    ) public {
        uint16 stressBps = uint16(bound(stressSeed, 1_000, 7_000));
        vm.prank(parent);
        vault.setSakuPolicy(1_000, stressBps);

        uint256 price = bound(priceSeed, 70_000e18, 300_000e18);
        priceFeed.setPrice(price);
        uint256 amount = bound(amountSeed, 1e18, 25_000e18);

        _grant(amount);
        vm.prank(parent);
        uint256 id = saku.createSchedule(child, uint128(amount), MONTH, 1, 0, LABEL);
        if (!saku.release(id)) return; // held: the gates refused, nothing moved

        uint256 stressed = (price * (10_000 - stressBps)) / 10_000;
        priceFeed.setPrice(stressed);
        uint256 defendIcr = vault.params().defendICR;
        if (_icrAt(stressed) < defendIcr) {
            vm.prank(keeper);
            vault.defend(address(0), address(0));
        }
        assertGe(_icrAt(stressed), defendIcr, "reserve brings the position back to the defense line");
    }

    /// The scenario raised in review: after an emergency defend, the parent's
    /// allowance passes both gates at exactly the 150% floor; BNB then falls
    /// another 30% into the emergency band. defend() aims for 160% and cannot
    /// reach it, but the reserve Gate 2 kept brings the position back above
    /// the 140% defense line, so the payment did not eat the protection.
    function test_EmergencyBand_ReserveStillRestoresDefenseLine() public {
        priceFeed.setPrice(55_000e18); // ICR 110%: emergency defend to 160%
        vm.prank(keeper);
        vault.defend(address(0), address(0));
        assertEq(vault.getDebt(), 34_375e18);
        assertEq(vault.state().smusdShares, 9_375e18);

        priceFeed.setPrice(51_562.5e18); // ICR exactly at the 150% floor
        _grant(24_000e18);
        vm.prank(parent);
        uint256 id = saku.createSchedule(child, 24_000e18, MONTH, 1, 0, LABEL);
        assertTrue(saku.release(id), "both gates pass");

        priceFeed.setPrice(36_093.75e18); // a further 30% fall: ICR 105%
        vm.prank(keeper);
        vault.defend(address(0), address(0));
        uint256 icr = _icrAt(36_093.75e18);
        assertGe(icr, 14_000, "back above the 140% defense line");
        assertLt(icr, 16_000, "short of the 160% emergency target, as documented");
    }
}

