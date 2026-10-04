// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ITroveManager} from "../../src/interfaces/mezo/ITroveManager.sol";

/// @notice Coordinated mock — MockBorrowerOperations writes here so tests don't need
///         to keep two copies of trove state in sync.
contract MockTroveManager is ITroveManager {
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    address public borrowerOps;

    modifier onlyBorrowerOps() {
        require(msg.sender == borrowerOps, "MockTM: not borrower ops");
        _;
    }

    function setBorrowerOps(address borrowerOps_) external {
        borrowerOps = borrowerOps_;
    }

    /// @dev Direct setter for tests that want to bypass BorrowerOperations.
    function setTrove(address borrower, uint256 coll, uint256 debt_) external {
        collateral[borrower] = coll;
        debt[borrower] = debt_;
    }

    function adjustTrove(address borrower, int256 collDelta, int256 debtDelta) external onlyBorrowerOps {
        collateral[borrower] = _apply(collateral[borrower], collDelta);
        debt[borrower] = _apply(debt[borrower], debtDelta);
    }

    /// @dev Mezo returns ICR as 1e18-based fixed point (2e18 = 200%).
    function getCurrentICR(address borrower, uint256 price) external view override returns (uint256) {
        if (debt[borrower] == 0) return type(uint256).max;
        return (collateral[borrower] * price) / debt[borrower];
    }

    function getTroveDebt(address borrower) external view override returns (uint256) {
        return debt[borrower];
    }

    function getTroveColl(address borrower) external view override returns (uint256) {
        return collateral[borrower];
    }

    function getTroveStatus(address borrower) external view override returns (uint256) {
        return debt[borrower] > 0 ? 1 : 2;
    }

    function _apply(uint256 base, int256 delta) private pure returns (uint256) {
        if (delta >= 0) return base + uint256(delta);
        uint256 sub = uint256(-delta);
        return sub >= base ? 0 : base - sub;
    }
}
