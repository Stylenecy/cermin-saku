// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IBorrowerOperations} from "../../src/interfaces/mezo/IBorrowerOperations.sol";
import {MockMUSD} from "./MockMUSD.sol";
import {MockTroveManager} from "./MockTroveManager.sol";

/// @notice 1:1 mirror of Mezo BorrowerOperations signatures (no Liquity v1
///         _maxFeePercentage param). Maintains a coordinated MockTroveManager
///         so tests don't need to keep two copies of state in sync.
contract MockBorrowerOperations is IBorrowerOperations {
    MockMUSD public musd;
    MockTroveManager public troveManager;

    constructor(address musd_, address troveManager_) {
        musd = MockMUSD(musd_);
        troveManager = MockTroveManager(troveManager_);
    }

    function openTrove(uint256 debtAmount, address, address) external payable override {
        troveManager.adjustTrove(msg.sender, int256(msg.value), int256(debtAmount));
        musd.mint(msg.sender, debtAmount);
    }

    function adjustTrove(
        uint256 collWithdrawal,
        uint256 debtChange,
        bool isDebtIncrease,
        address,
        address
    ) external payable override {
        int256 collDelta = msg.value > 0 ? int256(msg.value) : -int256(collWithdrawal);
        int256 debtDelta = isDebtIncrease ? int256(debtChange) : -int256(debtChange);
        troveManager.adjustTrove(msg.sender, collDelta, debtDelta);

        if (isDebtIncrease) musd.mint(msg.sender, debtChange);
        else if (debtChange > 0) musd.burn(msg.sender, debtChange);

        if (collWithdrawal > 0) {
            (bool ok,) = msg.sender.call{value: collWithdrawal}("");
            require(ok, "MockBO: coll xfer failed");
        }
    }

    function repayMUSD(uint256 amount, address, address) external override {
        if (amount == 0) return;
        troveManager.adjustTrove(msg.sender, int256(0), -int256(amount));
        musd.burn(msg.sender, amount);
    }

    function withdrawMUSD(uint256 amount, address, address) external override {
        troveManager.adjustTrove(msg.sender, int256(0), int256(amount));
        musd.mint(msg.sender, amount);
    }

    function addColl(address, address) external payable override {
        troveManager.adjustTrove(msg.sender, int256(msg.value), int256(0));
    }

    function closeTrove() external override {
        uint256 debt = troveManager.getTroveDebt(msg.sender);
        uint256 coll = troveManager.getTroveColl(msg.sender);

        // Mirror Mezo: caller burns (debt − GAS_COMP); the gas-pool's 200 MUSD
        // is conceptually burned separately and isn't taken from the caller.
        uint256 gasComp = 200e18;
        if (debt > gasComp) musd.burn(msg.sender, debt - gasComp);
        troveManager.adjustTrove(msg.sender, -int256(coll), -int256(debt));

        if (coll > 0) {
            (bool ok,) = msg.sender.call{value: coll}("");
            require(ok, "MockBO: coll return failed");
        }
    }

    receive() external payable {}
}
