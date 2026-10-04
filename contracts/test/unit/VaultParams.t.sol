// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";

import {CerminVault} from "../../src/CerminVault.sol";
import {CerminFactory} from "../../src/CerminFactory.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";

import {MockBorrowerOperations} from "../mocks/MockBorrowerOperations.sol";
import {MockTroveManager} from "../mocks/MockTroveManager.sol";
import {MockPriceFeed} from "../mocks/MockPriceFeed.sol";
import {MockSavingsVault} from "../mocks/MockSavingsVault.sol";
import {MockMUSD} from "../mocks/MockMUSD.sol";

/// @notice Exercises the parameter validation rules in CerminVault.initialize.
contract VaultParamsTest is Test {
    CerminVault internal impl;
    CerminFactory internal factory;

    function setUp() public {
        MockMUSD musd = new MockMUSD();
        MockTroveManager troveManager = new MockTroveManager();
        MockBorrowerOperations bo = new MockBorrowerOperations(address(musd), address(troveManager));
        troveManager.setBorrowerOps(address(bo));
        MockPriceFeed price = new MockPriceFeed(100_000e18);
        MockSavingsVault sv = new MockSavingsVault(address(musd));
        impl = new CerminVault(address(bo), address(troveManager), address(price), address(musd), address(sv));
        factory = new CerminFactory(address(impl));
    }

    function _good() internal pure returns (ICerminVault.VaultParams memory) {
        return ICerminVault.VaultParams({
            targetLTV: 5_000,
            defendICR: 14_000,
            emergencyICR: 12_000,
            skimThresholdBps: 500,
            spendableShare: 5_000
        });
    }

    function _expectInvalid(ICerminVault.VaultParams memory p) internal {
        address user = makeAddr("u");
        vm.deal(user, 10 ether);
        vm.prank(user);
        vm.expectRevert(ICerminVault.InvalidParams.selector);
        factory.createVault{value: 1 ether}(p, 0, address(0), address(0));
    }

    function test_TargetLtvBelowFloor() public {
        ICerminVault.VaultParams memory p = _good();
        p.targetLTV = 999;
        _expectInvalid(p);
    }

    function test_TargetLtvAboveCeiling() public {
        ICerminVault.VaultParams memory p = _good();
        p.targetLTV = 9_001;
        _expectInvalid(p);
    }

    function test_EmergencyIcrBelowFloor() public {
        ICerminVault.VaultParams memory p = _good();
        p.emergencyICR = 11_499;
        _expectInvalid(p);
    }

    function test_DefendIcrNotAboveEmergency() public {
        ICerminVault.VaultParams memory p = _good();
        p.defendICR = p.emergencyICR;
        _expectInvalid(p);
    }

    function test_SkimThresholdOutOfRange() public {
        ICerminVault.VaultParams memory p = _good();
        p.skimThresholdBps = 99;
        _expectInvalid(p);

        p = _good();
        p.skimThresholdBps = 5_001;
        _expectInvalid(p);
    }

    function test_SpendableShareTooHigh() public {
        ICerminVault.VaultParams memory p = _good();
        p.spendableShare = 10_001;
        _expectInvalid(p);
    }

    function test_DefendIcrTooCloseToOpenIcr() public {
        // At 50% LTV the trove opens at ICR=20000. defendICR must be ≤ 19000.
        ICerminVault.VaultParams memory p = _good();
        p.defendICR = 19_500;
        _expectInvalid(p);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz: every accepted VaultParams must respect the documented invariants.
    // ─────────────────────────────────────────────────────────────────────────

    function testFuzz_ValidParamsAccepted(
        uint16 ltv,
        uint16 defendIcr,
        uint16 emergencyIcr,
        uint16 skimBps,
        uint16 spendable
    ) public {
        // Constrain to the legal range so fuzzer doesn't waste runs. Use a slightly
        // tighter LTV floor so the open-time ICR (=10000²/ltv) stays within uint16.
        ltv = uint16(bound(uint256(ltv), 2_000, 9_000));
        emergencyIcr = uint16(bound(uint256(emergencyIcr), 11_500, 30_000));
        uint256 openIcr = (10_000 * 10_000) / uint256(ltv);
        uint256 defendMin = uint256(emergencyIcr) + 1;
        uint256 defendMax = openIcr - 1_000;
        if (defendMax > type(uint16).max) defendMax = type(uint16).max;
        if (defendMin > defendMax) return; // not satisfiable
        defendIcr = uint16(bound(uint256(defendIcr), defendMin, defendMax));
        skimBps = uint16(bound(uint256(skimBps), 100, 5_000));
        spendable = uint16(bound(uint256(spendable), 0, 10_000));

        ICerminVault.VaultParams memory p = ICerminVault.VaultParams({
            targetLTV: ltv,
            defendICR: defendIcr,
            emergencyICR: emergencyIcr,
            skimThresholdBps: skimBps,
            spendableShare: spendable
        });

        address user = makeAddr(string(abi.encodePacked("fuzz_", ltv)));
        vm.deal(user, 5 ether);
        vm.prank(user);
        // Use enough BTC so debt clears the 2000 MUSD floor at any allowed LTV.
        factory.createVault{value: 1 ether}(p, 0, address(0), address(0));
    }
}
