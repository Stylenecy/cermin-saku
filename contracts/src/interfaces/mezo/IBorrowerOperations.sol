// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title IBorrowerOperations — Mezo BorrowerOperations (subset used by Cermin)
/// @notice Signatures verified against the live impl on Mezo matsnet
///         (proxy 0xCdF7028ceAB81fA0C6971208e83fa7872994beE5, impl
///         0xc05Bf344BD5b58825784326dD3112fB6cC160dcC) on 2026-05-18.
///         Mezo's MUSD fork dropped the Liquity v1 `_maxFeePercentage`
///         parameter — there is no per-call fee cap; the borrowing rate
///         is a protocol-wide constant set by InterestRateManager.
interface IBorrowerOperations {
    /// @notice Open a new trove, minting `_debtAmount` MUSD against the BTC sent as `msg.value`.
    function openTrove(
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /// @notice Adjust an existing trove (collateral and/or debt).
    function adjustTrove(
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /// @notice Repay MUSD to reduce debt.
    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Withdraw additional MUSD, increasing debt.
    function withdrawMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Add BTC collateral to an existing trove.
    function addColl(address _upperHint, address _lowerHint) external payable;

    /// @notice Close trove: full repay, return BTC collateral.
    function closeTrove() external;
}
