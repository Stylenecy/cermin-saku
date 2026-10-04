// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";

import {CerminVault} from "../../src/CerminVault.sol";
import {CerminFactory} from "../../src/CerminFactory.sol";
import {CerminSaku} from "../../src/CerminSaku.sol";
import {CerminLens} from "../../src/CerminLens.sol";
import {ICerminVault} from "../../src/interfaces/ICerminVault.sol";

import {MockBorrowerOperations} from "../mocks/MockBorrowerOperations.sol";
import {MockTroveManager} from "../mocks/MockTroveManager.sol";
import {MockPriceFeed} from "../mocks/MockPriceFeed.sol";
import {MockSavingsVault} from "../mocks/MockSavingsVault.sol";
import {MockMUSD} from "../mocks/MockMUSD.sol";

/// @notice Shared stack for the Cermin Saku tests: Mezo-sized CDP rules,
///         one parent vault (1 BNB @ $100k, Balanced preset).
abstract contract SakuBase is Test {
    CerminVault internal impl;
    CerminFactory internal factory;
    CerminSaku internal saku;
    CerminLens internal lens;
    CerminVault internal vault;

    MockBorrowerOperations internal borrowerOps;
    MockTroveManager internal troveManager;
    MockPriceFeed internal priceFeed;
    MockSavingsVault internal savingsVault;
    MockMUSD internal musd;

    address internal parent = makeAddr("parent-medan");
    address internal child = makeAddr("child-jogja");
    address internal keeper = makeAddr("keeper");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant PRICE = 100_000e18;
    uint256 internal constant ONE_BNB = 1e18;
    uint64 internal constant MONTH = 30 days;
    bytes32 internal constant LABEL = "Uang saku Rara";

    function _balanced() internal pure returns (ICerminVault.VaultParams memory) {
        return ICerminVault.VaultParams({
            targetLTV: 5_000, defendICR: 14_000, emergencyICR: 12_000, skimThresholdBps: 500, spendableShare: 5_000
        });
    }

    function setUp() public virtual {
        musd = new MockMUSD();
        troveManager = new MockTroveManager();
        borrowerOps = new MockBorrowerOperations(address(musd), address(troveManager));
        troveManager.setBorrowerOps(address(borrowerOps));
        musd.setMinter(address(borrowerOps), true);
        priceFeed = new MockPriceFeed(PRICE);
        savingsVault = new MockSavingsVault(address(musd));
        impl = new CerminVault(
            address(borrowerOps),
            address(troveManager),
            address(priceFeed),
            address(musd),
            address(savingsVault),
            2_000e18,
            200e18
        );
        factory = new CerminFactory(address(impl));
        saku = new CerminSaku(address(factory));
        lens = new CerminLens();

        vm.deal(parent, 100 ether);
        vm.prank(parent);
        vault = CerminVault(payable(factory.createVault{value: ONE_BNB}(_balanced(), 0, address(0), address(0))));
        // 1 BNB × $100k × 50% = 50k MUSD debt → 25k spendable + 25k savings.
    }

    function _grant(uint256 cap) internal {
        vm.prank(parent);
        vault.setSpendAllowance(address(saku), cap);
    }

    function _schedule(uint128 amount, uint64 period, uint32 periods) internal returns (uint256 id) {
        vm.prank(parent);
        id = saku.createSchedule(child, amount, period, periods, 0, LABEL);
    }

    function _floor() internal view returns (uint256) {
        return uint256(vault.params().defendICR) + vault.sakuPolicy().floorBufferBps;
    }

    function _icrAt(uint256 price) internal view returns (uint256) {
        return troveManager.getCurrentICR(address(vault), price) * 10_000 / 1e18;
    }
}
