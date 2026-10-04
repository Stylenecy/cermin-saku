// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title ITroveManager — Mezo TroveManager interface (subset used by Cermin)
interface ITroveManager {
    /// @notice Returns ICR of a borrower at given BTC price (18-decimal fixed point)
    function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);

    /// @notice Returns total MUSD debt of a trove
    function getTroveDebt(address _borrower) external view returns (uint256);

    /// @notice Returns BTC collateral of a trove (in wei)
    function getTroveColl(address _borrower) external view returns (uint256);

    /// @notice Returns trove status (1 = active, 2 = closed by owner, 3 = closed by liquidation)
    function getTroveStatus(address _borrower) external view returns (uint256);
}
